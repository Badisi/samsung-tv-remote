import { existsSync, readFileSync, writeFileSync } from 'fs';
import { exec } from 'child_process';
import { homedir } from 'os';
import { join } from 'path';
import { wake } from 'wake_on_lan';

import WebSocket from 'ws';

import type { SamsungTvRemoteOptions } from './options';
import { SamsungTvLogger } from './logger';
import { Keys } from './keys';

export class SamsungTvRemote {
    private logger = new SamsungTvLogger();

    private options!: Required<SamsungTvRemoteOptions>;
    private wsURL!: string;
    private token?: string;

    constructor(options: SamsungTvRemoteOptions) {
        if (!options.ip) {
            throw new Error('[SamsungTvRemote]: TV IP address is required');
        }

        // Initialize
        this.options = {
            name: options.name ?? 'SamsungTvRemote',
            ip: options.ip,
            mac: options.mac ?? '00:00:00:00:00:00',
            port: options.port ?? 8002,
            timeout: options.timeout ?? 1000,
            debug: options.debug ?? false
        };
        this.logger.enabled(this.options.debug);
        this.logger.log('Options:', this.options);

        // Retrieve app token (if previously registered)
        const apps = this.getRegisteredApps();
        if (Object.prototype.hasOwnProperty.call(apps, this.options.name)) {
            this.token = apps[this.options.name];
            this.logger.log('Token found:', this.token);
        } else {
            this.logger.warn('No token found:', 'app is not registered yet and will need to be authorized on TV');
        }

        // Initialize web socket url
        this.refreshWebSocketURL();
    }

    // --- PUBLIC API(s) ---

    /**
     * Send a key to the TV.
     *
     * @async
     * @param {keyof typeof Keys} key The key to be sent
     * @returns {Promise<void>} A void promise
     */
    public async sendKey(key: keyof typeof Keys): Promise<void> {
        if (key) {
            const command = JSON.stringify({
                method: 'ms.remote.control',
                params: {
                    Cmd: 'Click',
                    DataOfCmd: key,
                    Option: false,
                    TypeOfRemote: 'SendRemoteKey'
                }
            });
            const ws = await this.connect().catch(err => this.logger.error(err));
            if (ws) {
                this.logger.log('Sending key:', key);

                if (this.options.port === 8001) {
                    setTimeout(() => ws.send(command), 1000);
                } else {
                    ws.send(command);
                    setTimeout(() => ws.close(), 250);
                }
            }
        }
    }

    /**
     * Send multiple keys to the TV.
     *
     * @async
     * @param {(keyof typeof Keys)[]} keys An array of keys to be sent
     * @returns {Promise<void>} A void promise
     */
    public async sendKeys(keys: (keyof typeof Keys)[]): Promise<void> {
        for (const key of keys) {
            await this.sendKey(key);
        }
    }

    /**
     * Turn the TV on or awaken it from sleep mode (also called WoL - Wake-on-LAN).
     * The mac address option is required in this case.
     *
     * @async
     * @returns {Promise<void>} A void promise
     */
    public async wakeTV(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (!(await this.isTvAlive())) {
                this.logger.log('Waking TV...');
                wake(this.options.mac, { num_packets: 30 }, async (error: Error) => {
                    if (error) {
                        this.logger.error(error);
                        return reject(error);
                    } else {
                        // Gives a little time for the TV to start
                        setTimeout(async () => {
                            if (!(await this.isTvAlive())) {
                                const msg = 'TV won\'t wake up';
                                this.logger.error(msg);
                                return reject(`[SamsungTvRemote]: Error: ${msg}`);
                            }
                            return resolve();
                        }, 5000);
                    }
                });
            } else {
                this.logger.log('Waking TV:', 'already up');
                return resolve();
            }
        });
    }

    // --- HELPER(s) ---

    private getCachePath(name = 'badisi-samsung-tv-remote.json'): string {
        const homeDir = homedir();
        switch (process.platform) {
            case 'darwin': return join(homeDir, 'Library', 'Caches', name);
            case 'win32': return join(process.env.LOCALAPPDATA ?? join(homeDir, 'AppData', 'Local'), name);
            default: return join(process.env.XDG_CACHE_HOME ?? join(homeDir, '.cache'), name);
        }
    }

    private getRegisteredApps(): Record<string, string> {
        const filePath = this.getCachePath();
        if (existsSync(filePath)) {
            return JSON.parse(readFileSync(filePath).toString());
        }
        return {};
    }

    private registerApp(appName: string, appToken: string): void {
        const filePath = this.getCachePath();

        const apps = this.getRegisteredApps();
        apps[appName] = appToken;
        writeFileSync(filePath, JSON.stringify(apps));
    };

    private refreshWebSocketURL(): void {
        let url = (this.options.port === 8001) ? 'ws' : 'wss';
        url += `://${this.options.ip}:${this.options.port}/api/v2/channels/samsung.remote.control`;
        url += `?name=${Buffer.from(this.options.name).toString('base64')}`;
        if (this.token) {
            url += `&token=${this.token}`;
        }
        this.wsURL = url;
    }

    private async isTvAlive(): Promise<boolean> {
        return new Promise((resolve) => {
            exec(`ping -c 1 -W 1 ${this.options.ip}`, (error) => resolve(!!!error));
        });
    }

    private connect(): Promise<WebSocket> {
        return new Promise((resolve, reject) => {
            this.logger.log('Connecting to TV:', this.wsURL);

            const ws = new WebSocket(this.wsURL, {
                timeout: this.options.timeout,
                rejectUnauthorized: false
            });
            ws.on('error', (error) => {
                ws.close();
                return reject(error.message);
            });
            ws.on('message', (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.event === 'ms.channel.connect') {
                    // Register app for next time
                    if (!this.token) {
                        this.token = msg.data.token;
                        this.refreshWebSocketURL();
                        this.registerApp(this.options.name, msg.data.token);
                    }
                    return resolve(ws);
                } else {
                    ws.close();
                    return reject(msg);
                }
            });
        });
    }
};

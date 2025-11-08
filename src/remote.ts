import { exec } from 'node:child_process';
import { wake } from 'wake_on_lan';
import WebSocket from 'ws';
import { getAppFromCache, saveAppToCache, saveDeviceToCache } from './cache';
import type { Keys } from './keys';
import { createLogger } from './logger';
import type { SamsungTvRemoteOptions } from './models';

const logger = createLogger();

const DEFAULT_OPTIONS: Required<Omit<SamsungTvRemoteOptions, 'ip' | 'device'>> = {
    name: 'SamsungTvRemote',
    mac: '00:00:00:00:00:00',
    port: 8002,
    timeout: 5000,
    keysDelay: 60
};

export class SamsungTvRemote {
    #options!: Required<Omit<SamsungTvRemoteOptions, 'device'>> & Partial<Pick<SamsungTvRemoteOptions, 'device'>>;
    #connectingPromise: Promise<void> | null = null;
    #webSocketURL!: string;
    #webSocket: WebSocket | null = null;
    #appToken?: string;

    constructor(options: Omit<SamsungTvRemoteOptions, 'device'>);
    constructor(options: Omit<SamsungTvRemoteOptions, 'ip' | 'mac'>);
    constructor(options: SamsungTvRemoteOptions) {
        // Initialize
        this.#options = {
            // @ts-expect-error This is made only for keys ordering during the logs
            name: undefined,
            // @ts-expect-error This is made only for keys ordering during the logs
            ip: undefined,
            ...DEFAULT_OPTIONS,
            ...options
        };
        if (options.device) {
            this.#options.ip = options.device.ip;
            this.#options.mac = options.device.mac;
        }
        if (!this.#options.ip) {
            throw new Error('TV IP address is required');
        }

        logger.info('Remote starting...');
        logger.debug(this.#options);

        // Retrieve app token (if previously registered)
        this.#appToken = this.#getAppToken(this.#options.ip, this.#options.port, this.#options.name);

        // Initialize web socket url
        this.#refreshWebSocketURL();
    }

    // --- PUBLIC API(s) ---

    /**
     * Sends a key to the TV.
     *
     * @async
     * @param {keyof typeof Keys} key The key to be sent
     * @returns {Promise<void>} A void promise
     */
    public async sendKey(key: keyof typeof Keys): Promise<void> {
        if (key) {
            await this.#connectToTV();

            logger.info('📡 Sending key...', key);
            this.#webSocket?.send(
                JSON.stringify({
                    method: 'ms.remote.control',
                    params: {
                        Cmd: 'Click',
                        DataOfCmd: key,
                        Option: false,
                        TypeOfRemote: 'SendRemoteKey'
                    }
                })
            );

            // Gives a delay before the next command
            await this.#delay(this.#options.keysDelay);
        }
    }

    /**
     * Sends multiple keys to the TV.
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
     * Turns the TV on or awaken it from sleep mode (also called WoL - Wake-on-LAN).
     *
     * The mac address option is required in this case.
     *
     * @async
     * @returns {Promise<void>} A void promise
     */
    public async wakeTV(): Promise<void> {
        if (await this.#isTvAlive()) {
            logger.info('💤 Waking TV... already up');
            return;
        }

        logger.info('💤 Waking TV...');

        if (!this.#options.mac) {
            throw new Error('TV mac address is required');
        }

        return new Promise<void>((resolve, reject) => {
            wake(this.#options.mac, { num_packets: 30 }, async (error: Error) => {
                if (error) {
                    return reject(error);
                } else {
                    // Gives a little time for the TV to start
                    setTimeout(async () => {
                        if (!(await this.#isTvAlive())) {
                            return reject(new Error("TV won't wake up"));
                        }
                        return resolve();
                    }, 5000);
                }
            });
        });
    }

    /**
     * Closes the connection to the TV.
     *
     * It doesn't shut down the TV - it only closes the connection to it.
     */
    public disconnect(): void {
        logger.info('📺 Disconnecting from TV...');
        this.#disconnectFromTV();
    }

    // --- HELPER(s) ---

    async #delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    #getAppToken(ip: string, port: number, appName: string): string | undefined {
        let value: string | undefined;

        const app = getAppFromCache(appName);
        if (app && typeof app === 'object' && Object.hasOwn(app, `${ip}:${String(port)}`)) {
            value = app[`${ip}:${String(port)}`];
        }

        if (value) {
            logger.info('✅ App token found:', value);
        } else {
            logger.warn('No token found: app is not registered yet and will need to be authorized on TV');
        }

        return value;
    }

    #refreshWebSocketURL(): void {
        let url = this.#options.port === 8001 ? 'ws' : 'wss';
        url += `://${this.#options.ip}:${this.#options.port}/api/v2/channels/samsung.remote.control`;
        url += `?name=${Buffer.from(this.#options.name).toString('base64')}`;
        if (this.#appToken) {
            url += `&token=${this.#appToken}`;
        }
        this.#webSocketURL = url;
    }

    async #isTvAlive(): Promise<boolean> {
        return new Promise(resolve => {
            exec(`ping -c 1 -W 1 ${this.#options.ip}`, error => resolve(!error));
        });
    }

    #disconnectFromTV(): void {
        this.#webSocket?.removeAllListeners();
        this.#webSocket?.close();
        this.#webSocket = null;
        this.#connectingPromise = null;
    }

    async #connectToTV(): Promise<void> {
        // If already connected -> returns immediately
        if (this.#webSocket?.readyState === WebSocket.OPEN) {
            return Promise.resolve();
        }

        // If already in progress -> returns the promise
        if (this.#connectingPromise) {
            return this.#connectingPromise;
        }

        // Otherwise -> starts new connection
        this.#connectingPromise = new Promise((resolve, reject) => {
            logger.info('📺 Connecting to TV...');
            logger.debug('Using websocket:', this.#webSocketURL);

            const _webSocket = new WebSocket(this.#webSocketURL, {
                timeout: this.#options.timeout,
                handshakeTimeout: this.#options.timeout,
                rejectUnauthorized: false
            });

            const cleanup = () => {
                _webSocket?.removeAllListeners();
                this.#connectingPromise = null;
            };

            _webSocket.on('error', (error: NodeJS.ErrnoException) => {
                cleanup();
                this.#disconnectFromTV();
                if (error.code === 'ETIMEDOUT') {
                    reject(new Error('Connection timed out'));
                } else if (error.code === 'EHOSTDOWN') {
                    reject(new Error('Host is down or service not available'));
                } else if (error.code === 'EHOSTUNREACH') {
                    reject(new Error('Host is unreachable'));
                } else {
                    reject(error);
                }
            });

            _webSocket.on('close', () => {
                cleanup();
                this.#webSocket = null;
            });

            _webSocket.once('message', data => {
                const message = JSON.parse(data.toString());
                if (message.event === 'ms.channel.connect') {
                    logger.info('✅ Connected to TV');

                    // Save token for next time (if not already in cache)
                    if (!this.#appToken && message.data?.token) {
                        this.#appToken = message.data.token;
                        this.#refreshWebSocketURL();
                        saveAppToCache(this.#options.ip, this.#options.port, this.#options.name, message.data.token);
                    }

                    // Save device for next time
                    const deviceName = this.#options.device?.friendlyName ?? 'Unknown';
                    saveDeviceToCache(this.#options.ip, this.#options.mac, deviceName);

                    this.#webSocket = _webSocket;
                    cleanup();
                    resolve();
                } else {
                    throw new Error(`Unexpected handshake message: ${data.toString()}`);
                }
            });
        });

        try {
            await this.#connectingPromise;
        } finally {
            this.#connectingPromise = null;
        }
    }
}

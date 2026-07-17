import { createSocket, type RemoteInfo } from 'node:dgram';
import { getDeviceFromCache } from './cache';
import { createLogger } from './logger';
import type { SamsungDevice } from './models';

let _logger: ReturnType<typeof createLogger>;
const getLogger = () => _logger ??= createLogger('SamsungTvDiscovery');

const SSDP_MSEARCH = [
    'M-SEARCH * HTTP/1.1',
    'HOST: 239.255.255.250:1900',
    'MAN: "ssdp:discover"',
    'MX: 10',
    'ST: urn:dial-multiscreen-org:service:dial:1',
    '',
    ''
].join('\r\n');

/**
 * Searches for last connected device, if any.
 *
 * @returns {SamsungDevice | undefined} The device if found, or undefined otherwise
 */
export const getLastConnectedDevice = async (): Promise<SamsungDevice | undefined> => {
    getLogger().info('🔍 Searching for a last connected device...');
    const device = await getDeviceFromCache();
    if (!device) {
        getLogger().warn('No last connected device found');
    } else {
        getLogger().info('✅ Found last connected device:', device);
    }
    return device;
};

/**
 * Retrieves a list of Samsung devices that are currently awake and reachable on the network.
 *
 * @async
 * @param {number} [timeout=500] The maximum time in milliseconds to wait for the response
 * @returns {Promise<SamsungDevice[]>} A promise that resolves with an array of awake Samsung devices
 */
export const getAwakeSamsungDevices = async (timeout: number = 500): Promise<SamsungDevice[]> => {
    getLogger().info('🔍 Searching for awake Samsung devices...');

    return new Promise(resolve => {
        const devices: SamsungDevice[] = [];
        const socket = createSocket('udp4');

        const resolveWithDevices = () => {
            if (!devices.length) {
                getLogger().warn('No Samsung devices found');
            }
            resolve(devices);
        };

        socket.on('listening', () => {
            const address = socket.address();
            getLogger().debug(`Listening on '${address.address}:${address.port}'...`);

            // Send M-SEARCH message
            const message = Buffer.from(SSDP_MSEARCH);
            socket.setBroadcast(true);
            socket.setMulticastTTL(2); // 2, to limit to local network
            getLogger().debug('Sending M-SEARCH message...');
            socket.send(message, 0, message.length, 1900, '239.255.255.250', error => {
                if (error) {
                    getLogger().error('Failed:', error);
                    socket.close();
                    resolveWithDevices();
                }
            });
        });

        socket.on('message', async (message: Buffer<ArrayBuffer>, remoteInfo: RemoteInfo): Promise<void> => {
            const response = messageToJson(message);

            getLogger().debug(`Received message from '${remoteInfo.address}:${remoteInfo.port}':\n`, response);

            if (response['SERVER']?.includes('Samsung')) {
                const device = {
                    friendlyName: 'Unknown',
                    ip: remoteInfo.address,
                    mac: '00:00:00:00:00:00'
                };

                if (response['LOCATION']) {
                    try {
                        const result = await (await fetch(response['LOCATION'])).text();
                        const regexp = /<friendlyName>(.*?)<\/friendlyName>/gi;
                        device.friendlyName = [...result.matchAll(regexp)]?.[0]?.[1];
                    } catch {
                        /** swallow any error as it is not relevant nor blocking */
                    }
                }

                if (response['WAKEUP']) {
                    const result = response['WAKEUP'].match(/\s*MAC=([0-9a-fA-F:]+)/);
                    if (result) {
                        device.mac = result[1];
                    }
                }

                getLogger().info('✅ Found Samsung device:', device);
                devices.push(device);
            }
        });

        socket.on('error', error => {
            getLogger().error('Socket error:', error);
            socket.close();
            resolveWithDevices();
        });

        socket.bind();

        const startTime = Date.now();
        const interval = setInterval(() => {
            const elapsedTime = Date.now() - startTime;
            if (devices.length > 0 || elapsedTime >= timeout) {
                try {
                    socket.close();
                } catch {
                    /** in case it was already closed with errors */
                }
                clearInterval(interval);
                resolveWithDevices();
            }
        }, 25);
    });
};

// --- HELPER(s) ---

const messageToJson = (message: Buffer<ArrayBuffer>): Record<string, string> =>
    message
        .toString()
        .split('\n')
        .reduce(
            (acc, line) => {
                const spos = line.indexOf(':');
                if (spos < 0) return acc; // If there's no colon, skip the line
                const key = line.substring(0, spos).trim().toUpperCase();
                const value = line.substring(spos + 1).trim();
                acc[key] = value;
                return acc;
            },
            {} as Record<string, string>
        );

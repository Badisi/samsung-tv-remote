import dgram from 'dgram';
import os from 'os';
import fs from 'fs'

interface DeviceInfo {
    friendlyName: string
    ip: string
    mac: string
}

export function getSamsungDevices(timeMs: number = 250): Promise<DeviceInfo[]> {
    return new Promise((resolve, reject) => {
        const devices: DeviceInfo[] = []
        const socket = dgram.createSocket('udp4');

        const ssdpMSearch = [
            'M-SEARCH * HTTP/1.1',
            'HOST: 239.255.255.250:1900',
            'MAN: "ssdp:discover"',
            'MX: 10',
            'ST: urn:dial-multiscreen-org:service:dial:1',
            '',
            ''
        ].join('\r\n');

        socket.on('listening', () => {
            socket.setBroadcast(true);
            socket.setMulticastTTL(2); // TTL = 2 to limit to local network

            const message = Buffer.from(ssdpMSearch);
            const multicastAddress = '239.255.255.250';
            const port = 1900;

            // Send M-SEARCH message
            socket.send(message, 0, message.length, port, multicastAddress, (err) => {
                if (err) console.error('Error sending:', err);
                //else console.log('M-SEARCH ent');
            });
        });

        socket.on('message', async (msg, rinfo) => {
            const response = msg.toString();

            if (response.includes('Samsung')) {
                let obj = {} as any
                for (const line of response.split("\n")) {
                    const spos = line.indexOf(':')
                    if (spos < 0) continue;
                    const key = line.substring(0, spos).trim().toUpperCase()
                    const value = line.substring(spos + 1).trim()
                    obj[key] = value
                }

                let friendlyName = rinfo.address
                let ipAddress = rinfo.address
                let macAddress = "00:00:00:00:00:00"

                if (obj.LOCATION) {
                    try {
                        const result = await (await fetch(obj.LOCATION)).text()
                        const regexp = /<friendlyName>(.*?)<\/friendlyName>/ig
                        friendlyName = [...result.matchAll(regexp)]?.[0]?.[1]
                    } catch (e) {
                        console.error(e)
                    }
                }

                const macMatch = response.match(/WAKEUP:\s*MAC=([0-9a-fA-F:]+)/);
                if (macMatch) {
                    macAddress = macMatch[1];
                }

                devices.push({ friendlyName: friendlyName, ip: ipAddress, mac: macAddress })
                //console.log(`Device: friendlyName: ${friendlyName}, ip: ${ipAddress}, mac: ${macAddress}`);
            }
        });

        socket.bind();

        let startTime = Date.now()
        let interval = setInterval(() => {
            const elapsedTime = Date.now() - startTime
            //console.log('interval')
            if (devices.length > 0 || elapsedTime >= timeMs) {
                resolve(devices)
                socket.close();
                clearInterval(interval)
            }
        }, 25)
    })
}

export async function getCachedSamsungDevices(): Promise<DeviceInfo[]> {
    function getCachePath(name = 'badisi-samsung-tv-remote-device-cache.json') {
        switch (process.platform) {
            case 'darwin': return `${os.homedir()}/Library/Caches/${name}`
            case 'win32': return `${(process.env.LOCALAPPDATA || `${os.homedir()}/AppData/Local`)}/${name}`
            default: return `${(process.env.XDG_CACHE_HOME || `${os.homedir()}/.cache`)}/${name}`
        }
    }

    const cachePath = getCachePath()
    let result: { [key: string]: DeviceInfo } = {}
    try {
        result = JSON.parse(await fs.promises.readFile(cachePath, { encoding: 'utf-8' }))
    } catch (e) {
    }
    if (typeof result !== 'object') result = {};

    //console.log(typeof result)

    for (const device of await getSamsungDevices()) {
        result[device.mac] = device
    }

    await fs.promises.writeFile(cachePath, JSON.stringify(result))

    return Object.values(result)
}

export function deviceToString(device: DeviceInfo | undefined) {
    if (!device) return 'Unknown'
    return `${device.friendlyName}, ip: ${device.ip}, mac: ${device.mac}`
}

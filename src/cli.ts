import { deviceToString, getCachedSamsungDevices } from './discovery';
import { SamsungTvRemote } from './remote';
import { Keys } from './keys';
import fs from 'node:fs';

(async () => {
    try {
        const devices = await getCachedSamsungDevices();
        if (devices.length === 0) {
            console.log('Couldn\'t find any Samsung device');
            process.exit(-1);
        }

        const fileHandle = await fs.promises.open('/dev/stdin', 'r');
        process.stdin.setRawMode(true);

        let selectedDevice = devices[0];

        if (devices.length > 1) {
            console.log('Select device:');
            for (let n = 0; n < devices.length; n++) {
                const device = devices[n];
                console.log(` ${n}: ${deviceToString(device)}`);
            }
            console.log('Waiting for key, q to quit...');

            while (true) {
                const buffer = Buffer.alloc(3);
                const { bytesRead } = await fileHandle.read(buffer, 0, 3, null);
                const key = buffer.slice(0, bytesRead).toString().replace(/\u0000/g, '');
                if (key == 'q') process.exit(-1);
                const number = parseInt(key);
                selectedDevice = devices[number];
                if (selectedDevice) break;
            }
        }

        console.log(`Selected ${deviceToString(selectedDevice)}`);

        const remote = new SamsungTvRemote({
            ip: selectedDevice.ip,
            mac: selectedDevice.mac
        });
        await remote.wakeTV();

        console.log('Press any key: q-Shutdown and Quit, f-Force Quit, w-Wake TV, +- -> Volume, Arrows, ENTER, ESC, BACKSPACE');

        while (true) {
            const buffer = Buffer.alloc(3);
            const { bytesRead } = await fileHandle.read(buffer, 0, 3, null);

            const key = buffer.slice(0, bytesRead).toString().replace(/\u0000/g, '');

            console.log(`Pressed: '${key}', ${[...key].map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))}`);

            switch (key) {
                case '0': await remote.sendKey(Keys.KEY_0); break;
                case '1': await remote.sendKey(Keys.KEY_1); break;
                case '2': await remote.sendKey(Keys.KEY_2); break;
                case '3': await remote.sendKey(Keys.KEY_3); break;
                case '4': await remote.sendKey(Keys.KEY_4); break;
                case '5': await remote.sendKey(Keys.KEY_5); break;
                case '6': await remote.sendKey(Keys.KEY_6); break;
                case '7': await remote.sendKey(Keys.KEY_7); break;
                case '8': await remote.sendKey(Keys.KEY_8); break;
                case '9': await remote.sendKey(Keys.KEY_9); break;
                case '\u001b[A': await remote.sendKey(Keys.KEY_UP); break;
                case '\u001b[B': await remote.sendKey(Keys.KEY_DOWN); break;
                case '\u001b[C': await remote.sendKey(Keys.KEY_RIGHT); break;
                case '\u001b[D': await remote.sendKey(Keys.KEY_LEFT); break;
                case '\u007f': await remote.sendKey(Keys.KEY_BACK_MHP); break;
                case '\u001b': await remote.sendKey(Keys.KEY_HOME); break;
                //case '\x09': await remote.sendKey(Keys.KEY_TOOLS); break;
                case '\r': await remote.sendKey(Keys.KEY_ENTER); break;
                case 'p': await remote.sendKey(Keys.KEY_PLAY); break;
                case '+': await remote.sendKey(Keys.KEY_VOLUP); break;
                case '-': await remote.sendKey(Keys.KEY_VOLDOWN); break;
                case 'w': await remote.sendKey(Keys.KEY_CHUP); break;
                case 's': await remote.sendKey(Keys.KEY_CHDOWN); break;
                case 'q':
                    await remote.sendKeys([Keys.KEY_POWER]);
                    console.log('Exiting...');
                    process.exit();
                case '\u0003':
                case 'f':
                    console.log('Force Exiting...');
                    process.exit();
                default:
                    [...key].map(it => String.fromCharCode());
                    break;
            }
        }
    } catch (error: unknown) {
        console.error(error);
    }
})();

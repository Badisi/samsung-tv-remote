import { deviceToString, getCachedSamsungDevices } from "./discovery";
import { Keys } from "./keys";
import fs from "fs"
import { SamsungTvRemote } from "./remote";

const main = async () => {
    const fileHandle = await fs.promises.open('/dev/stdin', 'r');
    process.stdin.setRawMode(true);

    const devices = await getCachedSamsungDevices()
    if (devices.length == 0) {
        console.log("Couldn't find any Samsung device")
        process.exit(-1)
    }

    let selectedDevice = devices[0]

    if (devices.length > 1) {
        console.log("Select device:")
        for (let n = 0; n < devices.length; n++) {
            const device = devices[n]
            console.log(` ${n}: ${deviceToString(device)}`)
        }
        console.log("Waiting for key, q to quit...")

        while (true) {
            const buffer = Buffer.alloc(3);
            const { bytesRead } = await fileHandle.read(buffer, 0, 3, null);
            const key = buffer.slice(0, bytesRead).toString().replace(/\u0000/g, '');
            if (key == 'q') process.exit(-1);
            const number = parseInt(key)
            selectedDevice = devices[number]
            if (selectedDevice) break
        }
    }

    console.log(`Selected ${deviceToString(selectedDevice)}`)

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
            case '0': await remote.sendKey(Keys.KEY_0 as any); break;
            case '1': await remote.sendKey(Keys.KEY_1 as any); break;
            case '2': await remote.sendKey(Keys.KEY_2 as any); break;
            case '3': await remote.sendKey(Keys.KEY_3 as any); break;
            case '4': await remote.sendKey(Keys.KEY_4 as any); break;
            case '5': await remote.sendKey(Keys.KEY_5 as any); break;
            case '6': await remote.sendKey(Keys.KEY_6 as any); break;
            case '7': await remote.sendKey(Keys.KEY_7 as any); break;
            case '8': await remote.sendKey(Keys.KEY_8 as any); break;
            case '9': await remote.sendKey(Keys.KEY_9 as any); break;
            case '\u001b[A': await remote.sendKey(Keys.KEY_UP as any); break;
            case '\u001b[B': await remote.sendKey(Keys.KEY_DOWN as any); break;
            case '\u001b[C': await remote.sendKey(Keys.KEY_RIGHT as any); break;
            case '\u001b[D': await remote.sendKey(Keys.KEY_LEFT as any); break;
            case '\u007f': await remote.sendKey(Keys.KEY_BACK_MHP as any); break;
            case '\u001b': await remote.sendKey(Keys.KEY_HOME as any); break;
            //case '\x09': await remote.sendKey(Keys.KEY_TOOLS as any); break;
            case '\r': await remote.sendKey(Keys.KEY_ENTER as any); break;
            case 'p': await remote.sendKey(Keys.KEY_PLAY as any); break;
            case '+': await remote.sendKey(Keys.KEY_VOLUP as any); break;
            case '-': await remote.sendKey(Keys.KEY_VOLDOWN as any); break;
            case 'w': await remote.sendKey(Keys.KEY_CHUP as any); break;
            case 's': await remote.sendKey(Keys.KEY_CHDOWN as any); break;
            case 'q':
                await remote.sendKeys([Keys.KEY_POWER as any]);
                console.log('Exiting...');
                process.exit();
                break;
            case '\u0003':
            case 'f':
                console.log('Force Exiting...');
                process.exit();
                break;
            default:
                [...key].map(it => String.fromCharCode())
                break;
        }
    }
};

main().catch(console.error);

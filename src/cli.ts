import { clearScreenDown, createInterface, emitKeypressEvents, moveCursor } from 'node:readline';
import { cyan, gray, magenta, yellow } from '@colors/colors/safe';
import { getAwakeSamsungDevices, getLastConnectedDevice } from './discovery';
import { Keys } from './keys';
import type { SamsungDevice } from './models';
import { SamsungTvRemote } from './remote';

interface KeyPressed {
    sequence: string;
    name?: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
}

const KEYS_MAP: Record<string, keyof typeof Keys> = {
    '0': Keys.KEY_0,
    '1': Keys.KEY_1,
    '2': Keys.KEY_2,
    '3': Keys.KEY_3,
    '4': Keys.KEY_4,
    '5': Keys.KEY_5,
    '6': Keys.KEY_6,
    '7': Keys.KEY_7,
    '8': Keys.KEY_8,
    '9': Keys.KEY_9,
    '+': Keys.KEY_VOLUP,
    '-': Keys.KEY_VOLDOWN,
    p: Keys.KEY_PLAY,
    w: Keys.KEY_CHUP,
    s: Keys.KEY_CHDOWN,
    q: Keys.KEY_POWER,
    '\r': Keys.KEY_ENTER, // Return
    '\u001b[A': Keys.KEY_UP, // Up
    '\u001b[B': Keys.KEY_DOWN, // Down
    '\u001b[C': Keys.KEY_RIGHT, // Right
    '\u001b[D': Keys.KEY_LEFT, // Left
    '\u007f': Keys.KEY_RETURN, // Backspace
    '\u001b': Keys.KEY_HOME // Escape
};

const deviceLabel = (device: SamsungDevice): string =>
    `${device.friendlyName ?? 'Unknown'} ${gray(`(ip: ${device.ip}, mac: ${device.mac})`)}`;

const displayHelp = () => {
    console.log(cyan('Usage'));
    console.log(`  Arrows (${yellow('←/↑/↓/→')})`);
    console.log(`  Channel (${yellow('w/s')})`);
    console.log(`  Enter (${yellow('Enter')})`);
    console.log(`  Home (${yellow('Escape')})`);
    console.log(`  Numbers (${yellow('[0-9]')})`);
    console.log(`  Play (${yellow('p')})`);
    console.log(`  Power (${yellow('q')})`);
    console.log(`  Return (${yellow('Backspace')})`);
    console.log(`  Volume (${yellow('+/-')})\n`);
};

const askQuestion = (question: string): Promise<string> =>
    new Promise(resolve => {
        const readline = createInterface({
            input: process.stdin,
            output: process.stdout
        });
        readline.question(question, res => {
            const numberOfLines = question.split('\n').length;
            moveCursor(process.stdout, 0, -numberOfLines);
            clearScreenDown(process.stdout);
            resolve(res);
            readline.close();
        });
    });

const chooseDevice = async (devices: SamsungDevice[]): Promise<number> => {
    let question = cyan('? Select device\n');
    devices.forEach((device, index) => {
        question += `  ${index + 1}) ${deviceLabel(device)}\n`;
    });
    question += '\nYour choice: ';
    return Number(await askQuestion(question));
};

(async () => {
    if (process.argv.includes('--version') || process.argv.includes('-v')) {
        console.log(process.env.npm_package_version);
        process.exit();
    }

    console.log(magenta('[SamsungTvRemote]\n'));
    displayHelp();

    try {
        let selectedDevice: SamsungDevice | undefined;
        let isDeviceAwake = false;

        const devices = await getAwakeSamsungDevices();
        if (devices.length) {
            const selectedDeviceIndex = 0;
            if (devices.length > 1) {
                let deviceIndex = await chooseDevice(devices);
                while (typeof deviceIndex !== 'number' || deviceIndex <= 0 || deviceIndex > devices.length) {
                    deviceIndex = await chooseDevice(devices);
                }
                deviceIndex--;
            }
            selectedDevice = devices[selectedDeviceIndex];
            isDeviceAwake = true;

            const label = devices.length > 1 ? 'Selected awake device' : 'Awake device found';
            console.log(`${cyan(`> ${label}:`)} ${deviceLabel(selectedDevice)}`);
        } else {
            console.log(yellow("> Couldn't find any awake Samsung devices"));

            selectedDevice = getLastConnectedDevice();
            if (selectedDevice) {
                console.log(`${cyan('> Last connected device found:')} ${deviceLabel(selectedDevice)}`);
            } else {
                console.log(yellow("> Couldn't find any last connected device"));
                process.exit(-1);
            }
        }

        const remote = new SamsungTvRemote({ device: selectedDevice, keysDelay: 0 });

        if (!isDeviceAwake) {
            console.log(`${cyan('> Waking TV...')}`);
            await remote.wakeTV();
        }

        //
        console.log(cyan('\n? Press any key: '));
        createInterface({ input: process.stdin }); // avoid keys to be displayed
        emitKeypressEvents(process.stdin); // allow keypress events
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true); // allow raw-mode to catch character by character
        }
        process.stdin.on('keypress', async (_str: string, key: KeyPressed) => {
            if (key.sequence in KEYS_MAP) {
                console.log(`${cyan('>')} sending...`, gray(KEYS_MAP[key.sequence]));
                await remote.sendKey(KEYS_MAP[key.sequence]);
                setTimeout(() => {
                    moveCursor(process.stdout, 0, -1);
                    clearScreenDown(process.stdout);
                }, 250);
            }

            if ((key.ctrl && key.name === 'c') || key.name === 'q' || key.name === 'f') {
                process.exit();
            }
        });
    } catch (error: unknown) {
        console.log('');
        console.error(error);
    }
})();

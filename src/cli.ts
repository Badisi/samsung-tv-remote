import { clearScreenDown, createInterface, emitKeypressEvents, moveCursor } from 'node:readline';
import { installApk, isAdbAvailable, launchAdbShell } from './adb';
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

const cyan = (message: string): string => process.stdout.isTTY ? `\x1b[36m${message}\x1b[0m` : message;
const gray = (message: string): string => process.stdout.isTTY ? `\x1b[90m${message}\x1b[0m` : message;
const green = (message: string): string => process.stdout.isTTY ? `\x1b[32m${message}\x1b[0m` : message;
const magenta = (message: string): string => process.stdout.isTTY ? `\x1b[35m${message}\x1b[0m` : message;
const red = (message: string): string => process.stdout.isTTY ? `\x1b[31m${message}\x1b[0m` : message;
const yellow = (message: string): string => process.stdout.isTTY ? `\x1b[33m${message}\x1b[0m` : message;

const deviceLabel = (device: SamsungDevice): string =>
    `${device.friendlyName ?? 'Unknown'} ${gray(`(ip: ${device.ip}, mac: ${device.mac})`)}`;

const displayHelp = (adbAvailable: boolean) => {
    console.log(cyan('Usage'));
    console.log(`  Arrows (${yellow('←/↑/↓/→')})`);
    console.log(`  Channel (${yellow('w/s')})`);
    console.log(`  Enter (${yellow('Enter')})`);
    console.log(`  Home (${yellow('Escape')})`);
    console.log(`  Numbers (${yellow('[0-9]')})`);
    console.log(`  Play (${yellow('p')})`);
    console.log(`  Power (${yellow('q')})`);
    console.log(`  Return (${yellow('Backspace')})`);
    console.log(`  Send text (${yellow('t')})`);
    console.log(`  Volume (${yellow('+/-')})`);
    if (adbAvailable) {
        console.log(`  Install APK (${yellow('i')})`);
        console.log(`  Terminal session (${yellow('T')})`);
    } else {
        console.log(yellow('  [ADB not found — install/terminal features disabled]'));
    }
    console.log('');
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

/** Suspend raw mode, run an async operation, then restore raw mode. */
const withCookedMode = async (fn: () => Promise<void>): Promise<void> => {
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(false);
    }
    try {
        await fn();
    } finally {
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
    }
};

(async () => {
    if (process.argv.includes('--version') || process.argv.includes('-v')) {
        console.log(process.env.npm_package_version);
        process.exit();
    }

    console.log(magenta('[SamsungTvRemote]\n'));

    const adbAvailable = await isAdbAvailable();
    displayHelp(adbAvailable);

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

        // Track whether we are already handling a modal prompt so we don't
        // stack multiple overlapping interactions.
        let busy = false;

        process.stdin.on('keypress', async (_str: string, key: KeyPressed) => {
            if (busy) return;

            // --- Send text to TV ---
            if (key.name === 't' && !key.ctrl && !key.meta && !key.shift) {
                busy = true;
                await withCookedMode(async () => {
                    const text = await askQuestion(cyan('> Enter text to send: '));
                    if (text) {
                        console.log(`${cyan('>')} sending text...`, gray(JSON.stringify(text)));
                        await remote.sendText(text);
                        setTimeout(() => {
                            moveCursor(process.stdout, 0, -1);
                            clearScreenDown(process.stdout);
                        }, 250);
                    }
                });
                busy = false;
                return;
            }

            // --- Install APK via ADB ---
            if (key.name === 'i' && !key.ctrl && !key.meta && !key.shift && adbAvailable) {
                busy = true;
                await withCookedMode(async () => {
                    const apkPath = await askQuestion(cyan('> Path to APK file: '));
                    if (apkPath) {
                        console.log(`${cyan('>')} installing APK...`, gray(apkPath));
                        try {
                            await installApk(selectedDevice!.ip, apkPath);
                            console.log(green('> APK installed successfully'));
                        } catch (err: unknown) {
                            console.log(red(`> APK install failed: ${(err as Error).message}`));
                        }
                        setTimeout(() => {
                            moveCursor(process.stdout, 0, -1);
                            clearScreenDown(process.stdout);
                        }, 1500);
                    }
                });
                busy = false;
                return;
            }

            // --- ADB terminal session (Shift+T) ---
            if (key.name === 't' && key.shift && adbAvailable) {
                busy = true;
                console.log(cyan('> Launching ADB shell — type "exit" or press Ctrl+D to return\n'));
                try {
                    await withCookedMode(async () => {
                        try {
                            await launchAdbShell(selectedDevice!.ip);
                        } catch (err: unknown) {
                            console.log(red(`> ADB shell failed: ${(err as Error).message}`));
                        }
                    });
                } finally {
                    console.log(cyan('\n> Back in remote control mode'));
                    busy = false;
                }
                return;
            }

            // --- Standard remote-control keys ---
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

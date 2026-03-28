import { exec, spawn } from 'node:child_process';
import { createLogger } from './logger';

const logger = createLogger();

const ADB_PORT = 5555;

const execAsync = (cmd: string): Promise<string> =>
    new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(stderr || error.message));
            } else {
                resolve(stdout);
            }
        });
    });

/**
 * Returns true if the `adb` binary is available on the host machine.
 */
export const isAdbAvailable = (): Promise<boolean> =>
    execAsync('adb version').then(() => true).catch(() => false);

/**
 * Connects ADB to the TV at the given IP address on the default ADB port (5555).
 */
export const adbConnect = (ip: string): Promise<void> => {
    logger.info(`ADB connecting to ${ip}:${ADB_PORT}...`);
    return execAsync(`adb connect ${ip}:${ADB_PORT}`).then(out => {
        logger.debug('adb connect output:', out.trim());
        if (out.includes('failed') || out.includes('unable')) {
            throw new Error(`ADB connect failed: ${out.trim()}`);
        }
    });
};

/**
 * Disconnects ADB from the TV at the given IP address.
 */
export const adbDisconnect = (ip: string): Promise<void> => {
    logger.info(`ADB disconnecting from ${ip}:${ADB_PORT}...`);
    return execAsync(`adb disconnect ${ip}:${ADB_PORT}`).then(out => {
        logger.debug('adb disconnect output:', out.trim());
    }).catch(() => {
        // Ignore disconnect errors — the session may already be gone
    });
};

/**
 * Installs an APK on the TV via ADB over the network.
 *
 * Requires `adb` to be installed on the host machine and Developer Mode /
 * USB Debugging to be enabled on the TV.
 *
 * @param ip      TV IP address
 * @param apkPath Absolute or relative path to the APK file on the host
 */
export const installApk = async (ip: string, apkPath: string): Promise<void> => {
    if (!(await isAdbAvailable())) {
        throw new Error('adb is not installed or not in PATH');
    }

    await adbConnect(ip);

    logger.info(`Installing APK: ${apkPath}`);
    try {
        const out = await execAsync(`adb -s ${ip}:${ADB_PORT} install -r "${apkPath}"`);
        logger.debug('adb install output:', out.trim());
        if (!out.includes('Success')) {
            throw new Error(`APK install failed: ${out.trim()}`);
        }
    } finally {
        await adbDisconnect(ip);
    }
};

/**
 * Launches an interactive ADB shell session on the TV, bridged to the local
 * terminal's stdin/stdout/stderr.  The returned promise resolves when the
 * shell session exits.
 *
 * Requires `adb` to be installed on the host machine and Developer Mode /
 * USB Debugging to be enabled on the TV.
 *
 * @param ip TV IP address
 */
export const launchAdbShell = async (ip: string): Promise<void> => {
    if (!(await isAdbAvailable())) {
        throw new Error('adb is not installed or not in PATH');
    }

    await adbConnect(ip);

    return new Promise((resolve, reject) => {
        logger.info('Launching ADB shell...');
        const proc = spawn('adb', ['-s', `${ip}:${ADB_PORT}`, 'shell'], {
            stdio: 'inherit'
        });

        proc.on('error', async err => {
            await adbDisconnect(ip);
            reject(err);
        });

        proc.on('close', async () => {
            await adbDisconnect(ip);
            resolve();
        });
    });
};

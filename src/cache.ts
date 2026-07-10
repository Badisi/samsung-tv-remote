import { readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Cache, SamsungApp, SamsungDevice } from './models';

export const getDeviceFromCache = async (): Promise<SamsungDevice | undefined> => {
    return (await getCache()).lastConnectedDevice;
};

export const saveDeviceToCache = async (ip: string, mac: string, friendlyName: string): Promise<void> => {
    const cache = await getCache();
    cache.lastConnectedDevice = { ip, mac, friendlyName };
    await writeFile(getCacheFilePath(), JSON.stringify(cache));
};

export const getAppFromCache = async (appName: string): Promise<SamsungApp | undefined> => {
    return (await getCache()).appTokens?.[appName];
};

export const saveAppToCache = async (ip: string, port: number, appName: string, appToken: string): Promise<void> => {
    const cache = await getCache();
    cache.appTokens ??= {};
    cache.appTokens[appName] ??= {};
    cache.appTokens[appName][`${ip}:${String(port)}`] = appToken;
    await writeFile(getCacheFilePath(), JSON.stringify(cache));
};

// --- HELPER(s) ---

const getCacheFilePath = (name = 'badisi-samsung-tv-remote.json'): string => {
    const homeDir = homedir();
    switch (process.platform) {
        case 'darwin':
            return join(homeDir, 'Library', 'Caches', name);
        case 'win32':
            return join(process.env['LOCALAPPDATA'] ?? join(homeDir, 'AppData', 'Local'), name);
        default:
            return join(process.env['XDG_CACHE_HOME'] ?? join(homeDir, '.cache'), name);
    }
};

const getCache = async (): Promise<Cache> => {
    try {
        return JSON.parse(await readFile(getCacheFilePath(), 'utf8'));
    } catch {
        return {} as Cache;
    }
};

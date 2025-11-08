import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Cache, SamsungApp, SamsungDevice } from './models';

export const getDeviceFromCache = (): SamsungDevice | undefined => {
    return getCache().lastConnectedDevice;
};

export const saveDeviceToCache = (ip: string, mac: string, friendlyName: string): void => {
    const cache = getCache();
    cache.lastConnectedDevice = { ip, mac, friendlyName };
    writeFileSync(getCacheFilePath(), JSON.stringify(cache));
};

export const getAppFromCache = (appName: string): SamsungApp | undefined => {
    return getCache().appTokens?.[appName];
};

export const saveAppToCache = (ip: string, port: number, appName: string, appToken: string): void => {
    const cache = getCache();
    cache.appTokens ??= {};
    cache.appTokens[appName] ??= {};
    cache.appTokens[appName][`${ip}:${String(port)}`] = appToken;
    writeFileSync(getCacheFilePath(), JSON.stringify(cache));
};

// --- HELPER(s) ---

const getCacheFilePath = (name = 'badisi-samsung-tv-remote.json'): string => {
    const homeDir = homedir();
    switch (process.platform) {
        case 'darwin':
            return join(homeDir, 'Library', 'Caches', name);
        case 'win32':
            return join(process.env.LOCALAPPDATA ?? join(homeDir, 'AppData', 'Local'), name);
        default:
            return join(process.env.XDG_CACHE_HOME ?? join(homeDir, '.cache'), name);
    }
};

const getCache = (): Cache => {
    try {
        const filePath = getCacheFilePath();
        if (existsSync(filePath)) {
            return JSON.parse(readFileSync(filePath).toString());
        }
        return {} as Cache;
    } catch {
        return {} as Cache;
    }
};

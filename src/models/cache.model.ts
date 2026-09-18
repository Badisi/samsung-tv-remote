import type { SamsungApp } from './samsung-app.model.js';
import type { SamsungDevice } from './samsung-device.model.js';

export interface Cache {
    lastConnectedDevice?: SamsungDevice;
    appTokens?: {
        [appName: string]: SamsungApp;
    };
}

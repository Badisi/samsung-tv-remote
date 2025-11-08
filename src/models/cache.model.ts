import type { SamsungApp } from './samsung-app.model';
import type { SamsungDevice } from './samsung-device.model';

export interface Cache {
    lastConnectedDevice?: SamsungDevice;
    appTokens?: {
        [appName: string]: SamsungApp;
    };
}

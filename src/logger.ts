export class SamsungTvLogger {
    private _enabled = false;

    public enabled(value: boolean): void {
        this._enabled = value;
    }

    public log(...params: any[]): void {
        if (this._enabled) {
            console.log('[SamsungTvRemote]:', ...params);
        }
    }

    public warn(...params: any[]): void {
        if (this._enabled) {
            console.error('[SamsungTvRemote]:`\x1b[33m', ...params, '\x1b[0m');
        }
    }

    public error(...params: any[]): void {
        if (this._enabled) {
            console.error('[SamsungTvRemote]:\x1b[31m', 'Error:', ...params, '\x1b[0m');
        }
    }
}

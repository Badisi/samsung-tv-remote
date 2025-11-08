const PREFIX = '\x1b[1m\x1b[35m[SamsungTvRemote]\x1b[39m\x1b[22m:';

export class SamsungTvLogger {
    private _enabled = false;

    public enabled(value: boolean): void {
        this._enabled = value;
    }

    public log(...params: any[]): void {
        if (this._enabled) {
            console.log(PREFIX, ...params);
        }
    }

    public warn(...params: any[]): void {
        if (this._enabled) {
            console.error(PREFIX, '\x1b[33m', ...params, '\x1b[0m');
        }
    }

    public error(...params: any[]): void {
        if (this._enabled) {
            console.error(PREFIX, '\x1b[31m', ...params, '\x1b[0m');
        }
    }
}

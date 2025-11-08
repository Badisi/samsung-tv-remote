export const createLogger = (
    prefix = 'SamsungTvRemote',
    level: 'none' | 'debug' | 'info' | 'warn' | 'error' = 'none'
) => {
    const _level = level !== 'none' ? level : (process.env.LOG_LEVEL?.toLowerCase() ?? 'none');
    const _prefix = `\x1b[35m[${prefix}]\x1b[39m:`;

    return {
        debug(...params: unknown[]): void {
            if (['debug'].includes(_level)) {
                console.log(_prefix, ...params);
            }
        },
        info(...params: unknown[]): void {
            if (['debug', 'info'].includes(_level)) {
                console.log(_prefix, ...params);
            }
        },
        warn(...params: unknown[]): void {
            if (['debug', 'info', 'warn'].includes(_level)) {
                console.error(`${_prefix}\x1b[33m`, ...params, '\x1b[39m');
            }
        },
        error(...params: unknown[]): void {
            if (['debug', 'info', 'warn', 'error'].includes(_level)) {
                console.error(`${_prefix}\x1b[31m`, ...params, '\x1b[39m');
            }
        }
    };
};

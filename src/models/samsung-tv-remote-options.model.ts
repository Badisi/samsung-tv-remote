import type { SamsungDevice } from './samsung-device.model';

export interface SamsungTvRemoteOptions {
    /**
     * IP address of the TV to connect to.
     */
    ip: string;

    /**
     * MAC address of the TV to connect to.
     *
     * Required only when using the 'wakeTV()' api.
     *
     * @default 00:00:00:00:00:00
     */
    mac?: string;

    /**
     * A Samsung device to connect to.
     *
     * To be used in replacement of `ip` and `mac` options.
     */
    device?: SamsungDevice;

    /**
     * Name under which the TV will recognize your program.
     *
     * - It will be displayed on TV, the first time you run your program, as a 'device' trying to connect.
     * - It will also be used by this library to persist a token on the operating system running your program,
     *   so that no further consent are asked by the TV after the first run.
     *
     * @default SamsungTvRemote
     */
    name?: string;

    /**
     * Port address used for remote control emulation protocol.
     *
     * Different ports are used in different TV models.
     * @example 55000 (legacy), 8001 (2016+) or 8002 (2018+).
     *
     * @default 8002
     */
    port?: number;

    /**
     * Delay in milliseconds before the connection to the TV times out.
     *
     * @default 5000
     */
    timeout?: number;

    /**
     * Delay in milliseconds between sending key commands.
     *
     * Some TV models or applications may drop key events if they are sent too quickly.
     * Introducing a delay helps ensure reliable key interactions.
     *
     * @default 60
     */
    keysDelay?: number;
}

export interface SamsungTvRemoteOptions {
    /**
     * IP address of the TV.
     */
    ip: string;

    /**
     * MAC address of the TV.
     * Required only when using the 'wakeTV()' api.
     *
     * @default 00:00:00:00:00:00
     */
    mac?: string,

    /**
     * Name under which the TV will recognize your program.
     * - It will be displayed on TV, the first time you run your program, as a 'device' trying to connect.
     * - It will also be used by this library to persist a token on the operating system running your program,
     *   so that no further consent are asked by the TV after the first run.
     *
     * @default SamsungTvRemote
     */
    name?: string,

    /**
     * Port address used for remote control emulation protocol.
     * Different ports are used in different TV models.
     * It could be: 55000 (legacy), 8001 (2016+) or 8002 (2018+).
     *
     * @default 8002
     */
    port?: number,

    /**
     * Milliseconds before the connection to the TV times out.
     *
     * @default 1000
     */
    timeout?: number;

    /**
     * Enables more detailed output.
     *
     * @default false
     */
    debug?: boolean;
};

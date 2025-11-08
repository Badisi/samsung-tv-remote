<h1 align="center">
    samsung-tv-remote
</h1>

<p align="center">
    <i>📺 NodeJS module to remotely control Samsung SmartTV starting from 2016.</i><br/>
</p>

<p align="center">
    <a href="https://www.npmjs.com/package/samsung-tv-remote">
        <img src="https://img.shields.io/npm/v/samsung-tv-remote.svg?color=blue&logo=npm" alt="npm version" /></a>
    <a href="https://npmcharts.com/compare/samsung-tv-remote?minimal=true">
        <img src="https://img.shields.io/npm/dw/samsung-tv-remote.svg?color=7986CB&logo=npm" alt="npm donwloads" /></a>
    <a href="https://github.com/Badisi/samsung-tv-remote/blob/main/LICENSE">
        <img src="https://img.shields.io/npm/l/samsung-tv-remote.svg?color=ff69b4" alt="license" /></a>
</p>

<p align="center">
    <a href="https://github.com/Badisi/samsung-tv-remote/blob/main/CONTRIBUTING.md#-submitting-a-pull-request-pr">
        <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs welcome" /></a>
</p>

<hr/>

## Features

✅ Support **Samsung SmartTV** from `2016+`<br/>
✅ Detect any Samsung TVs awake on the network<br/>
✅ Wake a TV from sleep mode - thanks to `Wake-on-LAN (WoL)`<br/>
✅ Send `one` or `multiple` keys at once to a TV<br/>
✅ [`241`][keys] known keys already predefined<br/>
✅ Works as a `library` and as a `CLI` tool<br/>


## Command line tool

The CLI utility provides an interactive way to control your TV remotely.

```sh
npx samsung-tv-remote
```

![CLI utility preview][clipreview]


## As a package

__Installation__

```sh
npm install samsung-tv-remote --save
```

```sh
yarn add samsung-tv-remote
```

__Example__

```ts
/** CommonJS */
// const { getAwakeSamsungDevices, Keys, SamsungTvRemote, getLastConnectedDevice } = require('samsung-tv-remote');

/** ESM / Typescript */
import { getAwakeSamsungDevices, getLastConnectedDevice, Keys, SamsungTvRemote } from 'samsung-tv-remote';

(async () => {
    let device = getLastConnectedDevice();
    if (!device) {
        const devices = await getAwakeSamsungDevices();
        if (devices.length) {
            device = devices[0];
        }
    }
    if (device) {
        try {
            const remote = new SamsungTvRemote({ device });
            await remote.wakeTV();
            await remote.sendKey(Keys.KEY_DOWN);
            await remote.sendKeys([Keys.KEY_POWER])
            remote.disconnect();
        } catch (error) {
            console.error(error);
        }
    }
})();
```

__Options__

```ts
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
```

__Apis__

```ts
class SamsungTvRemote {
    /**
     * Turns the TV on or awaken it from sleep mode (also called WoL - Wake-on-LAN).
     *
     * The mac address option is required in this case.
     */
    wakeTV(): Promise<void>;

    /**
     * Sends a key to the TV.
     */
    sendKey(key: keyof typeof Keys): Promise<void>;

    /**
     * Sends multiple keys to the TV.
     */
    sendKeys(key: (keyof typeof Keys)[]): Promise<void>;

    /**
     * Closes the connection to the TV.
     *
     * It doesn't shut down the TV - it only closes the connection to it.
     */
    disconnect(): void;
}
```

__Helpers__

```ts
/**
 * Searches for last connected device, if any.
 */
getLastConnectedDevice(): SamsungDevice | undefined;

/**
 * Retrieves a list of Samsung devices that are currently awake and reachable on the network.
 */
getAwakeSamsungDevices(timeout = 500): Promise<SamsungDevice[]>;
```


## Debug

You can enable **verbose mode** to help debug your program.

Set the `LOG_LEVEL` environment variable to one of the supported values: `none`, `debug`, `info`, `warn`, `error`.

#### Example

```sh
# Run your program in debug mode
LOG_LEVEL=debug npm run yourprogram
```


## FAQ

### I'm getting a `TypeError: bufferUtil.mask is not a function`

Under the hood, this library is using [ws](https://github.com/websockets/ws) package and also [bufferutil](https://github.com/websockets/bufferutil) to enhance ws' performances.

Since `bufferutil` is a binary addon, it may or may not be installed correctly on your current platform due to potential incompatibilities.

In such cases, using the environment variable `WS_NO_BUFFER_UTIL=1` will be necessary to resolve the issue.

You can read more [here](https://github.com/websockets/ws/blob/master/doc/ws.md#ws_no_buffer_util).


## Development

See the [developer docs][developer].


## Contributing

#### > Want to Help ?

Want to file a bug, contribute some code or improve documentation ? Excellent!

But please read up first on the guidelines for [contributing][contributing], and learn about submission process, coding rules and more.

#### > Code of Conduct

Please read and follow the [Code of Conduct][codeofconduct] and help me keep this project open and inclusive.




[keys]: https://github.com/Badisi/samsung-tv-remote/blob/main/src/keys.ts
[clipreview]: https://github.com/Badisi/samsung-tv-remote/blob/main/cli_preview.png
[developer]: https://github.com/Badisi/samsung-tv-remote/blob/main/DEVELOPER.md
[contributing]: https://github.com/Badisi/samsung-tv-remote/blob/main/CONTRIBUTING.md
[codeofconduct]: https://github.com/Badisi/samsung-tv-remote/blob/main/CODE_OF_CONDUCT.md

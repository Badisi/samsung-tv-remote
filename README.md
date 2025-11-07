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
✅ Wake TV from sleep mode thanks to `Wake-on-LAN (WoL)`<br/>
✅ Send `one` or `multiple` keys at once to the TV<br/>
✅ [`241`](https://github.com/Badisi/samsung-tv-remote/blob/main/src/keys.ts) known keys already predefined<br/>
✅ Works as a library and as a cli tool<br/>


## Installation

```sh
npm install samsung-tv-remote --save
```

```sh
yarn add samsung-tv-remote
```

## Usage as cli

```sh
npx samsung-tv-remote
```

## Usage as a library

__Example__

```ts
/** CommonJS */
// const { SamsungTvRemote, Keys } = require('samsung-tv-remote');

/** ESM / Typescript */
import { SamsungTvRemote, Keys } from 'samsung-tv-remote';

const main = async () => {
    const remote = new SamsungTvRemote({
        ip: '192.168.1.111',
        mac: 'fc:03:9f:0d:72:37'
    });
    await remote.wakeTV();
    await remote.sendKey(Keys.KEY_DOWN);
    await remote.sendKeys([Keys.KEY_POWER]);
};
main().catch(console.error);
```

__Options__

```ts
interface SamsungTvRemoteOptions {
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
}
```

__Apis__

```ts
class SamsungTvRemote {
    /**
     * Turn the TV on or awaken it from sleep mode (also called WoL - Wake-on-LAN).
     * The mac address option is required in this case.
     */
    wakeTV(): Promise<void>;

    /**
     * Send a key to the TV.
     */
    sendKey(key: Keys): Promise<void>;

    /**
     * Send multiple keys to the TV.
     */
    sendKeys(key: Keys[]): Promise<void>;
}
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




[clipreview]: https://github.com/Badisi/samsung-tv-remote/blob/main/cli_preview.png
[developer]: https://github.com/Badisi/samsung-tv-remote/blob/main/DEVELOPER.md
[contributing]: https://github.com/Badisi/samsung-tv-remote/blob/main/CONTRIBUTING.md
[codeofconduct]: https://github.com/Badisi/samsung-tv-remote/blob/main/CODE_OF_CONDUCT.md

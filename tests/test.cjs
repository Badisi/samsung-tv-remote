// @ts-check
const { SamsungTvRemote, Keys } = require('../dist');

(async () => {
    const remote = new SamsungTvRemote({
        ip: '192.168.1.111',
        mac: 'fc:03:9f:0d:72:37',
        debug: false
    });
    await remote.wakeTV();
    await remote.sendKey(Keys.KEY_DOWN);
})();

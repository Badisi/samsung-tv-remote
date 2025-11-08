// @ts-check

const { getAwakeSamsungDevices, Keys, SamsungTvRemote, getLastConnectedDevice } = require('../dist');

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
            await remote.sendKeys([Keys.KEY_RIGHT, Keys.KEY_RIGHT, Keys.KEY_RIGHT, Keys.KEY_RIGHT]);
            remote.disconnect();
        } catch (error) {
            console.error(error);
        }
    }
})();

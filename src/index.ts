/**
 *  samsung-tv-remote
 *  Remote client for Samsung SmartTV starting from 2016
 *
 *  @author Badisi
 *  @license Released under the MIT license
 *
 *  https://github.com/Badisi/samsung-tv-remote
 */

export { getAwakeSamsungDevices, getLastConnectedDevice } from './discovery.js';
export { Keys } from './keys.js';
export type { SamsungDevice, SamsungTvRemoteOptions } from './models/index.js';
export { SamsungTvRemote } from './remote.js';

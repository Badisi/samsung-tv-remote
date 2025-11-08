/**
 *  samsung-tv-remote
 *  Remote client for Samsung SmartTV starting from 2016
 *
 *  @author Badisi
 *  @license Released under the MIT license
 *
 *  https://github.com/Badisi/samsung-tv-remote
 */

export { getAwakeSamsungDevices, getLastConnectedDevice } from './discovery';
export { Keys } from './keys';
export type { SamsungDevice, SamsungTvRemoteOptions } from './models';
export { SamsungTvRemote } from './remote';

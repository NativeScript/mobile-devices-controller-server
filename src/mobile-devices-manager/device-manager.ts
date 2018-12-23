import { IUnitOfWork } from "../db/interfaces/unit-of-work";

import {
    AndroidController,
    IOSController,
    DeviceController,
    IDevice,
    Platform,
    DeviceType,
    Status,
    VirtualDeviceController,
    DeviceSignal
} from "mobile-devices-controller";
import { logWarn, logInfo, logError } from "../utils/utils";
import { interval, Subscription } from 'rxjs';
import { skipWhile, exhaustMap } from 'rxjs/operators';
import { spawnSync } from "child_process";

export const isProcessAlive = (arg: number) => {
    const result = spawnSync(`/bin/ps aux`, [`| grep -i ${arg} | grep -v grep | awk '{print $2}'`], {
        shell: true
    });
    console.log("Process check:", result.output.toString());
    const test = !result.output.every(output => !output || output.length === 0)
        && result.output
            .filter(output => output && output.length > 0)
            .every(f => {
                return new RegExp(arg.toString().trim()).test(f + "");
            });
    return test;
}

export const filterOptions = options => {
    Object.keys(options).forEach(key => !options[key] && delete options[key]);
    return options;
};

export class DeviceManager {
    [verbose: string]: any;

    private _usedDevices: Map<string, number>;
    private _usedVirtualDevices: Map<string, VirtualDeviceController>;
    private _dontCheckForDevice: boolean;

    public intervalSubscriber: Subscription;

    constructor(private _unitOfWork: IUnitOfWork, private _maxLiveDevicesCount: { iosCount: number, androidCount: number } = { iosCount: 1, androidCount: 1 }) {
        this._usedDevices = new Map<string, number>();
        this._usedVirtualDevices = new Map<string, VirtualDeviceController>();
        this._dontCheckForDevice = false;
        this.checkForNewDevices();
    }

    public async attachToDevice(query) {
        const simulators = await this._unitOfWork.devices.find(query);
        const attachedDevices = new Array<IDevice>();

        for (var index = 0; index < simulators.length; index++) {
            let device: IDevice = simulators[index];

            let virtualDeviceController;
            if (this._usedVirtualDevices.has(device.token)) {
                virtualDeviceController = this._usedVirtualDevices.get(device.token);
                device = await virtualDeviceController.attachToDevice(device);
            } else {
                virtualDeviceController = new VirtualDeviceController(device.platform);
                device = await virtualDeviceController.attachToDevice(device);
                this.addVirtualDevice(virtualDeviceController);

                virtualDeviceController.virtualDevice.once(DeviceSignal.onDeviceKilledSignal, async (device: IDevice) => {
                    await this.markAsShutdown(device);
                    this.removeVirtualDevice(device.token);
                });

                virtualDeviceController.virtualDevice.once(DeviceSignal.onDeviceErrorSignal, async (device: IDevice) => {
                });

                virtualDeviceController.virtualDevice.once(DeviceSignal.onDeviceKilledSignal, async (device: IDevice) => {
                });
            }

            virtualDeviceController.virtualDevice.once(DeviceSignal.onDeviceAttachedSignal, async (device: IDevice) => {
                console.log("Attached device: ", device);
            });

            attachedDevices.push(device);
        }
        return attachedDevices;
    }

    public async boot(query, count, shouldUpdate = true) {
        this._dontCheckForDevice = true;
        const options = query.options;
        delete query.options;

        const simulators = await this._unitOfWork.devices.find(query);
        const maxDevicesToBoot = Math.min(simulators.length, parseInt(count || 1));
        const startedDevices = new Array<IDevice>();

        for (var index = 0; index < maxDevicesToBoot; index++) {
            let device: IDevice = simulators[index];
            const virtualDeviceController = new VirtualDeviceController(device.platform);
            const token = device.token;
            const bootedDevice = await virtualDeviceController.startDevice(device, options);
            if (bootedDevice.token !== token) {
                await this._unitOfWork.devices.updateById(device, { token: bootedDevice.token, status: bootedDevice.status });
            }
            this.addVirtualDevice(virtualDeviceController);

            virtualDeviceController.virtualDevice.once(DeviceSignal.onDeviceKilledSignal, async (d: IDevice) => {
                await this.markAsShutdown(d);
                this.removeVirtualDevice(d.token);
            });

            virtualDeviceController.virtualDevice.once(DeviceSignal.onDeviceErrorSignal, async (device: IDevice) => {
            });

            virtualDeviceController.virtualDevice.once(DeviceSignal.onDeviceKilledSignal, async (device: IDevice) => {
            });

            if (shouldUpdate) {
                const result = await this._unitOfWork.devices.update(bootedDevice.token, device);
            }
            startedDevices.push(bootedDevice);
        }

        this._dontCheckForDevice = false;

        return startedDevices;
    }

    public async subscribeForDevice(query): Promise<IDevice> {
        const shouldRestartDevice = !!query.restart;
        delete query.restart;
        let searchQuery: IDevice = DeviceManager.convertIDeviceToQuery(query);
        delete searchQuery.info;
        searchQuery.status = Status.BOOTED;

        // get already booted device in order to reuse
        const parentPid = searchQuery.parentProcessPid;
        delete searchQuery.parentProcessPid;
        let device = await this._unitOfWork.devices.findSingle(searchQuery);
        if (shouldRestartDevice && device) {
            logInfo("Should restart device flag passed!")
            this.killDevice(device);
            device = undefined;
        }

        searchQuery.status = Status.BUSY;
        let busyDevices = await this._unitOfWork.devices.find(searchQuery);
        for (let index = 0; index < busyDevices.length; index++) {
            const element: IDevice = busyDevices[index];
            if (element.parentProcessPid && !isProcessAlive(element.parentProcessPid)) {
                logInfo(`Process ${element.parentProcessPid} should be not alive!`);
                logInfo(`Killing ${element.name}/ ${element.token}!`);
                await this.killDevice(element);
            }
        }

        if (!device) {
            this._dontCheckForDevice = true;
            searchQuery.status = Status.SHUTDOWN;
            device = await this._unitOfWork.devices.findSingle(searchQuery);

            if (device) {
                device.info = query.info;
                device.parentProcessPid = parentPid;
                const update = await this.mark(device);
                device.busySince = update.busySince;
                device.status = <Status>update.status;
                const deviceToBoot: IDevice = {
                    token: device.token,
                    type: device.type,
                    name: device.name,
                    apiLevel: device.apiLevel,
                    platform: device.platform
                };
                const bootedDevice = (await this.boot(deviceToBoot, 1, false))[0];
                device.token = bootedDevice.token;
                device.startedAt = bootedDevice.startedAt;
                device.busySince = bootedDevice.startedAt;
                device.status = bootedDevice.status;
                device.pid = bootedDevice.pid;
                device.parentProcessPid = parentPid;
                this.resetUsage(device);

                if (!device) {
                    delete searchQuery.status;
                    await this.unMark(searchQuery);
                }
            }
        }

        if (device) {
            device.info = query.info;
            device.parentProcessPid = parentPid;
            const update = await this.mark(device);
            device.busySince = update.busySince;
            device.status = update.status;
            await this._unitOfWork.devices.update(device.token, device);
            device = await this._unitOfWork.devices.findByToken(device.token);
            this.increaseDevicesUsage(device);
        } else {
            device = await this.unMark(device);
        }

        if (!device) {
            logError("Could not find device", searchQuery);
            return device;
        }

        if (device && (device.type === DeviceType.EMULATOR || device.platform === Platform.ANDROID)) {
            if (!AndroidController.checkIfEmulatorIsResponding(device)) {
                logWarn(`Rebooting device: ${device.name} ${device.token} on ${new Date(Date.now())} since error message is detected!`);
                AndroidController.reboot(device);
                logInfo(`On: ${new Date(Date.now())} device: ${device.name} ${device.token} is rebooted!`);
            }
        }

        this._dontCheckForDevice = false;

        return <IDevice>device;
    }

    public async unsubscribeFromDevice(query): Promise<IDevice> {
        const device = await this._unitOfWork.devices.findByToken(query.token);
        let result;
        if (device) {
            device.busySince = -1;
            device.info = undefined;
            if (device.status !== Status.SHUTDOWN) {
                device.status = Status.BOOTED;
            }

            result = await this.unMark(device);
        }

        await this.resetDevicesCountToMaxLimitedCount(device);

        return result;
    }

    public async killDevices(query?) {
        const updateQuery = DeviceManager.convertIDeviceToQuery(query || {});
        updateQuery.status = Status.SHUTDOWN;
        updateQuery.startedAt = -1;
        updateQuery.busySince = -1;

        if (!query) {
            await this._unitOfWork.devices.dropDb();
            IOSController.killAll();
            await this.refreshData({ platform: Platform.IOS }, updateQuery);
            AndroidController.killAll();
            await this.refreshData({ platform: Platform.ANDROID }, updateQuery);
            return this._unitOfWork.devices.find(updateQuery);
        } else {
            const devices = await this._unitOfWork.devices.find(query);
            for (let index = 0; index < devices.length; index++) {
                const element = devices[index];
                await this.killDevice(element);
            }
        }

        await this.refreshData(query, updateQuery);
    }

    public async refreshData(query, updateQuery) {
        return new Promise(async (resolve, reject) => {
            const parsedDevices = await DeviceController.getDevices(query);

            const devices = new Array();
            parsedDevices.forEach(device => {
                devices.push(DeviceManager.deviceToJSON(device));
            });

            await this._unitOfWork.devices.deleteMany(query);
            await this._unitOfWork.devices.addMany(devices);
            const result = await this._unitOfWork.devices.find(updateQuery);
            const bootedDevices = result.filter(d => d.status === Status.BOOTED);
            for (let index = 0; index < bootedDevices.length; index++) {
                const element = bootedDevices[index];
                await this.attachToDevice(element);
            }

            resolve(result);
        });
    }

    public async dropDB() {
        await this._unitOfWork.devices.dropDb();
        return await this.refreshData({}, {});
    }

    public async update(token, updateQuery) {
        return await this._unitOfWork.devices.update(token, updateQuery)
    }

    private getMaxDeviceCount(query) {
        const maxAndroidDeviceCount = process.env['MAX_EMU_COUNT'] || this._maxLiveDevicesCount.androidCount;
        const maxIOSDeviceCount = process.env['MAX_SIM_COUNT'] || this._maxLiveDevicesCount.iosCount;
        const maxDevicesCount = (query.type === DeviceType.EMULATOR || query.platform === Platform.ANDROID) ? maxAndroidDeviceCount : maxIOSDeviceCount;
        console.log(`Max device count allowed ${maxDevicesCount}`)
        return maxDevicesCount
    }

    private async resetDevicesCountToMaxLimitedCount(query) {
        const queryByPlatform = <IDevice>{ "platform": query.platform };

        queryByPlatform.status = Status.BOOTED;
        let bootedDevices = await this._unitOfWork.devices.find(queryByPlatform);
        logInfo(`Booted device count by: `, queryByPlatform);
        console.log(bootedDevices.length);

        queryByPlatform.status = Status.BUSY;
        let busyDevices = await this._unitOfWork.devices.find(queryByPlatform);
        logInfo(`Busy device count by: `, queryByPlatform);
        console.log(busyDevices.length);

        const devicesOverLimit = bootedDevices.filter(d => this.checkDeviceUsageHasReachedLimit(d));
        const devicesToKill = new Array();
        for (let index = 0; index < devicesOverLimit.length; index++) {
            const element = bootedDevices[index];
            logWarn(`${element.name}\ ${element.token} usage has reached the limit!`);
            await this.killDevice(element);
            this.resetUsage(element);
            devicesToKill.push(element);
        }

        if (devicesToKill.length > 0) {
            query.status = Status.BOOTED;
            bootedDevices = await this._unitOfWork.devices.find(query);
            logInfo(`Booted devices count after reset by ${query}: ${bootedDevices.length}`);
        }

        const maxDevicesCount = this.getMaxDeviceCount(query);
        if (busyDevices.length > maxDevicesCount) {
            logInfo("MAX device count: ", maxDevicesCount);
            logError(`MAX DEVICE COUNT  BY "${query.platform}" REACHED!!!`);
        }

        if (bootedDevices.length + busyDevices.length >= maxDevicesCount) {
            logWarn(`
                Max device count by ${query.platform} reached!!!
                Devices count: ${bootedDevices.length + busyDevices.length} >= max device count allowed: ${maxDevicesCount}!!!
            `);
            const devicesToKill = new Array();
            bootedDevices.forEach(d => devicesToKill.push({ name: d.name, token: d.token }));
            if (bootedDevices.length > 0) {
                logWarn(`Killing all booted device by query: ${query.platform}!!!`);
                devicesToKill.forEach(o => console.log("Device: ", o));
                for (let index = 0; index < bootedDevices.length; index++) {
                    const element = bootedDevices[index];
                    await this.killDevice(element);
                }

                bootedDevices = (await this._unitOfWork.devices.find({ "platform": query.platform, status: Status.BOOTED }));
                logInfo(`Booted device count after update by ${queryByPlatform.platform}: ${bootedDevices.length}`);
            } else {
                logWarn(`No free devices to kill. Probably all devices are with status BUSY!!!`);
            }
        }
    }

    // private killOverUsedBusyDevices(devices) {
    //     const updatedDevice = new Array();
    //     for (let index = 0; index < devices.length; index++) {
    //         const element = devices[index];
    //         const twoHours = 7200000;
    //         if (element.busySince && element.startedAt && element.startedAt - element.busySince > twoHours) {
    //             logWarn(`Killing device, since it has been BUSY more than ${twoHours}`);
    //             this.killDevice(element);
    //             updatedDevice.push(element);
    //         }
    //     }

    //     return updatedDevice;
    // }

    public async killDevice(device: IDevice) {
        logWarn("Killing device", device);
        const virtualDevice = this._usedVirtualDevices.get(device.token);
        if (virtualDevice) {
            virtualDevice.virtualDevice.removeAllListeners();
            this._usedVirtualDevices.delete(device.token);
            await virtualDevice.stopDevice();
        } else {
            await DeviceController.kill(device);
        }

        await this.markAsShutdown(device);
    }

    public async cleanListeners() {
        this.intervalSubscriber.unsubscribe();
        this._usedVirtualDevices.forEach((v, k, ds) => {
            v.virtualDevice.removeAllListeners();
        });
    }

    private async markAsShutdown(device: IDevice) {
        const updateQuery: any = {};
        updateQuery['status'] = Status.SHUTDOWN;
        updateQuery['startedAt'] = -1;
        updateQuery['busySince'] = -1;
        const log = await this._unitOfWork.devices.update(device.token, updateQuery);
        logInfo(`On device killed: `, log);
    }

    private async mark(query): Promise<IDevice> {
        const searchQuery: IDevice = {};
        searchQuery.token = query.token;
        searchQuery.parentProcessPid = query.parentProcessPid;
        searchQuery.status = Status.BUSY;
        searchQuery.busySince = Date.now();
        const result = await this._unitOfWork.devices.update(searchQuery.token, searchQuery);
        return searchQuery;
    }

    private async unMark(query) {
        if (!query || !query['token']) return;
        const searchQuery: IDevice = query;
        searchQuery.token = query.token;
        searchQuery.busySince = -1;
        searchQuery.info = undefined;
        searchQuery.parentProcessPid = undefined;
        if (query.status) {
            searchQuery.status = query.status;
        } else {
            searchQuery.status = Status.BOOTED;
        }
        const result = await this._unitOfWork.devices.update(searchQuery.token, searchQuery);

        const device = await this._unitOfWork.devices.findByToken(query.token);
        return device;
    }

    private static deviceToJSON(device: IDevice) {
        return {
            name: device.name,
            token: device.token,
            status: device.status,
            startedAt: device.startedAt,
            busySince: device.busySince,
            type: device.type,
            platform: device.platform,
            info: device.info,
            config: device.config,
            apiLevel: device.apiLevel,
            process: device.process,
            pid: device.pid
        };
    }

    private static convertIDeviceToQuery(from: any) {
        let to: any = {};
        Object.getOwnPropertyNames(from).forEach((prop) => {
            if (from[prop]) {
                const propName = prop.startsWith('_') ? prop.replace('_', '') : prop;
                //const propName = prop.startsWith("_") ? prop : "_" + prop;
                to[propName] = from[prop];
            }
        });

        return to;
    }

    private increaseDevicesUsage(device: IDevice) {
        if (!this._usedDevices.has(device.token)) {
            this._usedDevices.set(device.token, 0);
        }
        const counter = this._usedDevices.get(device.token) + 1;
        this._usedDevices.set(device.token, counter);
    }

    private resetUsage(device: IDevice) {
        this._usedDevices.set(device.token, 0);
    }

    private checkDeviceUsageHasReachedLimit(device: IDevice): boolean {
        const limitCount = (device.type === DeviceType.EMULATOR || device.platform === Platform.ANDROID) ? DeviceManager.getEmuUsageLimit() : DeviceManager.getSimUsageLimit();
        if (this._usedDevices.has(device.token) === false || this._usedDevices.get(device.token) === 0) {
            return false;
        }

        console.log(`Device: ${device.token} usage limit: ${limitCount}`)
        return this._usedDevices.get(device.token) >= limitCount ? true : false;
    }

    private static getEmuUsageLimit() {
        return process.env["EMU_USAGE_LIMIT"] || 1;
    }

    private static getSimUsageLimit() {
        return process.env["SIM_USAGE_LIMIT"] || 10;
    }

    private removeVirtualDevice(token) {
        if (this._usedVirtualDevices.has(token)) {
            this._usedVirtualDevices.delete(token);
        }
    }

    private addVirtualDevice(virtualDevice: VirtualDeviceController) {
        this._usedVirtualDevices.set(virtualDevice.virtualDevice.device.token, virtualDevice);
    }

    public async checkForNewDevices() {
        const interval$ = interval(5000);
        this.intervalSubscriber = interval$.pipe(
            skipWhile(() => this._dontCheckForDevice),
            exhaustMap(() => DeviceController.getRunningDevices(false)))
            .subscribe(async (runningDevices: IDevice[]) => {
                for (let index = 0; index < runningDevices.length; index++) {
                    const runningDevice = runningDevices[index];
                    // console.log(`Running devices: ${runningDevice.token}/ ${runningDevice.name}`);
                    if (this._dontCheckForDevice) return;
                    const device = await this._unitOfWork.devices.findSingle(<any>{ name: runningDevice.name, token: runningDevice.token });
                    if (!device || device.status === Status.SHUTDOWN) {
                        if (runningDevice.platform === Platform.ANDROID) {
                            const alreadyExists = await this._unitOfWork.devices.findByToken(runningDevice.token);
                            if (alreadyExists) {
                                const allRunningDevicesByAndroid = await this._unitOfWork.devices.find(<any>{ platform: Platform.ANDROID, type: DeviceType.EMULATOR });
                                const tokens = allRunningDevicesByAndroid.map(d => +d.token);
                                tokens.push(+runningDevice.token);
                                const token = AndroidController.getTokenForEmulator(tokens);
                                const oldToken = alreadyExists.token;
                                alreadyExists.token = `${token}`;
                                await this._unitOfWork.devices.update(oldToken, alreadyExists)
                            }
                            await this._unitOfWork.devices.updateByName(runningDevice.name, runningDevice).then(r => console.log("updated: ", r));
                        } else {
                            try {
                                await this._unitOfWork.devices.update(runningDevice.token, <any>runningDevice).then(r => console.log("updated: ", r));
                            } catch (error) {

                            }
                        }

                        const newDeviceQuery: any = {};
                        if (runningDevice.name) newDeviceQuery["name"] = runningDevice.name;
                        if (runningDevice.token) newDeviceQuery["token"] = runningDevice.token;
                        if (runningDevice.apiLevel) newDeviceQuery["apiLevel"] = runningDevice.apiLevel;
                        if (runningDevice.platform) newDeviceQuery["platform"] = runningDevice.platform;
                        if (runningDevice.type) newDeviceQuery["type"] = runningDevice.type;

                        await this.attachToDevice(newDeviceQuery);
                    }
                }
            })
    }
}
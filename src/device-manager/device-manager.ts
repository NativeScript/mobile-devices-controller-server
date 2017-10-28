import * as d from "../../models/interfaces/device";
import { IUnitOfWork } from "../../db/interfaces/unit-of-work";

import {
    AndroidManager,
    IOSManager,
    Device,
    IDevice,
    Platform,
    DeviceType,
    Status
} from "mobile-devices-controller";

export class DeviceManager {

    constructor() { }

    public static async bootDevices(repository: IUnitOfWork) {
        const simsCount = process.env.MAX_IOS_DEVICES_COUNT;
        const emusCount = process.env.MAX_ANDROID_DEVICES_COUNT;
        const simName = process.env.SIM_NAMES;
        const emuName = process.env.EMU_NAMES;
        let query = {
            "name": { "$regex": simName, "$options": "i" },
            "type": DeviceType.SIMULATOR,
        };
        await DeviceManager.boot(repository, query, simsCount);

        query.type = DeviceType.EMULATOR;
        await DeviceManager.boot(repository, query, emusCount);
    }

    public static async boot(repository: IUnitOfWork, query, count) {
        query.status = Status.SHUTDOWN;
        let simulators = await repository.devices.find(query);

        const maxDevicesToBoot = Math.min(simulators.length, parseInt(count || 1));
        const startedDevices = new Array<d.IDevice>();
        for (var index = 0; index < maxDevicesToBoot; index++) {
            let device: d.IDevice = simulators[index];
            if (device.type === DeviceType.SIMULATOR) {
                device = await IOSManager.startSimulator(DeviceManager.copyIDeviceModelToDevice(device));
            } else if (device.type === DeviceType.EMULATOR) {
                device = await AndroidManager.startEmulator(DeviceManager.copyIDeviceModelToDevice(device));
            }
            const json = (<Device>device).toJson();
            const result = await repository.devices.update(device.token, json);
            startedDevices.push(device);
        }

        return startedDevices;
    }

    public static async subscribeDevice(platform, deviceType, app, apiLevel, deviceName, repository: IUnitOfWork) {
        const status = Status.BOOTED;
        const searchQuery = {
            "platform": platform,
            "name": deviceName,
            "type": deviceType,
            "status": status,
            "apiLevel": apiLevel,
        };
        let devices = await repository.devices.find(searchQuery);

        let device = null;
        const count = deviceType === Platform.ANDROID ? process.env.MAX_ANDROID_DEVICES_COUNT : process.env.MAX_IOS_DEVICES_COUNT || 1
        let busyDevices = 0;
        if (devices.length === 0) {
            busyDevices = (await repository.devices.find(searchQuery)).length;

            if (busyDevices < count) {
                devices = await DeviceManager.boot(repository, searchQuery, 1);
                searchQuery.status = Status.BOOTED;
            }
        }

        if (devices && devices.length > 0 && busyDevices < count) {
            device = devices[0];
            (await repository.devices.update(device, {
                "status": Status.BUSY,
                "busySince": Date.now(),
                "info": app
            }));

            return device;
        }

        return device;
    }

    public static async update(repository: IUnitOfWork, searchQuery, udpateQuery) {
        const searchedObj = {};
        searchQuery.split("&").forEach(element => {
            let delimiter = "="
            if (element.includes(":")) {
                delimiter = ":";
            }

            const args = element.split(delimiter);
            searchedObj[args[0]] = args[1];
        });

        const simulators = await repository.devices.find(searchedObj);
        const updatedSimulators = new Array();
        for (var index = 0; index < simulators.length; index++) {
            const sim = simulators[index];
            await repository.devices.update(sim.token, udpateQuery)
            updatedSimulators.push(await repository.devices.find({ "token": sim.token }));
        }

        return updatedSimulators;
    }

    public static getIOSDevices() {
        return IOSManager.getAllDevices();
    }

    public static getAndroidDevices() {
        return AndroidManager.getAllDevices();
    }

    public static async killDevice(obj, repository: IUnitOfWork) {
        const devices = await repository.devices.find(obj);
        devices.forEach(async (device) => {
            await DeviceManager.killDeviceSingle(device, repository);
        });
    }

    public static async killDeviceSingle(device: d.IDevice, repository: IUnitOfWork) {
        if (device.type === DeviceType.SIMULATOR || device.platform === Platform.IOS) {
            IOSManager.kill(device.token.toString());
        } else {
            AndroidManager.kill(DeviceManager.copyIDeviceModelToDevice(device));
        }

        device.status = Status.SHUTDOWN;
        device.startedAt = -1;
        device.token = "";
        const tempQuery: any = (<Device>device).toJson();
        tempQuery.startedUsageAt = -1;
        tempQuery.holder = -1;

        const log = await repository.devices.update(device.token, (<Device>device).toJson());
        console.log(log);
    }

    public static async killAll(repository: IUnitOfWork, type?: string) {
        if (!type) {
            await repository.devices.dropDb();

            IOSManager.killAll();
            await DeviceManager.loadDBWithIOSDevices(repository);

            AndroidManager.killAll();
            await DeviceManager.loadDBWithAndroidDevices(repository);
        } else {
            if (type.includes("ios")) {
                IOSManager.killAll();
                await DeviceManager.loadDBWithIOSDevices(repository);
            }

            if (type.includes("android")) {
                AndroidManager.killAll();
                await DeviceManager.loadDBWithAndroidDevices(repository);
            }
        }
    }

    public static async refreshData(repository: IUnitOfWork, request) {
        await repository.devices.remove(request);

        if (!request.type || request.type.includes("ios")) {
            await DeviceManager.loadDBWithIOSDevices(repository);
        }

        if (!request.type || request.type.includes("android")) {
            await DeviceManager.loadDBWithAndroidDevices(repository);
        }

        const devices = await repository.devices.find();

        return devices;
    }

    public static checkDeviceStatus(repository: IUnitOfWork, maxUsageTime) {
        setInterval(async () => {
            const devices = await repository.devices.find({ "startedAt": "gt :0" });
            devices.forEach(async (device) => {
                const now = Date.now();
                if (now - device.startedAt > maxUsageTime) {
                    await DeviceManager.killDeviceSingle(device, repository);
                    await DeviceManager.boot(repository, { "name": device.name }, 1);
                }
            });
        }, 300000);
    }

    private static copyIDeviceModelToDevice(deviceModel: d.IDevice, device?: Device): IDevice {
        if (!device) {
            device = new Device(
                DeviceManager.stringObjToPrimitiveConverter(deviceModel.name),
                DeviceManager.stringObjToPrimitiveConverter(deviceModel.apiLevel),
                DeviceManager.stringObjToPrimitiveConverter(deviceModel.type),
                DeviceManager.stringObjToPrimitiveConverter(deviceModel.platform),
                DeviceManager.stringObjToPrimitiveConverter(deviceModel.token),
                DeviceManager.stringObjToPrimitiveConverter(deviceModel.status),
                deviceModel.pid)
        } else {
            device.name = DeviceManager.stringObjToPrimitiveConverter(deviceModel.name);
            device.pid = deviceModel.pid;
            device.startedAt = deviceModel.startedAt;
            device.status = DeviceManager.stringObjToPrimitiveConverter(deviceModel.status);
            device.token = DeviceManager.stringObjToPrimitiveConverter(deviceModel.token);
            device.type = DeviceManager.stringObjToPrimitiveConverter(deviceModel.type);
            device.platform = DeviceManager.stringObjToPrimitiveConverter(deviceModel.platform);
            device.apiLevel = DeviceManager.stringObjToPrimitiveConverter(deviceModel.apiLevel);
        }

        return device;
    }

    private static copyDeviceToIDeviceModel(device: Device, deviceModel: d.IDevice) {
        deviceModel.name = device.name;
        deviceModel.pid = device.pid;
        deviceModel.startedAt = device.startedAt;
        deviceModel.status = device.status.toString();
        deviceModel.token = device.token.toString();
        deviceModel.type = device.type;
        deviceModel.apiLevel = device.apiLevel;
    }

    private static stringObjToPrimitiveConverter(obj: String) {
        let value: any = undefined;
        if (obj) {
            value = obj + "";
        }
        return value;
    }

    private static async loadDBWithAndroidDevices(repository: IUnitOfWork) {
        (await DeviceManager.getAndroidDevices()).forEach(async (devices) => {
            devices.forEach(async (device) => {
                await DeviceManager.createModel(repository, device);
            });
        });
    }

    private static loadDBWithIOSDevices(repository: IUnitOfWork) {
        DeviceManager.getIOSDevices().forEach(async (devices) => {
            devices.forEach(async (device) => {
                await DeviceManager.createModel(repository, device);
            });
        });
    }

    private static async createModel(repository: IUnitOfWork, device: IDevice) {
        await repository.devices.add({
            name: device.name,
            token: device.token,
            status: device.status,
            startedAt: device.startedAt,
            busySince: device.busySince,
            type: device.type,
            platform: device.platform,
            info: device.info,
            config: device.config,
            apiLevel: device.apiLevel
        });
    }
}
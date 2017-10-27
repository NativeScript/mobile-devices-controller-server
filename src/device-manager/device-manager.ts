import * as childProcess from "child_process";
import { IModel } from "../models/model";
import { IDeviceModel } from "../models/device";
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

    public static async bootDevices(model) {
        const simsCount = process.env.MAX_IOS_DEVICES_COUNT;
        const emusCount = process.env.MAX_ANDROID_DEVICES_COUNT;
        const simName = process.env.SIM_NAMES;
        const emuName = process.env.EMU_NAMES;
        let query = {
            "name": { "$regex": simName, "$options": "i" },
            "type": DeviceType.SIMULATOR,
        };
        await DeviceManager.boot(model, query, simsCount);

        query.type = DeviceType.EMULATOR;
        await DeviceManager.boot(model, query, emusCount);
    }

    public static async boot(model: IModel, query, count) {
        query.status = Status.SHUTDOWN;
        let simulators = await DeviceManager.findDevices(model, query);

        const maxDevicesToBoot = Math.min(simulators.length, parseInt(count || 1));
        const startedDevices = new Array();
        for (var index = 0; index < maxDevicesToBoot; index++) {
            const sim = simulators[index];
            let device = DeviceManager.copyIDeviceModelToDevice(sim);
            if (device.type === DeviceType.SIMULATOR) {
                device = await IOSManager.startSimulator(device);
            } else if (device.type === DeviceType.EMULATOR) {
                device = await AndroidManager.startEmulator(device);
            }
            const json = (<Device>device).toJson();
            const result = model.device.update(sim, json);
            startedDevices.push(device);
        }

        return startedDevices;
    }

    public static async subscribeDevice(platform, deviceType, app, apiLevel, model) {
        const status = Status.SHUTDOWN;
        const devices = await DeviceManager.findDevices(model, {
            "platform": platform,
            "type": deviceType,
            "status": status,
            "apiLevel": apiLevel,
        });

        if (devices && devices.length > 0) {
            let device = devices[0];
            (await model.device.update(device, {
                "status": Status.BUSY,
                "busySince": Date.now(),
                "info": app
            }));
            return device;
        }
    }

    public static async update(model: IModel, searchQuery, udpateQuery) {
        const searchedObj: any = {};
        searchQuery.split(",").forEach(element => {
            let delimiter = "="
            if (element.includes(":")) {
                delimiter = ":";
            }

            const args = element.split(delimiter);
            for (let index = 0; index < args.length - 1; index++) {
                searchedObj[args[index]] = args[index + 1];
            }
        });

        let simulators;
        if (searchedObj.hasOwnProperty("id")) {
            simulators = await model.device.findById(searchedObj["id"]);
        } else {
            simulators = await model.device.find(searchedObj);
        }

        for (var index = 0; index < simulators.length; index++) {
            const sim = simulators[index];
            await model.device.update(sim, udpateQuery);
        }

        return simulators;
    }

    public static getIOSDevices() {
        return IOSManager.getAllDevices();
    }

    public static getAndroidDevices() {
        return AndroidManager.getAllDevices();
    }

    public static async killDevice(obj, model: IModel) {
        const devices = await model.device.find(obj);
        devices.forEach(async (device) => {
            await DeviceManager.killDeviceSingle(device, model);
        });
    }

    public static async killDeviceSingle(device: IDeviceModel, model) {
        const sim = DeviceManager.copyIDeviceModelToDevice(device);
        if (device.type === DeviceType.SIMULATOR || device.platform === Platform.IOS) {
            IOSManager.kill(sim.token.toString());
        } else {
            AndroidManager.kill(sim);
        }

        sim.status = Status.SHUTDOWN;
        sim.startedAt = -1;
        sim.token = "";
        const tempQuery: any = (<Device>sim).toJson();
        tempQuery.startedUsageAt = -1;
        tempQuery.holder = -1;

        const log = await model.device.update(device, (<Device>sim).toJson());
        console.log(log);
    }

    public static async killAll(model: IModel, type?: string) {
        if (!type) {
            await model.device.db.dropDatabase();

            IOSManager.killAll();
            await DeviceManager.loadDBWithIOSDevices(model);

            AndroidManager.killAll();
            await DeviceManager.loadDBWithAndroidDevices(model);
        }
        if (type.includes("ios")) {
            IOSManager.killAll();
            await DeviceManager.loadDBWithIOSDevices(model);
        }

        if (type.includes("android")) {
            AndroidManager.killAll();
            await DeviceManager.loadDBWithAndroidDevices(model);
        }
    }

    public static async refreshData(model: IModel, request) {
        await model.device.remove(request);

        if (!request.type || request.type.includes("ios")) {
            await DeviceManager.loadDBWithIOSDevices(model);
        }

        if (!request.type || request.type.includes("android")) {
            await DeviceManager.loadDBWithAndroidDevices(model);
        }
    }

    public static checkDeviceStatus(model: IModel, maxUsageTime) {
        setInterval(async () => {
            const devices = await model.device.find().where("startedAt").gt(0);
            devices.forEach(async (device) => {
                const now = Date.now();
                if (now - device.startedAt > maxUsageTime) {
                    await DeviceManager.killDeviceSingle(device, model);
                    await DeviceManager.boot(model, { "name": device.name }, 1);
                }
            });
        }, 300000);
    }

    private static async findDevices(model: IModel, query) {
        const simulators = await model.device.find(query);

        return simulators;
    }

    private static copyIDeviceModelToDevice(deviceModel: IDeviceModel, device?: Device): IDevice {
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

    private static copyDeviceToIDeviceModel(device: Device, deviceModel: IDeviceModel) {
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

    private static async loadDBWithAndroidDevices(model: IModel) {
        (await DeviceManager.getAndroidDevices()).forEach(async (devices) => {
            devices.forEach(async (device) => {
                await DeviceManager.createModel(model, device);
            });
        });
    }

    private static loadDBWithIOSDevices(model: IModel) {
        DeviceManager.getIOSDevices().forEach(async (devices) => {
            devices.forEach(async (device) => {
                await DeviceManager.createModel(model, device);
            });
        });
    }

    private static async createModel(model, device: IDevice) {
        await model.device.create({
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
import { IModel } from "../models/model";
import { IDeviceModel } from "../models/device";
import { IDevice } from "mobile-devices-controller";
export declare class DeviceManager {
    constructor();
    static bootDevices(model: any): Promise<void>;
    static boot(model: IModel, query: any, count: any): Promise<void>;
    static update(model: IModel, searchQuery: any, udpateQuery: any): Promise<any>;
    static getIOSDevices(): Map<string, IDevice[]>;
    static getAndroidDevices(): Map<string, IDevice[]>;
    static killDevice(obj: any, model: IModel): Promise<void>;
    static killDeviceSingle(device: IDeviceModel, model: any): Promise<void>;
    static killAll(model: IModel, type?: string): Promise<void>;
    static refreshData(model: IModel, request: any): Promise<void>;
    static checkDeviceStatus(model: IModel, maxUsageTime: any): void;
    private static findDevices(model, query);
    private static copyIDeviceModelToDevice(deviceModel, device?);
    private static copyDeviceToIDeviceModel(device, deviceModel);
    private static stringObjToPrimitiveConverter(obj);
    private static loadDBWithAndroidDevices(model);
    private static loadDBWithIOSDevices(model);
    private static createModel(model, device);
}

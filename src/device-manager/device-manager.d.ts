import * as d from "../../models/interfaces/device";
import { IUnitOfWork } from "../../db/interfaces/unit-of-work";
import { IDevice } from "mobile-devices-controller";
export declare class DeviceManager {
    constructor();
    static bootDevices(repository: IUnitOfWork): Promise<void>;
    static boot(repository: IUnitOfWork, query: any, count: any): Promise<d.IDevice[]>;
    static subscribeDevice(platform: any, deviceType: any, app: any, apiLevel: any, deviceName: any, repository: IUnitOfWork): Promise<any>;
    static update(repository: IUnitOfWork, searchQuery: any, udpateQuery: any): Promise<any>;
    static getIOSDevices(): Map<string, IDevice[]>;
    static getAndroidDevices(): Promise<Map<string, IDevice[]>>;
    static killDevice(obj: any, repository: IUnitOfWork): Promise<void>;
    static killDeviceSingle(device: d.IDevice, repository: IUnitOfWork): Promise<void>;
    static killAll(repository: IUnitOfWork, type?: string): Promise<void>;
    static refreshData(repository: IUnitOfWork, request: any): Promise<d.IDevice[]>;
    static checkDeviceStatus(repository: IUnitOfWork, maxUsageTime: any): void;
    private static copyIDeviceModelToDevice(deviceModel, device?);
    private static copyDeviceToIDeviceModel(device, deviceModel);
    private static stringObjToPrimitiveConverter(obj);
    private static loadDBWithAndroidDevices(repository);
    private static loadDBWithIOSDevices(repository);
    private static createModel(repository, device);
}

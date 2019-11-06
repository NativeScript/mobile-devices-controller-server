import { IUnitOfWork } from "../db/interfaces/unit-of-work";
import { IDevice } from "mobile-devices-controller";
import { Subscription } from 'rxjs';
export declare class DevicesConfig {
    maxSimulatorsCount?: number;
    maxEmulatorsCount?: number;
    simulatorMaxUsageLimit?: number;
    emulatorMaxUsageLimit?: number;
}
export declare class DeviceManager {
    private _unitOfWork;
    devicesConfig: DevicesConfig;
    [verbose: string]: any;
    private _usedDevices;
    private _usedVirtualDevices;
    private _dontCheckForDevice;
    intervalSubscriber: Subscription;
    constructor(_unitOfWork: IUnitOfWork, devicesConfig?: DevicesConfig);
    readonly usedVirtualDevices: Map<string, any>;
    attachToDevice(query: any): Promise<any[]>;
    boot(query: any, count?: number): Promise<any[]>;
    subscribeForDevice(query: any): Promise<IDevice>;
    unsubscribeFromDevice(query: any): Promise<IDevice>;
    killDevices(query?: any): Promise<void>;
    refreshData(query: any): Promise<any[]>;
    dropDB(): Promise<any[]>;
    update(token: any, updateQuery: any): Promise<any>;
    private onDeviceKilledSignal;
    private onDeviceErrorSignal;
    private onDeviceAttachedSignal;
    private clearBusyDevicesWithoutLivingParent;
    private getMaxDeviceCount;
    private resetDevicesCountToMaxLimitedCount;
    killDevice(device: IDevice): Promise<void>;
    cleanListeners(): Promise<void>;
    private markAsShutdown;
    private mark;
    private unMark;
    private static convertIDeviceToQuery;
    private increaseDevicesUsage;
    private resetUsage;
    private checkDeviceUsageHasReachedLimit;
    private removeVirtualDevice;
    private addVirtualDevice;
    checkForNewDevices(): Promise<void>;
}

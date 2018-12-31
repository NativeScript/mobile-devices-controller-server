import { IUnitOfWork } from "../db/interfaces/unit-of-work";
import { IDevice } from "mobile-devices-controller";
import { Subscription } from 'rxjs';
export declare class DeviceManager {
    private _unitOfWork;
    private _maxLiveDevicesCount;
    [verbose: string]: any;
    private _usedDevices;
    private _usedVirtualDevices;
    private _dontCheckForDevice;
    intervalSubscriber: Subscription;
    constructor(_unitOfWork: IUnitOfWork, _maxLiveDevicesCount?: {
        iosCount: number;
        androidCount: number;
    });
    attachToDevice(query: any): Promise<any[]>;
    boot(query: any, count?: number): Promise<any[]>;
    private clearBusyDevicesWithoutLivingParent;
    subscribeForDevice(query: any): Promise<IDevice>;
    unsubscribeFromDevice(query: any): Promise<IDevice>;
    killDevices(query?: any): Promise<any[]>;
    refreshData(query: any, updateQuery: any): Promise<{}>;
    dropDB(): Promise<{}>;
    update(token: any, updateQuery: any): Promise<any>;
    private onDeviceKilledSignal;
    private onDeviceErrorSignal;
    private onDeviceAttachedSignal;
    private getMaxDeviceCount;
    private resetDevicesCountToMaxLimitedCount;
    killDevice(device: IDevice): Promise<void>;
    cleanListeners(): Promise<void>;
    private markAsShutdown;
    private mark;
    private unMark;
    private static deviceToJSON;
    private static convertIDeviceToQuery;
    private increaseDevicesUsage;
    private resetUsage;
    private checkDeviceUsageHasReachedLimit;
    private static getEmuUsageLimit;
    private static getSimUsageLimit;
    private removeVirtualDevice;
    private addVirtualDevice;
    checkForNewDevices(): Promise<void>;
}

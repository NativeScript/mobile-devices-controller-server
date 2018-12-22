import { IUnitOfWork } from "../interfaces/unit-of-work";
import { IRepository } from "../interfaces/repository";
import { IDeviceModel } from "../interfaces/device-model";
export declare class TestUnitOfWork implements IUnitOfWork {
    private _devices;
    private _context;
    constructor();
    static createConnection(connectionString?: string): Promise<TestUnitOfWork>;
    readonly devices: IRepository<IDeviceModel>;
}

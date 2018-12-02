import { IUnitOfWork } from "../interfaces/unit-of-work";
import { IRepository } from "../interfaces/repository";
import { IDevice } from "mobile-devices-controller";
import { TestRepository } from "./test-repository";

export class TestUnitOfWork implements IUnitOfWork {
    private _devices: IRepository<IDevice>;

    constructor() {
    }

    get devices(): IRepository<IDevice> {
        if (!this._devices) {
            this._devices = new TestRepository<IDevice>();
        }
        return this._devices;
    }
}
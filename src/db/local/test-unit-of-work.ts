import { IDevice } from "mobile-devices-controller";
import { IUnitOfWork } from "../interfaces/unit-of-work";
import { IRepository } from "../interfaces/repository";
import { TestRepository } from "./test-repository";
import { Connection, createConnection } from "mongoose";
import * as schema from "../mongo/schemas/schema";
import { IDeviceModel } from "../interfaces/device-model";
// require('mongoose').Promise = require("q").Promise;

const MONGODB_TEST_CONNECTION: string = "mongodb://127.0.0.1:27017/devices-test";
export class TestUnitOfWork implements IUnitOfWork {
    private _devices: IRepository<IDevice>;
    private _context: Connection;

    constructor() {
    }

    public static async createConnection(connectionString: string = MONGODB_TEST_CONNECTION) {
        const mongoUnitOfWork: TestUnitOfWork = new TestUnitOfWork();
        const options = {
            connectTimeoutMS: 5000,
            reconnectTries: Number.MAX_VALUE,
            autoReconnect: true,
            useNewUrlParser: true,
            promiseLibrary: global.Promise
        };

        mongoUnitOfWork._context = await createConnection(connectionString, options);

        return mongoUnitOfWork;
    }

    get devices(): IRepository<IDevice> {
        if (!this._devices) {
            this._devices = new TestRepository<IDeviceModel>(this._context.model<IDeviceModel>("Device", schema.DeviceSchema));
        }
        return this._devices;
    }

    public async quit(){
        await this._context.close()
    }
}
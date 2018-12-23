import { IUnitOfWork } from "../interfaces/unit-of-work";
import { IRepository } from "../interfaces/repository";
import { IDevice } from "mobile-devices-controller";
import { TestRepository } from "./test-repository";
import { IDeviceModel } from "../interfaces/device-model";
import { Connection, createConnection } from "mongoose";
import * as schema from "../mongo/schemas/schema";
require('mongoose').Promise = require("q").Promise;

const MONGODB_TEST_CONNECTION: string = "mongodb://127.0.0.1:27017/devices-test";
export class TestUnitOfWork implements IUnitOfWork {
    private _devices: IRepository<IDevice>;
    private _context: Connection;

    constructor() {
    }

    public static async createConnection(connectionString: string = MONGODB_TEST_CONNECTION) {
        const mongoUnitOfWork: TestUnitOfWork = new TestUnitOfWork();
        mongoUnitOfWork._context = await createConnection(connectionString, {
            server: {
                reconnectTries: Number.MAX_VALUE,
                autoReconnect: true
            }
        });

        return mongoUnitOfWork;
    }

    get devices(): IRepository<IDevice> {
        if (!this._devices) {
            this._devices = new TestRepository<IDevice>(this._context.model<IDevice>("Device", schema.device));
        }
        return this._devices;
    }
}
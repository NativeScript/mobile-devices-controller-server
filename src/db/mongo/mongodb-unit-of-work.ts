import { Connection, createConnection } from "mongoose";
import { IUnitOfWork } from "../interfaces/unit-of-work";
import { IRepository } from "../interfaces/repository";
import { MongoRepository } from "./mongo-repository";
import { IDevice } from "mobile-devices-controller";
import * as schema from "./schemas/schema";
import { IDeviceModel } from "../interfaces/device-model";
// require('mongoose').Promise = require("q").Promise;

const MONGODB_CONNECTION: string = "mongodb://127.0.0.1:27017/devices";

export class MongoUnitOfWork implements IUnitOfWork {
    private _devices: IRepository<IDevice>;
    private _context: Connection;

    constructor() {
    }

    public static async createConnection(connectionString: string = MONGODB_CONNECTION) {
        const mongoUnitOfWork: MongoUnitOfWork = new MongoUnitOfWork();
        
        const options = {
            autoReconnect: true,
            connectTimeoutMS: 5000,
            reconnectTries: Number.MAX_VALUE,
            useNewUrlParser: true,
            promiseLibrary: global.Promise
        };

        mongoUnitOfWork._context = await createConnection(connectionString,options);

        return mongoUnitOfWork;
    }

    get devices(): IRepository<IDevice> {
        if (!this._devices) {
            this._devices = new MongoRepository<IDeviceModel>(this._context.model<IDeviceModel>("Device", schema.DeviceSchema));
        }
        return this._devices;
    }
}
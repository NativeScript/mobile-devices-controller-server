import { Model } from "mongoose";
import { IDeviceModel } from "../interfaces/device-model";
import { MongoRepository } from '../mongo/mongo-repository';
export declare class TestRepository<T extends IDeviceModel> extends MongoRepository<T> {
    constructor(entities: Model<T>);
}

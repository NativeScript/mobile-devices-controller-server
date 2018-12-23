import {
    IDevice,
    DeviceController
} from 'mobile-devices-controller';
import { Model } from "mongoose"; //import mongoose
import { IRepository } from "../interfaces/repository";
import { IDeviceModel } from "../interfaces/device-model";
import { MongoRepository } from '../mongo/mongo-repository';

export class TestRepository<T extends IDeviceModel> extends MongoRepository<T> {

    constructor(entities: Model<T>) {
        super(entities);
    }
}

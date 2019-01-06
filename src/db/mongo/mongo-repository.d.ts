import { Model } from "mongoose";
import { IRepository } from "../interfaces/repository";
import { IDeviceModel } from "../interfaces/device-model";
export declare class MongoRepository<T extends IDeviceModel> implements IRepository<T> {
    private _entitySet;
    constructor(entities: Model<T>);
    add(item: T): Promise<T>;
    addMany(items: T[]): Promise<T[]>;
    deleteMany(item: any): Promise<any>;
    find(query: T): Promise<Array<T>>;
    findByToken(token: string): Promise<T>;
    findSingle(query: T): Promise<T>;
    update(token: string, values: T): Promise<any>;
    updateById(obj: any, values: T): Promise<any>;
    remove(item: T): Promise<any>;
    dropDb(): Promise<void>;
    private static convertQueryToConditionalOne;
    private copyDeviceToIDeviceModel;
}

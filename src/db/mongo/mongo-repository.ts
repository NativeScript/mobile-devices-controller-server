import { Model } from "mongoose"; //import mongoose
import { IRepository } from "../interfaces/repository";
import { IDeviceModel } from "../interfaces/device-model";

export class MongoRepository<T extends IDeviceModel> implements IRepository<T> {
    private _entitySet: Model<T>

    constructor(entities: Model<T>) {
        if (!entities) {
            throw new Error("No entities provided.");
        }

        this._entitySet = entities;
    }

    public async add(item: T) {
        return await this._entitySet.create(item);
    }

    public async addMany(items: T[]) {
        return await this._entitySet.create(...items);
    }

    public async deleteMany(item: any) {
        return await this._entitySet.deleteMany(item);
    }

    public async find(query: T): Promise<Array<T>> {
        const result = await this._entitySet.find(query);
        const array = new Array<T>();

        result.forEach(element => {
            array.push(<T>element);
        });

        return array;
    }

    public async findByToken(token: string): Promise<T> {
        const result = await this._entitySet.findOne({ "token": token });
        if (!result) {
            return null;
        }

        return result;
    }

    public async findSingle(query: T): Promise<T> {
        const result = await this._entitySet.findOne(query);

        return result;
    }

    public async update(token: string, values: T) {
        const device: IDeviceModel = await this._entitySet.findOne({ "token": token });
        const result = await this._entitySet.update({ "token": token }, this.copyDeviceToIDeviceModel(values, device));
        return result;
    }

    public async updateByName(name: string, values: T) {
        const device: IDeviceModel = await this._entitySet.findOne({ "name": name });
        const result = await this._entitySet.update({ "name": name }, this.copyDeviceToIDeviceModel(values, device));
        return result;
    }

    public async remove(item: T) {
        return await this._entitySet.remove(item);
    }

    public async dropDb() {
        await this._entitySet.db.dropDatabase();
    }

    private copyDeviceToIDeviceModel(device: T, deviceModel: IDeviceModel) {
        if (!device) return deviceModel;

        deviceModel['_doc']['name'] = device['name'];
        deviceModel['_doc']['pid'] = device['pid'];
        deviceModel['_doc']['startedAt'] = device['startedAt'];
        deviceModel['_doc']['busySince'] = device['busySince'];
        deviceModel['_doc']['status'] = device['status'];
        deviceModel['_doc']['token'] = device['token'];
        deviceModel['_doc']['type'] = device['type'];
        deviceModel['_doc']['info'] = device['info'] || "";
        deviceModel['_doc']['config'] = device['config'] || "";
        deviceModel['_doc']['apiLevel'] = device['apiLevel'];
        deviceModel['_doc']['parentProcessPid'] = device['parentProcessPid'];
        
        return deviceModel;
    }
}

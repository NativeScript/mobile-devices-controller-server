import { Model } from "mongoose"; //import mongoose
import { IRepository } from "../interfaces/repository";
import { IDeviceModel } from "../interfaces/device-model";
import { ObjectId } from "mongodb"
import { isRegExp, isObject, isFunction } from "util";

const copyDeviceToStrictQuery = source => {
    let query = {};
    for (const key in source) {
        if (isRegExp(source[key]) || (!isObject(source[key]) && !isFunction(source[key]))) {
            const p = key.startsWith("_") ? key.substring(1) : key;
            if (source[p] && !p.startsWith("$")) {
                query[p] = source[p];
            }
        }
    }

    return query;
}
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
        const q = MongoRepository.convertQueryToConditionalOne(item);
        return await this._entitySet.deleteMany(q);
    }

    public async find(query: T): Promise<Array<T>> {
        const q = MongoRepository.convertQueryToConditionalOne(query);

        const result = await this._entitySet.find(q);
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
        const q = MongoRepository.convertQueryToConditionalOne(query);
        const result = await this._entitySet.findOne(q);

        return result;
    }

    public async update(token: string, values: T) {
        const device: IDeviceModel = await this._entitySet.findOne({ "token": token });
        const result = await this._entitySet.updateOne({ "token": token }, this.copyDeviceToIDeviceModel(values, device));
        return result;
    }

    public async updateById(obj, values: T) {
        const device: IDeviceModel = await this._entitySet.findOne({ "_id": ObjectId(obj.id) });
        const result = await this._entitySet.updateOne({ "_id": ObjectId(obj.id) }, this.copyDeviceToIDeviceModel(values, device));
        return result;
    }

    public async updateByName(name: string, values: T) {
        const device: IDeviceModel = await this._entitySet.findOne({ "name": name });
        const result = await this._entitySet.updateOne({ "name": name }, this.copyDeviceToIDeviceModel(values, device));
        return result;
    }

    public async remove(item: T) {
        const q = MongoRepository.convertQueryToConditionalOne(item);
        return await this._entitySet.remove(q);
    }

    public async dropDb() {
        await this._entitySet.db.dropDatabase();
    }

    private static convertQueryToConditionalOne(query) {
        if (query.apiLevel || query.releaseVersion) {
            const newQuery: any = copyDeviceToStrictQuery(query);
            const apiLevelS = new RegExp(query.apiLevel, "ig")
            const releaseVersionS = new RegExp(query.releaseVersion, "ig");

            const queryArray = [apiLevelS, releaseVersionS]
                .filter(q => q && q.source !== "(?:)" && !q.source.includes("undefined"));
            delete newQuery.apiLevel;
            delete newQuery.releaseVersion;
            const q = <any>{};
            q["$and"] = [{
                    "$or": [
                        { apiLevel: { $in: [...queryArray] } },
                        { releaseVersion: { $in: [...queryArray] } }
                    ]
                },
                newQuery];

            return q;
        }

        return query;
    }

    private copyDeviceToIDeviceModel(device: T, deviceModel: IDeviceModel) {
        if (!device) return deviceModel;
        if (!deviceModel) return {};

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
        deviceModel['_doc']['releaseVersion'] = device['releaseVersion'];

        return deviceModel;
    }
}

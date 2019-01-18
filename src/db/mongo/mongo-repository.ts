import { Model } from "mongoose"; //import mongoose
import { IRepository } from "../interfaces/repository";
import { IDeviceModel } from "../interfaces/device-model";
import { copyDeviceToStrictQuery } from "../../utils/utils";
import { isRegExp } from "util";
import { convertStringToRegExp } from "mobile-devices-controller";

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
        return await this._entitySet.insertMany(items);
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
        const device = await this._entitySet.findOne({ "token": token });
        const result = await this._entitySet.updateOne({ "token": token }, this.copyDeviceToIDeviceModel(values, device))
        return result;
    }

    public async updateById(obj, values: T) {
        const device = await this._entitySet.findById(obj.id);
        const result = await this._entitySet.updateOne({ "_id": obj.id }, this.copyDeviceToIDeviceModel(values, device));
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
        if (query && query.platform === "ios") {
            return query;
        }
        if (query && (query.apiLevel || query.releaseVersion)) {
            const newQuery: any = copyDeviceToStrictQuery(query);
            let apiLevelS = convertStringToRegExp(query.apiLevel);
            let releaseVersionS = convertStringToRegExp(query.releaseVersion);

            apiLevelS = isRegExp(apiLevelS) ? apiLevelS : new RegExp(apiLevelS, "ig");
            releaseVersionS = isRegExp(releaseVersionS) ? releaseVersionS : new RegExp(releaseVersionS, "ig");
            
            const queryArray = [apiLevelS, releaseVersionS]
                .filter(q => q && q.source && q.source !== "(?:)" && !q.source.includes("undefined"));

            delete newQuery.apiLevel;
            delete newQuery.releaseVersion;
            delete newQuery.id;

            const q = {
                $and: [
                    {
                        $or:
                            [
                                { apiLevel: { $in: [...queryArray] } },
                                { releaseVersion: { $in: [...queryArray] } }
                            ]
                    },
                    newQuery
                ]
            }
            return q;
        }

        return query;
    }

    private copyDeviceToIDeviceModel(device: T, deviceModel: IDeviceModel) {
        return device;
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

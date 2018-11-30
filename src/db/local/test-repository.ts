import { IRepository } from '../interfaces/repository';
import {
    IDevice,
    Device,
} from 'mobile-devices-controller';

export class TestRepository<T extends IDevice> implements IRepository<T> {

    constructor() {
    }

    public async find(query): Promise<Array<T>> {
        return;
    }

    public async findByToken(token): Promise<T> {
        return;
    }

    public async findSingle(item: any): Promise<T> {
        return;
    }

    private async filter(query: any) {
        return;
    }

    public async update(token: string, obj: T) {
         return Promise.resolve(obj)
    }

    public add(item: T):Promise<any> {
        return Promise.reject("Not implemented!");
        // not sure but could be implement if we want to create new iPhone
    }

    public addMany(item: T[]) :Promise<any> {
        return Promise.reject("Not implemented!");  
        // not sure but could be implement if we want to create new iPhone
    }

    public deleteMany(item: any) :Promise<any> {
        return Promise.reject("Not implemented!");  
        // not sure but could be implement if we want to create new iPhone
    }

    public async remove(item) {
        // when we want to delete simulator or emulator
    }

    public dropDb() {
        return null;
    }
}

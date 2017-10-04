/// <reference types="mongoose" />
import { Model } from "mongoose";
import { IUserModel } from "./user";
import { IDeviceModel } from "./device";
export interface IModel {
    user: Model<IUserModel>;
    device: Model<IDeviceModel>;
}

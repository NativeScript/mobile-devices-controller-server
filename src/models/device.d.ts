/// <reference types="mongoose" />
import { Document } from "mongoose";
import { IDevice } from "../interfaces/device";
export interface IDeviceModel extends IDevice, Document {
}

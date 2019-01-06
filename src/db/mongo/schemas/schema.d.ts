import { Schema } from "mongoose";
export declare type Optional<T> = {
    [P in keyof T]?: T[P];
};
export declare var DeviceSchema: Schema;

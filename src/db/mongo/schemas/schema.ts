import { Schema } from "mongoose";
// import { IDevice } from "mobile-devices-controller";

export type Optional<T> = { [P in keyof T]?: T[P] }

const deviceModel = {
  name: String,
  token: String,
  type: String,
  platform: String,
  status: String,
  info: String,
  config: {},
  startedAt: Number,
  busySince: Number,
  pid: Number,
  apiLevel: String,
  releaseVersion: String,
  parentProcessPid: Number,
}

export var DeviceSchema: Schema = new Schema(deviceModel);

DeviceSchema.pre("save", function (next) {
  next();
});

DeviceSchema.methods.fullName = function (): string {
  return (this.name.trim() + " " + this.token.trim());
};
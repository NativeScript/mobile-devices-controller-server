import { Schema } from "mongoose";

export var deviceSchema: Schema = new Schema({
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
  apiLevel: String
});

deviceSchema.pre("save", function (next) {
  next();
});
import { Schema } from "mongoose";

export var deviceSchema: Schema = new Schema({
  name: String,
  token: String,
  type: String,
  platform: String,
  status: String,
  info: String,
  config: String,
  startedAt: Number,
  busySince: Number,
  procPid: Number,
  apiLevel: String
});

deviceSchema.pre("save", function (next) {
  next();
});
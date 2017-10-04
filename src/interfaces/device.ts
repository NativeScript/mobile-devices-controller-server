export interface IDevice {
  name: string,
  token: string,
  type: string,
  platform: string,
  status?: string,
  info?: string,
  config?: string,
  apiLevel?: string,
  startedAt?: number,
  busySince?: number;
  procPid?: number,
}
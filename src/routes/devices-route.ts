import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";
import { DeviceManager, IUnitOfWork } from "mobile-devices-manager";
import { Subscribe } from "../utils/subscription";
import { log } from "../utils/utils";

export class DevicesRoute extends BaseRoute {
  private static _subscribe: Subscribe = new Subscribe();
  /**
   * Create the routes.
   *
   * @class DevicesRoute
   * @method create
   * @static
   */
  public static create(router: Router, repository: IUnitOfWork, deviceManager: DeviceManager) {

    DevicesRoute._subscribe.pushSubscription(async () => {
      await DevicesRoute.refreshData(repository, deviceManager);
    });

    const getDevicesFilter = function (req, res, next) {
      req.setTimeout(0);
      repository.devices.find(req.query).then((devices) => {
        res.json(devices);
      }).catch((error) => {
        res.json(error);
      });
    };

    router.get("/devices", getDevicesFilter, (req: Request, res: Response, next: NextFunction) => {
      res.send('');
    });

    const bootDeviceFilter = function (req, res, next) {
      req.setTimeout(0);
      DevicesRoute._subscribe.pushSubscription(async () => {
        const count = req.query.count;
        log(`Boot device`, req.query);
        delete req.query.count;
        await deviceManager.boot(req.query, count).then((devices) => {
          log(`Booted devices`, devices);
          res.json(devices);
        }, (err) => {
          res.json(`Failed to boot device ${err.message}`);
        });
      });
    };

    router.get("/devices/boot", bootDeviceFilter, (req: Request, res: Response, next: NextFunction) => {
      res.json("Device failed to boot!");
    });

    const subscribeDeviceFilter = function (req, res, next) {
      req.setTimeout(0);
      DevicesRoute._subscribe.pushSubscription(async () => {
        const query = req.query;
        if (!query || !(query.platform || query.type) || !query.info || !query.apiLevel) {
          res.json("Missing required filter");
        } else {
          log('Requested query: ', query);
          await deviceManager.subscribeForDevice(query).then((device) => {
            log("Subscribe for device: ", device);
            res.json(device);
          }, (error) => {
            log("Fail!", error);
            res.json("Device failed to boot! " + error.message);
          });
        }
      });
    };

    // /api/v1/devices/subscribe?type=simulator&name=iPhone%207%20100&info=Test&apiLevel=11.0&platform=ios
    router.get("/devices/subscribe", subscribeDeviceFilter, (req: Request, res: Response, next: NextFunction) => {
      res.json("Filed to subscribe!");
    });

    const unsubscribeDeviceFilter = function (req, res, next) {
      req.setTimeout(0);
      DevicesRoute._subscribe.pushSubscription(async () => {
        const query = req.query;
        if (!query && !query.token) {
          res.json("Missing required token param");
        }
        await deviceManager.unsubscribeFromDevice(query, query.maxDeviceUsage).then((device) => {
          log("Unsubscribe from device: ", device);
          res.json(device);
        }, () => {
          res.json("Filed to unsubscribe!");
        });
      });
    };

    // /api/v1/devices/unsubscribe?token=93B75F3B-0D2A-4873-8BCB-9F78B104BDB5
    router.get("/devices/unsubscribe", unsubscribeDeviceFilter, (req: Request, res: Response, next: NextFunction) => {
      log("Fail!");
      res.json("Device failed to boot!");
    });

    const update = function (req, res, next) {
      DevicesRoute._subscribe.pushSubscription(async () => {
        const token = req.query.token
        delete req.query.token;
        delete req.query.name;
        delete req.query.apiLevel;
        delete req.query.type;

        const queryToUpdate = req.query;
        deviceManager.update(token, queryToUpdate).then((devices) => {
          res.json(devices);
        })
      });
    }

    // /api/v1/devices/update?token=token&status=shutdown
    router.get("/devices/udpate", update, (req: Request, res: Response, next: NextFunction) => {
      res.json("Data failed to update!");
    });

    const refreshFilter = function (req, res, next) {
      deviceManager.refreshData(req.query, {}).then((devices) => {
        res.json(devices);
      })
    };

    router.get("/devices/refresh", refreshFilter, (req: Request, res: Response, next: NextFunction) => {
      res.json("Data failed to refresh!");
    });

    // api/v1/devices/kill?platform=android
    // api/v1/devices/kill?name=Emulator-Api21-Default
    router.get("/devices/kill", (req: Request, res: Response, next: NextFunction) => {
      deviceManager.killDevices(req.query).then((devices) => {
        res.send(devices);
      });
    });

    router.get("/devices/dropdb", (req: Request, res: Response, next: NextFunction) => {
      deviceManager.dropdb().then((devices) => {
        res.send(devices);
      });
    });
  }

  constructor() {
    super();
  }


  public get(req: Request, res: Response, next: NextFunction) {
    //set custom title
    this.title = "Devices | Device manager server!";

    //set message
    let options: Object = {
      "message": "Welcome to the device manager server"
    };

    //render template
    this.render(req, res, "devices", options);
  }

  private static async refreshData(repository: IUnitOfWork, deviceManager: DeviceManager) {
    log("Refreshing data!!!")

    if (process.argv.indexOf("--cleandata") >= 0) {
      await deviceManager.killDevices();
    }

    const deviceMaxUsageTime = process.env.MAX_USAGE_INTERVAL;
    if (deviceMaxUsageTime && parseInt(deviceMaxUsageTime) !== NaN) {
      //deviceManager.checkDeviceStatus(deviceMaxUsageTime);
    }

    const result = await deviceManager.refreshData({}, {});
    log("Data refreshed!!!", result);
  }
}
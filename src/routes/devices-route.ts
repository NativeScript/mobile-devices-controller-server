import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";
import { DeviceManager, IUnitOfWork } from "mobile-devices-manager";

/**
 * / route
 *
 * @class DevicesRoute
 */
export class DevicesRoute extends BaseRoute {

  /**
   * Create the routes.
   *
   * @class DevicesRoute
   * @method create
   * @static
   */
  public static create(router: Router, repository: IUnitOfWork, deviceManager: DeviceManager) {
    const subscribtionQueue: { (): Promise<void> }[] = [];

    function pushSubscription(action: () => Promise<void>): void {
      subscribtionQueue.push(action);
      console.log("Push subscription: " + subscribtionQueue.length);
      if (subscribtionQueue.length === 1) {
        processNextSubscription();
      }
    }

    function processNextSubscription(): void {
      const next = subscribtionQueue[0];
      function onNextCompleted() {
        subscribtionQueue.shift()
        console.log("Complete! " + subscribtionQueue.length);
        if (subscribtionQueue.length > 0) {
          processNextSubscription();
        }
      }
      console.log("Process next: " + subscribtionQueue.length);
      next().then(onNextCompleted, onNextCompleted);
    }

    pushSubscription(async () => {
      await DevicesRoute.refreshData(repository, deviceManager);
    });

    const getDevicesFilter = function (req, res, next) {
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
      pushSubscription(async () => {
        const count = req.query.count;
        delete req.query.count;
        await deviceManager.boot(req.query, count).then((devices) => {
          res.json(devices);
        }, (err) => {
          res.json(`Failed to boot device ${err}`);
        });
      });
    };

    router.get("/devices/boot", bootDeviceFilter, (req: Request, res: Response, next: NextFunction) => {
      res.json("Device failed to boot!");
    });

    const subscribeDeviceFilter = function (req, res, next) {
      pushSubscription(async () => {
        const query = req.query;
        if (!query || !(query.platform || query.type) || !query.info || !query.apiLevel || !(query.name || query.token)) {
          res.json("Missing required filter");
        } else {
          console.log('Requested query: ',query);
          await deviceManager.subscribeDevice(query).then((device) => {
            res.json(device);
          }, () => {
            console.log("Fail!");
            res.json("Device failed to boot!");
          });
        }
      });
    };

    // http://localhost:8000/api/v1/devices/subscribe?type=simulator&name=iPhone%207%20100&info=Test&apiLevel=11.0&platform=ios
    router.get("/devices/subscribe", subscribeDeviceFilter, (req: Request, res: Response, next: NextFunction) => {
      res.json("Filed to subscribe!");
    });

    const unsubscribeDeviceFilter = function (req, res, next) {
      pushSubscription(async () => {
        const query = req.query;
        if (!query && !query.token) {
          res.json("Missing required token param");
        }
        await deviceManager.unSubscribeDevice(query).then((device) => {
          res.json(device);
        }, () => {
          res.json("Filed to unsubscribe!");
        });
      });
    };

    // http://localhost:8000/api/devices/unsubscribe?token=93B75F3B-0D2A-4873-8BCB-9F78B104BDB5
    router.get("/devices/unsubscribe", unsubscribeDeviceFilter, (req: Request, res: Response, next: NextFunction) => {
      console.log("Fail!");
      res.json("Device failed to boot!");
    });

    const update = function (req, res, next) {
      pushSubscription(async () => {
        const searchedString = req.params[0].split("/")[0];
        deviceManager.update(searchedString, req.query).then((devices) => {
          res.json(devices);
        })
      });
    }

    // //http://localhost:3000/devices/update/type=simulator&status=shutdown&name=iPhone%206?name=KOr
    // router.get("/devices/update", update, (req: Request, res: Response, next: NextFunction) => {
    //   res.json("Data failed to update!");
    // });

    const refreshFilter = function (req, res, next) {
      deviceManager.refreshData(req.query, {}).then((devices) => {
        res.json(devices);
      })
    };

    router.get("/devices/refresh", refreshFilter, (req: Request, res: Response, next: NextFunction) => {
      res.json("Data failed to refresh!");
    });

    // api/devices/kill?platform=android
    // api/devices/kill?name=Emulator-Api21-Default
    router.get("/devices/kill", (req: Request, res: Response, next: NextFunction) => {
      deviceManager.killDevices(req.query).then((devices) => {
        res.send(devices);
      });
    });
  }

  constructor() {
    super();
  }

  /**
   * The home page route.
   *
   * @class DeviceRoute
   * @method index
   * @param req {Request} The express Request object.
   * @param res {Response} The express Response object.
   * @next {NextFunction} Execute the next method.
   */
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
    console.log("Refreshing data!!!")
    //await deviceManager.killDevices();

    const deviceMaxUsageTime = process.env.MAX_USAGE_INTERVAL;
    if (deviceMaxUsageTime && parseInt(deviceMaxUsageTime) !== NaN) {
      deviceManager.checkDeviceStatus(deviceMaxUsageTime);
    }
    console.log("Data refreshed!!!")
  }
}
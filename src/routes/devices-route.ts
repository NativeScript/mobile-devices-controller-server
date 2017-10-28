import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";
import { DeviceManager } from "../device-manager/device-manager";
import { Platform, DeviceType } from "mobile-devices-controller";
import { IUnitOfWork } from "../../db/interfaces/unit-of-work";

/**
 * / route
 *
 * @class Device
 */
export class DevicesRoute extends BaseRoute {

  /**
   * Create the routes.
   *
   * @class IndexRoute
   * @method create
   * @static
   */
  public static create(router: Router, repository: IUnitOfWork) {

    const getDevicesFilter = function (req, res, next) {
      repository.devices.find(req.query).then((devices) => {
        res.json(devices);
      });
    };

    router.get("/devices", getDevicesFilter, (req: Request, res: Response, next: NextFunction) => {
      res.send('');
    });

    const bootDeviceFilter = function (req, res, next) {
      const count = req.query.count;
      delete req.query.count;
      DeviceManager.boot(repository, req.query, count).then((devices) => {
        res.json(devices);
      })
    };

    router.get("/devices/boot*", bootDeviceFilter, (req: Request, res: Response, next: NextFunction) => {
      res.json("Device failed to boot!");
    });

    const subscribeDeviceFilter = function (req, res, next) {
      const query = req.query;
      if (!query || !query.platform || !query.type || !query.app || !query.apiLevel || !query.deviceName) {
        res.json("Data failed to update!");
      }
      DeviceManager.subscribeDevice(query.platform, query.type, query.app, query.apiLevel, query.deviceName, repository).then((device) => {
        res.json(device);
      });
    };

    // http://localhost:3000/devices/subscribe?platform=ios&type=simulator&app=UITests&apiLevel=11&deviceName=iPhone%207%20110
    router.get("/devices/subscribe", subscribeDeviceFilter, (req: Request, res: Response, next: NextFunction) => {
      res.json("Device failed to boot!");
    });

    const update = function (req, res, next) {
      const searchedString = req.params[0].split("/")[0];
      DeviceManager.update(repository, searchedString, req.query).then((devices) => {
        res.json(devices);
      })
    };
    //              /searchedDeviceToUpdate    ?update properties
    //devices/update/name=iPhone,type=simulator?name=test
    router.get("/devices/update/*", update, (req: Request, res: Response, next: NextFunction) => {
      res.json("Data failed to update!");
    });

    const refreshFilter = function (req, res, next) {
      DeviceManager.refreshData(repository, req.query).then((devices) => {
        res.json(devices);
      })
    };

    router.get("/devices/refresh", refreshFilter, (req: Request, res: Response, next: NextFunction) => {
      res.json("Data failed to refresh!");
    });

    // devices/kill/all
    // devices/kill/ios
    // devices/kill/android
    // devices/kill?name=Emulator-Api21-Default
    router.get("/devices/kill*", (req: Request, res: Response, next: NextFunction) => {
      const params = req.params;
      const query = req.query;
      if (!query.hasOwnProperty() && params[0] !== "") {
        const command = params[0].replace("/", "").trim().toLowerCase();
        switch (command) {
          case "ios":
          case "android":
          case "all":
            DeviceManager.killAll(repository, command).then(() => {
              res.json(`${command} are dead!`);
            });
            break;
          default:
            break;
        }
      } else {
        DeviceManager.killDevice(query, repository).then(() => {
          res.send("no query string");
        })
      }
    });
  }

  /**
   * Constructor
   *
   * @class IndexRoute
   * @constructor
   */
  constructor() {
    super();
  }

  /**
   * The home page route.
   *
   * @class IndexRoute
   * @method index
   * @param req {Request} The express Request object.
   * @param res {Response} The express Response object.
   * @next {NextFunction} Execute the next method.
   */
  public get(req: Request, res: Response, next: NextFunction) {
    //set custom title
    this.title = "Home | Device manager server!";

    //set message
    let options: Object = {
      "message": "Welcome to the device manager server"
    };

    //render template
    this.render(req, res, "index", options);
  }

  public static async refreshData(repository: IUnitOfWork) {
    DeviceManager.killAll(repository);

    const deviceMaxUsageTime = process.env.MAX_USAGE_INTERVAL;
    if (deviceMaxUsageTime && parseInt(deviceMaxUsageTime) !== NaN) {
      DeviceManager.checkDeviceStatus(repository, deviceMaxUsageTime);
    }
    console.log("Data refreshed")
  }
}
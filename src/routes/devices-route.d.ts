import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";
import { DeviceManager } from "../mobile-devices-manager/device-manager";
import { IUnitOfWork } from "../db/interfaces/unit-of-work";
export declare class DevicesRoute extends BaseRoute {
    private static _subscribe;
    /**
     * Create the routes.
     *
     * @class DevicesRoute
     * @method create
     * @static
     */
    static create(router: Router, repository: IUnitOfWork, deviceManager: DeviceManager): void;
    constructor();
    get(req: Request, res: Response, next: NextFunction): void;
    private static refreshData;
}

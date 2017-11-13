import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";
import { DeviceManager, IUnitOfWork } from "mobile-devices-manager";
/**
 * / route
 *
 * @class DevicesRoute
 */
export declare class DevicesRoute extends BaseRoute {
    /**
     * Create the routes.
     *
     * @class DevicesRoute
     * @method create
     * @static
     */
    static create(router: Router, repository: IUnitOfWork, deviceManager: DeviceManager): void;
    constructor();
    /**
     * The home page route.
     *
     * @class DeviceRoute
     * @method index
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @next {NextFunction} Execute the next method.
     */
    get(req: Request, res: Response, next: NextFunction): void;
    private static refreshData(repository, deviceManager);
}

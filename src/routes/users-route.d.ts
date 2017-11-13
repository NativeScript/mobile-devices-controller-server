import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";
import { IUnitOfWork } from "mobile-devices-manager";
/**
 * / route
 *
 * @class User
 */
export declare class UsersRoute extends BaseRoute {
    /**
     * Create the routes.
     *
     * @class IndexRoute
     * @method create
     * @static
     */
    static create(router: Router, repository: IUnitOfWork): void;
    /**
     * Constructor
     *
     * @class IndexRoute
     * @constructor
     */
    constructor();
    /**
     * The home page route.
     *
     * @class IndexRoute
     * @method index
     * @param req {Request} The express Request object.
     * @param res {Response} The express Response object.
     * @next {NextFunction} Execute the next method.
     */
    get(req: Request, res: Response, next: NextFunction): void;
}

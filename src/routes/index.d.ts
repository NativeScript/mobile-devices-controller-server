/// <reference types="express" />
import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";
/**
 * / route
 *
 * @class User
 */
export declare class IndexRoute extends BaseRoute {
    /**
     * Create the routes.
     *
     * @class IndexRoute
     * @method create
     * @static
     */
    static create(router: Router): void;
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
    index(req: Request, res: Response, next: NextFunction): void;
}

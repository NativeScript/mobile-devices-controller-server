import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";
export declare class IndexRoute extends BaseRoute {
    static create(router: Router): void;
    constructor();
    index(req: Request, res: Response, next: NextFunction): void;
}

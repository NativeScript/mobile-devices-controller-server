import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";
export declare class UtilsRoute extends BaseRoute {
    private static _subscribe;
    static usedPorts: Array<number>;
    static create(router: Router): void;
    constructor();
    get(req: Request, res: Response, next: NextFunction): void;
}
export declare const findFreePort: (retries?: number, host?: string, port?: string, timeout?: number) => Promise<number>;
export declare const releaseUsedPort: (port: any) => Promise<any>;

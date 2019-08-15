import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";
import { Subscribe } from "../utils/subscription";
import * as express from 'express';
import * as http from 'http';

export class UtilsRoute extends BaseRoute {
    private static _subscribe: Subscribe = new Subscribe();
    public static usedPorts: Array<number> = new Array();

    public static create(router: Router) {
        const getFreePort = function (req, res, next) {
            UtilsRoute._subscribe.pushSubscription(async () => {
                let port = req.query.from || 8300;
                const host = req.query.host || "0.0.0.0";
                findFreePort(req.query.retriesCount || 1000, host, port, 9999).then((port) => {
                    res.json(port);
                }).catch((error) => {
                    res.json(error);
                });
            })
        };

        router.get("/utils/free-port", getFreePort, (req: Request, res: Response, next: NextFunction) => {
            res.send('');
        });

        const releasePort = function (req, res, next) {
            const port = req.query.port;
            if (!port) {
                console.log("Unvalid data!");
                res.json("Unvalid data!");
            }
            releaseUsedPort(port).then((port) => {
                console.log(`port: ${port} is released successfully!`)
                res.json(port);
            }).catch((error) => {
                res.json(error);
            });
        };

        router.get("/utils/release-port", getFreePort, (req: Request, res: Response, next: NextFunction) => {
            res.send('');
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
            "message": "Welcome to the info page"
        };

        //render template
        this.render(req, res, "devices", options);
    }
}

export const findFreePort = async (retries: number = 100, host: string = "0.0.0.0", port = "8000", timeout: number = 10000) => {
    let p: number = +port;
    p = checkIfPortIsUsed(p);
    try {
        while (!await server(p)) {
            p++;
            p = checkIfPortIsUsed(p);
            console.log(p);
        }
    } catch (error) {
        console.log(error);
    }

    UtilsRoute.usedPorts.push(p);
    return p;
}

export const releaseUsedPort = async (port) => {
    const portIndex = UtilsRoute.usedPorts.indexOf(port);
    if (portIndex >= 0) {
        UtilsRoute.usedPorts.splice(portIndex, 1);
    }

    return port;
}

function checkIfPortIsUsed(port) {
    while (UtilsRoute.usedPorts.indexOf(port) >= 0) {
        port++;
    }

    return port;
}

function server(port, hostname = null) {
    return new Promise((resolve, reject) => {
        // create the actual http server
        let app = express();
        let httpServer = http.createServer(app);

        // http.Server.close() only stops new connections, but we need to wait until
        // all connections are closed and the `close` event is emitted
        let close = httpServer.close.bind(httpServer);
        httpServer.once('close', async (msg) => {
            resolve(true);
        });
        httpServer.on('error', (err) => {
            if ((<any>err).code === 'EADDRNOTAVAIL') {
                console.error('Could not start REST http interface listener. ' +
                    'Requested address is not available.');
            } else {
                console.error('Could not start REST http interface listener. The requested ' +
                    'port may already be in use. Please make sure there is no ' +
                    'other instance of this server running already.');
            }
            resolve(false);
        });
        httpServer.on('connection', (socket) => {
            socket.setTimeout(600 * 1000); // 10 minute timeout
            resolve(true);
        });

        let serverArgs = [port];
        if (hostname) {
            // If the hostname is omitted, the server will accept
            // connections on any IP address
            serverArgs.push(hostname);
        }
        httpServer.listen(...serverArgs, async (err) => {
            if (err) {
                reject(false);
            }
            await httpServer.close();
        });
    });
}
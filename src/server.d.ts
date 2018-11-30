import * as express from "express";
/**
 * The server.
 *
 * @class Server
 */
export declare class Server {
    private _unitOfWork;
    private _deviceManager;
    app: express.Application;
    /**
     * Bootstrap the application.
     *
     * @class Server
     * @method bootstrap
     * @static
     * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
     */
    static bootstrap(): Promise<Server>;
    /**
     * Constructor.
     *
     * @class Server
     * @constructor
     */
    constructor();
    startServer(): Promise<void>;
    /**
     * Create REST API routes
     *
     * @class Server
     * @method api
     */
    api(): void;
    /**
     * Configure application
     *
     * @class Server
     * @method config
     */
    config(): Promise<void>;
    /**
     * Create and return Router.
     *
     * @class Server
     * @method config
     * @return void
     */
    private routes;
}

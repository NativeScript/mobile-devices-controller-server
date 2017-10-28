import * as express from "express";
/**
 * The server.
 *
 * @class Server
 */
export declare class Server {
    private _unitOfWork;
    app: express.Application;
    /**
     * Bootstrap the application.
     *
     * @class Server
     * @method bootstrap
     * @static
     * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
     */
    static bootstrap(): Server;
    /**
     * Constructor.
     *
     * @class Server
     * @constructor
     */
    constructor();
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
    private routes();
}

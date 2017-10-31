import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as logger from "morgan";
import * as path from "path";
import errorHandler = require("errorhandler");
import methodOverride = require("method-override");

//routes
import { IndexRoute } from "./routes/index";
import { UsersRoute } from "./routes/users-route";
import { DevicesRoute } from "./routes/devices-route";
import {
  IUnitOfWork,
  DeviceManager,
  LocalUnitOfWork,
  MongoUnitOfWork
} from "mobile-devices-manager";


/**
 * The server.
 *
 * @class Server
 */
export class Server {

  private _unitOfWork: IUnitOfWork;
  private _deviceManager: DeviceManager;

  public app: express.Application;

  /**
   * Bootstrap the application.
   *
   * @class Server
   * @method bootstrap
   * @static
   * @return {ng.auto.IInjectorService} Returns the newly created injector for this app.
   */
  public static bootstrap(): Server {
    return new Server();
  }

  /**
   * Constructor.
   *
   * @class Server
   * @constructor
   */
  constructor() {

    if (process.env.LOCAL_DB) {
      this._unitOfWork = new LocalUnitOfWork();
   } else {
     this._unitOfWork = new MongoUnitOfWork();
    }

    this._deviceManager = new DeviceManager(this._unitOfWork);
    //create expressjs application
    this.app = express();

    //configure application
    this.config();

    //add routes
    this.routes();

    //add api
    this.api();
  }

  /**
   * Create REST API routes
   *
   * @class Server
   * @method api
   */
  public api() {
    //empty for now
  }

  /**
   * Configure application
   *
   * @class Server
   * @method config
   */
  public async config() {

    //add static paths
    //this.app.use(express.static('public')).listen(3000, "0.0.0.0");

    //configure pug
    this.app.use(express.static(path.join(__dirname, "public")));

    this.app.set("views", path.join(__dirname, "../views"));
    this.app.set("view engine", "pug");

    //mount logger
    this.app.use(logger("dev"));

    //mount json form parser
    this.app.use(bodyParser.json());

    //mount query string parser
    this.app.use(bodyParser.urlencoded({
      extended: true
    }));

    //mount cookie parker
    //this.app.use(cookieParser("SECRET_GOES_HERE"));

    //mount override
    this.app.use(methodOverride());

    this.app.use(function (err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
      err.status = 404;
      next(err);
    });

    //error handling
    this.app.use(errorHandler());

    await this._deviceManager.refreshData();
  }

  /**
   * Create and return Router.
   *
   * @class Server
   * @method config
   * @return void
   */
  private routes() {
    let router: express.Router;
    router = express.Router();

    //IndexRoute
    IndexRoute.create(router);
    //UsersRoute.create(router, this._unitOfWork);
    DevicesRoute.create(router, this._unitOfWork,this._deviceManager);

    //use router middleware
    this.app.use(router);
  }

}
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
import { UtilsRoute } from "./routes/utils-route";
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
  constructor(private _useLocalRepository: boolean = false) {
    if (!this._useLocalRepository) {
      this._unitOfWork = new MongoUnitOfWork();
    } else {
      this._unitOfWork = new LocalUnitOfWork();
    }

    this._deviceManager = new DeviceManager(this._unitOfWork, this._useLocalRepository);

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

    this.app.use(function (req, res, next) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      next();
    });
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

    IndexRoute.create(router);
    DevicesRoute.create(router, this._unitOfWork, this._deviceManager);
    UtilsRoute.create(router);

    //use router middleware
    this.app.use("/api/v1/", router);
  }
}

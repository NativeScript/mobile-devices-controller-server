import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as express from "express";
import * as logger from "morgan";
import * as path from "path";
import errorHandler = require("errorhandler");
import methodOverride = require("method-override");
import mongoose = require("mongoose"); //import mongoose

//routes
import { IndexRoute } from "./routes/index";
import { UsersRoute } from "./routes/users-route";
import { DevicesRoute } from "./routes/devices-route";

//interfaces
import { IUser } from "./interfaces/user"; //import IUser
import { IDevice } from "./interfaces/device"; //import IUser

//models
import { IModel } from "./models/model"; //import IModel

import { IUserModel } from "./models/user"; //import IUserModel
import { IDeviceModel } from "./models/device"; //import IUserModel

//schemas
import { userSchema } from "./schemas/user"; //import userSchema
import { deviceSchema } from "./schemas/device"; //import userSchema

/**
 * The server.
 *
 * @class Server
 */
export class Server {

  public app: express.Application;

  private model: IModel; //an instance of IModel

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
    //instance defaults
    this.model = Object(); //initialize this to an empty object

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
    const MONGODB_CONNECTION: string = "mongodb://localhost:27017/devices";

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

    //use q promises
    global.Promise = require("q").Promise;
    mongoose.Promise = global.Promise;

    //connect to mongoose
    let connection: mongoose.Connection = mongoose.createConnection(MONGODB_CONNECTION);
    //connection.dropDatabase();
    //create models
    this.model.user = connection.model<IUserModel>("User", userSchema);
    this.model.device = connection.model<IDeviceModel>("Device", deviceSchema);
    await this.model.device.db.dropDatabase();
    // catch 404 and forward to error handler
    this.app.use(function (err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
      err.status = 404;
      next(err);
    });

    //error handling
    this.app.use(errorHandler());

    await DevicesRoute.refreshData(this.model);
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
    UsersRoute.create(router, this.model);
    DevicesRoute.create(router, this.model);

    //use router middleware
    this.app.use(router);
  }

}
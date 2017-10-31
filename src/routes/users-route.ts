import { NextFunction, Request, Response, Router } from "express";
import { BaseRoute } from "./route";
import { IUnitOfWork } from "mobile-devices-manager";

/**
 * / route
 *
 * @class User
 */
export class UsersRoute extends BaseRoute {

  /**
   * Create the routes.
   *
   * @class IndexRoute
   * @method create
   * @static
   */
  public static create(router: Router, repository: IUnitOfWork) {
    //log
    // model.user.create({name:"test1"});
    // model.user.create({name:"test2"});
    // model.user.create({name:"test3"});
    // model.user.create({name:"test4"}).catch((er)=>{
    //   console.log(er);
    // });


    router.get("/users", (req: Request, res: Response, next: NextFunction) => {
      // repository.users.find((error, users) => {
      //   res.json(users);
      // });
    });
  }

  /**
   * Constructor
   *
   * @class IndexRoute
   * @constructor
   */
  constructor() {
    super();
  }

  /**
   * The home page route.
   *
   * @class IndexRoute
   * @method index
   * @param req {Request} The express Request object.
   * @param res {Response} The express Response object.
   * @next {NextFunction} Execute the next method.
   */
  public get(req: Request, res: Response, next: NextFunction) {
    //set custom title
    this.title = "Home";

    //set message
    let options: Object = {
      "message": "Welcome to the mobile devices controll server"
    };

    //render template
    this.render(req, res, "index", options);
  }
}
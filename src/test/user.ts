import { suite, test } from "mocha-typescript";

@suite
class UserTest {

  //store test data

  //the User model
  public static before() {
    //require chai and use should() assertions
    let chai = require("chai");
    chai.should();
  }

  constructor() {

  }

  @test("should create a new User")
  public create() {
  }
}
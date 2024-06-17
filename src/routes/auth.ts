import { addUser, checkIfUserExists, deleteUser, editUser, getAllUsers, registerUser, resetPassword, sendResetPasswordRequest } from "../controllers/userManagement/auth";
import { bucket, verifyToken, verifyTokenFactSheetMember, verifyTokenRiskMember } from "../controllers/common";
import { deleteTrade, editTrade } from "../controllers/operations/trades";
import { uploadToBucket } from "./reports/reports";
import { CookieOptions, NextFunction, Router } from "express";
import { Request, Response } from "express";
import { readUsersSheet } from "../controllers/operations/readExcel";
const bcrypt = require("bcrypt");
const saltRounds: any = process.env.SALT_ROUNDS;
const authRouter = Router();

authRouter.get("/auth", uploadToBucket.any(), verifyTokenFactSheetMember, async (req: any, res: Response, next: NextFunction) => {
  res.send({ status: 200, accessRole: req.accessRole });
});
authRouter.get("/users", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let result = await getAllUsers();
    res.send(result);
  } catch (error) {
    res.send(404);
  }
});

authRouter.post("/login", uploadToBucket.any(), async (req: Request, res: Response, next: NextFunction) => {
  let data = req.body;
  let email = data.email;
  let password = data.password;

  let user = await checkIfUserExists(email, password);
  let cookie: CookieOptions = {
    maxAge: 3 * 24 * 60 * 60 * 1000,
    httpOnly: process.env.PRODUCTION === "production",
    secure: process.env.PRODUCTION === "production", // Set to true if using HTTPS
    sameSite: "lax",
  };

  res.cookie("triada.admin.cookie", user, cookie);
  res.send(user);
});

authRouter.post("/sign-up", async (req: Request, res: Response, next: NextFunction) => {
  let data = req.body;
  let email = data.email;
  let password = data.password;
  let verificationCode = data.verificationCode;
  let result = await registerUser(email, password, verificationCode);
  console.log(result);
  res.send(result);
});
authRouter.post("/send-reset-code", async (req: Request, res: Response, next: NextFunction) => {
  let data = req.body;
  let result = await sendResetPasswordRequest(data.email);
  res.send(result);
});

authRouter.post("/reset-password", async (req: Request, res: Response, next: NextFunction) => {
  let data = req.body;
  let result = await resetPassword(data.email, data.code, data.password);

  res.send(result);
});

authRouter.post("/edit-user", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let action: any = await editUser(req.body);

    if (action.error) {
      res.send({ error: action.error });
    } else {
      res.send({ error: action.error });
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "something is not correct, check error log records" });
  }
});
authRouter.post("/delete-user", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    let action: any = await deleteUser(data["_id"], data["name"], data["email"]);
    if (action.error) {
      res.send({ error: action.error, status: 404 });
    } else {
      res.send({ message: "success", status: 200 });
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Unexpected Error" });
  }
});
authRouter.post("/add-user", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    if (data.email && data.name && data.shareClass && data.accessRole) {
      let action = await addUser(req.body);
      let result = await sendResetPasswordRequest(req.body.email);
      if (action.error) {
        res.send({ error: action.error });
      } else {
        res.sendStatus(200);
      }
    } else {
      res.send({ error: "Something is not correct, check error log records" });
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Something is not correct, check error log records" });
  }
});
authRouter.post("/add-users", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const fileName = req.files[0].filename;
    const path = bucket + fileName;
    let users = await readUsersSheet(path);
  } catch (error) {
    res.send({ error: "fatal error" });
  }
});

authRouter.post("/send-fact-sheet-welcome", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let result = await getAllUsers();
    res.send(result);
  } catch (error) {
    res.send(404);
  }
});

export default authRouter;

import { checkIfUserExists, editUser, getAllUsers, registerUser, resetPassword, sendResetPasswordRequest } from "../controllers/auth";
import { verifyToken } from "../controllers/common";
import { editTrade } from "../controllers/operations/trades";
import { uploadToBucket } from "./reports/portfolio";
import { CookieOptions, NextFunction, Router } from "express";
import { Request, Response } from "express";

const authRouter = Router();

authRouter.get("/auth", uploadToBucket.any(), verifyToken, async (req: any, res: Response, next: NextFunction) => {
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

export default authRouter;

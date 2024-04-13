import { checkIfUserExists, registerUser, resetPassword, sendResetPasswordRequest } from "../controllers/auth";
import { verifyToken } from "../controllers/common";
import { uploadToBucket } from "./reports/portfolio";
import { CookieOptions, NextFunction, Router } from "express";
import { Request, Response } from "express";


const authRouter = Router();

authRouter.get("/auth", uploadToBucket.any(), verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  res.sendStatus(200);
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
  console.log(user)
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
    console.log(data, "x");
    console.log(data.email);
    let result = await sendResetPasswordRequest(data.email);
    console.log(result);
    res.send(result);
  });
  
  authRouter.post("/reset-password", async (req: Request, res: Response, next: NextFunction) => {
    let data = req.body;
    let result = await resetPassword(data.email, data.code, data.password);
  
    res.send(result);
  });
  


export default authRouter;
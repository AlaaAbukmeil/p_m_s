import { addUser, checkIfUserExists, checkLinkRight, checkPasswordStrength, checkUserRight, deleteUser, editUser, getAllUsers, getUserByEmail, registerUser, resetPassword, sendResetPasswordRequest, updateUser } from "../controllers/userManagement/auth";
import { bucketPublic, bucketPublicBucket, generateSignedUrl, verifyToken, verifyTokenFactSheetMember } from "../controllers/common";
import { CookieOptions, NextFunction, Router } from "express";
import { Request, Response } from "express";
import { readUsersSheet } from "../controllers/operations/readExcel";
import { getDateTimeInMongoDBCollectionFormat } from "../controllers/reports/common";
import { numberOfNewTrades } from "../controllers/operations/trades";
import { bucketPublicTest, multerTest, uploadToBucket } from "../controllers/userManagement/tools";
const bcrypt = require("bcrypt");
const saltRounds: any = process.env.SALT_ROUNDS;
const authRouter = Router();

authRouter.get("/auth", uploadToBucket.any(), verifyTokenFactSheetMember, async (req: any, res: Response, next: NextFunction) => {
  let test = await checkUserRight(req.email, req.accessRole, req.shareClass);

  if (test == false && req.link == true) {
    test = await checkLinkRight(req.token, req.accessRole, req.shareClass, req.query.email);
  }
  if (test) {
    let investorReports: any = {
      a2: "https://storage.googleapis.com/public_triada_admin/files_to_be_shared/Triada%20Investment%20Report%20-%20A2%20-%20July%202024.pdf",
      a3: "https://storage.googleapis.com/public_triada_admin/files_to_be_shared/Triada%20Investment%20Report%20-%20A3%20-%20July%202024.pdf",
      a4: "https://storage.googleapis.com/public_triada_admin/files_to_be_shared/Triada%20Investment%20Report%20-%20A4%20-%20July%202024.pdf",
      a5: "https://storage.googleapis.com/public_triada_admin/files_to_be_shared/Triada%20Investment%20Report%20-%20A5%20-%20July%202024.pdf",
      a6: "https://storage.googleapis.com/public_triada_admin/files_to_be_shared/Triada%20Investment%20Report%20-%20A6%20-%20July%202024.pdf",
    };
    let final: any = {};
    for (let key in investorReports) {
      if (req.shareClass.toString().includes(key) || req.accessRole == "admin" || req.accessRole == "member (risk report)") {
        final[key] = investorReports[key];
      }
    }
    let newTrades = await numberOfNewTrades();
    res.send({ status: 200, accessRole: req.accessRole, shareClass: req.shareClass, newTrades: newTrades, investorReports: final });
  } else {
    res.sendStatus(401);
  }
});

authRouter.get("/users", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let result = await getAllUsers();
    res.send(result);
  } catch (error) {
    res.send(404);
  }
});

authRouter.get("/user", verifyTokenFactSheetMember, async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let selected = req.query.selected && req.query.selected != "" ? req.query.selected : req.email;

    if (!selected) {
      res.send(401);
    } else {
      let result = await getUserByEmail(selected);

      res.send(result);
    }
  } catch (error) {
    res.send(404);
  }
});

authRouter.post("/login", uploadToBucket.any(), async (req: Request, res: Response, next: NextFunction) => {
  let data = req.body;
  let email = data.email.toLocaleLowerCase().trim();
  let password = data.password;

  let user: any = await checkIfUserExists(email, password);

  let cookie: CookieOptions = {
    maxAge: 3 * 24 * 60 * 60 * 1000,
    httpOnly: process.env.PRODUCTION === "production",
    secure: process.env.PRODUCTION === "production", // Set to true if using HTTPS
    sameSite: "lax",
    path: "/",
    domain: ".triadacapital.com",
  };
  res.cookie("triada.admin.cookie", user, cookie);

  res.send(user);
});

authRouter.post("/logout", uploadToBucket.any(), async (req: Request, res: Response, next: NextFunction) => {
  res.clearCookie("triada.admin.cookie", {
    maxAge: 3 * 24 * 60 * 60 * 1000,
    httpOnly: process.env.PRODUCTION === "production",
    secure: process.env.PRODUCTION === "production", // Set to true if using HTTPS
    sameSite: "lax",
    path: "/",
    domain: ".triadacapital.com",
  });

  res.send("Cookie cleared successfully");
});

authRouter.post("/sign-up", async (req: Request, res: Response, next: NextFunction) => {
  let data = req.body;
  let email = data.email.toLowerCase();
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
  let passwordCheck = checkPasswordStrength(data.password);
  if (passwordCheck == true) {
    let result = await resetPassword(data.email, data.code, data.password);
    res.send(result);
  } else {
    res.send({ message: passwordCheck });
  }
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
      req.body.welcome = true;
      let action = await addUser(req.body);
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

authRouter.post("/send-fact-sheet-welcome", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let result = await getAllUsers();
    res.send(result);
  } catch (error) {
    res.send(404);
  }
});

authRouter.post("/user-upload-files", verifyTokenFactSheetMember, multerTest.any(), async (req: Request | any, res: Response, next: any) => {
  try {
    const files = req.files;
    let userInfo = await getUserByEmail(req.email);
    const purpose = req.body["files-purpose"];
    userInfo.files = userInfo.files ? userInfo.files : [];
    let newFileNames: any = [];

    const uploadFile = (file: any) => {
      return new Promise((resolve, reject) => {
        const blob = bucketPublicTest.file(file.originalname);
        newFileNames.push(file.originalname);
        const blobStream = blob.createWriteStream();

        blobStream.on("error", (err: any) => {
          reject(err);
        });

        blobStream.on("finish", () => {
          const publicUrl = `${bucketPublic}/${blob.name}`;
          userInfo.files.push({
            name: file.originalname,
            link: publicUrl,
            purpose: purpose,
            createdOn: getDateTimeInMongoDBCollectionFormat(new Date()) + " HKT",
          });
          resolve(null);
        });

        blobStream.end(file.buffer);
      });
    };

    // Await all file uploads
    await Promise.all(files.map((file: any) => uploadFile(file)));

    console.log(userInfo.name, userInfo.files.length);
    const action = await updateUser(userInfo, newFileNames);
    res.send(action);
  } catch (error) {
    console.log(error);
    res.send({ error: error });
  }
});
export default authRouter;

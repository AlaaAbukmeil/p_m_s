import { addContact, addUser, checkIfUserExists, checkLinkRight, checkPasswordStrength, checkUserRight, deleteContact, deleteUser, editContact, editUser, getAllContacts, getAllUsers, getUserByEmail, registerUser, resetPassword, sendResetPasswordRequest, updateUser } from "../../controllers/userManagement/auth";
import { bucketPublic, bucketPublicBucket, generateSignedUrl, verifyToken, verifyTokenFactSheetMember } from "../../controllers/common";
import { CookieOptions, NextFunction, Router } from "express";
import { Request, Response } from "express";
import { getDateTimeInMongoDBCollectionFormat } from "../../controllers/reports/common";
import { deleteTrade, editTrade, numberOfNewTrades } from "../../controllers/operations/trades";
import { bucketPublicTest, multerTest, uploadToBucket } from "../../controllers/userManagement/tools";
import { getTrades } from "../../controllers/reports/trades";
import { deleteInvestorsTrade, editInvestorTrade, getInvestorsTrades } from "../../controllers/userManagement/investorsTrades";
const authContactRouter = Router();

authContactRouter.get("/contacts", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let type: any = req.query.type || "people";
    let result = await getAllContacts(type);
    res.send(result);
  } catch (error) {
    res.send(404);
  }
});

authContactRouter.post("/edit-contact", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    console.log({ req: req.body });
    let action: any = await editContact(req.body);

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

authContactRouter.post("/delete-contact", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    let action: any = await deleteContact(data["id"], data["type"]);
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

authContactRouter.post("/add-contact", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    console.log(req.body);
    let action = await addContact(req.body);
    if (action.error) {
      res.send({ error: action.error });
    } else {
      res.sendStatus(200);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Something is not correct, check error log records" });
  }
});

authContactRouter.get("/investors-trades", verifyToken, async (req, res) => {
  try {
    let trades = await getInvestorsTrades();
    res.send(trades);
  } catch (error) {
    console.log({error})
    res.status(500).send("An error occurred while reading the file.");
  }
});

authContactRouter.post("/edit-investors-trade", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let action = await editInvestorTrade(req.body);
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

authContactRouter.post("/delete-investors-trade", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    let action: any = await deleteInvestorsTrade(data["id_trade"]);
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

export default authContactRouter;

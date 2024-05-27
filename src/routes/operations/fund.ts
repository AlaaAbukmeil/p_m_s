import { Router } from "express";
import { verifyToken } from "../../controllers/common";
import { uploadToBucket } from "../reports/reports";
import { Request, Response, NextFunction } from "express";
import { addFund, deleteFund, editFund } from "../../controllers/operations/fund";

const fundRouter = Router();

fundRouter.post("/edit-fund", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let action = await editFund(req.body);

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Something is not correct, check error log records" });
  }
});

fundRouter.post("/delete-fund", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    console.log(req.body, "before");
    let action = await deleteFund(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Something is not correct, check error log records" });

  }
});

fundRouter.post("/add-fund", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    console.log(req.body, "before");
    let action = await addFund(req.body);
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

export default fundRouter
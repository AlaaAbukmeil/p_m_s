import { bucket, generateSignedUrl, verifyToken } from "../controllers/common";
import { uploadToBucket } from "./reports/reports";
import { NextFunction, Router } from "express";
import { Request, Response } from "express";
import { readMUFGReconcileFile, readNomuraReconcileFile, uploadArrayAndReturnFilePath } from "../controllers/operations/readExcel";
import { reconcileMUFG, reconcileNomura } from "../controllers/operations/reconcile";
import { getPortfolioOnSpecificDate } from "../controllers/reports/portfolios";

const reconcileRouter = Router();

reconcileRouter.post("/check-mufg", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let collectionDate: string = req.body.collectionDate;
    let files = req.files[0];

    let portfolio = await getPortfolioOnSpecificDate(collectionDate);
    let data: any = [];
    if (files) {
      const fileName = req.files[0].filename;
      const path = await generateSignedUrl(fileName);

      data = await readMUFGReconcileFile(path);
    }

    if (data?.error) {
      res.send({ error: data.error });
    } else {
      let action = await reconcileMUFG(data, portfolio.portfolio);
      if (action.error) {
        res.send({ error: action.error });
      } else {
        let link = await uploadArrayAndReturnFilePath(action, `mufg_check_${collectionDate}`, "mufg_check");
        let downloadEBlotName = bucket + link + "?authuser=2";
        res.send(downloadEBlotName);
      }
    }
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

reconcileRouter.post("/check-nomura", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let collectionDate: string = req.body.collectionDate;
    let files = req.files[0];

    let portfolio = await getPortfolioOnSpecificDate(collectionDate);
    let data: any = [];
    if (files) {
      const fileName = req.files[0].filename;
      const path = await generateSignedUrl(fileName);

      data = await readNomuraReconcileFile(path);
    }

    if (data?.error) {
      res.send({ error: data.error });
    } else {
      let action = await reconcileNomura(data, portfolio.portfolio);
      if (action.error) {
        res.send({ error: action.error });
      } else {
        let link = await uploadArrayAndReturnFilePath(action, `nomura_check_${collectionDate}`, "nomura_check");
        let downloadEBlotName = bucket + link + "?authuser=2";
        res.send(downloadEBlotName);
      }
    }
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});
export default reconcileRouter;

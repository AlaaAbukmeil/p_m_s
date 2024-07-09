import { bucket, generateSignedUrl, verifyToken } from "../../controllers/common";
import { uploadToBucket } from "../reports/reports";
import { NextFunction, Router } from "express";
import { Request, Response } from "express";
import { readMUFGReconcileFile, readNomuraReconcileFile, uploadArrayAndReturnFilePath } from "../../controllers/operations/readExcel";
import { reconcileMUFG, reconcileNomura } from "../../controllers/operations/reconcile";
import { getPortfolioOnSpecificDate, getPrincipal } from "../../controllers/reports/portfolios";
import { monthlyRlzdDate } from "../../controllers/reports/common";

const reconcileRouter = Router();

reconcileRouter.post("/check-mufg", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let collectionDate: string = req.body.collectionDate || new Date().toString();
    let files = req.files[0];

    let portfolio: any = await getPortfolioOnSpecificDate(collectionDate);
    let thisMonth = monthlyRlzdDate(collectionDate);
    console.log(collectionDate, thisMonth, "collectionDate");

    portfolio.portfolio = portfolio.portfolio.filter((position: any) => {
      if (position["Notional Amount"] == 0) {
        let monthsTrades = Object.keys(position["MTD Rlzd"] || {});
        for (let index = 0; index < monthsTrades.length; index++) {
          monthsTrades[index] = monthlyRlzdDate(monthsTrades[index]);
        }
        if (monthsTrades.includes(thisMonth)) {
          return position;
        }
      } else {
        return position;
      }
    });
    let portfolioWithPrincipal: any = getPrincipal(portfolio.portfolio).portfolio;

    let data: any = [];
    if (files) {
      const fileName = req.files[0].filename;
      const path = await generateSignedUrl(fileName);

      data = await readMUFGReconcileFile(path);
    }

    if (data?.error) {
      res.send({ error: data.error });
    } else {
      let action = await reconcileMUFG(data, portfolioWithPrincipal);
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
      console.log(portfolio.portfolio);
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

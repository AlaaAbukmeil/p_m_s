import { bucket, generateSignedUrl, verifyToken } from "../../controllers/common";
import { NextFunction, Router } from "express";
import { Request, Response } from "express";
import { readMUFGReconcileFile, readNomuraCashReport, readNomuraReconcileFile, uploadArrayAndReturnFilePath, uploadArrayAndReturnFilePathTwoDifferentWorkbooks } from "../../controllers/operations/readExcel";
import { reconcileMUFG, reconcileNomura, reconcileNomuraCash } from "../../controllers/operations/reconcile/reconcile";
import { getPortfolioOnSpecificDate, getPrincipal } from "../../controllers/reports/portfolios";
import { monthlyRlzdDate } from "../../controllers/reports/common";
import { uploadToBucket } from "../../controllers/userManagement/tools";

const reconcileRouter = Router();

reconcileRouter.post("/check-mufg", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let collectionDate: string = req.body.collectionDate || new Date().toString();
    let files = req.files[0];

    let portfolio: any = await getPortfolioOnSpecificDate(collectionDate, "true");
    let thisMonth = monthlyRlzdDate(collectionDate);
    console.log(collectionDate, thisMonth, "collectionDate");

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

    let portfolio = await getPortfolioOnSpecificDate(collectionDate, "true");

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

reconcileRouter.post("/reconcile-cash", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const fileName = req.files[0].filename;
    const path = await generateSignedUrl(fileName);
    let collectionDate = req.body.collectionDate;
    let link = bucket + "/" + fileName + "?authuser=2";
    let start = new Date(req.body.timestamp_start).getTime();
    let end = new Date(req.body.timestamp_end).getTime();
    let portfolioId = "portfolio-main";

    let action: any = await reconcileNomuraCash({ path, collectionDate, start, end, portfolioId });
    if (action.error) {
      res.send({ error: action.error });
    } else {
      let link = await uploadArrayAndReturnFilePathTwoDifferentWorkbooks({ fxInterest: action.fxInterest, redeemped: action.redeemped, couponPayments: action.couponPayments, tradesCheck: action.tradesCheck, pathName: `nomura_cash_reconcile_${collectionDate}`, folderName: "reconcile_cash", type: "xlsx" });
      let downloadEBlotName = bucket + link + "?authuser=2";
      res.send(downloadEBlotName);
    }
  } catch (error: any) {
    res.send({ error: error.toString() });
  }
});
export default reconcileRouter;

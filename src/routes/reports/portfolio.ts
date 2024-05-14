import { NextFunction, Router, Response, Request } from "express";
import { verifyToken, generateRandomString, bucket } from "../../controllers/common";
import { getDateTimeInMongoDBCollectionFormat, monthlyRlzdDate } from "../../controllers/reports/common";
import { getPortfolioWithAnalytics } from "../../controllers/reports/portfolios";
import { getPortfolio } from "../../controllers/operations/positions";

require("dotenv").config();

const multerGoogleStorage = require("multer-google-storage");
const multer = require("multer");
export const uploadToBucket = multer({
  storage: multerGoogleStorage.storageEngine({
    autoRetry: true,
    bucket: process.env.BUCKET,
    projectId: process.env.PROJECTID,
    keyFilename: process.env.KEYPATHFILE,
    filename: (req: Request, file: any, cb: (err: boolean, fileName: string) => void) => {
      cb(false, `/v2/${generateRandomString(6)}_${file.originalname.replace(/[!@#$%^&*(),?":{}|<>/\[\]\\;'\-=+`~ ]/g, "_")}`);
    },
  }),
});

const router = Router();

router.get("/portfolio", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let date: any = req.query.date;
    if (date.includes("NaN")) {
      date = getDateTimeInMongoDBCollectionFormat(new Date());
    }

    let sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMTDPl" | any = req.query.sort || "order";
    let sign: any = req.query.sign || 1;
    let conditions: any = req.query || {};
    let report: any = await getPortfolioWithAnalytics(date, sort, sign, conditions, "back office", null);

    if (report.error) {
      res.send({ error: report.error });
    } else {
      res.send(report);
    }
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

router.get("/summary-portfolio", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let date: any = req.query.date;
    let sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMTDPl" | "groupDV01Sum" | "groupDayPriceMoveSum" | "groupMTDPriceMoveSum" | any = req.query.sort || "order";
    let sign: any = req.query.sign || 1;
    let conditions: any = req.query || {};
    

    if (date.includes("NaN")) {
      date = getDateTimeInMongoDBCollectionFormat(new Date());
    }

    date = getDateTimeInMongoDBCollectionFormat(new Date(date)).split(" ")[0] + " 23:59";
    let report = await getPortfolioWithAnalytics(date, sort, sign, conditions, "front office", null);
    if (report.error) {
      res.send({ error: report.error });
    } else {
      res.send(report);
    }
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

router.get("/summary-exposure-portfolio", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let date: any = req.query.date;
    let sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMTDPl" | "groupDV01Sum" | "groupDayPriceMoveSum" | "groupMTDPriceMoveSum" | "groupCallDate" | "groupMaturity" | any = req.query.sort || "order";
    let sign: any = req.query.sign || 1;
    let conditions: any = req.query || {};
    // console.log(conditions)

    if (date.includes("NaN")) {
      date = getDateTimeInMongoDBCollectionFormat(new Date());
    }

    date = getDateTimeInMongoDBCollectionFormat(new Date(date)).split(" ")[0] + " 23:59";
    let report = await getPortfolioWithAnalytics(date, sort, sign, conditions, "exposure", null);
    if (report.error) {
      res.send({ error: report.error });
    } else {
      res.send(report);
    }
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

router.get("/performers-portfolio", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let date: any = req.query.date;
    let conditions: any = req.query || {};
    let sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMTDPl" | "groupDV01Sum" | "groupDayPriceMoveSum" | "groupMTDPriceMoveSum" | any = req.query.sort || "order";
    let type: null | "pl" | "price move" | any = req.query.type;
    let view: "front office" | "back office" | any = req.query.view;
    let sign: any = req.query.sign || 1;

    if (date.includes("NaN")) {
      date = getDateTimeInMongoDBCollectionFormat(new Date());
    }

    date = getDateTimeInMongoDBCollectionFormat(new Date(date)).split(" ")[0] + " 23:59";
    let report = await getPortfolioWithAnalytics(date, sort, sign, conditions, view, type);
    if (report.error) {
      res.send({ error: report.error });
    } else {
      res.send(report);
    }
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

router.get("/risk-report", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let date: any = req.query.date;
    let sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMTDPl" | "groupDV01Sum" | "groupDayPriceMoveSum" | "groupMTDPriceMoveSum" | any = req.query.sort || "order";
    let sign: any = req.query.sign || 1;

    if (date.includes("NaN")) {
      date = getDateTimeInMongoDBCollectionFormat(new Date());
    }

    date = getDateTimeInMongoDBCollectionFormat(new Date(date)).split(" ")[0] + " 23:59";
    let report = await getPortfolioWithAnalytics(date, sort, sign, null, "front office", null);

    res.send(report);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

router.post("/one-time", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let portfolio = await getPortfolio();
  console.log(portfolio);
  res.send(200);
});

export default router;

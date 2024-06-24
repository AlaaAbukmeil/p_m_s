import { NextFunction, Router, Response, Request } from "express";
import { verifyToken, generateRandomString, verifyTokenRiskMember, verifyTokenFactSheetMember } from "../../controllers/common";
import { getDateTimeInMongoDBCollectionFormat, getLastDayOfMonth, monthlyRlzdDate } from "../../controllers/reports/common";
import { getPortfolioWithAnalytics } from "../../controllers/reports/portfolios";
import { calculateBetaCorrelationBenchMarks, calculateMonthlyReturn, calculateOutPerformance, calculateOutPerformanceParam, calculateRatios, calculateRegression, calculateRiskRatios, getFactSheet, getFactSheetData, getTreasuryAnnulizedReturn, trimFactSheetData, uploadFSData } from "../../controllers/reports/factSheet";
import { getEarliestCollectionName, getMonthName } from "../../controllers/reports/tools";

require("dotenv").config();
let shareClasses = ["a2", "a3", "a4", "a5", "a6", "ma2", "ma3", "ma4", "ma6"];
const multerGoogleStorage = require("multer-google-storage");
const multer = require("multer");
export const uploadToBucket = multer({
  storage: multerGoogleStorage.storageEngine({
    autoRetry: true,
    bucket: process.env.BUCKET,
    projectId: process.env.PROJECTID,
    keyFilename: process.env.KEYPATHFILE,
    filename: (req: Request, file: any, cb: (err: boolean, fileName: string) => void) => {
      cb(false, `v2/${generateRandomString(6)}_${file.originalname.replace(/[!@#$%^&*(),?":{}|<>/\[\]\\;'\-=+`~ ]/g, "_")}`);
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

router.get("/risk-report", verifyTokenRiskMember, async (req: Request, res: Response, next: NextFunction) => {
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

router.get("/fact-sheet", uploadToBucket.any(), verifyTokenFactSheetMember, async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let sign = 1;
    let sort = "order";
    let type = req.query.type;
    let shareClass = req.shareClass;
    let accessRole = req.accessRole;
    if (accessRole == "member (factsheet report)" && !shareClass.includes(type)) {
      res.sendStatus(401);
    } else {
      if (accessRole != "member (factsheet report)") {
        type = shareClasses.includes(type) ? type : "a2";
      }

      const now = new Date();
      const from2015: any = new Date("2015-04-01").getTime();
      const to2020 = new Date("2020-12-31").getTime();
      const from2020 = new Date("2020-11-01").getTime();

      const to2YearsAgo = new Date("2022-12-31").getTime();
      const from2YearsAgo = new Date("2022-11-01").getTime();

      let inception = await getFactSheet({ from: from2015, to: now, type, inception: true });
      let fiveYears = await getFactSheet({ from: from2015, to: to2020, type, inception: false });
      let twoYears = await getFactSheet({ from: from2YearsAgo, to: now, type, inception: false });
      let chinaPeriod = await getFactSheet({ from: from2020, to: to2YearsAgo, type, inception: false });
      let lastDayOfThisMonth = getLastDayOfMonth(inception.lastDateTimestamp);
      let countrySectorMacro = await getPortfolioWithAnalytics(lastDayOfThisMonth, sort, sign, null, "fact sheet", null);

      res.send({ countrySectorMacro: countrySectorMacro, inception: inception, fiveYears: fiveYears, twoYears: twoYears, chinaPeriod: chinaPeriod });
    }
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

export default router;

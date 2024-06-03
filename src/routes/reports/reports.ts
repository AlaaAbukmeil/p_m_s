import { NextFunction, Router, Response, Request } from "express";
import { verifyToken, generateRandomString, bucket, verifyTokenRiskMember, verifyTokenFactSheetMember } from "../../controllers/common";
import { getDateTimeInMongoDBCollectionFormat, monthlyRlzdDate } from "../../controllers/reports/common";
import { getPortfolioWithAnalytics } from "../../controllers/reports/portfolios";
import { getPortfolio } from "../../controllers/operations/positions";
import { calculateMonthlyReturn, calculateOutPerformance, calculateOutPerformanceParam, getFactSheetData, uploadFSData } from "../../controllers/reports/factSheet";

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
router.get("/fact-sheet", verifyTokenFactSheetMember, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let date = getDateTimeInMongoDBCollectionFormat(new Date());
    let sign = 1;
    let sort = "order";
    let data = await getFactSheetData("Triada");
    let legatruu = await getFactSheetData("LEGATRUU Index");
    let emustruu = await getFactSheetData("EMUSTRUU Index");
    let beuctruu = await getFactSheetData("BEUCTRUU Index");
    let beuytruu = await getFactSheetData("BEUYTRUU Index");
    let lg30truu = await getFactSheetData("LG30TRUU Index");

    let result = calculateMonthlyReturn(data, ["a2"]);
    let result_lg30truu = calculateMonthlyReturn(lg30truu, ["main"]);
    let result_beuctruu = calculateMonthlyReturn(beuctruu, ["main"]);
    let result_beuytruu = calculateMonthlyReturn(beuytruu, ["main"]);
    let result_emustruu = calculateMonthlyReturn(emustruu, ["main"]);
    let result_legatruu = calculateMonthlyReturn(legatruu, ["main"]);

    let countrySectorMacro = await getPortfolioWithAnalytics(date, sort, sign, null, "fact sheet", null);
    let benchmarks = { "LG30TRUU Index": result_lg30truu.monthlyReturns["main"], "BEUCTRUU Index": result_beuctruu.monthlyReturns["main"], "EMUSTRUU Index": result_emustruu.monthlyReturns["main"], "LEGATRUU Index": result_legatruu.monthlyReturns["main"], "BEUYTRUU Index": result_beuytruu.monthlyReturns["main"] };
    let annulizedReturns = { "LG30TRUU Index": result_lg30truu.annulizedReturn["main"]["annualPer"], "BEUCTRUU Index": result_beuctruu.annulizedReturn["main"]["annualPer"], "EMUSTRUU Index": result_emustruu.annulizedReturn["main"]["annualPer"], "LEGATRUU Index": result_legatruu.annulizedReturn["main"]["annualPer"], "BEUYTRUU Index": result_beuytruu.annulizedReturn["main"]["annualPer"] };
    let cumulativeReturns = { "LG30TRUU Index": result_lg30truu.cumulativeReturn["main"] - 1, "BEUCTRUU Index": result_beuctruu.cumulativeReturn["main"] - 1, "EMUSTRUU Index": result_emustruu.cumulativeReturn["main"] - 1, "LEGATRUU Index": result_legatruu.cumulativeReturn["main"] - 1, "BEUYTRUU Index": result_beuytruu.cumulativeReturn["main"] - 1 };
    let outPerformance = calculateOutPerformance({ benchmarks: benchmarks, data: result.monthlyReturns["a2"] });
    let annulizedReturnBenchMarks = calculateOutPerformanceParam({ benchmarks: annulizedReturns, data: result.annulizedReturn["a2"]["annualPer"] });
    let cumulativeReturnsBenchMarks = calculateOutPerformanceParam({ benchmarks: cumulativeReturns, data: result.cumulativeReturn["a2"] - 1 });

    res.send({ countrySectorMacro: countrySectorMacro, result: result, outPerformance: outPerformance, annulizedReturnBenchMarks: annulizedReturnBenchMarks, cumulativeReturnsBenchMarks: cumulativeReturnsBenchMarks });
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});
router.post("/fact-sheet-test", async (req: Request, res: Response, next: NextFunction) => {
  let test = await uploadFSData();
  console.log(test);
});

export default router;

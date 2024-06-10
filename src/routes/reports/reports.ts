import { NextFunction, Router, Response, Request } from "express";
import { verifyToken, generateRandomString, bucket, verifyTokenRiskMember, verifyTokenFactSheetMember } from "../../controllers/common";
import { getDateTimeInMongoDBCollectionFormat, monthlyRlzdDate } from "../../controllers/reports/common";
import { getPortfolioWithAnalytics } from "../../controllers/reports/portfolios";
import { calculateBetaCorrelationBenchMarks, calculateMonthlyReturn, calculateOutPerformance, calculateOutPerformanceParam, calculateRatios, calculateRegression, calculateRiskRatios, getFactSheetData, uploadFSData } from "../../controllers/reports/factSheet";
import { getMonthName } from "../../controllers/reports/tools";

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
    let type: "a2" | "a3" | "a4" | "a5" | "a6" | any = req.query.type || "a2";
    let data = await getFactSheetData("Triada");
    let legatruu = await getFactSheetData("LEGATRUU Index");
    let emustruu = await getFactSheetData("EMUSTRUU Index");
    let beuctruu = await getFactSheetData("BEUCTRUU Index");
    let beuytruu = await getFactSheetData("BEUYTRUU Index");
    let lg30truu = await getFactSheetData("LG30TRUU Index");
    let countrySectorMacro = await getPortfolioWithAnalytics(date, sort, sign, null, "fact sheet", null);
    let lastDate = getMonthName(data[data.length - 1].date);
    let result = calculateMonthlyReturn(data, [type]);
    let result_lg30truu = calculateMonthlyReturn(lg30truu, ["main"]);
    let result_beuctruu = calculateMonthlyReturn(beuctruu, ["main"]);
    let result_beuytruu = calculateMonthlyReturn(beuytruu, ["main"]);
    let result_emustruu = calculateMonthlyReturn(emustruu, ["main"]);
    let result_legatruu = calculateMonthlyReturn(legatruu, ["main"]);

    let benchmarks = { "LG30TRUU Index": result_lg30truu.monthlyReturns["main"], "BEUCTRUU Index": result_beuctruu.monthlyReturns["main"], "EMUSTRUU Index": result_emustruu.monthlyReturns["main"], "LEGATRUU Index": result_legatruu.monthlyReturns["main"], "BEUYTRUU Index": result_beuytruu.monthlyReturns["main"] };
    let annulizedReturns = { "LG30TRUU Index": result_lg30truu.annulizedReturn["main"]["annualPer"], "BEUCTRUU Index": result_beuctruu.annulizedReturn["main"]["annualPer"], "EMUSTRUU Index": result_emustruu.annulizedReturn["main"]["annualPer"], "LEGATRUU Index": result_legatruu.annulizedReturn["main"]["annualPer"], "BEUYTRUU Index": result_beuytruu.annulizedReturn["main"]["annualPer"] };
    let cumulativeReturns = { "LG30TRUU Index": result_lg30truu.fundReturns.cumulativeReturn["main"] - 1, "BEUCTRUU Index": result_beuctruu.fundReturns.cumulativeReturn["main"] - 1, "EMUSTRUU Index": result_emustruu.fundReturns.cumulativeReturn["main"] - 1, "LEGATRUU Index": result_legatruu.fundReturns.cumulativeReturn["main"] - 1, "BEUYTRUU Index": result_beuytruu.fundReturns.cumulativeReturn["main"] - 1 };
    let fundReturns = { "LG30TRUU Index": result_lg30truu.fundReturns, "BEUCTRUU Index": result_beuctruu.fundReturns, "EMUSTRUU Index": result_emustruu.fundReturns, "LEGATRUU Index": result_legatruu.fundReturns, "BEUYTRUU Index": result_beuytruu.fundReturns };

    let outPerformance = calculateOutPerformance({ benchmarks: benchmarks, data: result.monthlyReturns[type] });
    let annulizedReturnBenchMarks = calculateOutPerformanceParam({ benchmarks: annulizedReturns, data: result.annulizedReturn[type]["annualPer"] });
    let cumulativeReturnsBenchMarks = calculateOutPerformanceParam({ benchmarks: cumulativeReturns, data: result.fundReturns.cumulativeReturn[type] - 1 });
    let ratiosAndPositiveNegativeCorrelations = calculateRatios({ benchmarks: fundReturns, data: result.fundReturns, type: type });

    let benchmarksBeta = {
      "LG30TRUU Index": { results: result_lg30truu.returns["main"], normal: result_lg30truu.normal["main"] },
      "BEUCTRUU Index": { results: result_beuctruu.returns["main"], normal: result_beuctruu.normal["main"] },
      "EMUSTRUU Index": { results: result_emustruu.returns["main"], normal: result_emustruu.normal["main"] },
      "LEGATRUU Index": { results: result_legatruu.returns["main"], normal: result_legatruu.normal["main"] },
      "BEUYTRUU Index": { results: result_beuytruu.returns["main"], normal: result_beuytruu.normal["main"] },
    };

    let betaCorrelation = calculateBetaCorrelationBenchMarks({ benchmarks: benchmarksBeta, data: { results: result.returns[type], normal: result.normal[type] } });
    let benchmarksRiskRatios = {
      "LG30TRUU Index": { annulizedReturn: result_lg30truu.annulizedReturn["main"], maxDrawdown: result_lg30truu.maxDrawdown["main"], normal: result_lg30truu.normal["main"], negativeAnnualVolitality: result_lg30truu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["LG30TRUU Index"] },
      "BEUCTRUU Index": { annulizedReturn: result_beuctruu.annulizedReturn["main"], maxDrawdown: result_beuctruu.maxDrawdown["main"], normal: result_beuctruu.normal["main"], negativeAnnualVolitality: result_beuctruu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["BEUCTRUU Index"] },
      "EMUSTRUU Index": { annulizedReturn: result_emustruu.annulizedReturn["main"], maxDrawdown: result_emustruu.maxDrawdown["main"], normal: result_emustruu.normal["main"], negativeAnnualVolitality: result_emustruu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["EMUSTRUU Index"] },
      "LEGATRUU Index": { annulizedReturn: result_legatruu.annulizedReturn["main"], maxDrawdown: result_legatruu.maxDrawdown["main"], normal: result_legatruu.normal["main"], negativeAnnualVolitality: result_legatruu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["LEGATRUU Index"] },
      "BEUYTRUU Index": { annulizedReturn: result_beuytruu.annulizedReturn["main"], maxDrawdown: result_beuytruu.maxDrawdown["main"], normal: result_beuytruu.normal["main"], negativeAnnualVolitality: result_beuytruu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["BEUYTRUU Index"] },
    };
    let riskRatios = calculateRiskRatios({ benchmarks: benchmarksRiskRatios, fundDetails: countrySectorMacro.fundDetails });

    let benchmarksRegression = {
      "LG30TRUU Index": { results: result_lg30truu.returns["main"], annulizedReturn: result_lg30truu.annulizedReturn["main"], beta: betaCorrelation.betas["LG30TRUU Index"], correlation: betaCorrelation.correlation["LG30TRUU Index"], fundReturns: result_lg30truu.fundReturns.returnsHashTable.main },
      "BEUCTRUU Index": { results: result_beuctruu.returns["main"], annulizedReturn: result_beuctruu.annulizedReturn["main"], beta: betaCorrelation.betas["BEUCTRUU Index"], correlation: betaCorrelation.correlation["BEUCTRUU Index"], fundReturns: result_beuctruu.fundReturns.returnsHashTable.main },
      "EMUSTRUU Index": { results: result_emustruu.returns["main"], annulizedReturn: result_emustruu.annulizedReturn["main"], beta: betaCorrelation.betas["EMUSTRUU Index"], correlation: betaCorrelation.correlation["EMUSTRUU Index"], fundReturns: result_emustruu.fundReturns.returnsHashTable.main },
      "LEGATRUU Index": { results: result_legatruu.returns["main"], annulizedReturn: result_legatruu.annulizedReturn["main"], beta: betaCorrelation.betas["LEGATRUU Index"], correlation: betaCorrelation.correlation["LEGATRUU Index"], fundReturns: result_legatruu.fundReturns.returnsHashTable.main },
      "BEUYTRUU Index": { results: result_beuytruu.returns["main"], annulizedReturn: result_beuytruu.annulizedReturn["main"], beta: betaCorrelation.betas["BEUYTRUU Index"], correlation: betaCorrelation.correlation["BEUYTRUU Index"], fundReturns: result_beuytruu.fundReturns.returnsHashTable.main },
    };
    let correlationAndRegresion = calculateRegression({ benchmarks: benchmarksRegression, fundDetails: countrySectorMacro.fundDetails, data: { results: result.fundReturns.returnsHashTable[type] }, correlations: ratiosAndPositiveNegativeCorrelations, annulizedReturnBenchMarks: annulizedReturnBenchMarks });

    res.send({ countrySectorMacro: countrySectorMacro, result: result, outPerformance: outPerformance, annulizedReturnBenchMarks: annulizedReturnBenchMarks, cumulativeReturnsBenchMarks: cumulativeReturnsBenchMarks, ratios: ratiosAndPositiveNegativeCorrelations.ratios, riskRatios: riskRatios, correlationAndRegresion: correlationAndRegresion.regression, lastDate: lastDate });
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

export default router;

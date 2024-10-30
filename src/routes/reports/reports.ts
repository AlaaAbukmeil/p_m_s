import { NextFunction, Router, Response, Request } from "express";
import { verifyToken, generateRandomString, verifyTokenRiskMember, verifyTokenFactSheetMember, bucket } from "../../controllers/common";
import { getDateTimeInMongoDBCollectionFormat, getLastDayOfMonth, monthlyRlzdDate } from "../../controllers/reports/common";
import { getPortfolioWithAnalytics } from "../../controllers/reports/portfolios";
import { calculateBetaCorrelationBenchMarks, calculateMonthlyReturn, calculateOutPerformance, calculateOutPerformanceParam, calculateRatios, calculateRegression, calculateRiskRatios, getFactSheet, getFactSheetData, getTreasuryAnnulizedReturn, trimFactSheetData, uploadFSData } from "../../controllers/reports/factSheet";
import { getFactSheetDisplay } from "../../controllers/operations/commands";
import { uploadToBucket } from "../../controllers/userManagement/tools";
import { getAllTrades } from "../../controllers/reports/trades";
import { takeDateWithTimeAndReturnTimestamp } from "../../controllers/operations/tools";
import { uploadArrayAndReturnFilePath } from "../../controllers/operations/readExcel";

require("dotenv").config();
let shareClasses = ["a2", "a3", "a4", "a5", "a6", "ma2", "ma3", "ma4", "ma6"];

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
    let report = await getPortfolioWithAnalytics(date, sort, sign, conditions, "back office", null, "portfolio_main");
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
    let input: any = req.query.sort || "order";
    let sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMTDPl" | "groupDV01Sum" | "groupDayPriceMoveSum" | "groupMTDPriceMoveSum" | "groupBBTicker" = input;
    let sign: any = req.query.sign || 1;
    let conditions: any = req.query || {};

    if (date.includes("NaN")) {
      date = getDateTimeInMongoDBCollectionFormat(new Date());
    }

    date = getDateTimeInMongoDBCollectionFormat(new Date(date)).split(" ")[0] + " 23:59";

    let report = await getPortfolioWithAnalytics(date, sort, sign, conditions, "front office", null, "portfolio_main");
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
    let report = await getPortfolioWithAnalytics(date, sort, sign, conditions, "exposure", null, "portfolio_main");
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
    let report = await getPortfolioWithAnalytics(date, sort, sign, conditions, view, type, "portfolio_main");
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
    let report = await getPortfolioWithAnalytics(date, sort, sign, null, "front office", null, "portfolio_main");

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
    let disabled = await getFactSheetDisplay("view");

    if (accessRole == "member (factsheet report)" && !shareClass.includes(type)) {
      // console.log("fact sheet error", shareClass, type)
      res.sendStatus(401);
    } else {
      if (accessRole != "member (factsheet report)") {
        type = shareClasses.includes(type) ? type : "a2";
        disabled = false;
      }

      const now = new Date();
      const from2015: any = new Date("2015-04-01").getTime();
      const to2020 = new Date("2020-12-31").getTime();
      const from2020 = new Date("2020-11-01").getTime();

      const to2YearsAgo = new Date("2022-12-31").getTime();
      const from2YearsAgo = new Date("2022-11-01").getTime();

      let inception = await getFactSheet({ from: from2015, to: now, type, inception: true, mkt: false });
      let fiveYears = await getFactSheet({ from: from2015, to: to2020, type, inception: false, mkt: false });
      let twoYears = await getFactSheet({ from: from2YearsAgo, to: now, type, inception: false, mkt: true });
      let chinaPeriod = await getFactSheet({ from: from2020, to: to2YearsAgo, type, inception: false, mkt: false });
      let lastDayOfThisMonth = getLastDayOfMonth(inception.lastDateTimestamp);
      console.log({ lastDayOfThisMonth });
      let countrySectorMacro = await getPortfolioWithAnalytics(lastDayOfThisMonth, sort, sign, null, "fact sheet", null, "portfolio_main");
      res.send({ countrySectorMacro: countrySectorMacro, inception: inception, fiveYears: fiveYears, twoYears: twoYears, chinaPeriod: chinaPeriod, disabled: disabled });
    }
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString(), disabled: true });
  }
});

router.get("/fact-sheet-mkt", uploadToBucket.any(), verifyTokenFactSheetMember, async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let type = req.query.type;
    let shareClass = req.shareClass;
    let accessRole = req.accessRole;
    let disabled = await getFactSheetDisplay("view");

    if (accessRole == "member (factsheet report)" && !shareClass.includes(type)) {
      res.sendStatus(401);
    } else {
      if (accessRole != "member (factsheet report)") {
        type = shareClasses.includes(type) ? type : "a2";
        disabled = false;
      }

      const now = new Date();
      const from2015: any = new Date("2015-04-01").getTime();

      let inception = await getFactSheet({ from: from2015, to: now, type, inception: true, mkt: true });

      res.send({ inception: inception, disabled: disabled });
    }
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString(), disabled: true });
  }
});

router.get("/fact-sheet-mkt", uploadToBucket.any(), verifyTokenFactSheetMember, async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let type = req.query.type;
    let shareClass = req.shareClass;
    let accessRole = req.accessRole;
    let disabled = await getFactSheetDisplay("view");

    if ((accessRole == "member (factsheet report)" && !shareClass.includes(type)) || (accessRole == "member (factsheet report)" && !shareClass.includes("mkt"))) {
      res.sendStatus(401);
    } else {
      if (accessRole != "member (factsheet report)") {
        type = shareClasses.includes(type) ? type : "a2";
        disabled = false;
      }

      const now = new Date();
      const from2015: any = new Date("2015-04-01").getTime();

      let inception = await getFactSheet({ from: from2015, to: now, type, inception: true, mkt: true });

      res.send({ inception: inception, disabled: disabled });
    }
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString(), disabled: true });
  }
});
// router.post("/test", async (req: Request, res: Response, next: NextFunction) => {
//   let start: any = new Date().getTime() - 12 * 30 * 24 * 60 * 60 * 1000;
//   let end: any = new Date().getTime() + 1 * 24 * 60 * 60 * 1000;

//   let originalTrades = await getAllTrades(start, end, "portfolio_main", "vcons");
//   originalTrades = originalTrades.sort((a: any, b: any) => takeDateWithTimeAndReturnTimestamp(b["Trade Date"] + " " + b["Trade Time"]) - takeDateWithTimeAndReturnTimestamp(a["Trade Date"] + " " + a["Trade Time"]));

//   let tradesObject: any = {};
//   for (let index = 0; index < originalTrades.length; index++) {
//     let isinAndLocation = originalTrades[index]["ISIN"] + originalTrades[index]["Location"];
//     let buySell = originalTrades[index]["B/S"] == "B" ? -1 : 1;

//     let notional = originalTrades[index]["Notional Amount"] * buySell;
//     let pnl = originalTrades[index]["Settlement Amount"] * buySell;
//     let price = originalTrades[index]["Price"];

//     tradesObject[isinAndLocation] = tradesObject[isinAndLocation] ? tradesObject[isinAndLocation] : { changes: [], notional: 0, rlzdDate: "", trades: [], pnl: 0, entry: -1, exit: -1, bbTicker: "", isin: "", cusip: "", location: "" };
//     tradesObject[isinAndLocation].notional += notional;
//     tradesObject[isinAndLocation].pnl += pnl;
//     tradesObject[isinAndLocation].trades.push(originalTrades[index]);
//     tradesObject[isinAndLocation].changes.push(tradesObject[isinAndLocation].notional);

//     if (tradesObject[isinAndLocation].entry == -1) {
//       tradesObject[isinAndLocation].entry = price;
//     }
//     tradesObject[isinAndLocation].exit = price;
//     tradesObject[isinAndLocation].bbTicker = originalTrades[index]["BB Ticker"];
//     tradesObject[isinAndLocation].cusip = originalTrades[index]["Cuisp"];
//     tradesObject[isinAndLocation].isin = originalTrades[index]["ISIN"];
//     tradesObject[isinAndLocation].location = originalTrades[index]["Location"];

//     if (tradesObject[isinAndLocation].notional == 0) {
//       tradesObject[isinAndLocation].rlzdDate = originalTrades[index]["Trade Date"];
//     }
//   }
//   let positions: any = [];
//   for (let isin in tradesObject) {
//     if (tradesObject[isin].pnl) {
//       let position = {
//         "BB Ticker": tradesObject[isin].bbTicker,
//         Location: tradesObject[isin].location,
//         ISIN: tradesObject[isin].isin,
//         CUSIP: tradesObject[isin].cusip,
//       };
//       positions.push(position);
//     }
//   }
//   let tradesExcel = await uploadArrayAndReturnFilePath(positions, "test", "trade_profit_nov");
//   let downloadEBlotName = bucket + tradesExcel + "?authuser=2";
//   res.send(downloadEBlotName);
// });

// router.post("/test", async (req: any, res: Response, next: NextFunction) => {
//   try {
//     let type = req.query.type;
//     let shareClass = "a2";
//     let accessRole = "admin";
//     let disabled = await getFactSheetDisplay("view");

//     if (accessRole == "member (factsheet report)" && !shareClass.includes(type)) {
//       // console.log("fact sheet error", shareClass, type)
//       res.sendStatus(401);
//     } else {
//       if (accessRole != "member (factsheet report)") {
//         type = shareClasses.includes(type) ? type : "a2";
//         disabled = false;
//       }

//       const now = new Date();
//       const from2015: any = new Date("2015-04-01").getTime();

//       let inception = await getFactSheet({ from: from2015, to: now, type, inception: true, mkt: false });
//       // let data = inception.result.monthlyReturns.a2;
//       // let volitality = []
//       // for(let year in data){

//       // }
//       res.send({ inception: inception });
//     }
//   } catch (error: any) {
//     console.log(error);
//     res.send({ error: error.toString(), disabled: true });
//   }
// });

export default router;

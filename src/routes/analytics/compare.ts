import { NextFunction, Router, query } from "express";
import { breakdown, extractAnalytics, getAnalytics, getCollectionsInRange, updateAnalytics } from "../../controllers/analytics/compare/historicalData";
import { getPortfolioWithAnalytics } from "../../controllers/reports/portfolios";
import { bucket, verifyToken } from "../../controllers/common";
import { uploadToBucket } from "../../controllers/userManagement/tools";
import { insertPositionsInfo } from "../../controllers/analytics/data";
import { FundDetails, FundMTD, IntStatsType, PositionBeforeFormatting } from "../../models/portfolio";
import { uploadArrayAndReturnFilePath } from "../../controllers/operations/readExcel";
import { getIndexingData } from "../../controllers/operations/indexing";
import { insertIndexingData } from "../../controllers/operations/psql/operation";

const analyticsRouter = Router();

analyticsRouter.get("/compare", uploadToBucket.any(), verifyToken, async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let start = new Date(req.query.start).getTime();
    let end = new Date(req.query.end).getTime();

    let type = req.query.type || "pnl";
    let notOperation = req.query.notOperation || "false";
    let conditions: any = req.query;
    delete conditions.type;
    delete conditions.notOperation;
    delete conditions.start;
    delete conditions.end;

    if (Object.keys(conditions).length == 0) {
      conditions = {};
      conditions.portfolio = "portfolio";
    }

    let analytics = await getAnalytics(start, end, "portfolio_main");
    let extracted = extractAnalytics(analytics, conditions, notOperation, type);

    // let update = await insertPositionsInfo(analytics.isinInformation);
    res.send(extracted);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

analyticsRouter.post("/update-compare", uploadToBucket.any(), verifyToken, async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let start = new Date(req.body.start).getTime();
    let end = new Date(req.body.end).getTime();

    let list = await getCollectionsInRange(start, end, "portfolio_main");

    for (let index = 0; index < list.length; index++) {
      let date = list[index].split(" ")[0] + " 23:59";
      let report: any = await getPortfolioWithAnalytics(date, "order", 1, {}, "back office", null, "portfolio_main");
      let name = report.collectionName.split(" ");
      let analytics = breakdown(report.portfolio, report.fundDetails, name);
      analytics.name = name[0];

      analytics.timestamp = new Date(analytics.name + " 23:59").getTime();
      analytics.lastUpdatedTime = new Date();
      analytics.mtdExpensesAmount = report.mtdExpensesAmount;

      console.log(analytics.name);
      await updateAnalytics(analytics, analytics.name, "portfolio_main");
    }

    res.send(list);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

// analyticsRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response | any, next: NextFunction) => {
//   try {
//     let start = new Date(req.body.start).getTime();
//     let end = new Date(req.body.end).getTime();

//     let list = await getCollectionsInRange(start, end, "portfolio_main");
//     let excel = [];
//     for (let index = 0; index < list.length; index++) {
//       let date = list[index].split(" ")[0] + " 23:59";
//       let report: any = await getPortfolioWithAnalytics(date, "order", 1, {}, "back office", null, "portfolio_main");
//       let name = report.collectionName;
//       let fundDetails: FundMTD = report.fundDetails;
//       let objectPnl = {
//         "P&L Name Date": name,
//         "Day P&L % NAV": fundDetails.dayplPercentage,
//         "MTD P&L % NAV": fundDetails.mtdplPercentage,
//         "YTD P&L % NAV": fundDetails.ytdNet,
//       };
//       excel.push(objectPnl);
//     }
//     let url = await uploadArrayAndReturnFilePath(excel, "mtd_pnl", "test");
//     url = bucket + url + "?authuser=2";

//     res.send(url);
//   } catch (error: any) {
//     console.log(error);
//     res.send({ error: error.toString() });
//   }
// });

// analyticsRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response | any, next: NextFunction) => {
//   try {
//     let allIndexes = await getIndexingData("portfolio_main");
//     let newIndexingRow = {
//       portfolio_id: "test",
//       portfolio_document_ids: allIndexes,
//     };

//     for (let index = 0; index < allIndexes.length; index++) {
//       if (allIndexes[index].name == "portfolio-2024-10-12 04:00") {
//         allIndexes[index].timestamp = 1728648000000;
//         allIndexes[index].name = "portfolio-2024-10-11 20:00";

//       }
//     }

//     await insertIndexingData([newIndexingRow]);

//     res.send(allIndexes);
//   } catch (error: any) {
//     console.log(error);
//     res.send({ error: error.toString() });
//   }
// });
export default analyticsRouter;

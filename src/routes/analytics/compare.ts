import { NextFunction, Router, query } from "express";
import { bucket, dateWithMonthOnly, generateSignedUrl, verifyToken } from "../../controllers/common";
import { getFactSheetData, trimFactSheetData } from "../../controllers/reports/factSheet";
import { uploadToBucket } from "../reports/reports";
import { addFactSheet, deleteFactSheet, editFactSheet } from "../../controllers/operations/factSheet";
import { readFactSheet } from "../../controllers/operations/readExcel";
import { formatExcelDate, getDateTimeInMongoDBCollectionFormat } from "../../controllers/reports/common";
import { dateWithNoDay } from "../../controllers/common";
import { editFactSheetDisplay, getFactSheetDisplay } from "../../controllers/operations/commands";
import { breakdown, extractAnalytics, getAnalytics, getCollectionsInRange, updateAnalytics } from "../../controllers/analytics/compare/historicalData";
import { getPortfolioWithAnalytics } from "../../controllers/reports/portfolios";
import { client } from "../../controllers/userManagement/auth";
const analyticsRouter = Router();

analyticsRouter.get("/compare", uploadToBucket.any(), async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let start = new Date(req.query.start).getTime();
    let end = new Date(req.query.end).getTime();

    console.log(req.query.start, req.query.end, req.query, "test");

    let type = req.query.type || "pnl";
    let notOperation = req.query.notOperation || "false";
    let conditions: any = req.query;
    delete conditions.type;
    delete conditions.notOperation;
    delete conditions.start;
    delete conditions.end;

    if (notOperation == "false" && Object.keys(conditions).length == 0) {
      // console.log("she",conditions)
      conditions = {};
      conditions.portfolio = "portfolio";
    }

    let analytics = await getAnalytics(start, end);

    // for (let index = 0; index < analytics.length; index++) {
    //   console.log(analytics[index].portfolio.portfolio.mtdUnrlzdUniform);
    // }

    analytics = extractAnalytics(analytics, conditions, notOperation, type);

    console.log(analytics[0]);
    res.send(analytics);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});
analyticsRouter.post("/update-compare", uploadToBucket.any(), async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let start = new Date(req.body.start).getTime();
    let end = new Date(req.body.end).getTime();

    let list = await getCollectionsInRange(start, end);

    for (let index = 0; index < list.length; index++) {
      let date = list[index].split(" ")[0] + " 23:59";
      let report: any = await getPortfolioWithAnalytics(date, "order", 1, {}, "back office", null);
      let analytics = breakdown(report.portfolio, report.fundDetails);
      let name = report.collectionName.split(" ");
      analytics.name = name[0];

      analytics.timestamp = new Date(analytics.name + " 23:59").getTime();
      analytics.lastUpdatedTime = new Date();

      console.log(analytics.name);
      await updateAnalytics(analytics, analytics.name);
    }

    res.send(list);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

export default analyticsRouter;

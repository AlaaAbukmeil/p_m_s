import { NextFunction, Router, query } from "express";
import { breakdown, extractAnalytics, getAnalytics, getCollectionsInRange, updateAnalytics } from "../../controllers/analytics/compare/historicalData";
import { getPortfolioWithAnalytics } from "../../controllers/reports/portfolios";
import { verifyToken } from "../../controllers/common";
import { uploadToBucket } from "../../controllers/userManagement/tools";
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

    let analytics = await getAnalytics(start, end);

    analytics = extractAnalytics(analytics, conditions, notOperation, type);
    console.log(analytics.isinInformation);
    res.send(analytics);
    // await insertPositions(analytics.isinInformation);
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
      let name = report.collectionName.split(" ");
      let analytics = breakdown(report.portfolio, report.fundDetails, name);
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

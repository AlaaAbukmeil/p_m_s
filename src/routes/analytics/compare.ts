import { NextFunction, Router } from "express";
import { bucket, dateWithMonthOnly, generateSignedUrl, verifyToken } from "../../controllers/common";
import { getFactSheetData, trimFactSheetData } from "../../controllers/reports/factSheet";
import { uploadToBucket } from "../reports/reports";
import { addFactSheet, deleteFactSheet, editFactSheet } from "../../controllers/operations/factSheet";
import { readFactSheet } from "../../controllers/operations/readExcel";
import { formatExcelDate, getDateTimeInMongoDBCollectionFormat } from "../../controllers/reports/common";
import { dateWithNoDay } from "../../controllers/common";
import { editFactSheetDisplay, getFactSheetDisplay } from "../../controllers/operations/commands";
import { getCollectionsInRange } from "../../controllers/analytics/compare/historicalData";
import { getPortfolioWithAnalytics } from "../../controllers/reports/portfolios";
const analyticsRouter = Router();

analyticsRouter.get("/compare", uploadToBucket.any(), verifyToken, async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let start = new Date().getTime() - 11 * 24 * 60 * 60 * 1000;
    let end = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;

    let list = await getCollectionsInRange(start, end);

    res.send(list);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});
analyticsRouter.post("/update-compare", uploadToBucket.any(), verifyToken, async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let date = getDateTimeInMongoDBCollectionFormat(new Date());
    let report: any = await getPortfolioWithAnalytics(date, "order", 1, {}, "back office", null);

    res.send(report);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

export default analyticsRouter;

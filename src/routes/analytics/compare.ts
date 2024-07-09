import { NextFunction, Router } from "express";
import { bucket, dateWithMonthOnly, generateSignedUrl, verifyToken } from "../../controllers/common";
import { getFactSheetData, trimFactSheetData } from "../../controllers/reports/factSheet";
import { uploadToBucket } from "../reports/reports";
import { addFactSheet, deleteFactSheet, editFactSheet } from "../../controllers/operations/factSheet";
import { readFactSheet } from "../../controllers/operations/readExcel";
import { formatExcelDate } from "../../controllers/reports/common";
import { dateWithNoDay } from "../../controllers/common";
import { editFactSheetDisplay, getFactSheetDisplay } from "../../controllers/operations/commands";
import { getAllCollections, getCollectionsInRange, getDayPNLData } from "../../controllers/analytics/compare/historicalData";
const analyticsRouter = Router();

analyticsRouter.get("/compare", uploadToBucket.any(), async (req: Request | any, res: Response | any, next: NextFunction) => {
  try {
    let start = new Date().getTime() - 11 * 24 * 60 * 60 * 1000;
    let end = new Date().getTime() - 7 * 24 * 60 * 60 * 1000;

    let list = await getCollectionsInRange(start, end);
    let collections = await getAllCollections(list);
    let pnlData = getDayPNLData(list, collections);
    
    console.log(Object.keys(collections), list,pnlData);

    res.send(pnlData);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

export default analyticsRouter;

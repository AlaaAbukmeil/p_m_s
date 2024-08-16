import { Router } from "express";
import { Request, Response, NextFunction } from "express";

import { uploadToBucket } from "../../controllers/userManagement/tools";
import { factsheetPool, formatFactSheet, formatFundMTD, formatLinks, formatNewIssues, formatPositions, formatTrades, formatUsers, insertFactSheetData, insertFundMTDData, insertLinksData, insertNewIssuesData, insertPositionsData, insertTradesData, insertUsersData, migrateFactSheetData, migrateInformationDB, testPsqlTime } from "../../controllers/operations/psql/operation";
import { findTrade } from "../../controllers/reports/trades";

const migrateRouter = Router();

migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = await migrateInformationDB("fund", "details", {});
  let formatted = formatFundMTD(data);
  await insertFundMTDData(formatted, "portfolio_main");
  res.send({ done: formatted });
});

export default migrateRouter;

import { Router } from "express";
import { Request, Response, NextFunction } from "express";

import { uploadToBucket } from "../../controllers/userManagement/tools";
import { factsheetPool, formatFactSheet, formatLinks, formatNewIssues, formatPositions, formatTrades, formatUsers, insertFactSheetData, insertLinksData, insertNewIssuesData, insertPositionsData, insertTradesData, insertUsersData, migrateFactSheetData, migrateInformationDB, testPsqlTime } from "../../controllers/operations/psql/operation";
import { findTrade } from "../../controllers/reports/trades";

const migrateRouter = Router();

migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = await migrateInformationDB("trades_v_2", "ib", {});
  let formatted = formatTrades(data, "ib");
  await insertTradesData(formatted, "ib");
  res.send({ done: formatted });
});

export default migrateRouter;

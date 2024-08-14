import { Router } from "express";
import { Request, Response, NextFunction } from "express";

import { uploadToBucket } from "../../controllers/userManagement/tools";
import { factsheetPool, formatFactSheet, formatLinks, formatNewIssues, formatPositions, formatTrades, formatUsers, insertFactSheetData, insertLinksData, insertNewIssuesData, insertPositionsData, insertTradesData, insertUsersData, migrateFactSheetData, migrateInformationDB, testPsqlTime } from "../../controllers/operations/psql/operation";
import { findTrade } from "../../controllers/reports/trades";

const migrateRouter = Router();

migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  // let data = await migrateInformationDB("trades_v_2", "ib", {});
  // let formatted = formatTrades(data, "ib");
  // await insertTradesData(formatted, "ib");
  let test = await findTrade("vcons", "4457a9ec-48d7-46fb-8c06-a9da04d71467");
  res.send({ done: test });
});

export default migrateRouter;

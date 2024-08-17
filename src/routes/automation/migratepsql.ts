import { Router } from "express";
import { Request, Response, NextFunction } from "express";

import { uploadToBucket } from "../../controllers/userManagement/tools";
import { factsheetPool, formatEditLogs, formatFactSheet, formatFundMTD, formatLinks, formatNewIssues, formatPositions, formatTrades, formatUsers, insertFactSheetData, insertFundMTDData, insertLinksData, insertLogsData, insertNewIssuesData, insertPositionsData, insertTradesData, insertUsersData, migrateFactSheetData, migrateInformationDB, testPsqlTime } from "../../controllers/operations/psql/operation";
import { findTrade } from "../../controllers/reports/trades";
import { getDateTimeInMongoDBCollectionFormat } from "../../controllers/reports/common";
import { insertEditLogs } from "../../controllers/operations/logs";

const migrateRouter = Router();

migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    await insertEditLogs([{"json":"test"}], "errors", dateTime, "errors", "test ignore");
});

export default migrateRouter;

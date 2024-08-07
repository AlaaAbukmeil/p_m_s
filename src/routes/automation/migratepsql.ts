import { Router } from "express";
import { Request, Response, NextFunction } from "express";

import { uploadToBucket } from "../../controllers/userManagement/tools";
import { factsheetPool, formatFactSheet, formatNewIssues, formatPositions, insertFactSheetData, insertNewIssuesData, insertPositionsData, migrateFactSheetData, migrateInformationDB, testPsqlTime } from "../../controllers/operations/psql/operation";

const migrateRouter = Router();

migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = await migrateInformationDB();
  let formatted = formatNewIssues(data);
  await insertNewIssuesData(formatted);
  res.send({ formatted });
});

export default migrateRouter;

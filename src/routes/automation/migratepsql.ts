import { Router } from "express";
import { Request, Response, NextFunction } from "express";

import { uploadToBucket } from "../../controllers/userManagement/tools";
import { factsheetPool, formatFactSheet, formatLinks, formatNewIssues, formatPositions, formatUsers, insertFactSheetData, insertLinksData, insertNewIssuesData, insertPositionsData, insertUsersData, migrateFactSheetData, migrateInformationDB, testPsqlTime } from "../../controllers/operations/psql/operation";

const migrateRouter = Router();

migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = await migrateInformationDB("auth", "users");
  let formatted = formatUsers(data);
  await insertUsersData(formatted);
  // console.log({ data });
  res.send({ formatted });
});

export default migrateRouter;

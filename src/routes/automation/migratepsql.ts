import { Router } from "express";
import { Request, Response, NextFunction } from "express";

import { uploadToBucket } from "../../controllers/userManagement/tools";
import { factsheetPool, formatFactSheet, formatLinks, formatNewIssues, formatPositions, formatUsers, insertFactSheetData, insertLinksData, insertNewIssuesData, insertPositionsData, insertUsersData, migrateFactSheetData, migrateInformationDB, testPsqlTime } from "../../controllers/operations/psql/operation";

const migrateRouter = Router();

migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  const from2010: any = new Date("2010-01-01").getTime();
  const now = new Date().getTime();
  let query = {
    timestamp: {
      $gte: from2010,
      $lte: now,
    },
  };
  let psqlFactSheetDBNames: any = {
    "LEGATRUU Index": "bbg_global_aggregate",
    "EMUSTRUU Index": "bbg_em_aggregate",
    "BEUCTRUU Index": "bbg_em_asia",
    "BEUYTRUU Index": "bbg_em_asia_hy",
    "LG30TRUU Index": "bbg_global_hy",
    "FIDITBD LX Equity": "fidelity_global_bond",
    "PIMGLBA ID Equity": "pimco_global_bond",
    "3 Month Treasury": "3_month_treasury",
    Triada: "triada_main",
    "Triada Master": "triada_master",
    "BEBGTRUU Index": "bbg_em_global_hy",
  };
  let keys = Object.keys(psqlFactSheetDBNames);
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    let data = await migrateInformationDB("factsheet", key, query);
    let formatted = formatFactSheet(data, psqlFactSheetDBNames[key]);

    await insertFactSheetData(formatted);
  }
  // console.log({ data });
  res.send({ done: "done" });
});

export default migrateRouter;

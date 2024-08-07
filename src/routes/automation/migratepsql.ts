import { Router } from "express";
import { Request, Response, NextFunction } from "express";

import { uploadToBucket } from "../../controllers/userManagement/tools";
import { factsheetPool, formatFactSheet, insertFactSheetData, migrateFactSheetData, testPsqlTime } from "../../controllers/operations/psql/operation";

const migrateRouter = Router();

migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let mongodbFactsheet = await migrateFactSheetData("BEBGTRUU Index", "main");
  let psqlFactSheetDBNames = {
    "LEGATRUU Index": "bbg_global_aggregate",
    "EMUSTRUU Index": "bbg_em_aggregate",
    "BEUCTRUU Index": "bbg_em_asia",
    "BEUYTRUU Index": "bbg_em_asia_hy",
    "LG30TRUU Index": "bbg_global_hy",
    "FIDITBD LX Equity": "fidelity_global_bond",
    "PIMGLBA ID Equity": "pimco_global_bond",
    "BEBGTRUU Index": "bbg_em_global_hy",
  };
  //   "bbg_global_aggregate"
  //   "bbg_em_aggregate"
  //   "bbg_em_asia"
  //   "bbg_global_hy"
  //   "fidelity_global_bond"
  //   "pimco_global_bond"
  //   "LEGATRUU Index": "BBG Global Aggregate",
  //     "EMUSTRUU Index": "BBG EM Aggregate",
  //     "BEUCTRUU Index": "BBG EM Asia",
  //     // "BEUYTRUU Index": "BBG EM Asia HY",
  //     "LG30TRUU Index": "BBG Global HY",
  //     "FIDITBD LX Equity": "Fidelity Global Bond",
  //     "PIMGLBA ID Equity": "Pimco Global Bond",

  let formatted = formatFactSheet(mongodbFactsheet, "bbg_em_global_hy");
  await insertFactSheetData(formatted);
  // let result = await testPsqlTime();
  res.json(formatted);
});

export default migrateRouter;

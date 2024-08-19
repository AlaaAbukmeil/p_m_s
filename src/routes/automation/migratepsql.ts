import { Router } from "express";
import { Request, Response, NextFunction } from "express";

import { uploadToBucket } from "../../controllers/userManagement/tools";
import { factsheetPool, formatEditLogs, formatFactSheet, formatFundMTD, formatLinks, formatNewIssues, formatPositions, formatTrades, formatUsers, insertFactSheetData, insertFundMTDData, insertIndexingData, insertLinksData, insertLogsData, insertNewIssuesData, insertPinnedData, insertPositionsData, insertTradesData, insertUsersData, migrateFactSheetData, migrateInformationDB, testPsqlTime } from "../../controllers/operations/psql/operation";
import { findTrade } from "../../controllers/reports/trades";
import { getDateTimeInMongoDBCollectionFormat } from "../../controllers/reports/common";
import { insertEditLogs } from "../../controllers/operations/logs";
import { client } from "../../controllers/userManagement/auth";
import { Indexing } from "../../models/portfolio";
import { PinnedPosition } from "../../models/position";

const migrateRouter = Router();
const { v4: uuidv4 } = require("uuid");

// migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
//   const database = client.db("portfolios");

//   const cursor = await database.listCollections().toArray();
//   let ans = [];
//   for (let index = 0; index < cursor.length; index++) {
//     const element = cursor[index];
//     let object = {
//       name: element["name"],
//       timestamp: new Date(element["name"].split("portfolio-")[1]).getTime(),
//     };
//     ans.push(object);
//   }

//   let result: Indexing = {
//     portfolio_id: "portfolio-main",
//     portfolio_document_ids: ans,
//   };
//   await insertIndexingData([result]);
//   res.send(result);
// });
// migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
//   let result: PinnedPosition[] = [
//     {
//       portfolio_id: "portfolio-main",
//       pinned: "pinned",
//       isin: "FR001400QR21",
//       location: "B408",
//       ticker: "CCAMA V6.5 PERP",
//       id: uuidv4(),
//     },
//     {
//       portfolio_id: "portfolio-main",
//       pinned: "pinned",
//       isin: "XS2865533462",
//       location: "B414",
//       ticker: "WFC V3.9 07/22/32 EMTN",
//       id: uuidv4(),
//     },
//   ];
//   await insertPinnedData(result);
//   res.send(200);
// });

export default migrateRouter;

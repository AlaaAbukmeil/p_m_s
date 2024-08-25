import { Router } from "express";
import { Request, Response, NextFunction } from "express";

import { uploadToBucket } from "../../controllers/userManagement/tools";
import { factsheetPool, formatEditLogs, formatFactSheet, formatFundMTD, formatLinks, formatNewIssues, formatPositions, formatPositionsTOSQL, formatTrades, formatUsers, insertFactSheetData, insertFundMTDData, insertIndexingData, insertLinksData, insertLogsData, insertNewIssuesData, insertPositionsData, insertPositionsPortfolioData, insertTradesData, insertUsersData, migrateFactSheetData, migrateInformationDB, testPsqlTime } from "../../controllers/operations/psql/operation";
import { findTrade } from "../../controllers/reports/trades";
import { getDateTimeInMongoDBCollectionFormat } from "../../controllers/reports/common";
import { insertEditLogs } from "../../controllers/operations/logs";
import { client } from "../../controllers/userManagement/auth";
import { Indexing } from "../../models/portfolio";
import { getAllCollectionNames, getEarliestCollectionName } from "../../controllers/reports/tools";
import { getCollectionsInRange } from "../../controllers/analytics/compare/historicalData";
import { getPortfolio } from "../../controllers/operations/positions";
import { getCollectionDays } from "../../controllers/operations/tools";
import { formatDateUS } from "../../controllers/common";
import { getIndexingData } from "../../controllers/operations/indexing";

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
//     portfolio_id: "portfolio_main",
//     portfolio_document_ids: ans,
//   };
//   await insertIndexingData([result]);
//   res.send(result);
// });

// migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
//   let allCollectionNames = await getAllCollectionNames("portfolio_main");
//   res.send({ allCollectionNames });
// });
// migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
//   let result: PinnedPosition[] = [
//     {
//       portfolio_id: "portfolio_main",
//       pinned: "pinned",
//       isin: "FR001400QR21",
//       location: "B408",
//       ticker: "CCAMA V6.5 PERP",
//       id: uuidv4(),
//     },
//     {
//       portfolio_id: "portfolio_main",
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

// migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
//   let data = await migrateInformationDB("fund", "details", {});
//   let format = formatFundMTD(data);
//   await insertFundMTDData(format, "portfolio_main");
//   res.send(200);
// });
// migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
//   const database = client.db("portfolios");

//   const cursor = database.listCollections();
//   const collections = await cursor.toArray();
//   let finalCollections: any = {};
//   let finalCollectionsArray: any = [];

//   for (let index = 0; index < collections.length; index++) {
//     const element = collections[index];
//     let name = element.name.split("-");

//     let date = new Date(name[2] + "/" + name[3].split(" ")[0] + "/" + name[1]).getTime();
//     finalCollections[date] = element.name;
//   }
//   let keys = Object.keys(finalCollections).sort((a: any, b: any) => b - a);
//   for (let index = 0; index < keys.length; index++) {
//     const element = keys[index];
//     finalCollectionsArray.push(finalCollections[element]);
//   }

//   for (let index = 0; index < 1; index++) {
//     let data = await migrateInformationDB("portfolios", finalCollectionsArray[index], {});
//     let name = finalCollectionsArray[index].split("-");
//     let nameInDB = name[2] + "/" + name[3].split(" ")[0] + "/" + name[1];
//     console.log({ nameInDB });
//     await insertPositionsPortfolioData(formatPositionsTOSQL(data), "portfolio_main", "portfolio_main_" + nameInDB.replace(/-/g, "_").replace(/\//g, "_"));
//   }
//   res.send(200);
// });

// migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
//   let allCollectionNames = await getAllCollectionNames("portfolio_main");
//   let earliestPortfolioName = getEarliestCollectionName(new Date().toString(), allCollectionNames);

//   console.log({ allCollectionNames, earliestPortfolioName });

//   res.send(200);
// });
migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = await migrateInformationDB("trades_v_2", "canceled_vcons", {});
  let format = formatTrades(data, "canceled_vcons");
  await insertTradesData(format, "canceled_vcons");
  res.send(200);
});

// migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
//   let list = await getAllCollectionNames("portfolio_main");
//   let day = getDateTimeInMongoDBCollectionFormat(new Date().getTime() - 3 * 24 * 60 * 60 * 1000);
//   let formatted = getCollectionDays(list);
//   let date = formatDateUS(day);

//   let result = formatted.find((dateList: string) => dateList.includes(date));

//   res.send({ formatted, day, date, result });
// });
// migrateRouter.post("/test", uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
//   let test = await getIndexingData("portfolio_main");
//   res.send({ test });
// });
export default migrateRouter;

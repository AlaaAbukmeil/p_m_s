import { NextFunction, Router } from "express";
import { image } from "../models/image";
import { registerUser, checkIfUserExists, sendResetPasswordRequest, resetPassword } from "../controllers/auth";
import { Request, Response } from "express";
import { verifyToken, formatDateFile, generateRandomString, monthlyRlzdDate, bucket } from "../controllers/common";
import { updatePositionPortfolio, getHistoricalPortfolioWithAnalytics, updatePricesPortfolio, getTrades, getPortfolio, editPosition, getHistoricalSummaryPortfolioWithAnalytics, getRiskReportWithAnalytics } from "../controllers/reports";
import { bloombergToTriada, getDateTimeInMongoDBCollectionFormat, readIBRawExcel, readPricingSheet } from "../controllers/portfolioFunctions";
import { uploadArrayAndReturnFilePath, getTriadaTrades, formatCentralizedRawFiles, formatIbTrades, formatEmsxTrades, readEmsxRawExcel } from "../controllers/excelFormat";
import { getFxTrades, getGraphToken, getVcons } from "../controllers/graphApiConnect";
import { formatMufg, formatFxMufg, tradesTriada, checkMUFGEndOfMonthWithPortfolio } from "../controllers/mufgOperations";
import { getCollectionDays, readMUFGPrices, updatePreviousPricesPortfolioMUFG, updatePreviousPricesPortfolioBloomberg, getEditLogs, readMUFGEndOfMonthFile, getPortfolioOnSpecificDate, editPositionPortfolio, getAllFundDetails, editFund, deleteFund, addFund, editTrade, deleteTrade, deletePosition } from "../controllers/operations";
import { getAllTrades } from "../controllers/eblot";
import util from "util";
const fs = require("fs");
const writeFile = util.promisify(fs.writeFile);

require("dotenv").config();

const readLastLines = require("read-last-lines");
const path = require("path");

const multerGoogleStorage = require("multer-google-storage");
const multer = require("multer");
const uploadBeforeExcel = multer({
  storage: multerGoogleStorage.storageEngine({
    autoRetry: true,
    bucket: process.env.BUCKET,
    projectId: process.env.PROJECTID,
    keyFilename: process.env.KEYPATHFILE,
    filename: (req: Request, file: image, cb: (err: boolean, fileName: string) => void) => {
      cb(false, `/v2/${generateRandomString(6)}_${file.originalname.replace(/[!@#$%^&*(),?":{}|<>/\[\]\\;'\-=+`~ ]/g, "_")}`);
    },
  }),
});

const router = Router();

router.get("/auth", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  res.sendStatus(200);
});

router.get("/portfolio", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    let date: any = req.query.date;
    if (date.includes("NaN")) {
      date = getDateTimeInMongoDBCollectionFormat(new Date());
    }

    let sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMonthlyPl" | "groupDV01Sum" | any = req.query.sort || "order";
    let sign: any = req.query.sign || 1;

    let report: any = await getHistoricalPortfolioWithAnalytics(date, sort, sign);
   
    if (report.error) {
      res.send({ error: report.error });
    } else {
      res.send(report);
    }
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});
router.get("/summary-portfolio", async (req: Request, res: Response, next: NextFunction) => {
  try {
    let date: any = req.query.date;
    let sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMonthlyPl" | "groupDV01Sum" | "groupDuration" | any = req.query.sort || "order";
    let sign: any = req.query.sign || 1;

    if (date.includes("NaN")) {
      date = getDateTimeInMongoDBCollectionFormat(new Date());
    }

    date = getDateTimeInMongoDBCollectionFormat(new Date(date)).split(" ")[0] + " 23:59";
    let report = await getHistoricalSummaryPortfolioWithAnalytics(date, sort, sign);
    if (report.error) {
      res.send({ error: report.error });
    } else {
      res.send(report);
    }
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

router.get("/risk-report", async (req: Request, res: Response, next: NextFunction) => {
  try {
    let date: any = req.query.date;
    let sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMonthlyPl" | "groupDV01Sum" | "groupDuration" | any = req.query.sort || "order";
    let sign: any = req.query.sign || 1;

    if (date.includes("NaN")) {
      date = getDateTimeInMongoDBCollectionFormat(new Date());
    }

    date = getDateTimeInMongoDBCollectionFormat(new Date(date)).split(" ")[0] + " 23:59";
    let report = await getRiskReportWithAnalytics(date, sort, sign);

    res.send(report);
  } catch (error: any) {
    console.log(error);
    res.send({ error: error.toString() });
  }
});

router.get("/trades-logs", verifyToken, async (req, res) => {
  try {
    const filePath = path.resolve("trades-logs.txt");
    const lastLines = await readLastLines.read(filePath, 4000);
    res.send(lastLines);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

router.get("/prices-logs", verifyToken, async (req, res) => {
  try {
    const filePath = path.resolve("prices-logs.txt");
    const lastLines = await readLastLines.read(filePath);
    res.send(lastLines);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

router.get("/trades", verifyToken, async (req, res) => {
  try {
    const tradeType: any = req.query.tradeType;

    let trades = await getTrades(`${tradeType}`);
    res.send(trades);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

router.get("/all-trades", verifyToken, async (req, res) => {
  try {
    let from: any = req.query.from;
    let to: any = req.query.to;
    let start: any = new Date(from).getTime() - 2 * 24 * 60 * 60 * 1000;
    let end: any = new Date(to).getTime() + 2 * 24 * 60 * 60 * 1000;

    let token = await getGraphToken();
    let trades = await getAllTrades(start, end);
    trades.filter((trade: any, index: any) => new Date(trade["Trade Date"]).getTime() > start && new Date(trade["Trade Date"]).getTime() < end);

    let vconTrades: [any[], number] | any = await getTriadaTrades("vcons", start, end);

    let vcons: any = await getVcons(token, start + 2 * 24 * 60 * 60 * 1000, end - 2 * 24 * 60 * 60 * 1000, vconTrades);
    console.log(vcons)
    vcons = vcons.filter((trade: any, index: any) => trade["Trade App Status"] != "uploaded_to_app");
    let action: any = await formatCentralizedRawFiles({}, vcons, [], [], []);
    // action = action.filter((trade: any, index: any) => trade["Trade App Status"] != "uploaded_to_app");
    let allTrades = action.concat(trades).sort((a: any, b: any) => new Date(b["Trade Date"]).getTime() - new Date(a["Trade Date"]).getTime());
    res.send({ trades: allTrades });
  } catch (error) {
    console.log(error)
    res.status(500).send("An error occurred while reading the file.");
  }
});
router.get("/edit-logs", verifyToken, async (req, res) => {
  try {
    const editLogsType: any = req.query.logsType;

    let editLogs = await getEditLogs(`${editLogsType}`);
    res.send(editLogs);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

router.get("/previous-collections", verifyToken, async (req, res) => {
  try {
    let previousCollections = await getCollectionDays();
    res.send(previousCollections);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});
router.get("/fund-details", verifyToken, async (req, res) => {
  try {
    const date: any = req.query.date;
    let thisMonth = monthlyRlzdDate(date);
    let fundDetails = await getAllFundDetails(thisMonth);

    res.send(fundDetails);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

router.post("/login", async (req: Request, res: Response, next: NextFunction) => {
  let data = req.body;
  let email = data.email;
  let password = data.password;
  let user = await checkIfUserExists(email, password);

  res.send(user);
});

router.post("/signUp", async (req: Request, res: Response, next: NextFunction) => {
  let data = req.body;
  let email = data.email;
  let password = data.password;
  let verificationCode = data.verificationCode;
  let result = await registerUser(email, password, verificationCode);
  res.send(result);
});
router.post("/send-reset-code", async (req: Request, res: Response, next: NextFunction) => {
  let data = req.body;
  console.log(data, "x");
  console.log(data.email);
  let result = await sendResetPasswordRequest(data.email);
  console.log(result);
  res.send(result);
});

router.post("/reset-password", async (req: Request, res: Response, next: NextFunction) => {
  let data = req.body;
  let result = await resetPassword(data.email, data.code, data.password);

  res.send(result);
});

router.post("/ib-excel", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const fileName = req.files[0].filename;
    const path = bucket + fileName;
    // to be modified
    let beforeMonth = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
    let now = new Date().getTime() + 5 * 24 * 60 * 60 * 1000;
    let trades = await getTriadaTrades("ib", beforeMonth, now);
    let data = await readIBRawExcel(path);
    let portfolio = await getPortfolio();
    let action = formatIbTrades(data, trades, portfolio);
    // console.log(action)

    if (!action) {
      res.send({ error: action });
    } else {
      let ib = await uploadArrayAndReturnFilePath(action, "ib_formatted", "ib");
      let downloadEBlotName = bucket + ib;
      res.send(downloadEBlotName);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "File Template is not correct" });
  }
});

router.post("/mufg-excel", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = req.body;
  let pathName = "mufg_" + formatDateFile(data.timestamp_start) + "_" + formatDateFile(data.timestamp_end) + "_";
  let trades = await tradesTriada();

  let array: any = await formatMufg(trades, data.timestamp_start, data.timestamp_end);

  if (array.length == 0) {
    res.send({ error: "No Trades" });
  } else {
    let mufgTrades = await uploadArrayAndReturnFilePath(array, pathName, "mufg");
    let downloadEBlotName = bucket + mufgTrades;
    res.send(downloadEBlotName);
  }
});

router.post("/mufg-fx", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let tradesCount: number = req.body.tradesCount;

  let action: any = await formatFxMufg(req.files, tradesCount);
  let url = await uploadArrayAndReturnFilePath(action, "fx_mufg_formatted", "mufg_fx");
  url = bucket + url;
  res.send(url);
});

router.post("/centralized-blotter", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    let token = await getGraphToken();
    // to be modified
    let start = new Date(data.timestamp_start).getTime() - 5 * 24 * 60 * 60 * 1000;
    let end = new Date(data.timestamp_end).getTime() + 5 * 24 * 60 * 60 * 1000;
    let vconTrades = await getTriadaTrades("vcons", start, end);

    let vcons: any = await getVcons(token, data.timestamp_start, data.timestamp_end, vconTrades);
    let ibTrades = await getTriadaTrades("ib", start, end);
    let emsxTrades = await getTriadaTrades("emsx", start, end);
    let action: any = await formatCentralizedRawFiles(req.files, vcons, vconTrades, ibTrades, emsxTrades);

    if (action.error) {
      res.send({ error: action.error });
    } else {
      if (action.length > 0) {
        let url = await uploadArrayAndReturnFilePath(action, "centralized_blot", "centralized_blot");
        url = bucket + url;

        res.send(url);
      } else {
        res.send({ error: "no trades" });
      }
    }
  } catch (error) {
    console.log(error);
    res.send({ error: error });
  }
});

router.post("/emsx-excel", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let files = req.files;
    const fileName = req.files[0].filename;
    const path = bucket + fileName;
    //to be modified
    let beforeMonth = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
    let now = new Date().getTime() + 5 * 24 * 60 * 60 * 1000;
    let trades = await getTriadaTrades("emsx", beforeMonth, now);

    let data = await readEmsxRawExcel(path);

    let portfolio = await getPortfolio();

    let action = formatEmsxTrades(data, trades, portfolio);
    if (!action) {
      res.send({ error: action });
    } else {
      let emsx = await uploadArrayAndReturnFilePath(action, "emsx_formated", "emsx");
      let downloadEBlotName = bucket + emsx;
      res.send(downloadEBlotName);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "File Template is not correct" });
  }
});

router.post("/fx-excel", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = req.body;
  let pathName = "fx_" + formatDateFile(data.timestamp_start) + "_" + formatDateFile(data.timestamp_end) + "_";
  let token = await getGraphToken();
  let array: any = await getFxTrades(token, data.timestamp_start, data.timestamp_end, []);

  if (array.length == 0) {
    res.send({ error: "No Trades" });
  } else {
    let fxTrades = await uploadArrayAndReturnFilePath(array, pathName, "fx");
    let downloadEBlotName = bucket + fxTrades;
    res.send(downloadEBlotName);
  }
});

router.post("/upload-trades", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let files = req.files;
    const fileName = files[0].filename;
    const path = bucket + fileName;

    let action: any = await updatePositionPortfolio(path);

    console.log(action);
    if (action?.error) {
      res.send({ error: action.error });
    } else {
      res.send(action);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "File Template is not correct" });
  }
});

router.post("/edit-position", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let action = await editPosition(req.body, req.body.date);

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Template is not correct" });
  }
});

router.post("/edit-trade", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let action = await editTrade(req.body, req.body.tradeType);

    if (action.error) {
      res.send({ error: action.error });
    } else {
      res.send({ error: action.error });
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Template is not correct" });
  }
});

router.post("/delete-trade", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    let tradeType = req.body.tradeType;
    console.log(data, "test delete");
    let action: any = await deleteTrade(tradeType, data["_id"], data["BB Ticker"]);
    if (action.error) {
      res.send({ error: action.error, status: 404 });
    } else {
      res.send({ message: "success", status: 200 });
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Unexpected Error" });
  }
});

router.post("/delete-position", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = JSON.parse(req.body.data);
    let tradeType = req.body.tradeType;
    console.log(data["_id"]);

    let action: any = await deletePosition(data);
    console.log(action);
    if (action.error) {
      res.send({ error: action.error, status: 404 });
    } else {
      res.send({ message: "success", status: 200 });
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Unexpected Error" });
  }
});

router.post("/update-prices", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const fileName = req.files[0].filename;
    const path = bucket + fileName;
    let action: any = await updatePricesPortfolio(path);
  
    if (action?.error) {
      res.send({ error: action.error });
    } else {
      res.sendStatus(200);
    }
  } catch (error) {
    res.send({ error: "File Template is not correct" });
  }
});

router.post("/bulk-edit", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const fileName = req.files[0].filename;
    const path = bucket + fileName;
    let action: any = await editPositionPortfolio(path);
    console.log(action);
    if (action?.error) {
      res.send({ error: action.error });
    } else {
      res.sendStatus(200);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "File Template is not correct" });
  }
});

router.post("/update-previous-prices", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let collectionDate: string = req.body.collectionDate;
    let collectionType: string = req.body.collectionType;

    const fileName = req.files[0].filename;
    const path = bucket + fileName;
    let data: any = collectionType == "MUFG" ? await readMUFGPrices(path) : await readPricingSheet(path);
    let action = collectionType == "MUFG" ? await updatePreviousPricesPortfolioMUFG(data, collectionDate, path) : await updatePreviousPricesPortfolioBloomberg(data, collectionDate, path);
    if (action?.error) {
      res.send({ error: action.error });
    } else {
      res.sendStatus(200);
    }
    // console.log(action);
  } catch (error) {
    res.send({ error: "fatal error" });
  }
});

router.post("/check-mufg", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let collectionDate: string = req.body.collectionDate;
    let files = req.files[0];

    let portfolio: any = await getPortfolioOnSpecificDate(collectionDate);
    let data: any = [];
    if (files) {
      const fileName = req.files[0].filename;
      const path = bucket + fileName;
      data = await readMUFGEndOfMonthFile(path);
    }

    let action = await checkMUFGEndOfMonthWithPortfolio(data, portfolio[0]);
    if (action?.error) {
      res.send({ error: action.error });
    } else {
      let link = await uploadArrayAndReturnFilePath(action, `mufg_check_${collectionDate}`, "mufg_check");
      let downloadEBlotName = bucket + link;
      res.send(downloadEBlotName);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "File Template is not correct" });
  }
});

router.post("/edit-fund", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    console.log(req.body, "before");
    let action = await editFund(req.body);

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Template is not correct" });
  }
});

router.post("/delete-fund", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    console.log(req.body, "before");
    let action = await deleteFund(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Template is not correct" });
  }
});

router.post("/add-fund", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    console.log(req.body, "before");
    let action = await addFund(req.body);
    if (action.error) {
      res.send({ error: action.error });
    } else {
      res.sendStatus(200);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "Template is not correct" });
  }
});

router.post("/one-time", uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  // Online Javascript Editor for free
  // Write, Edit and Run your Javascript code using JS Online Compiler
  let text = `2.23 0.24	-0.17	0.94	0.14	0.66 1.41	-0.77	0.07	-1.07	3.31	2.06
-0.49	-7.18	0.27	-4.40	-0.88	-3.28	-1.17	2.93	0.19	-3.84	1.20	1.52
-5.12	0.12	0.01	1.58	1.29	-2.41	-6.46	-0.51	-4.63	-11.85	-2.15	-0.09`;

  let array = text.split(" ");

  let updatedText = "";

  for (let index = 0; index < array.length; index++) {
    const element = array[index];
    updatedText += element + " , ";
  }

  // Convert the log entry to a string

  // Append the log entry to the file
  await writeFile("trades-logs.txt", updatedText, { flag: "a" });
});

export default router;

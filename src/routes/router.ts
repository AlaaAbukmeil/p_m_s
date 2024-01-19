import { NextFunction, Router } from "express";
import { image } from "../models/image";
import { registerUser, checkIfUserExists, sendResetPasswordRequest, resetPassword } from "../controllers/auth";
import { Request, Response } from "express";
import { verifyToken, formatDateVconFile, generateRandomString, monthlyRlzdDate } from "../controllers/common";
import { updatePositionPortfolio, getHistoricalPortfolioWithAnalytics, updatePricesPortfolio, getTrades, getPortfolio, editPosition, getHistoricalSummaryPortfolioWithAnalytics } from "../controllers/reports";
import { bloombergToTriada, getDateTimeInMongoDBCollectionFormat, readIBRawExcel, readPricingSheet } from "../controllers/portfolioFunctions";
import { uploadArrayAndReturnFilePath, getTriadaTrades, formatCentralizedRawFiles, formatIbTrades, formatEmsxTrades, readEmsxRawExcel } from "../controllers/excelFormat";
import { getFxTrades, getGraphToken, getVcons } from "../controllers/graphApiConnect";
import { formatMufg, formatFxMufg, tradesTriada } from "../controllers/mufgOperations";
import { getCollectionDays, readMUFGPrices, updatePreviousPricesPortfolioMUFG, updatePreviousPricesPortfolioBloomberg, getEditLogs, readMUFGEndOfMonthFile, checkMUFGEndOfMonthWithPortfolio, getPortfolioOnSpecificDate, editPositionPortfolio, getFundDetails, getAllFundDetails, editFund, deleteFund, addFund } from "../controllers/operations";
import { editDayRlzd, editMTDRlzd } from "../controllers/oneTimeFunctions";
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
    console.log(date, "test");
    let report = await getHistoricalPortfolioWithAnalytics(date);
    res.send(report);
  } catch (error: any) {
    res.send({ error: error.toString() });
  }
});
router.get("/summary-portfolio", async (req: Request, res: Response, next: NextFunction) => {
  try {
    let date: any = req.query.date;

    if (date.includes("NaN")) {
      date = getDateTimeInMongoDBCollectionFormat(new Date());
    }
    
    
    date = getDateTimeInMongoDBCollectionFormat(new Date(date)).split(" ")[0] + " 23:59";
    let report = await getHistoricalSummaryPortfolioWithAnalytics(date);

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
    console.log(fundDetails);
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

router.post("/elec-blot", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  const fileName = req.files[0].filename;
  const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
  const trader = req.body.trader;
  const startegy = req.body.startegy;
  let arr: any = await bloombergToTriada(path, trader, startegy); // array
  if (arr.error) {
    res.send(arr.error);
  } else {
    let eBlotName = await uploadArrayAndReturnFilePath(arr, "test"); //
    let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + eBlotName;
    res.send(downloadEBlotName);
  }
});

router.post("/upload-trades", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let files = req.files;
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;

    let action: any = await updatePositionPortfolio(path); //updatePositionPortfolio
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

router.post("/update-prices", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
    let action: any = await updatePricesPortfolio(path);
    console.log(action);
    if (action?.error) {
      res.send({ error: action.error });
    } else {
      res.sendStatus(200);
    }
  } catch (error) {
    res.send({ error: "File Template is not correct" });
  }
});

router.post("/nomura-excel", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = req.body;
  let pathName = formatDateVconFile(data.timestamp_start) + "_" + formatDateVconFile(data.timestamp_end) + "_";
  let token = await getGraphToken();
  //to be modified
  let trades = await getTriadaTrades("vcons");
  let array: any = await getVcons(token, data.timestamp_start, data.timestamp_end, trades[0], trades[1]);
  if (array.length == 0) {
    res.send({ error: "No Trades" });
  } else {
    let vcons = await uploadArrayAndReturnFilePath(array, pathName);
    let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + vcons;
    res.send(downloadEBlotName);
  }
});

router.post("/vcon-excel", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = req.body;
  let pathName = "vcon_" + formatDateVconFile(data.timestamp_start) + "_" + formatDateVconFile(data.timestamp_end) + "_";
  let token = await getGraphToken();
  let trades = await getTriadaTrades("vcons");
  let array: any = await getVcons(token, data.timestamp_start, data.timestamp_end, trades[0], trades[1]);
  if (array.length == 0) {
    res.send({ error: "No Trades" });
  } else {
    let vcons = await uploadArrayAndReturnFilePath(array, pathName);
    let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + vcons;
    res.send(downloadEBlotName);
  }
});

router.post("/ib-excel", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let files = req.files;
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
    // to be modified
    let trades = await getTriadaTrades("ib");
    let data = await readIBRawExcel(path);
    let portfolio = await getPortfolio();
    let action = formatIbTrades(data, trades[0], portfolio, trades[1]);
    // console.log(action)

    if (!action) {
      res.send({ error: action });
    } else {
      let ib = await uploadArrayAndReturnFilePath(action, "ib_formatted");
      let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + ib;
      res.send(downloadEBlotName);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "File Template is not correct" });
  }
});

router.post("/mufg-excel", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = req.body;
  let pathName = "mufg_" + formatDateVconFile(data.timestamp_start) + "_" + formatDateVconFile(data.timestamp_end) + "_";
  let trades = await tradesTriada();

  let array: any = await formatMufg(trades, data.timestamp_start, data.timestamp_end);

  if (array.length == 0) {
    res.send({ error: "No Trades" });
  } else {
    let mufgTrades = await uploadArrayAndReturnFilePath(array, pathName);
    let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + mufgTrades;
    res.send(downloadEBlotName);
  }
});

router.post("/mufg-fx", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let tradesCount: number = req.body.tradesCount;

  let action: any = await formatFxMufg(req.files, tradesCount);
  let url = await uploadArrayAndReturnFilePath(action, "fx_mufg_formatted");
  url = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + url;
  res.send(url);
});

router.post("/centralized-blotter", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    let token = await getGraphToken();
    // to be modified
    let vconTrades = await getTriadaTrades("vcons", new Date(data.timestamp_start).getTime() - 2 * 24 * 60 * 60 * 1000, new Date(data.timestamp_end).getTime() + 2 * 24 * 60 * 60 * 1000);

    let vcons: any = await getVcons(token, data.timestamp_start, data.timestamp_end, vconTrades[0], vconTrades[1]);
    let ibTrades = await getTriadaTrades("ib", new Date(data.timestamp_start).getTime(), new Date(data.timestamp_end).getTime());
    let emsxTrades = await getTriadaTrades("emsx", new Date(data.timestamp_start).getTime(), new Date(data.timestamp_end).getTime());
    let action: any = await formatCentralizedRawFiles(req.files, vcons, vconTrades[0], ibTrades[0], emsxTrades[0]);

    if (action.error) {
      res.send({ error: action.error });
    } else {
      if (action.length > 0) {
        let url = await uploadArrayAndReturnFilePath(action, "centralized_blot");
        url = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + url;

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

router.post("/bulk-edit", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
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

router.post("/emsx-excel", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let files = req.files;
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
    //to be modified
    let trades = await getTriadaTrades("emsx");
    console.log(trades[0]);
    let data = await readEmsxRawExcel(path);

    let portfolio = await getPortfolio();

    let action = formatEmsxTrades(data, trades[0], portfolio, trades[1]);
    if (!action) {
      res.send({ error: action });
    } else {
      let emsx = await uploadArrayAndReturnFilePath(action, "emsx_formated");
      let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + emsx;
      res.send(downloadEBlotName);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "File Template is not correct" });
  }
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

router.post("/edit-position", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let action = await editPosition(req.body, req.body.date);

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Template is not correct" });
  }
});

router.post("/fx-excel", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = req.body;
  let pathName = "fx_" + formatDateVconFile(data.timestamp_start) + "_" + formatDateVconFile(data.timestamp_end) + "_";
  let token = await getGraphToken();
  // let trades = await getTriadaTrades("fx");
  let array: any = await getFxTrades(token, data.timestamp_start, data.timestamp_end, []);

  if (array.length == 0) {
    res.send({ error: "No Trades" });
  } else {
    let fxTrades = await uploadArrayAndReturnFilePath(array, pathName);
    let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + fxTrades;
    res.send(downloadEBlotName);
  }
});

router.post("/update-previous-prices", verifyToken, uploadBeforeExcel.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let collectionDate: string = req.body.collectionDate;
    let collectionType: string = req.body.collectionType;
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
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
      const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
      data = await readMUFGEndOfMonthFile(path);
    }

    let action = await checkMUFGEndOfMonthWithPortfolio(data, portfolio[0]);
    if (action?.error) {
      res.send({ error: action.error });
    } else {
      let link = await uploadArrayAndReturnFilePath(action, `mufg_check_${collectionDate}`);
      let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + link;
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
  // let day = getDateTimeInMongoDBCollectionFormat(new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000));
  // let test = await editMTDRlzd(day);

  res.sendStatus(200);
});

export default router;

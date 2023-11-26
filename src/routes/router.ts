import { NextFunction, Router } from "express";
import { image } from "../models/image";
import {
  registerUser,
  checkIfUserExists,
  sendResetPasswordRequest,
  resetPassword,
} from "../controllers/auth";
import { Request, Response } from "express";
import {
  getDate,
  verifyToken,
  formatDateVconFile,
} from "../controllers/common";
import {
  updatePositionPortfolio,
  getHistoricalPortfolioWithAnalytics,
  updatePricesPortfolio,
  uploadPortfolioFromImagine,
  getTrades,
  getAllCollectionDatesSinceStartMonth,
  uploadPortfolioFromLivePortfolio,
  uploadPortfolioFromMufg,
  getPortfolio,
  editPositionPortfolio,
  editPosition,
} from "../controllers/portfolioOperations";
import {
  bloombergToTriada,
  uploadTriadaAndReturnFilePath,
  readMUFGEBlot,
  readIBEBlot,
  formatIbTrades,
  readEmsxRawEBlot,
  formatEmsxTrades,
} from "../controllers/portfolioFunctions";
import { checkIfSecurityExist } from "../controllers/tsImagineOperations";
import {
  uploadVconAndReturnFilePath,
  formatNomuraEBlot,
  getTriadaTrades,
} from "../controllers/vconOperation";
import { getGraphToken, getVcons } from "../controllers/graphApiConnect";
import {
  readBBGBlot,
  createExcelAndReturnPath,
  formatBBGBlotToMufg,
  readFxTrades,
  formatFxTradesToMufg,
} from "../controllers/mufgOperations";
import { formatTriadaBlot } from "../controllers/eblot";

require("dotenv").config();

const readLastLines = require("read-last-lines");
const path = require("path");
const xlsx = require("xlsx");
const axios = require("axios");

const multerGoogleStorage = require("multer-google-storage");
const multer = require("multer");
const uploadBeforeExcel = multer({
  storage: multerGoogleStorage.storageEngine({
    autoRetry: true,
    bucket: process.env.BUCKET,
    projectId: process.env.PROJECTID,
    keyFilename: process.env.KEYPATHFILE,
    filename: (
      req: Request,
      file: image,
      cb: (err: boolean, fileName: string) => void
    ) => {
      cb(false, `/before-excel/${Date.now()}_${file.originalname}`);
    },
  }),
});

const router = Router();

router.get(
  "/auth",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    res.sendStatus(200);
  }
);

router.get(
  "/portfolio",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    const date: any = req.query.date;
    let report = await getHistoricalPortfolioWithAnalytics(date);
    res.send(report);
  }
);

router.get("/trades-logs", verifyToken, async (req, res) => {
  try {
    const filePath = path.resolve("trades-logs.txt");
    const lastLines = await readLastLines.read(filePath, 500);
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

router.post(
  "/login",
  async (req: Request, res: Response, next: NextFunction) => {
    let data = req.body;
    let username = data.username;
    let password = data.password;
    let user = await checkIfUserExists(username, password);
    res.send(user);
  }
);

router.post(
  "/signUp",
  async (req: Request, res: Response, next: NextFunction) => {
    let data = req.body;
    let email = data.email;
    let password = data.password;
    let verificationCode = data.verificationCode;
    let result = await registerUser(email, password, verificationCode);
    res.send(result);
  }
);

router.post(
  "/elec-blot",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    const fileName = req.files[0].filename;
    const path =
      "https://storage.googleapis.com/capital-trade-396911.appspot.com" +
      fileName;
    const trader = req.body.trader;
    const startegy = req.body.startegy;
    let arr: any = await bloombergToTriada(path, trader, startegy); // array
    if (arr.error) {
      res.send(arr.error);
    } else {
      let eBlotName = await uploadTriadaAndReturnFilePath(arr); //
      let downloadEBlotName =
        "https://storage.googleapis.com/capital-trade-396911.appspot.com/" +
        eBlotName;
      res.send(downloadEBlotName);
    }
  }
);

router.post(
  "/upload-trades",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    try {
      let files = req.files;
      let bbg = "",
        ib = "",
        emsx = "";
      for (let index = 0; index < files.length; index++) {
        if (files[index].fieldname == "bbg") {
          const fileName = req.files[index].filename;
          const path =
            "https://storage.googleapis.com/capital-trade-396911.appspot.com" +
            fileName;
          bbg = path;
        } else if (files[index].fieldname == "ib") {
          const fileName = req.files[index].filename;
          const path =
            "https://storage.googleapis.com/capital-trade-396911.appspot.com" +
            fileName;
          ib = path;
        } else if (files[index].fieldname == "emsx") {
          const fileName = req.files[index].filename;
          const path =
            "https://storage.googleapis.com/capital-trade-396911.appspot.com" +
            fileName;
          emsx = path;
        }
      }

      let action: any = await updatePositionPortfolio(bbg, ib, emsx); //updatePositionPortfolio
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
  }
);

router.post(
  "/update-prices",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    try {
      const fileName = req.files[0].filename;
      const path =
        "https://storage.googleapis.com/capital-trade-396911.appspot.com" +
        fileName;
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
  }
);

router.post(
  "/check-isin",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    const fileName = req.files[0].filename;
    const path =
      "https://storage.googleapis.com/capital-trade-396911.appspot.com" +
      fileName;
    let action = await checkIfSecurityExist(path);

    if (action?.error) {
      res.send({ error: action.error });
    } else {
      res.send(action);
    }
  }
);

router.post(
  "/nomura-excel",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    let data = req.body;
    let pathName =
      formatDateVconFile(data.timestamp_start) +
      "xxxx" +
      formatDateVconFile(data.timestamp_end);
    let token = await getGraphToken();
    let trades = await getTriadaTrades("vcons");
    let array: any = await getVcons(
      token,
      data.timestamp_start,
      data.timestamp_end,
      trades
    );
    if (array.length == 0) {
      res.send({ error: "No Trades" });
    } else {
      let vcons = await uploadVconAndReturnFilePath(array, pathName);
      let downloadEBlotName =
        "https://storage.googleapis.com/capital-trade-396911.appspot.com/" +
        vcons;
      res.send(downloadEBlotName);
    }
  }
);

router.post(
  "/vcon-excel",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    let data = req.body;
    let pathName =
      formatDateVconFile(data.timestamp_start) +
      "xxxx" +
      formatDateVconFile(data.timestamp_end);
    let token = await getGraphToken();
    let trades = await getTriadaTrades("vcons");
    let array: any = await getVcons(
      token,
      data.timestamp_start,
      data.timestamp_end,
      trades
    );
    if (array.length == 0) {
      res.send({ error: "No Trades" });
    } else {
      let vcons = await uploadVconAndReturnFilePath(array, pathName);
      let downloadEBlotName =
        "https://storage.googleapis.com/capital-trade-396911.appspot.com/" +
        vcons;
      res.send(downloadEBlotName);
    }
  }
);

router.post(
  "/ib-excel",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    try {
      let files = req.files;
      const fileName = req.files[0].filename;
      const path =
        "https://storage.googleapis.com/capital-trade-396911.appspot.com" +
        fileName;
      let trades = await getTriadaTrades("ib");
      let data = await readIBEBlot(path);
      let portfolio = await getPortfolio();
      let action = formatIbTrades(data, trades, portfolio);

      if (!action) {
        res.send({ error: action });
      } else {
        let ib = await uploadVconAndReturnFilePath(action, "ibFromated");
        let downloadEBlotName =
          "https://storage.googleapis.com/capital-trade-396911.appspot.com/" +
          ib;
        res.send(downloadEBlotName);
      }
    } catch (error) {
      console.log(error);
      res.send({ error: "File Template is not correct" });
    }
  }
);

router.post(
  "/mufg",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    let tradesCount: number = req.body.countTrades;
    let action: any = await formatBBGBlotToMufg(req.files, tradesCount);
    console.log(req.body);
    let url = await createExcelAndReturnPath(action, getDate(null));
    url = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + url;
      res.send(url);
  }
);

router.post(
  "/mufg-fx",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    let action: any = await readFxTrades(req.files[0]["filename"]);
    // let url = await uploadMufgTest(action, "test")
    // url = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + url
    res.send(200);
  }
);

router.post(
  "/centerlized-blotter",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    try {
      let action: any = await formatTriadaBlot(req.files);

      let url = await createExcelAndReturnPath(action, "centerlizedBlot");
      url =
        "https://storage.googleapis.com/capital-trade-396911.appspot.com/" +
        url;

      res.send(url);
    } catch (error) {
      console.log(error);
      res.send({ error: error });
    }
  }
);

router.post(
  "/bulk-edit",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    try {
      const fileName = req.files[0].filename;
      const path =
        "https://storage.googleapis.com/capital-trade-396911.appspot.com" +
        fileName;
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
  }
);

router.post(
  "/emsx-excel",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    try {
      let files = req.files;
      const fileName = req.files[0].filename;
      const path =
        "https://storage.googleapis.com/capital-trade-396911.appspot.com" +
        fileName;
      let trades = await getTriadaTrades("emsx");
      let data = await readEmsxRawEBlot(path);
      let portfolio = await getPortfolio();

      let action = formatEmsxTrades(data, trades, portfolio);
      if (!action) {
        res.send({ error: action });
      } else {
        let emsx = await uploadVconAndReturnFilePath(action, "emsxFormated");
        let downloadEBlotName =
          "https://storage.googleapis.com/capital-trade-396911.appspot.com/" +
          emsx;
        res.send(downloadEBlotName);
      }
    } catch (error) {
      console.log(error);
      res.send({ error: "File Template is not correct" });
    }
  }
);

router.post(
  "/send-reset-code",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    let data = req.body;
    console.log(data, "x");
    let result = await sendResetPasswordRequest(data.email);
    console.log(result);
    res.send(result);
  }
);

router.post(
  "/reset-password",
  verifyToken,
  async (req: Request, res: Response, next: NextFunction) => {
    let data = req.body;
    let result = await resetPassword(data.email, data.code, data.password);

    res.send(result);
  }
);

router.post(
  "/edit-position",
  verifyToken,
  uploadBeforeExcel.any(),
  async (req: Request | any, res: Response, next: NextFunction) => {
    try {
      let action = await editPosition(req.body);
      console.log("xxxxxxx", action);
      res.send(action);
    } catch (error) {
      console.log(error);
      res.send({ error: "File Template is not correct" });
    }
  }
);

export default router;

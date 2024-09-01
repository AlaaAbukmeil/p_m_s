import { checkIfUserExists, registerUser, resetPassword, sendResetPasswordRequest } from "../controllers/userManagement/auth";
import { formatCentralizedRawFiles, formatEmsxTrades, formatIbTrades, formatNomura } from "../controllers/eblot/excelFormat";
import { CookieOptions, NextFunction, Router } from "express";
import { Request, Response } from "express";
import { readEmsxRawExcel, readIBRawExcel, uploadArrayAndReturnFilePath } from "../controllers/operations/readExcel";
import { getPortfolio } from "../controllers/operations/positions";
import { formatFxMufg, formatMufg, formatMufgCDS } from "../controllers/operations/mufgOperations";
import { getFxTrades, getGraphToken, getVcons } from "../controllers/eblot/graphApiConnect";
import { MufgTrade } from "../models/mufg";
import { addNomuraGeneratedDateToTrades } from "../controllers/operations/trades";
import { getAllTrades } from "../controllers/operations/trades";
import { bucket, formatDateFile, generateSignedUrl, verifyToken } from "../controllers/common";
import { uploadToBucket } from "../controllers/userManagement/tools";
import { CentralizedTrade } from "../models/trades";
const { exec } = require("child_process");
const formatterRouter = Router();

formatterRouter.post("/ib-excel", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const fileName = req.files[0].filename;
    const path = await generateSignedUrl(fileName);

    // to be modified
    let beforeMonth = new Date().getTime() - 6 * 30 * 24 * 60 * 60 * 1000;
    let now = new Date().getTime() + 5 * 24 * 60 * 60 * 1000;
    let trades = await getAllTrades(beforeMonth, now, "ib");
    let data = await readIBRawExcel(path);
    let portfolio = await getPortfolio("portfolio_main");
    let action = formatIbTrades(data, trades, portfolio);

    if (!action) {
      res.send({ error: action });
    } else {
      let ib = await uploadArrayAndReturnFilePath(action, "ib_formatted", "ib");
      let downloadEBlotName = bucket + ib + "?authuser=2";
      res.send(downloadEBlotName);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "File Template is not correct" });
  }
});

formatterRouter.post("/mufg-excel", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = req.body;
  let pathName = "mufg_" + formatDateFile(data.timestamp_start) + "_" + formatDateFile(data.timestamp_end) + "_";
  let vcons = await getAllTrades(new Date(data.timestamp_start).getTime(), new Date(data.timestamp_end).getTime(), "portfolio_main", "vcons");
  let ib = await getAllTrades(new Date(data.timestamp_start).getTime(), new Date(data.timestamp_end).getTime(), "portfolio_main", "ib");
  let emsx = await getAllTrades(new Date(data.timestamp_start).getTime(), new Date(data.timestamp_end).getTime(), "portfolio_main", "emsx");
  let trades = [...vcons,... ib, ...emsx];
  console.log({ trades });
  let array: MufgTrade[] = formatMufg(trades, data.timestamp_start, data.timestamp_end);

  if (array.length == 0) {
    res.send({ error: "No Trades" });
  } else {
    let mufgTrades = await uploadArrayAndReturnFilePath(array, pathName, "mufg");
    let downloadEBlotName = bucket + mufgTrades + "?authuser=2";
    res.send(downloadEBlotName);
  }
});
formatterRouter.post("/mufg-excel-cds", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = req.body;
  let pathName = "mufg_cds_" + formatDateFile(data.timestamp_start) + "_" + formatDateFile(data.timestamp_end) + "_";
  let trades = await getAllTrades(data.timestamp_start, data.timestamp_end, "cds_gs");

  let array: MufgTrade[] = formatMufgCDS(trades, data.timestamp_start, data.timestamp_end);

  if (array.length == 0) {
    res.send({ error: "No Trades" });
  } else {
    let mufgTrades = await uploadArrayAndReturnFilePath(array, pathName, "mufg");
    let downloadEBlotName = bucket + mufgTrades + "?authuser=2";
    res.send(downloadEBlotName);
  }
});

formatterRouter.post("/mufg-fx", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let tradesCount: number = req.body.tradesCount;

  let action: any = await formatFxMufg(req.files, tradesCount);
  let url = await uploadArrayAndReturnFilePath(action, "fx_mufg_formatted", "mufg_fx");
  url = bucket + url + "?authuser=2";
  res.send(url);
});

formatterRouter.post("/centralized-blotter", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    let token = await getGraphToken();
    // to be modified
    let start = new Date(data.timestamp_start).getTime() - 5 * 24 * 60 * 60 * 1000;
    let end = new Date(data.timestamp_end).getTime() + 5 * 24 * 60 * 60 * 1000;
    let startLimit = new Date(data.timestamp_start).getTime() - 1 * 24 * 60 * 60 * 1000;
    let endLimit = new Date(data.timestamp_end).getTime() + 1 * 24 * 60 * 60 * 1000;
    let cdsTrades: [CentralizedTrade[], number] | any = await await getAllTrades(start, end, "cds_gs");
    let canceledTrades = await getAllTrades(start, end, "canceled_vcons");
    let vconTrades = await getAllTrades(start, end, "vcons");

    vconTrades = [...vconTrades, ...cdsTrades, ...canceledTrades];
    let vcons: any = await getVcons(token, data.timestamp_start, data.timestamp_end, vconTrades);
    vcons = vcons.filter((trade: any, index: any) => trade["Trade App Status"] != "uploaded_to_app" && new Date(trade["Trade Date"]).getTime() > startLimit && new Date(trade["Trade Date"]).getTime() < endLimit);
    let ibTrades = await getAllTrades(start, end, "ib");
    let emsxTrades = await getAllTrades(start, end, "emsx");
    let action: any = await formatCentralizedRawFiles(req.files, vcons, vconTrades, ibTrades, emsxTrades, false);

    if (action.error) {
      res.send({ error: action.error });
    } else {
      if (action.length > 0) {
        let url = await uploadArrayAndReturnFilePath(action, "centralized_blot", "centralized_blot");
        url = bucket + url + "?authuser=2";

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

formatterRouter.post("/emsx-excel", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let files = req.files;
    const fileName = req.files[0].filename;
    const path = await generateSignedUrl(fileName);

    //to be modified
    let beforeMonth = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
    let now = new Date().getTime() + 5 * 24 * 60 * 60 * 1000;
    let trades = await getAllTrades(beforeMonth, now, "emsx");

    let data = await readEmsxRawExcel(path);

    let portfolio = await getPortfolio("portfolio_main");

    let action = formatEmsxTrades(data, trades, portfolio);
    if (!action) {
      res.send({ error: action });
    } else {
      let emsx = await uploadArrayAndReturnFilePath(action, "emsx_formated", "emsx");
      let downloadEBlotName = bucket + emsx + "?authuser=2";
      res.send(downloadEBlotName);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "File Template is not correct" });
  }
});

formatterRouter.post("/fx-excel", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = req.body;
  let pathName = "fx_" + formatDateFile(data.timestamp_start) + "_" + formatDateFile(data.timestamp_end) + "_";
  let token = await getGraphToken();
  let array: any = await getFxTrades(token, data.timestamp_start, data.timestamp_end, []);

  if (array.length == 0) {
    res.send({ error: "No Trades" });
  } else {
    let fxTrades = await uploadArrayAndReturnFilePath(array, pathName, "fx");
    let downloadEBlotName = bucket + fxTrades + "?authuser=2";
    res.send(downloadEBlotName);
  }
});

formatterRouter.post("/nomura-excel", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  let data = req.body;
  let pathName = "nomura" + formatDateFile(data.timestamp_start) + "_" + formatDateFile(data.timestamp_end) + "_";
  let start = new Date(data.timestamp_start).getTime() - 5 * 24 * 60 * 60 * 1000;
  let end = new Date(data.timestamp_end).getTime() + 5 * 24 * 60 * 60 * 1000;
  await addNomuraGeneratedDateToTrades(start, end);
  let vconTrades = await getAllTrades(start, end, "vcons");
  let array = formatNomura(vconTrades, data.timestamp_start, data.timestamp_end);
  if (array.length == 0) {
    res.send({ error: "No Trades" });
  } else {
    let mufgTrades = await uploadArrayAndReturnFilePath(array, pathName, "nomura", "csv");
    let downloadEBlotName = bucket + mufgTrades + "?authuser=2";
    res.send(downloadEBlotName);
  }
});

export default formatterRouter;

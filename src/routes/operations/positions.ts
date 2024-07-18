import { Router } from "express";
import { bucket, formatDateFile, generateSignedUrl, verifyToken } from "../../controllers/common";
import { Request, Response, NextFunction } from "express";
import { addFund, deleteFund, editFund, getAllFundDetails } from "../../controllers/operations/fund";
import { deletePosition, editPosition, editPositionBulkPortfolio, insertFXPosition, pinPosition, readCalculatePosition, updatePositionPortfolio } from "../../controllers/operations/positions";
import { readCentralizedEBlot, readMUFGPrices, readPricingSheet, uploadArrayAndReturnFilePath } from "../../controllers/operations/readExcel";
import { checkLivePositions, updatePreviousPricesPortfolioBloomberg, updatePreviousPricesPortfolioMUFG, updatePricesPortfolio } from "../../controllers/operations/prices";
import { monthlyRlzdDate } from "../../controllers/reports/common";
import { FundDetails } from "../../models/portfolio";
import { CentralizedTrade } from "../../models/trades";
import { getAllTradesForSpecificPosition } from "../../controllers/operations/trades";
import { consumers } from "stream";
import { getEditLogs, updateEditLogs } from "../../controllers/operations/logs";
import { getCollectionDays } from "../../controllers/operations/tools";
import { uploadToBucket } from "../../controllers/userManagement/tools";

const positionsRouter = Router();

positionsRouter.get("/edit-logs", verifyToken, async (req, res) => {
  try {
    const editLogsType: any = req.query.logsType;

    let editLogs = await getEditLogs(`${editLogsType}`);
    res.send(editLogs);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

positionsRouter.get("/previous-collections", verifyToken, async (req, res) => {
  try {
    let previousCollections = await getCollectionDays();
    res.send(previousCollections);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

positionsRouter.post("/recalculate-position", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    let tradeType = data.tradeType;
    let isin = data["ISIN"];
    let location = data["Location"];
    let date = data.date;
    let trades = await getAllTradesForSpecificPosition(tradeType, isin, location, date);
    if (trades.length) {
      let action: any = await readCalculatePosition(trades, date, isin, location, tradeType);
      console.log(action);
      res.sendStatus(200);
    } else {
      res.send({ error: "no trades" });
    }
  } catch (error) {
    console.log(error);
    res.send({ error: error });
  }
});

positionsRouter.post("/edit-position", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let action = await editPosition(req.body, req.body.date);

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "something is not correct, check error log records" });
  }
});

positionsRouter.post("/fx-add-position", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    let check = ["Notional Amount", "Code", "Location"];
    let checkResult = false;
    let checkResultElement = "";

    for (let index = 0; index < check.length; index++) {
      const element = check[index];
      if (!data[element]) {
        checkResult = true;
        checkResultElement = element;
      }
    }
    if (checkResult) {
      res.send({ error: "missing param: " + checkResultElement });
    } else {
      let dateBroken = req.body.date.split("-");
      let newDate = dateBroken[2] + "/" + dateBroken[1] + "/" + dateBroken[0];
      let action = await insertFXPosition(req.body, newDate);
      res.sendStatus(200);
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "something is not correct, check error log records" });
  }
});

positionsRouter.post("/pin-position", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let action = await pinPosition(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "something is not correct, check error log records" });
  }
});

positionsRouter.post("/delete-position", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = JSON.parse(req.body.data);
    let date = req.body.date;
    console.log(data["_id"]);

    let action: any = await deletePosition(data, date);
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

positionsRouter.post("/upload-trades", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let files = req.files;
    const fileName = files[0].filename;
    const path = await generateSignedUrl(fileName);
    let link = bucket + "/" + fileName + "?authuser=2";

    let allTrades: any = await readCentralizedEBlot(path);

    if (allTrades?.error) {
      res.send({ error: allTrades.error });
    } else {
      let action: any = await updatePositionPortfolio(allTrades, link);
      if (action?.error) {
        console.log(action);
        res.send({ error: action.error });
      } else {
        console.log(action);
        res.send(action);
      }
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "File Template is not correct" });
  }
});

positionsRouter.post("/update-prices", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const fileName = req.files[0].filename;
    const path = await generateSignedUrl(fileName);
    let link = bucket + "/" + fileName + "?authuser=2";
    let action: any = await updatePricesPortfolio(path, link);
    if (action?.error) {
      res.send({ error: action.error });
    } else {
      res.send({ error: null });
    }
  } catch (error) {
    res.send({ error: "File Template is not correct" });
  }
});

positionsRouter.post("/live-prices", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let action: any = await checkLivePositions();
    let pathName = "live-positions";
    let livePositions = await uploadArrayAndReturnFilePath(action, pathName, "live-positions");

    let downloadEBlotName = bucket + livePositions + "?authuser=2";
    res.send(downloadEBlotName);
  } catch (error) {
    res.send({ error: "File Template is not correct" });
  }
});

positionsRouter.post("/bulk-edit", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const fileName = req.files[0].filename;
    const path = await generateSignedUrl(fileName);
    let link = bucket + "/" + fileName + "?authuser=2";

    let action: any = await editPositionBulkPortfolio(path, link);
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

positionsRouter.post("/update-previous-prices", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let collectionDate: string = req.body.collectionDate;
    let collectionType: string = req.body.collectionType;

    const fileName = req.files[0].filename;
    const path = await generateSignedUrl(fileName);

    let data: any = collectionType == "MUFG" ? await readMUFGPrices(path) : await readPricingSheet(path);
    let link = bucket + "/" + fileName + "?authuser=2";

    if (!data.error) {
      let action = collectionType == "MUFG" ? await updatePreviousPricesPortfolioMUFG(data, collectionDate, link) : await updatePreviousPricesPortfolioBloomberg(data, collectionDate, link);
      if (action?.error && Object.keys(action.error).length) {
        res.send({ error: action.error, status: 404 });
      } else {
        res.send({ error: null });
      }
    } else {
      res.send({ error: data.error, status: 404 });
    }
    // console.log(action);
  } catch (error) {
    res.send({ error: "fatal error" });
  }
});

export default positionsRouter;

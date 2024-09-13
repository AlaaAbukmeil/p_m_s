import { Router } from "express";
import { bucket, formatDateFile, generateSignedUrl, verifyToken } from "../../controllers/common";
import { Request, Response, NextFunction } from "express";
import { deletePosition, editPosition, insertFXPosition, pinPosition, readCalculatePosition, updatePositionPortfolio } from "../../controllers/operations/positions";
import { readCentralizedEBlot, readExcel, readMUFGPrices, readPricingSheet, uploadArrayAndReturnFilePath } from "../../controllers/operations/readExcel";
import { checkLivePositions, updatePreviousPricesPortfolioMUFG, updatePricesPortfolio } from "../../controllers/operations/prices";
import { getAllTradesForSpecificPosition } from "../../controllers/operations/trades";
import { getEditLogs } from "../../controllers/operations/logs";
import { getCollectionDays } from "../../controllers/operations/tools";
import { uploadToBucket } from "../../controllers/userManagement/tools";
import { factsheetPool } from "../../controllers/operations/psql/operation";
import { getAllCollectionNames } from "../../controllers/reports/tools";

const positionsRouter = Router();

positionsRouter.get("/edit-logs", verifyToken, async (req, res) => {
  try {
    const editLogsType: any = req.query.logsType;

    let editLogs = await getEditLogs(`${editLogsType}`, "portfolio_main");
    res.send(editLogs);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

positionsRouter.get("/previous-collections", verifyToken, async (req, res) => {
  try {
    let previousCollections = await getAllCollectionNames("portfolio_main");
    let formatted = getCollectionDays(previousCollections);
    res.send(formatted);
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
    let trades = await getAllTradesForSpecificPosition(tradeType, isin, location, date, "portfolio_main");
    if (trades.length) {
      let action: any = await readCalculatePosition(trades, date, isin, location, tradeType, "portfolio_main");
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
    let action = await editPosition(req.body, req.body.date, "portfolio_main");

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
      let action = await insertFXPosition(req.body, newDate, "portfolio_main");
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

    let action: any = await deletePosition(data, date, "portfolio_main");
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
    let timestamp = new Date().getTime();
    let files = req.files;
    const fileName = files[0].filename;
    const path = await generateSignedUrl(fileName);
    let link = bucket + "/" + fileName + "?authuser=2";
    let allTrades: any = await readCentralizedEBlot(path);

    if (allTrades?.error) {
      res.send({ error: allTrades.error });
    } else {
      let action: any = await updatePositionPortfolio(allTrades, link, "portfolio_main");
      let timestamp_2 = new Date().getTime();
      console.log((timestamp_2 - timestamp) / 1000 + " seconds to upload trades");
      if (action?.error) {
        res.send({ error: action.error });
      } else {
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
    let timestamp = new Date().getTime();
    const path = await generateSignedUrl(fileName);
    let link = bucket + "/" + fileName + "?authuser=2";
    let action: any = await updatePricesPortfolio(path, link, "portfolio_main");
    let timestamp_2 = new Date().getTime();
    console.log((timestamp_2 - timestamp) / 1000 + " seconds to update prices");
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

positionsRouter.post("/update-previous-prices", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let collectionDate: string = req.body.collectionDate;
    let collectionType: string = req.body.collectionType;

    const fileName = req.files[0].filename;
    const path = await generateSignedUrl(fileName);

    let data: any = collectionType == "MUFG" ? await readMUFGPrices(path) : {};
    let link = bucket + "/" + fileName + "?authuser=2";

    if (!data.error) {
      let action = collectionType == "MUFG" ? await updatePreviousPricesPortfolioMUFG(data, collectionDate, link, "portfolio_main") : await updatePricesPortfolio(path, link, "portfolio_main", collectionDate);
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
positionsRouter.post("/process-excel", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  const fileName = req.files[0].filename;
  const path = await generateSignedUrl(fileName);
  let link = bucket + "/" + fileName + "?authuser=2";
  let action: any = await readExcel(path);
  console.log({ action });
});

export default positionsRouter;

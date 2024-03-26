import { Router } from "express";
import { bucket, verifyToken } from "../../controllers/common";
import { uploadToBucket } from "./portfolio";
import { Request, Response, NextFunction } from "express";
import { addFund, deleteFund, deletePosition, editFund, editPositionPortfolio, getAllFundDetails, getCollectionDays, getEditLogs, readCalculatePosition } from "../../controllers/operations/portfolio";
import { editPosition, updatePositionPortfolio, updatePricesPortfolio } from "../../controllers/operations/positions";
import { readCentralizedEBlot, readMUFGPrices, readPricingSheet } from "../../controllers/operations/readExcel";
import { updatePreviousPricesPortfolioBloomberg, updatePreviousPricesPortfolioMUFG } from "../../controllers/operations/prices";
import { monthlyRlzdDate } from "../../controllers/reports/common";
import { FundDetails } from "../../models/portfolio";
import { CentralizedTrade } from "../../models/trades";
import { getAllTradesForSpecificPosition } from "../../controllers/operations/trades";

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

positionsRouter.get("/fund-details", verifyToken, async (req, res) => {
  try {
    const date: any = req.query.date;
    let thisMonth = monthlyRlzdDate(date);
    let fundDetails: FundDetails[] = await getAllFundDetails(thisMonth);
    res.send(fundDetails);
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
    // console.log(tradeType, isin, location, date, trades);
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
    res.send({ error: "Template is not correct" });
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
    const path = bucket + fileName;
    let allTrades: any = await readCentralizedEBlot(path);

    if (allTrades?.error) {
      res.send({ error: allTrades.error });
    } else {
      let action: any = await updatePositionPortfolio(allTrades, path);
      if (action?.error) {
        res.send({ error: allTrades.error });
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

positionsRouter.post("/bulk-edit", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
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

positionsRouter.post("/update-previous-prices", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
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

positionsRouter.post("/edit-fund", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    console.log(req.body, "before");
    let action = await editFund(req.body);

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Template is not correct" });
  }
});

positionsRouter.post("/delete-fund", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    console.log(req.body, "before");
    let action = await deleteFund(req.body);
    res.sendStatus(200);
  } catch (error) {
    console.log(error);
    res.send({ error: "Template is not correct" });
  }
});

positionsRouter.post("/add-fund", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
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

export default positionsRouter;

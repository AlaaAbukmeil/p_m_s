import { Router } from "express";
import { verifyToken } from "../../controllers/common";
import { getRlzdTrades, getTrades } from "../../controllers/reports/trades";
import { Request, Response, NextFunction } from "express";
import { deleteTrade, editTrade } from "../../controllers/operations/trades";
import { getDateTimeInMongoDBCollectionFormat } from "../../controllers/reports/common";
import { uploadToBucket } from "../../controllers/userManagement/tools";

const tradesRouter = Router();

tradesRouter.get("/trades", verifyToken, async (req, res) => {
  try {
    const tradeType: "vcons" | "ib" | "emsx" | "written_blotter" | "cds_gs" | any = req.query.tradeType;
    console.log({ tradeType });
    let trades = await getTrades(tradeType, "portfolio_main");
    res.send(trades);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

tradesRouter.get("/rlzd-trades", verifyToken, async (req, res) => {
  try {
    const tradeType: any = req.query.tradeType;
    const isin: any = req.query["isin"];
    let ticker: any = req.query["ticker"];

    const location: any = req.query["location"];
    let date: any = req.query["date"];
    date = getDateTimeInMongoDBCollectionFormat(new Date(date));

    let mtdMark: any = req.query["mtdMark"];
    let mtdNotional: any = req.query["mtdNotional"] || 0;

    mtdNotional = parseFloat(mtdNotional.toString().replace(/,/g, ""));
    let trades = await getRlzdTrades(`${tradeType}`, isin, location, date, mtdMark, mtdNotional, ticker);

    res.send(trades.documents);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

tradesRouter.post("/edit-trade", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let logs = req.query.logs == "false" ? false : true;
    let source = req.query.source ? req.query.source : "main";

    let action = await editTrade(req.body, req.body.tradeType, "portfolio_main");

    if (action.error) {
      res.send({ error: action.error });
    } else {
      res.send({ error: action.error });
    }
  } catch (error) {
    console.log(error);
    res.send({ error: "something is not correct, check error log records" });
  }
});

tradesRouter.post("/delete-trade", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    let tradeType = req.body.tradeType;
    let action: any = await deleteTrade(tradeType, data["Id"], data["BB Ticker"], data["Location"]);
    console.log({ tradeType, action }, data["Id"], data["BB Ticker"], data["Location"]);
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

export default tradesRouter;

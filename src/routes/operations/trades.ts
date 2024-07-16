import { Router } from "express";
import { verifyToken } from "../../controllers/common";
import { formatCentralizedRawFiles } from "../../controllers/eblot/excelFormat";
import { getRlzdTrades, getTrades } from "../../controllers/reports/trades";
import { uploadToBucket } from "../reports/reports";
import { Request, Response, NextFunction } from "express";
import { getGraphToken, getVcons } from "../../controllers/eblot/graphApiConnect";
import { getAllTrades, getNewTrades } from "../../controllers/eblot/eblot";
import { addNewTrade, deleteNewTrade, deleteTrade, editTrade, getTriadaTrades } from "../../controllers/operations/trades";
import { CentralizedTrade } from "../../models/trades";
import { getDateTimeInMongoDBCollectionFormat } from "../../controllers/reports/common";
import { getAllPositionsInformation } from "../../controllers/analytics/data";
const { v4: uuidv4 } = require("uuid");

const tradesRouter = Router();

tradesRouter.get("/all-trades", verifyToken, async (req, res) => {
  try {
    let from: any = req.query.from;
    let to: any = req.query.to;
    let start: any = new Date(from).getTime() - 2 * 24 * 60 * 60 * 1000;
    let end: any = new Date(to).getTime() + 2 * 24 * 60 * 60 * 1000;

    let token = await getGraphToken();
    let trades = await getAllTrades(start, end);
    trades.filter((trade: any, index: any) => new Date(trade["Trade Date"]).getTime() > start && new Date(trade["Trade Date"]).getTime() < end);

    let vconTrades: [CentralizedTrade[], number] | any = await getTriadaTrades("vcons", start, end);
    let vcons: any = await getVcons(token, start + 2 * 24 * 60 * 60 * 1000, end - 2 * 24 * 60 * 60 * 1000, vconTrades);

    vcons = vcons.filter((trade: any, index: any) => trade["Trade App Status"] != "uploaded_to_app" && new Date(trade["Trade Date"]).getTime() > start && new Date(trade["Trade Date"]).getTime() < end);
    let action: any = await formatCentralizedRawFiles({}, vcons, [], [], [], true);
    // action = action.filter((trade: any, index: any) => trade["Trade App Status"] != "uploaded_to_app");
    let allTrades = action.concat(trades).sort((a: any, b: any) => new Date(b["Trade Date"]).getTime() - new Date(a["Trade Date"]).getTime());
    let newTrades = await getNewTrades();

    let allTradesUpdated = [...newTrades, ...allTrades];
    let positionsInformation = await getAllPositionsInformation();
    res.send({ trades: allTradesUpdated, newTrades: newTrades.length, positionsInformation: positionsInformation });
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while reading the file.");
  }
});

tradesRouter.get("/trades", verifyToken, async (req, res) => {
  try {
    const tradeType: any = req.query.tradeType;

    let trades = await getTrades(`${tradeType}`);
    res.send(trades);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

tradesRouter.get("/rlzd-trades", verifyToken, async (req, res) => {
  try {
    const tradeType: any = req.query.tradeType;
    const isin: any = req.query["isin"];

    const location: any = req.query["location"];
    let date: any = req.query["date"];
    date = getDateTimeInMongoDBCollectionFormat(new Date(date));

    let mtdMark: any = req.query["mtdMark"];
    let mtdNotional: any = req.query["mtdNotional"] || 0;
    let type: any = req.query["type"] || 0;

    mtdNotional = parseFloat(mtdNotional.toString().replace(/,/g, ""));
    let trades = await getRlzdTrades(`${tradeType}`, isin, location, date, mtdMark, mtdNotional);

    res.send(trades.documents);
  } catch (error) {
    res.status(500).send("An error occurred while reading the file.");
  }
});

tradesRouter.post("/edit-trade", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let logs = req.query.logs == "false" ? false : true;

    let action = await editTrade(req.body, req.body.tradeType, logs);

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
    console.log(data, "test delete");
    let action: any = await deleteTrade(tradeType, data["_id"], data["BB Ticker"], data["Location"]);
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

tradesRouter.post("/add-trade", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let data = req.body;
    let id = uuidv4();

    data["Trade App Status"] = "new, inputted by front office";
    data["Triada Trade Id"] = id;
    let action: any = await addNewTrade(data);
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

tradesRouter.post("/delete-new-trade", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
  try {
    let id = req.body["Triada Trade Id"];
    let action: any = await deleteNewTrade(id);
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

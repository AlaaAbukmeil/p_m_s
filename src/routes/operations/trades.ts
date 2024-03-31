import { Router } from "express";
import { verifyToken } from "../../controllers/common";
import { formatCentralizedRawFiles, getTriadaTrades } from "../../controllers/eblot/excelFormat";
import { getTrades } from "../../controllers/reports/trades";
import { uploadToBucket } from "../reports/portfolio";
import { Request, Response, NextFunction } from "express";
import { getGraphToken, getVcons } from "../../controllers/eblot/graphApiConnect";
import { getAllTrades } from "../../controllers/eblot/eblot";
import { deleteTrade, editTrade } from "../../controllers/operations/trades";
import { CentralizedTrade } from "../../models/trades";

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

    let vconTrades: [CentralizedTrade[], number] | any = await getTriadaTrades("vcons", start, end) 
    let vcons: any = await getVcons(token, start + 2 * 24 * 60 * 60 * 1000, end - 2 * 24 * 60 * 60 * 1000, vconTrades);

    vcons = vcons.filter((trade: any, index: any) => trade["Trade App Status"] != "uploaded_to_app");
    let action: any = await formatCentralizedRawFiles({}, vcons, [], [], []);
    // action = action.filter((trade: any, index: any) => trade["Trade App Status"] != "uploaded_to_app");
    let allTrades = action.concat(trades).sort((a: any, b: any) => new Date(b["Trade Date"]).getTime() - new Date(a["Trade Date"]).getTime());
    res.send({ trades: allTrades });
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
tradesRouter.post("/edit-trade", verifyToken, uploadToBucket.any(), async (req: Request | any, res: Response, next: NextFunction) => {
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
export default tradesRouter;

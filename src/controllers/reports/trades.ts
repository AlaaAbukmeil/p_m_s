import { CentralizedTrade } from "../../models/trades";
import { client } from "../auth";
import { getDate } from "../common";
import { insertEditLogs } from "../operations/portfolio";
import { getDateTimeInMongoDBCollectionFormat } from "./common";

export async function getTrades(tradeType: any) {
  try {
    const database = client.db("trades_v_2");
    const reportCollection = database.collection(`${tradeType}`);
    let documents = await reportCollection.find().sort({ "Trade Date": -1 }).toArray();
    for (let index = 0; index < documents.length; index++) {
      let trade = documents[index];
      if (!trade["BB Ticker"] && trade["Issue"]) {
        trade["BB Ticker"] = trade["Issue"];
        delete trade["Issue"];
      }
    }
    return documents;
  } catch (error) {
    return error;
  }
}

export async function getRlzdTrades(tradeType: any, isin: any, location: any, date: any, mtdMark: any, mtdAmountInput = 0) {
  try {
    const database = client.db("trades_v_2");
    const reportCollection = database.collection(`${tradeType}`);
    const inputDate = new Date(date);

    const startOfMonth = new Date(inputDate.getFullYear(), inputDate.getMonth(), 1).getTime();
    const endOfMonth = new Date(inputDate.getFullYear(), inputDate.getMonth() + 1, 0).getTime();

    const query = {
      $and: [{ ISIN: isin }, { Location: location }, { timestamp: { $gte: startOfMonth, $lte: endOfMonth } }],
    };

    let documents = await reportCollection.find(query).sort({ "Trade Date": 1 }).toArray();
    let multiplier = tradeType == "vcons" ? 100 : 1;
    let total = 0;

    let mtdAmount = mtdAmountInput;
    let accumualteNotional = mtdAmount;
    for (let index = 0; index < documents.length; index++) {
      let trade = documents[index];
      if (!trade["BB Ticker"] && trade["Issue"]) {
        trade["BB Ticker"] = trade["Issue"];
        delete trade["Issue"];
      }

      let tradeBS = trade["B/S"] == "B" ? 1 : -1;
      let newNotional = parseFloat(trade["Notional Amount"]) * tradeBS;
      if (accumualteNotional + newNotional < accumualteNotional && accumualteNotional > 0) {
        trade["Rlzd"] = "True (Long)";
        trade["Rlzd P&L Amount"] = parseFloat(trade["Notional Amount"]) * (parseFloat(trade["Price"]) / multiplier - parseFloat(mtdMark) / multiplier);
        trade["Price Diff"] = parseFloat(trade["Price"]) / multiplier - parseFloat(mtdMark) / multiplier;
        total += trade["Rlzd P&L Amount"];
        accumualteNotional += newNotional;
        trade["Updated Notional"] = accumualteNotional;
      } else if (accumualteNotional + newNotional > accumualteNotional && accumualteNotional < 0) {
        trade["Rlzd P&L Amount"] = parseFloat(trade["Notional Amount"]) * (parseFloat(mtdMark) / multiplier - parseFloat(trade["Price"]) / multiplier);
        trade["Price Diff"] = parseFloat(mtdMark) / multiplier - parseFloat(trade["Price"]) / multiplier;

        trade["Rlzd"] = "True (Short)";
        total += trade["Rlzd P&L Amount"];
        accumualteNotional += newNotional;
        trade["Updated Notional"] = accumualteNotional;
      } else {
        trade["Rlzd P&L Amount"] = "0";
        trade["Rlzd"] = "False";

        accumualteNotional += newNotional;
        trade["Updated Notional"] = accumualteNotional;
      }
    }
    let totalRow = {
      Rlzd: "Total",
      "Rlzd P&L Amount": total,
    };
    documents.push(totalRow);
    return documents;
  } catch (error) {
    return error;
  }
}

export async function insertTrade(trades: any, tradeType: any) {
  const database = client.db("trades_v_2");
  const reportCollection = database.collection(`${tradeType}`);

  const operations = trades.map((trade: any) => ({
    updateOne: {
      filter: { "Triada Trade Id": trade["Triada Trade Id"] },
      update: { $set: trade },
      upsert: true,
    },
  }));

  // Execute the operations in bulk
  try {
    const result = await reportCollection.bulkWrite(operations);
    return result;
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "insertTrade", "controllers/reports/trades.ts");

    return;
  }
}

export async function findTrade(tradeType: string, tradeTriadaId: string, seqNo: any): Promise<CentralizedTrade | {}> {
  try {
    const database = client.db("trades_v_2");
    const reportCollection = database.collection(tradeType);
    let query;
    if (seqNo != null && seqNo != "") {
      query = { $and: [{ "Triada Trade Id": tradeTriadaId }, { "Seq No": seqNo }] };
    } else {
      query = { "Triada Trade Id": tradeTriadaId };
    }

    const documents = await reportCollection.find(query).toArray();
    for (let index = 0; index < documents.length; index++) {
      let trade = documents[index];
      if (!trade["BB Ticker"] && trade["Issue"]) {
        trade["BB Ticker"] = trade["Issue"];
        delete trade["Issue"];
      }
    }
    if (documents) {
      return documents[0];
    } else {
      return {};
    }
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "findTrade", "controllers/reports/trades.ts");
    return {};
  }
}

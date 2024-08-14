import { CentralizedTrade, CentralizedTradeInDB } from "../../models/trades";
// import { client } from "../userManagement/auth";
import { getDate } from "../common";
import { insertEditLogs } from "../operations/logs";
import { getDateTimeInMongoDBCollectionFormat } from "./common";
import { getAverageCost } from "./tools";
import { tradesPool } from "../operations/psql/operation";
import { convertTradesSQLToCentralized } from "../eblot/eblot";

export async function getTrades(tradeType: "vcons" | "ib" | "emsx" | "writter_blotter" | "cds_gs", portfolioId: string) {
  const client = await tradesPool.connect();
  try {
    const query = `
      SELECT *
      FROM public.trades_${tradeType}
      WHERE portfolio_id = $1
      ORDER BY timestamp DESC;
    `;

    const { rows } = await client.query(query, [portfolioId]);
    let trades: any = convertTradesSQLToCentralized(rows, "uploaded_to_app");
    return trades;
  } catch (error) {
    // Handle any errors that occurred during the operation
    console.error("An error occurred while retrieving data from MongoDB:", error);
  }
}

export async function getRlzdTrades(tradeType: any, isin: any, location: any, date: any, mtdMark: any, mtdAmountInput: any): Promise<{ documents: any[]; totalRow: { Rlzd: number; "Rlzd P&L Amount": number }; averageCostMTD: any; pnlDayRlzdHistory: { [key: string]: number } }> {
  try {
    let documents = await getTradesForAPosition(tradeType, isin, location, date);

    let multiplier = tradeType == "vcons" ? 100 : tradeType == "gs" ? 1000000 : 1;
    let total = 0;

    let mtdAmount = parseFloat(mtdAmountInput) || 0;
    let accumualteNotional = mtdAmount;
    let averageCost = parseFloat(mtdMark);
    let pnlDayRlzdHistory: any = {};
    // console.log(documents[0],);
    for (let index = 0; index < documents.length; index++) {
      let trade = documents[index];
      if (!trade["BB Ticker"] && trade["Issue"]) {
        trade["BB Ticker"] = trade["Issue"];
        delete trade["Issue"];
      }
      //We only check for cds because original face is already factored in ib/vcons.
      let tradeBS = trade["B/S"] == "B" ? 1 : -1;
      let newNotional = parseFloat(trade["Notional Amount"]) * tradeBS;
      // console.log(averageCost, isin, documents[index]["Settle Date"], newNotional, accumualteNotional, trade["Price"], averageCost, "before");
      if (accumualteNotional + newNotional < accumualteNotional && accumualteNotional > 0) {
        trade["Rlzd"] = "True (Long)";
        trade["Price Diff"] = parseFloat(trade["Price"]) - averageCost;
        trade["Rlzd P&L Amount"] = parseFloat(trade["Notional Amount"]) * (parseFloat(trade["Price"]) / multiplier - averageCost / multiplier);
        pnlDayRlzdHistory[trade["Trade Date"]] = (pnlDayRlzdHistory[trade["Trade Date"]] || 0) + parseFloat(trade["Rlzd P&L Amount"]);

        total += trade["Rlzd P&L Amount"];

        accumualteNotional += newNotional;

        trade["Updated Notional"] = accumualteNotional;
      } else if (accumualteNotional + newNotional > accumualteNotional && accumualteNotional < 0) {
        trade["Rlzd"] = "True (Short)";
        trade["Price Diff"] = averageCost - parseFloat(trade["Price"]);
        trade["Rlzd P&L Amount"] = parseFloat(trade["Notional Amount"]) * (averageCost / multiplier - parseFloat(trade["Price"]) / multiplier);
        pnlDayRlzdHistory[trade["Trade Date"]] = (pnlDayRlzdHistory[trade["Trade Date"]] || 0) + parseFloat(trade["Rlzd P&L Amount"]);

        total += trade["Rlzd P&L Amount"];

        accumualteNotional += newNotional;

        trade["Updated Notional"] = accumualteNotional;
      } else {
        trade["Rlzd P&L Amount"] = "0";
        trade["Rlzd"] = "False";
        averageCost = getAverageCost(newNotional, accumualteNotional, trade["Price"], averageCost);
        trade["Average Cost MTD"] = averageCost;

        accumualteNotional += newNotional;
        trade["Updated Notional"] = accumualteNotional;
      }
    }

    let totalRow: any = {
      Rlzd: "Total",
      "Rlzd P&L Amount": total,
    };
    documents.push(totalRow);
    return { documents: documents, totalRow: totalRow, averageCostMTD: averageCost, pnlDayRlzdHistory: pnlDayRlzdHistory };
  } catch (error) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    if (!errorMessage.toString().includes("Batch cannot be empty")) {
      // await insertEditLogs([errorMessage], "Errors", dateTime, "getRlzdTrades", "controllers/reports/trades.ts");
    }

    return { documents: [], totalRow: { Rlzd: 0, "Rlzd P&L Amount": 0 }, averageCostMTD: 0, pnlDayRlzdHistory: {} };
  }
}

async function getTradesForAPosition(tradeType: "vcons" | "ib" | "emsx" | "writter_blotter" | "cds_gs", isin: string, location: string, date: any) {
  const client = await tradesPool.connect();
  try {
    const query = `
      SELECT *
      FROM public.trades_${tradeType}
      WHERE isin = $1 AND location = $2 AND timestamp >= $3 AND timestamp <= $4
      ORDER BY timestamp;
    `;
    const inputDate = new Date(date);
    const startOfMonth = new Date(inputDate.getFullYear(), inputDate.getMonth(), 1).getTime();
    const endOfMonth = inputDate.getTime();
    const { rows } = await client.query(query, [isin, location, startOfMonth, endOfMonth]);
    let trades: any = convertTradesSQLToCentralized(rows, "uploaded_to_app");
    return trades;
  } catch (error) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.error(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getTradesForAPosition", "controllers/operations/trades.ts");

    console.error("An error occurred while retrieving data from MongoDB:", error);
  } finally {
    client.release();
  }
}

export async function insertTradesData(dataInput: CentralizedTradeInDB[], tradeType: "vcons" | "ib" | "emsx" | "writter_blotter" | "cds_gs") {
  const client = await tradesPool.connect();
  try {
    await client.query("BEGIN");

    const insertQuery = `
      INSERT INTO public.trades_${tradeType} (
        b_s, bb_ticker, location, trade_date, trade_time, settle_date, price, notional_amount, settlement_amount, principal, counter_party, triada_trade_id, seq_no, isin, cuisp, currency, yield, accrued_interest, original_face, comm_fee, trade_type, updated_notional, timestamp, nomura_upload_status, last_nomura_generated, broker_full_name_account, broker_email, settlement_venue, primary_market, broker_email_status, id, portfolio_id,front_office_check
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33);
    `;

    for (const trade of dataInput) {
      await client.query(insertQuery, [
        trade.b_s,
        trade.bb_ticker,
        trade.location,
        trade.trade_date,
        trade.trade_time,
        trade.settle_date,
        trade.price,
        trade.notional_amount,
        trade.settlement_amount,
        trade.principal,
        trade.counter_party,
        trade.triada_trade_id,
        trade.seq_no,
        trade.isin,
        trade.cuisp,
        trade.currency,
        trade.yield,
        trade.accrued_interest,
        trade.original_face,
        trade.comm_fee,
        trade.trade_type,
        trade.updated_notional,
        trade.timestamp,
        trade.nomura_upload_status,
        trade.last_nomura_generated,
        trade.broker_full_name_account,
        trade.broker_email,
        trade.settlement_venue,
        trade.primary_market,
        trade.broker_email_status,
        trade.id,
        trade.portfolio_id,
        trade.front_office_check,
      ]);
    }

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error inserting trades", err.stack);
  } finally {
    client.release();
  }
}

export async function findTrade(tradeType: string, tradeTriadaId: string): Promise<CentralizedTrade | {}> {
  const client = await tradesPool.connect();
  try {
    const query = `
      SELECT *
      FROM public.trades_${tradeType}
      WHERE triada_trade_id = $1
      ORDER BY timestamp;
    `;
    const { rows } = await client.query(query, [tradeTriadaId]);
    let trades: any = convertTradesSQLToCentralized(rows, "uploaded_to_app");
    return trades[0];
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    if (!errorMessage.toString().includes("Batch cannot be empty")) {
      await insertEditLogs([errorMessage], "Errors", dateTime, "findTrade", "controllers/reports/trades.ts");
    }
    return {};
  } finally {
    client.release();
  }
}

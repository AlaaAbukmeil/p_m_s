import { CentralizedTrade, CentralizedTradeInDB, CentralizedTradeMTDRlzd } from "../../models/trades";
// import { client } from "../userManagement/auth";
import { getDate } from "../common";
import { insertEditLogs } from "../operations/logs";
import { getDateTimeInMongoDBCollectionFormat } from "./common";
import { getAverageCost } from "./tools";
import { updatePositionsBasedOnTrade } from "../operations/positions";
import { sortTradesOnTheSameDate } from "../operations/readExcel";
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
export async function getRlzdTrades(tradeType: any, isin: any, location: any, date: any, mtdMark: any, mtdAmountInput: any, ticker: string): Promise<{ documents: any[]; totalRow: { Rlzd: number; "Rlzd P&L Amount": number }; averageCostMTD: any; pnlDayRlzdHistory: { [key: string]: number } }> {
  try {
    let documents = await getTradesForAPositionInDB(tradeType, isin, location, date, ticker);

    let multiplier = tradeType == "vcons" ? 100 : tradeType == "gs" ? 1000000 : 1;
    let total = 0;

    let mtdAmount = parseFloat(mtdAmountInput) || 0;
    let accumualteNotional = mtdAmount;
    let averageCost = parseFloat(mtdMark);
    let pnlDayRlzdHistory: any = {};
    for (let index = 0; index < documents.length; index++) {
      let trade = documents[index];

      //We only check for cds because original face is already factored in ib/vcons.
      let tradeBS = trade["B/S"] == "B" ? 1 : -1;
      let newNotional = parseFloat(trade["Notional Amount"]) * tradeBS;
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
    console.log({ error });
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    if (!errorMessage.toString().includes("Batch cannot be empty")) {
      // await insertEditLogs([errorMessage], "errors", dateTime, "getRlzdTrades", "controllers/reports/trades.ts");
    }

    return { documents: [], totalRow: { Rlzd: 0, "Rlzd P&L Amount": 0 }, averageCostMTD: 0, pnlDayRlzdHistory: {} };
  }
}

export function getRlzdTradesWithTrades(tradeType: "vcons" | "ib" | "emsx" | "writter_blotter" | "cds_gs", isin: any, location: any, date: any, mtdMark: any, mtdAmountInput: any, allMTDTrades: CentralizedTrade[], ticker: string): { documents: any[]; totalRow: { Rlzd: number; "Rlzd P&L Amount": number }; averageCostMTD: any; pnlDayRlzdHistory: { [key: string]: number } } {
  try {
    let shortLongGuess = tradeType == "ib" ? "S" : ticker.toString().split(" ")[0] == "T" ? "S" : "B";
    let mtdTradesPosition = getTradesForAPosition(isin, location, allMTDTrades, shortLongGuess);

    let multiplier = tradeType == "vcons" ? 100 : tradeType == "cds_gs" ? 1000000 : 1;
    let total = 0;

    let mtdAmount = parseFloat(mtdAmountInput) || 0;
    let accumualteNotional = mtdAmount;
    let averageCost = parseFloat(mtdMark);
    let pnlDayRlzdHistory: any = {};
    for (let index = 0; index < mtdTradesPosition.length; index++) {
      let trade: CentralizedTradeMTDRlzd = mtdTradesPosition[index];

      let tradeBS = trade["B/S"] == "B" ? 1 : -1;
      let newNotional = trade["Notional Amount"] * tradeBS;
      if (accumualteNotional + newNotional < accumualteNotional && accumualteNotional > 0) {
        // if (trade["BB Ticker"] == "ESU4 IB") {
        //   console.log({ price: trade["Price"], averageCost, notional: trade["Notional Amount"], multiplier });
        // }
        trade["Rlzd"] = "True (Long)";
        trade["Price Diff"] = trade["Price"] - averageCost;
        trade["Rlzd P&L Amount"] = trade["Notional Amount"] * (trade["Price"] / multiplier - averageCost / multiplier);
        pnlDayRlzdHistory[trade["Trade Date"]] = (pnlDayRlzdHistory[trade["Trade Date"]] || 0) + trade["Rlzd P&L Amount"];

        total += trade["Rlzd P&L Amount"];

        accumualteNotional += newNotional;

        trade["Updated Notional"] = accumualteNotional;
      } else if (accumualteNotional + newNotional > accumualteNotional && accumualteNotional < 0) {
        trade["Rlzd"] = "True (Short)";
        trade["Price Diff"] = averageCost - trade["Price"];
        trade["Rlzd P&L Amount"] = trade["Notional Amount"] * (averageCost / multiplier - trade["Price"] / multiplier);
        pnlDayRlzdHistory[trade["Trade Date"]] = (pnlDayRlzdHistory[trade["Trade Date"]] || 0) + trade["Rlzd P&L Amount"];

        total += trade["Rlzd P&L Amount"];

        accumualteNotional += newNotional;

        trade["Updated Notional"] = accumualteNotional;
      } else {
        trade["Rlzd P&L Amount"] = 0;
        trade["Rlzd"] = "False";
        averageCost = getAverageCost(newNotional, accumualteNotional, trade["Price"], averageCost);
        // if (trade["BB Ticker"] == "ESU4 IB") {
        //   console.log({ newNotional, accumualteNotional, price: trade["Price"], averageCost, mtdAmount });
        // }
        trade["Average Cost MTD"] = averageCost;

        accumualteNotional += newNotional;
        trade["Updated Notional"] = accumualteNotional;
      }
    }

    let totalRow: any = {
      Rlzd: "Total",
      "Rlzd P&L Amount": total,
    };
    mtdTradesPosition.push(totalRow);
    return { documents: mtdTradesPosition, totalRow: totalRow, averageCostMTD: averageCost, pnlDayRlzdHistory: pnlDayRlzdHistory };
  } catch (error) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    return { documents: [], totalRow: { Rlzd: 0, "Rlzd P&L Amount": 0 }, averageCostMTD: 0, pnlDayRlzdHistory: {} };
  }
}

function getTradesForAPosition(isin: string, location: string, allMTDTrades: CentralizedTrade[], shortLongGuess: string) {
  let mtdTrades: CentralizedTradeMTDRlzd[] = [];
  for (let index = 0; index < allMTDTrades.length; index++) {
    const trade = allMTDTrades[index];
    if (trade["ISIN"] == isin && trade["Location"] == location) {
      let newTrade: CentralizedTradeMTDRlzd = { ...trade, "Rlzd P&L Amount": 0, "Price Diff": 0, Rlzd: "", "Average Cost MTD": 0 };
      mtdTrades.push(newTrade);
    }
  }

  mtdTrades = mtdTrades.sort((tradeA, tradeB) => {
    const dateA = new Date(tradeA["Trade Date"]).getTime();
    const dateB = new Date(tradeB["Trade Date"]).getTime();

    if (dateA !== dateB) {
      return dateA - dateB;
    }

    if (tradeA["B/S"] == shortLongGuess && tradeB["B/S"] != shortLongGuess) {
      return -1;
    } else if (tradeA["B/S"] != shortLongGuess && tradeB["B/S"] == shortLongGuess) {
      return 1;
    }
    return 0;
  });
  return mtdTrades;
}
async function getTradesForAPositionInDB(tradeType: "vcons" | "ib" | "emsx" | "writter_blotter" | "cds_gs", isin: string, location: string, date: any, ticker: string) {
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

    let shortLongGuess = tradeType == "ib" ? "S" : ticker.toString().split(" ")[0] == "T" ? "S" : "B";

    trades = trades.sort((tradeA: any, tradeB: any) => {
      const dateA = new Date(tradeA["Trade Date"]).getTime();
      const dateB = new Date(tradeB["Trade Date"]).getTime();

      if (dateA !== dateB) {
        return dateA - dateB;
      }

      if (tradeA["B/S"] == shortLongGuess && tradeB["B/S"] != shortLongGuess) {
        return -1;
      } else if (tradeA["B/S"] != shortLongGuess && tradeB["B/S"] == shortLongGuess) {
        return 1;
      }
      return 0;
    });

    return trades;
  } catch (error) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.error(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getTradesForAPositionInDB", "controllers/operations/trades.ts");

    console.error("An error occurred while retrieving data from MongoDB:", error);
  } finally {
    client.release();
  }
}
export async function getTradesMTD(date: any) {
  const client = await tradesPool.connect();
  try {
    const query = `
      SELECT *
      FROM public.trades
      WHERE timestamp >= $1 AND timestamp <= $2
      ORDER BY timestamp;
    `;
    const inputDate = new Date(date);
    const startOfMonth = new Date(inputDate.getFullYear(), inputDate.getMonth(), 1).getTime();
    const endOfMonth = inputDate.getTime();
    const { rows } = await client.query(query, [startOfMonth, endOfMonth]);
    let trades: CentralizedTrade[] = convertTradesSQLToCentralized(rows, "uploaded_to_app");
    return trades;
  } catch (error) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.error(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getTradesForAPosition", "controllers/operations/trades.ts");

    console.error("An error occurred while retrieving data from MongoDB:", error);
    return [];
  } finally {
    client.release();
  }
}

export async function insertTradesData(dataInput: CentralizedTradeInDB[], tableName: string) {
  const client = await tradesPool.connect();
  try {
    await client.query("BEGIN");

    const insertQuery = `
  INSERT INTO public.trades_${tableName} (
    b_s, bb_ticker, location, trade_date, trade_time, settle_date, price, notional_amount, settlement_amount, principal, counter_party, triada_trade_id, seq_no, isin, cuisp, currency, yield, accrued_interest, original_face, comm_fee, trade_type, updated_notional, timestamp, nomura_upload_status, last_nomura_generated, broker_full_name_account, broker_email, settlement_venue, primary_market, broker_email_status, id, portfolio_id, front_office_check,front_office_note
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34)
  ON CONFLICT (triada_trade_id, trade_type) DO UPDATE SET
    b_s = EXCLUDED.b_s,
    bb_ticker = EXCLUDED.bb_ticker,
    location = EXCLUDED.location,
    trade_date = EXCLUDED.trade_date,
    trade_time = EXCLUDED.trade_time,
    settle_date = EXCLUDED.settle_date,
    price = EXCLUDED.price,
    notional_amount = EXCLUDED.notional_amount,
    settlement_amount = EXCLUDED.settlement_amount,
    principal = EXCLUDED.principal,
    counter_party = EXCLUDED.counter_party,
    seq_no = EXCLUDED.seq_no,
    isin = EXCLUDED.isin,
    cuisp = EXCLUDED.cuisp,
    currency = EXCLUDED.currency,
    yield = EXCLUDED.yield,
    accrued_interest = EXCLUDED.accrued_interest,
    original_face = EXCLUDED.original_face,
    comm_fee = EXCLUDED.comm_fee,
    trade_type = EXCLUDED.trade_type,
    updated_notional = EXCLUDED.updated_notional,
    timestamp = EXCLUDED.timestamp,
    nomura_upload_status = EXCLUDED.nomura_upload_status,
    last_nomura_generated = EXCLUDED.last_nomura_generated,
    broker_full_name_account = EXCLUDED.broker_full_name_account,
    broker_email = EXCLUDED.broker_email,
    settlement_venue = EXCLUDED.settlement_venue,
    primary_market = EXCLUDED.primary_market,
    broker_email_status = EXCLUDED.broker_email_status,
    portfolio_id = EXCLUDED.portfolio_id,
    front_office_check = EXCLUDED.front_office_check,
    front_office_note = EXCLUDED.front_office_note;
`;

    for (const trade of dataInput) {
      await client.query(insertQuery, [trade.b_s, trade.bb_ticker, trade.location, trade.trade_date, trade.trade_time, trade.settle_date, trade.price, trade.notional_amount, trade.settlement_amount, trade.principal, trade.counter_party, trade.triada_trade_id, trade.seq_no, trade.isin, trade.cuisp, trade.currency, trade.yield, trade.accrued_interest, trade.original_face, trade.comm_fee, trade.trade_type, trade.updated_notional, trade.timestamp, trade.nomura_upload_status, trade.last_nomura_generated, trade.broker_full_name_account, trade.broker_email, trade.settlement_venue, trade.primary_market, trade.broker_email_status, trade.id, trade.portfolio_id, trade.front_office_check, trade.front_office_note]);
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
      await insertEditLogs([errorMessage], "errors", dateTime, "findTrade", "controllers/reports/trades.ts");
    }
    return {};
  } finally {
    client.release();
  }
}

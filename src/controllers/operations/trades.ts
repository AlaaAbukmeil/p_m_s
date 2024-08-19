import { ObjectId } from "mongodb";
import { client } from "../userManagement/auth";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { CentralizedTrade, NewIssue } from "../../models/trades";
import { insertEditLogs } from "./logs";
import { tradesPool } from "./psql/operation";
import { convertCentralizedToTradesSQL, convertTradesSQLToCentralized } from "../eblot/eblot";

export async function getAllTradesForSpecificPosition(tradeType: "vcons" | "ib" | "emsx" | "writter_blotter" | "cds_gs", isin: string, location: string, date: string, portfolioId: string) {
  const client = await tradesPool.connect();
  try {
    let timestamp = new Date(date).getTime();

    const query = `
      SELECT *
      FROM public.trades_${tradeType}
      WHERE isin = $1 AND location = $2 AND timestamp <= $3 AND portfolio_id = $4;
    `;

    const { rows } = await client.query(query, [isin, location, timestamp, portfolioId]);
    let trades: any = convertTradesSQLToCentralized(rows, "uploaded_to_app");

    return trades;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.error(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getAllTradesForSpecificPosition", "controllers/operations/trades.ts");

    return [];
  } finally {
    client.release();
  }
}

export async function getTrade(tradeType: "vcons" | "ib" | "emsx" | "writter_blotter" | "cds_gs", tradeId: string, portfolioId: string) {
  const client = await tradesPool.connect();
  try {
    const query = `
      SELECT *
      FROM public.trades_${tradeType}
      WHERE id = $1 AND portfolio_id = $2;
    `;

    const { rows } = await client.query(query, [tradeId, portfolioId]);
    let trades: any = convertTradesSQLToCentralized(rows, "uploaded_to_app");

    return trades[0];
  } catch (error) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.error(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getTrade", "controllers/operations/trades.ts");

    // Handle any errors that occurred during the operation
    console.error("An error occurred while retrieving data from MongoDB:", error);
  } finally {
    client.release();
  }
}

export async function editTrade(editedTrade: any, tradeType: "vcons" | "ib" | "emsx" | "writter_blotter" | "cds_gs", logs = false, source = "main", portfolioId: string) {
  try {
    let tradeInfo = await getTrade(tradeType, editedTrade["Id"], portfolioId);
    let unEditableParams = ["Id", "Updated Notional", "B/S", "BB Ticker", "Location", "Trade Date", "Trade Time", "Settle Date", "Price", "Notional Amount", "Settlement Amount", "Principal", "Triada Trade Id", "Seq No", "ISIN", "Currency", "Yield", "Accrued Interest", "Trade Type", "App Check Test", "Trade App Status", "Nomura Upload Status", "Broker Email Status", "App Check Test", "Front Office Check", "Trade Type"];

    if (tradeInfo) {
      let beforeModify = JSON.parse(JSON.stringify(tradeInfo));
      beforeModify["id"] = new ObjectId(beforeModify["id"]);

      let centralizedBlotKeys: any = [
        "B/S",
        "BB Ticker",
        "Location",
        "Trade Date",
        "Trade Time",
        "Settle Date",
        "Price",
        "Notional Amount",
        "Settlement Amount",
        "Principal",
        "Counter Party",
        "Triada Trade Id",
        "Seq No",
        "ISIN",
        "Cuisp",
        "Currency",
        "Yield",
        "Accrued Interest",
        "Original Face",
        "Comm/Fee",
        "Trade Type",
        "Nomura Upload Status",
        "Broker Full Name & Account",
        "Broker Email Status",
        "Broker Email",
        "Primary (True/False)",
        "Settlement Venue",
        "Edit Note",
        "Resolved",
        "Front Office Check",
        "Front Office Note",
      ];

      let changes = 0;
      let changesText = [];
      for (let index = 0; index < centralizedBlotKeys.length; index++) {
        let key: any = centralizedBlotKeys[index];
        if (source == "main") {
          if (editedTrade[key] != "" && editedTrade[key]) {
            changesText.push(`${key} changed from ${tradeInfo[key]} to ${editedTrade[key]} `);
            tradeInfo[key] = editedTrade[key];

            changes++;
          }
        } else {
          if (editedTrade[key] != "" && editedTrade[key] && !unEditableParams.includes(key)) {
            changesText.push(`${key} changed from ${tradeInfo[key]} to ${editedTrade[key]} `);
            tradeInfo[key] = editedTrade[key];

            changes++;
          }
        }
      }
      if (!changes) {
        return { error: "The trade is still the same." };
      }
      let newTradeInSQL = convertCentralizedToTradesSQL([tradeInfo])[0];
      const query = `
    UPDATE public.trades_${tradeType}
    SET 
      b_s = $1,
      bb_ticker = $2,
      location = $3,
      trade_date = $4,
      trade_time = $5,
      settle_date = $6,
      price = $7,
      notional_amount = $8,
      settlement_amount = $9,
      principal = $10,
      counter_party = $11,
      seq_no = $12,
      isin = $13,
      cuisp = $14,
      currency = $15,
      yield = $16,
      accrued_interest = $17,
      original_face = $18,
      comm_fee = $19,
      
      broker_full_name_account = $20,
      broker_email = $21,
      broker_email_status = $22,
      settlement_venue = $23,
      primary_market = $24
      WHERE id = $25;
  `;

      const values = [
        newTradeInSQL.b_s,
        newTradeInSQL.bb_ticker,
        newTradeInSQL.location,
        newTradeInSQL.trade_date,
        newTradeInSQL.trade_time,
        newTradeInSQL.settle_date,
        newTradeInSQL.price,
        newTradeInSQL.notional_amount,
        newTradeInSQL.settlement_amount,
        newTradeInSQL.principal,
        newTradeInSQL.counter_party,
        newTradeInSQL.seq_no,
        newTradeInSQL.isin,
        newTradeInSQL.cuisp,
        newTradeInSQL.currency,
        newTradeInSQL.yield,
        newTradeInSQL.accrued_interest,
        newTradeInSQL.original_face,
        newTradeInSQL.comm_fee,

        newTradeInSQL.broker_full_name_account,
        newTradeInSQL.broker_email,
        newTradeInSQL.broker_email_status,
        newTradeInSQL.settlement_venue,
        newTradeInSQL.primary_market,

        newTradeInSQL.id,
      ];

      const client = await tradesPool.connect();
      try {
        const res = await client.query(query, values);

        if (res.rowCount > 0) {
          return { error: null };
        } else {
          return { error: "unexpected error, please contact Triada team" };
        }
      } catch (error: any) {
        let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
        console.error(error);
        let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

        await insertEditLogs([errorMessage], "errors", dateTime, "editTrade", "controllers/operations/trades.ts");
        return { error: error.toString() };
      } finally {
        client.release();
      }
    } else {
      return { error: "Trade does not exist, please referesh the page!" };
    }
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.error(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "editTrade", "controllers/operations/trades.ts");
    console.log(error);
    return { error: error };
  }
}

export async function deleteTrade(tradeType: string, tradeId: string, ticker: string, location: string) {
  const client = await tradesPool.connect();
  try {
    const query = `
      DELETE FROM public.trades_${tradeType}
      WHERE id = $1;
    `;

    const result = await client.query(query, [tradeId]);

    if (result.rowCount === 0) {
      return { error: `Trade does not exist!` };
    } else {
      const dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      await insertEditLogs(["deleted"], "edit_trade", dateTime, "deleted", `${ticker} ${location}`);
      console.log("deleted");
      return { error: null };
    }
  } catch (error: any) {
    console.error(`An error occurred while deleting the trade: ${error}`);
    const dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    await insertEditLogs([error], "errors", dateTime, "deleteTrade", `${ticker} ${location}`);
    return { error: error.toString() };
  } finally {
    client.release();
  }
}
//tessting
export async function modifyTradesDueToRecalculate(trades: any, tradeType: "vcons" | "ib" | "emsx" | "writter_blotter" | "cds_gs") {
  const client = await tradesPool.connect();

  try {
    const updatePromises = trades.map(async (trade: any) => {
      let tradeInSql = convertCentralizedToTradesSQL([trade])[0];
      const query = `
        UPDATE public.trades_${tradeType}
        SET
         updated_notional = $1
        WHERE id = $2;
      `;

      const values = [tradeInSql.updated_notional, tradeInSql.id];

      return client.query(query, values);
    });

    const results = await Promise.all(updatePromises);
    console.log(results);
    return results;
  } catch (error: any) {
    console.log(error);
    const dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "modifyTradesDueToRecalculate", "controllers/operations/operations.ts");
    return "";
  } finally {
    client.release();
  }
}

export async function getAllTrades(from: number, to: number, portfolioId: string, tradeType: "vcons" | "ib" | "emsx" | "writter_blotter" | "cds_gs" | "" = ""): Promise<CentralizedTrade[]> {
  const client = await tradesPool.connect();

  try {
    const query = `
      SELECT *
      FROM public.trades${tradeType ? "_" + tradeType : ""}
      WHERE timestamp >= $1 AND timestamp <= $2 AND portfolio_id = $3;
    `;

    const { rows } = await client.query(query, [from, to, portfolioId]);
    let trades: any = convertTradesSQLToCentralized(rows, "uploaded_to_app");
    for (let index = 0; index < trades.length; index++) {
      trades[index]["Front Office Check"] = true;
    }
    return trades;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.error(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getAllTrades", "controllers/eblot/eblot.ts");

    return [];
  } finally {
    client.release();
  }
}

export async function addNomuraGeneratedDateToTrades(fromTimestamp: number | null = 0, toTimestamp: number | null = 0) {
  const client = await tradesPool.connect();

  try {
    let query = `
      UPDATE public.trades_vcons
      SET last_nomura_generated = $1
    `;

    const dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let values: any = [dateTime];

    if (fromTimestamp !== null && toTimestamp !== null) {
      query += ` WHERE timestamp BETWEEN $2 AND $3`;
      values.push(fromTimestamp, toTimestamp);
    } else if (fromTimestamp !== null) {
      query += ` WHERE timestamp >= $2`;
      values.push(fromTimestamp);
    } else if (toTimestamp !== null) {
      query += ` WHERE timestamp <= $2`;
      values.push(toTimestamp);
    }

    const action = await client.query(query, values);
    console.log({ action, query });
  } catch (error: any) {
    console.error(`An error occurred: ${error.message}`);
  } finally {
    client.release();
  }
}

export async function numberOfNewTrades(): Promise<any> {
  const client = await tradesPool.connect();

  try {
    const query = `
      SELECT *
      FROM public.trades_written_blotter
      WHERE resolved = false;
    `;

    const { rows } = await client.query(query);
    let trades: any = convertTradesSQLToCentralized(rows, "uploaded_to_app");
    for (let index = 0; index < trades.length; index++) {
      trades[index]["Front Office Check"] = true;
    }
    return trades;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.error(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getAllTrades", "controllers/eblot/eblot.ts");

    return [];
  } finally {
    client.release();
  }
}

export async function getNewTrades(): Promise<CentralizedTrade[]> {
  const client = await tradesPool.connect();

  try {
    const query = `
      SELECT *
      FROM public.trades_written_blotter WHERE resolved = false;
    `;

    const { rows } = await client.query(query);
    let trades: any = convertTradesSQLToCentralized(rows, "uploaded_to_app");
    for (let index = 0; index < trades.length; index++) {
      trades[index]["App Check Test"] = "This was inputted by front office and it did not match any new vcon";
    }

    return trades;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.error(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getNewTrades", "controllers/eblot/eblot.ts");

    return [];
  } finally {
    client.release();
  }
}

export function matchVconToNewTrade(newVcons: CentralizedTrade[], newTrades: CentralizedTrade[]) {
  let newTradeIdsThatMatch = [];
  for (let i = 0; i < newVcons.length; i++) {
    let newVconTrade = newVcons[i];
    for (let j = 0; j < newTrades.length; j++) {
      let newTrade = newTrades[j];
      let notionalCondition = parseFloat(newVconTrade["Notional Amount"].toString().replace(/,/g, "")) == parseFloat(newTrade["Notional Amount"].toString().replace(/,/g, ""));
      let buySell = newVconTrade["B/S"] == newTrade["B/S"];
      let tradeDate = newVconTrade["Trade Date"] == newTrade["Trade Date"];
      let settleDate = newVconTrade["Settle Date"] == newTrade["Settle Date"];
      let currency = newVconTrade["Currency"] == newTrade["Currency"];
      let isin = newVconTrade["ISIN"] == newTrade["ISIN"];
      let price = newVconTrade["Price"] == newTrade["Price"];

      if (notionalCondition && buySell && tradeDate && settleDate && currency && isin && price) {
        let object = { vconTriadaId: newVconTrade["Triada Trade Id"], newTradeTriadaId: newTrade["Triada Trade Id"] };
        newTradeIdsThatMatch.push(object);
        break;
      }
    }
  }
  return newTradeIdsThatMatch;
}

export async function updateMatchedVcons(newVcons: CentralizedTrade[]) {
  const client = await tradesPool.connect();

  try {
    const query = `
    UPDATE public.trades_written_blotter
    SET resolved = true
    WHERE triada_trade_id = $1;
  `;
    let newTrades = await getNewTrades();
    let matchedIds = matchVconToNewTrade(newVcons, newTrades);

    for (const newTrade of matchedIds) {
      const { rows } = await client.query(query, newTrade["newTradeTriadaId"]);
    }
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.error(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "updateMatchedVcons", "controllers/eblot/eblot.ts");

    return [];
  } finally {
    client.release();
  }
}

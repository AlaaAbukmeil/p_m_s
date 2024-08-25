import { CentralizedTrade, CentralizedTradeInDB } from "../../models/trades";
import { insertEditLogs } from "../operations/logs";
import { tradesPool } from "../operations/psql/operation";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { client } from "../userManagement/auth";

export async function getNewTrades(portfolioId: string): Promise<CentralizedTrade[]> {
  const client = await tradesPool.connect();

  try {
    const query = `
      SELECT *
      FROM public.trades_written_blotter WHERE resolved = false AND portfolio_id = $1;
    `;

    const { rows } = await client.query(query, [portfolioId]);
    let trades: any = convertTradesSQLToCentralized(rows, "uploaded_to_app");

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
export function convertTradesSQLToCentralized(trades: CentralizedTradeInDB[], tradeAppStatus: string): CentralizedTrade[] {
  let copy: CentralizedTrade[] = trades.map((trade) => ({
    "B/S": trade.b_s,
    "BB Ticker": trade.bb_ticker,
    Location: trade.location,
    "Trade Date": trade.trade_date,
    "Trade Time": trade.trade_time,
    "Settle Date": trade.settle_date,
    Price: trade.price,
    "Notional Amount": trade.notional_amount,
    "Settlement Amount": trade.settlement_amount,
    Principal: trade.principal,
    "Counter Party": trade.counter_party,
    "Triada Trade Id": trade.triada_trade_id,
    "Seq No": trade.seq_no,
    ISIN: trade.isin,
    Cuisp: trade.cuisp,
    Currency: trade.currency,
    Yield: trade.yield,
    "Accrued Interest": trade.accrued_interest,
    "Original Face": trade.original_face,
    "Comm/Fee": trade.comm_fee,
    "Trade Type": trade.trade_type,
    "Updated Notional": trade.updated_notional ? trade.updated_notional : null,
    timestamp: trade.timestamp,
    "Nomura Upload Status": trade.nomura_upload_status,
    "Last Nomura Generated": trade.last_nomura_generated,
    "Broker Full Name & Account": trade.broker_full_name_account,
    "Broker Email": trade.broker_email,
    "Settlement Venue": trade.settlement_venue,
    "Primary (True/False)": trade.primary_market ? "True" : "False",
    "Broker Email Status": trade.broker_email_status,
    "App Check Test": trade.front_office_check ? "Validated" : "",
    "Portfolio ID": trade.portfolio_id,
    "Front Office Check": false,
    "Trade App Status": tradeAppStatus,
    "Front Office Note": trade.front_office_note,
    Resolved: trade.resolved,
    Id: trade.id,
  }));
  return copy;
}
export function convertCentralizedToTradesSQL(centralizedTrades: CentralizedTrade[]): CentralizedTradeInDB[] {
  const safeString = (value: any) => (typeof value === "string" || typeof value === "number" ? value.toString() : "");
  const safeNumber = (value: any) => (typeof value === "number" || parseFloat(value) ? parseFloat(value) : 0);

  let copy: CentralizedTradeInDB[] = centralizedTrades.map((trade) => ({
    b_s: safeString(trade["B/S"]),
    bb_ticker: safeString(trade["BB Ticker"]),
    location: safeString(trade.Location),
    trade_date: safeString(trade["Trade Date"]),
    trade_time: safeString(trade["Trade Time"]),
    settle_date: safeString(trade["Settle Date"]),
    price: safeNumber(trade.Price),
    notional_amount: safeNumber(trade["Notional Amount"]),
    settlement_amount: safeNumber(trade["Settlement Amount"]),
    principal: safeNumber(trade.Principal),
    counter_party: safeString(trade["Counter Party"]),
    triada_trade_id: safeString(trade["Triada Trade Id"]),
    seq_no: safeString(trade["Seq No"]),
    isin: safeString(trade.ISIN),
    cuisp: safeString(trade.Cuisp),
    currency: safeString(trade.Currency),
    yield: safeString(trade.Yield),
    accrued_interest: safeNumber(trade["Accrued Interest"]),
    original_face: safeString(trade["Original Face"]),
    comm_fee: safeNumber(trade["Comm/Fee"]),
    trade_type: safeString(trade["Trade Type"]),
    updated_notional: safeNumber(trade["Updated Notional"]) || null,
    timestamp: safeNumber(trade.timestamp),

    nomura_upload_status: safeString(trade["Nomura Upload Status"]),
    last_nomura_generated: safeString(trade["Last Nomura Generated"]),
    broker_full_name_account: safeString(trade["Broker Full Name & Account"]),
    broker_email: safeString(trade["Broker Email"]),
    settlement_venue: safeString(trade["Settlement Venue"]),
    primary_market: trade["Primary (True/False)"] === "True",
    broker_email_status: safeString(trade["Broker Email Status"]),
    front_office_check: trade["App Check Test"] === "Validated",
    portfolio_id: safeString(trade["Portfolio ID"]),
    resolved: trade.Resolved,
    id: safeString(trade.Id),
    front_office_note: trade["Front Office Note"] || "",
  }));
  return copy;
}

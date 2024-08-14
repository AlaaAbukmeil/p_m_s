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

    await insertEditLogs([errorMessage], "Errors", dateTime, "getNewTrades", "controllers/eblot/eblot.ts");

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
    Resolved: trade.resolved,
    Id: trade.id,
  }));
  return copy;
}
export function convertCentralizedToTradesSQL(centralizedTrades: CentralizedTrade[]): CentralizedTradeInDB[] {
  return centralizedTrades.map((trade) => ({
    b_s: trade["B/S"],
    bb_ticker: trade["BB Ticker"],
    location: trade.Location,
    trade_date: trade["Trade Date"],
    trade_time: trade["Trade Time"],
    settle_date: trade["Settle Date"],
    price: trade.Price,
    notional_amount: trade["Notional Amount"],
    settlement_amount: trade["Settlement Amount"],
    principal: trade.Principal,
    counter_party: trade["Counter Party"],
    triada_trade_id: trade["Triada Trade Id"],
    seq_no: trade["Seq No"],
    isin: trade.ISIN,
    cuisp: trade.Cuisp,
    currency: trade.Currency,
    yield: trade.Yield,
    accrued_interest: trade["Accrued Interest"],
    original_face: trade["Original Face"],
    comm_fee: trade["Comm/Fee"],
    trade_type: trade["Trade Type"],
    updated_notional: trade["Updated Notional"] || null,
    timestamp: trade.timestamp,
    nomura_upload_status: trade["Nomura Upload Status"],
    last_nomura_generated: trade["Last Nomura Generated"],
    broker_full_name_account: trade["Broker Full Name & Account"],
    broker_email: trade["Broker Email"],
    settlement_venue: trade["Settlement Venue"],
    primary_market: trade["Primary (True/False)"] === "True",
    broker_email_status: trade["Broker Email Status"],
    front_office_check: trade["App Check Test"] === "Validated",
    portfolio_id: trade["Portfolio ID"],
    resolved: trade.Resolved,
    id: trade.Id,
  }));
}
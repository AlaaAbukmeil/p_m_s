import { UserAuth } from "../../../models/auth";
import { FactSheetBenchMarkDataInDB, FactSheetFundDataInDB } from "../../../models/factSheet";
import { Logs } from "../../../models/logs";
import { FundDetailsInDB, Indexing, PositionInDB, PositionInSQLDB } from "../../../models/portfolio";
import { PinnedPosition } from "../../../models/position";
import { InformationInDB } from "../../../models/positionsInformation";
import { CentralizedTrade, CentralizedTradeInDB } from "../../../models/trades";
import { getDateTimeInMongoDBCollectionFormat } from "../../reports/common";
import { getFactSheetData } from "../../reports/factSheet";
import { client } from "../../userManagement/auth";

require("dotenv").config();

const { Pool } = require("pg");
const { v4: uuidv4 } = require("uuid");

function createPool(databaseName: string) {
  if (!databaseName) {
    throw new Error("Database name is required");
  }

  return new Pool({
    user: process.env.PSQL_USERNAME,
    host: process.env.PSQL_HOST,
    port: process.env.PSQL_PORT,
    database: databaseName,
    password: process.env.PSQL_PASSWORD,
    max: 200,
  });
}

export const factsheetPool = createPool("factsheet");
export const positionsInfomrationPool = createPool("positions_information");
export const authPool = createPool("auth");
export const tradesPool = createPool("trades");
export const fundMTDPool = createPool("fund_info_mtd");
export const logsPool = createPool("logs");
export const indexPool = createPool("portfolio_index");
export const pinnedPool = createPool("pinned");
export const automationPool = createPool("automation");
export const portfolioPool = createPool("portfolio");

export async function migrateFactSheetData(name: string, className: string) {
  const from2010: any = new Date("2010-01-01").getTime();
  const now = new Date().getTime();

  let data = await getFactSheetData(name, from2010, now, className);
  return data;
}

export function formatFactSheet(factSheetMongoDbData: any, name: any): FactSheetBenchMarkDataInDB[] {
  let result: FactSheetBenchMarkDataInDB[] = [];
  for (let index = 0; index < factSheetMongoDbData.length; index++) {
    const element = factSheetMongoDbData[index];
    let id = uuidv4();

    let object: FactSheetBenchMarkDataInDB = {
      timestamp: element.timestamp,
      date: element.date,
      data: element.data,
      fund: name,
      id: id,
    };
    result.push(object);
  }
  return result;
}

export async function insertFactSheetData(dataInput: FactSheetBenchMarkDataInDB[]) {
  const client = await factsheetPool.connect();
  try {
    await client.query("BEGIN");

    const createPartitionQuery = `
        SELECT create_partition_if_not_exists($1);
      `;

    const insertQuery = `
        INSERT INTO public.factsheet (fund, date, timestamp, data, id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (fund, date)
        DO UPDATE SET
          timestamp = EXCLUDED.timestamp,
          data = EXCLUDED.data;
      `;

    for (const { fund, date, timestamp, data, id } of dataInput) {
      // Ensure the partition exists
      await client.query(createPartitionQuery, [fund]);
      // Insert the data
      await client.query(insertQuery, [fund, date, timestamp, data, id]);
    }

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error inserting data", err.stack);
  } finally {
    client.release();
  }
}

export async function testPsqlTime() {
  const client = await factsheetPool.connect();
  try {
    await client.query("BEGIN");

    const query = `
        EXPLAIN ANALYZE
        SELECT fund, date, timestamp, data
        FROM public.factsheet
        WHERE fund = 'triada_main' AND date = '06/2024';
        
      `;

    const result = await client.query(query);
    console.log(result.rows);

    await client.query("COMMIT");
    return result.rows;
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error executing query", err.stack);
  } finally {
    client.release();
  }
}

export async function migrateInformationDB(db: string, collectionName: string, query: any) {
  const database = client.db(db);
  const collection = database.collection(collectionName);

  const existingPosition = await collection.find(query).toArray();

  return existingPosition;
}

export function formatPositions(data: any): InformationInDB[] {
  let result: InformationInDB[] = [];
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    let object: InformationInDB = {
      bb_ticker: element["BB Ticker"],
      isin: element["ISIN"],
      cusip: element["CUSIP"],
      currency: element["Currency"],
      type: "Position",
      issue_price: null,

      trade_date: null,
      settle_date: null,
      email_id: null,

      reoffer_price: null,

      treasury_and_spread: null,
      timestamp: null,
    };
    result.push(object);
  }
  return result;
}

export async function insertPositionsData(dataInput: InformationInDB[]) {
  const client = await positionsInfomrationPool.connect();
  try {
    await client.query("BEGIN");

    const insertQuery = `
        INSERT INTO public.positions_information_positions (bb_ticker, isin, cusip, currency, "type")
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (isin)
        DO UPDATE SET
          bb_ticker = EXCLUDED.bb_ticker,
          cusip = EXCLUDED.cusip,
          currency = EXCLUDED.currency;
      `;

    for (const ticker of dataInput) {
      await client.query(insertQuery, [ticker["bb_ticker"], ticker["isin"], ticker["cusip"], ticker["currency"], ticker["type"]]);
    }

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error inserting data", err.stack);
  } finally {
    client.release();
  }
}

export function formatNewIssues(data: any): InformationInDB[] {
  let result: InformationInDB[] = [];
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    let object: InformationInDB = {
      bb_ticker: element["BB Ticker"],
      isin: element["ISIN"],
      cusip: null,
      currency: element["Currency"],
      type: "New Issues",
      issue_price: element["Issue Price"],

      trade_date: element["Trade Date"],
      settle_date: element["Settle Date"],
      email_id: element["emailId"],

      reoffer_price: element["Reoffer Price"],

      treasury_and_spread: element["Treasury & Spread"],
      timestamp: parseFloat(element["timestamp"]),
    };
    result.push(object);
  }
  return result;
}

export async function insertNewIssuesData(dataInput: InformationInDB[]) {
  const client = await positionsInfomrationPool.connect();
  try {
    await client.query("BEGIN");

    const insertQuery = `
      INSERT INTO public.positions_information_new_issues (
        bb_ticker, isin, cusip, currency, "type", issue_price, trade_date, settle_date, email_id, reoffer_price, treasury_and_spread, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (isin, email_id)
      DO UPDATE SET
        bb_ticker = EXCLUDED.bb_ticker,
        isin = EXCLUDED.isin,
        cusip = EXCLUDED.cusip,
        currency = EXCLUDED.currency,
        "type" = EXCLUDED."type",
        issue_price = EXCLUDED.issue_price,
        trade_date = EXCLUDED.trade_date,
        settle_date = EXCLUDED.settle_date,
        reoffer_price = EXCLUDED.reoffer_price,
        treasury_and_spread = EXCLUDED.treasury_and_spread,
        timestamp = EXCLUDED.timestamp;

    `;

    for (const ticker of dataInput) {
      await client.query(insertQuery, [ticker.bb_ticker, ticker.isin, ticker.cusip, ticker.currency, ticker.type, ticker.issue_price, ticker.trade_date, ticker.settle_date, ticker.email_id, ticker.reoffer_price, ticker.treasury_and_spread, ticker.timestamp]);
    }

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error inserting data", err.stack);
  } finally {
    client.release();
  }
}

export function formatUsers(data: any): UserAuth[] {
  let result: UserAuth[] = [];
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    let id = uuidv4();

    let object: UserAuth = {
      email: element["email"],
      password: element["password"],
      access_role_instance: element["accessRole"],
      access_role_portfolio: "portfolio_main",
      share_class: element["shareClass"].toString().replace("mkt", ""),
      last_time_accessed: element["lastTimeAccessed"] || "",
      reset_password: element["resetPassword"] == "true" ? true : false,
      created_on: element["createdOn"] || getDateTimeInMongoDBCollectionFormat(new Date()),
      type: "user",
      name: element["name"],
      link: null,
      expiration: null,
      token: null,
      id: id,
      files: element["files"],
      reset_code: element["resetCode"],
    };
    result.push(object);
  }
  return result;
}
export async function insertUsersData(dataInput: UserAuth[]) {
  const client = await authPool.connect();
  try {
    await client.query("BEGIN");

    const insertQuery = `
      INSERT INTO public.auth_users (
        email, password, access_role_instance, access_role_portfolio, share_class, last_time_accessed, reset_password, created_on, type, name, link, expiration, id, files, reset_code
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT (email)
      DO NOTHING
    `;

    for (const ticker of dataInput) {
      await client.query(insertQuery, [ticker.email, ticker.password, ticker.access_role_instance, ticker.access_role_portfolio, ticker.share_class, ticker.last_time_accessed, ticker.reset_password, ticker.created_on, ticker.type, ticker.name, null, null, ticker.id, ticker.files, ticker.reset_code]);
    }

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error inserting data", err.stack);
  } finally {
    client.release();
  }
}

export function formatLinks(data: any): UserAuth[] {
  let result: UserAuth[] = [];
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    let id = uuidv4();

    let object: UserAuth = {
      email: element["email"],
      password: null,
      access_role_instance: element["accessRole"],
      access_role_portfolio: null,
      share_class: element["accessRight"],
      last_time_accessed: element["lastAccessedTime"] || "",
      reset_password: null,
      created_on: element["createdOn"] || getDateTimeInMongoDBCollectionFormat(new Date()),
      type: "link",
      name: element["name"],
      link: element["link"],
      expiration: element["expiration"],
      token: element["token"],
      id: id,
      files: null,
      reset_code: null,
    };
    if (element["email"]) {
      result.push(object);
    }
  }
  return result;
}

export async function insertLinksData(dataInput: UserAuth[]) {
  const client = await authPool.connect();
  try {
    await client.query("BEGIN");

    const insertQuery = `
      INSERT INTO public.auth_links (
        email, password, access_role_instance, access_role_portfolio, share_class, last_time_accessed, reset_password, created_on, type, name, link, expiration, token, id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14);
    `;

    for (const entry of dataInput) {
      await client.query(insertQuery, [entry.email, entry.password, entry.access_role_instance, entry.access_role_portfolio, entry.share_class, entry.last_time_accessed, entry.reset_password, entry.created_on, entry.type, entry.name, entry.link, entry.expiration, entry.token, entry.id]);
    }

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error inserting data", err.stack);
  } finally {
    client.release();
  }
}

export function formatTrades(data: any[], tradeType: string): CentralizedTradeInDB[] {
  let result: CentralizedTradeInDB[] = [];
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    let id = uuidv4();

    let object: CentralizedTradeInDB = {
      b_s: element["B/S"],
      bb_ticker: element["BB Ticker"], //|| element["Issue"],
      location: element["Location"],
      trade_date: element["Trade Date"],
      trade_time: element["Trade Time"],
      settle_date: element["Settle Date"],
      price: parseFloat(element["Price"]),
      notional_amount: parseFloat(element["Notional Amount"]),
      settlement_amount: parseFloat(element["Settlement Amount"]),
      principal: parseFloat(element["Principal"]),
      counter_party: element["Counter Party"],
      triada_trade_id: element["Triada Trade Id"],
      seq_no: element["Seq No"],
      isin: element["ISIN"],
      cuisp: element["Cuisp"],
      currency: element["Currency"],
      yield: element["Yield"],
      accrued_interest: parseFloat(element["Accrued Interest"]) || 0,
      original_face: element["Original Face"],
      comm_fee: parseFloat(element["Comm/Fee"]) || 0,
      trade_type: tradeType,
      updated_notional: parseFloat(element["Updated Notional"] || "0") || 0,
      timestamp: new Date(element["timestamp"] || element["Trade Date"]).getTime(),
      nomura_upload_status: element["Nomura Upload Status"],
      last_nomura_generated: element["Last Nomura Generated"],
      broker_full_name_account: element["Broker Full Name & Account"],
      broker_email: element["Broker Email"],
      settlement_venue: element["Settlement Venue"],
      primary_market: false,
      broker_email_status: element["Broker Email Status"],
      id: id,
      portfolio_id: "portfolio_main",
      front_office_check: true,
      resolved: true,
      front_office_note: element["Front Office Note"],
    };
    result.push(object);
  }
  return result;
}


export function formatFundMTD(data: any[]): FundDetailsInDB[] {
  let result: FundDetailsInDB[] = [];
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    let id = uuidv4();
    let date = element["month"].split("/");
    date = new Date(date[0], date[1], 1).getTime();
    console.log(new Date(date));
    let object: FundDetailsInDB = {
      id: id,
      portfolio_id: "portfolio_main",
      share_price: element["a2 price"],
      borrowing_amount: element["borrowing amount"],
      month: element["month"],
      nav: element["nav"],
      expenses: element["expenses"],
      holdback_ratio: element["holdBackRatio"],
      timestamp: date,
    };
    result.push(object);
  }
  return result;
}

export async function insertFundMTDData(dataInput: FundDetailsInDB[], tableName: string) {
  const client = await fundMTDPool.connect();
  try {
    await client.query("BEGIN");

    const insertQuery = `
  INSERT INTO public.fund_${tableName} (
    portfolio_id, share_price,borrowing_amount, month, nav, expenses, holdback_ratio, timestamp, id
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (portfolio_id, month) DO NOTHING;`;

    for (const element of dataInput) {
      await client.query(insertQuery, [element.portfolio_id, element.share_price, element.borrowing_amount, element.month, element.nav, element.expenses, element.holdback_ratio, element.timestamp, element.id]);
    }

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error inserting trades", err.stack);
  } finally {
    client.release();
  }
}
export function formatEditLogs(data: any[], type: string): Logs[] {
  let result: Logs[] = [];
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    let id = uuidv4();
    let object: Logs = {
      id: id,
      portfolio_id: "portfolio_main",
      changes: typeof element["changes"][0] == "string" ? [] : element["changes"],
      log_type: type,
      date_time: element["dateTime"],
      edit_note: element["editNote"],
      identifier: element["identifier"],
      timestamp: new Date(element["dateTime"]).getTime(),
    };
    result.push(object);
  }
  return result;
}

export async function insertLogsData(dataInput: Logs[], tableName: string) {
  const client = await logsPool.connect();
  try {
    await client.query("BEGIN");

    const insertQuery = `
  INSERT INTO public.logs_${tableName} (
    id, changes,log_type, date_time, edit_note, identifier, timestamp, portfolio_id
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (id, portfolio_id) DO NOTHING;`;

    for (const element of dataInput) {
      await client.query(insertQuery, [element.id, element.changes, element.log_type, element.date_time, element.edit_note, element.identifier, element.timestamp, element.portfolio_id]);
    }

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error inserting", err.stack);
  } finally {
    client.release();
  }
}
export async function insertIndexingData(dataInput: Indexing[]) {
  const client = await indexPool.connect();
  try {
    await client.query("BEGIN");

    const insertQuery = `
  INSERT INTO public.indexing (
    portfolio_id, portfolio_document_ids
  )
  VALUES ($1, $2)
  ON CONFLICT (portfolio_id) DO UPDATE
  SET portfolio_document_ids = EXCLUDED.portfolio_document_ids;`;

    for (const element of dataInput) {
      await client.query(insertQuery, [element.portfolio_id, element.portfolio_document_ids]);
    }

    await client.query("COMMIT");
    console.log("indexing added");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error inserting", err.stack);
  } finally {
    client.release();
  }
}



export async function insertPositionsPortfolioData(dataInput: PositionInSQLDB[], portfolioId: string, snapShot: string) {
  const client = await portfolioPool.connect();
  try {
    await client.query("BEGIN");

    // Create table if it doesn't exist

    // Insert or update data
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS "${snapShot}" PARTITION OF ${portfolioId}
        FOR VALUES IN ('${snapShot}');
    `;
    await client.query(createTableQuery);
    await client.query("COMMIT");

    for (const element of dataInput) {
      const insertQuery = `
      INSERT INTO public.positions (
        id, portfolio_id, portfolio_snapshot_time, location, isin, cusip, bloomberg_id,
        bid, mid, ask, bloomberg_mid_bgn, notional_amount, average_cost, bb_ticker,
        cr01, dv01, broker, call_date, country, coupon_rate, currency, entry_price,
        entry_yield, fx_rate, fitch_bond_rating, fitch_outlook, interest, issuer,
        last_price_update, last_upload_trade, maturity, moddys_outlook, moodys_bond_rating,
        moodys_outlook, bbg_composite_rating, sp_bond_rating, sp_outlook, oas, original_face,
        sector, strategy, ytm, ytw, z_spread, notes, coupon_duration, asset_class, pin,
        issuers_country, coupon_frequency, previous_settle_date, next_settle_date, cost_mtd,
        security_description, type
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
        $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55
      )
      ON CONFLICT (portfolio_id, portfolio_snapshot_time, id) DO UPDATE
      SET last_price_update = EXCLUDED.last_price_update,
          last_upload_trade = EXCLUDED.last_upload_trade;
    `;

      let idTest = uuidv4();
      await client.query(insertQuery, [
        idTest,
        portfolioId,
        snapShot,
        element.location,
        element.isin,
        element.cusip,
        element.bloomberg_id,
        element.bid,
        element.mid,
        element.ask,
        element.bloomberg_mid_bgn,
        element.notional_amount,
        element.average_cost,
        element.bb_ticker,
        element.cr01,
        element.dv01,
        element.broker,
        element.call_date,
        element.country,
        element.coupon_rate,
        element.currency,
        JSON.stringify(element.entry_price),
        element.entry_yield,
        element.fx_rate,
        element.fitch_bond_rating,
        element.fitch_outlook,
        JSON.stringify(element.interest),
        element.issuer,
        element.last_price_update,
        element.last_upload_trade,
        element.maturity,
        element.moddys_outlook,
        element.moodys_bond_rating,
        element.moodys_outlook,
        element.bbg_composite_rating,
        element.sp_bond_rating,
        element.sp_outlook,
        element.oas,
        element.original_face,
        element.sector,
        element.strategy,
        element.ytm,
        element.ytw,
        element.z_spread,
        element.notes,
        element.coupon_duration,
        element.asset_class,
        element.pin,
        element.issuers_country,
        element.coupon_frequency,
        element.previous_settle_date,
        element.next_settle_date,
        JSON.stringify(element.cost_mtd),
        element.security_description,
        element.type,
      ]);
    }
    await client.query("COMMIT");
    console.log({ tableName: snapShot + " SUCCESS" });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error inserting", err);
  } finally {
    client.release();
  }
}

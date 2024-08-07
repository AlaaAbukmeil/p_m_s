import { FactSheetBenchMarkDataInDB } from "../../../models/factSheet";
import { InformationInDB } from "../../../models/positionsInformation";
import { getFactSheetData } from "../../reports/factSheet";
import { client } from "../../userManagement/auth";

require("dotenv").config();

const { Pool } = require("pg");

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
    max: 20,
  });
}

export const factsheetPool = createPool("factsheet");
export const positionsInfomrationPool = createPool("positions_information");

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
    let object = {
      timestamp: element.timestamp,
      date: element.date,
      data: element.data,
      fund: name,
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
        INSERT INTO public.factsheet (fund, date, timestamp, data)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (fund, date)
        DO UPDATE SET
          timestamp = EXCLUDED.timestamp,
          data = EXCLUDED.data;
      `;

    for (const { fund, date, timestamp, data } of dataInput) {
      // Ensure the partition exists
      await client.query(createPartitionQuery, [fund]);
      // Insert the data
      await client.query(insertQuery, [fund, date, timestamp, data]);
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

export async function migrateInformationDB() {
  const database = client.db("Information");
  const collection = database.collection("New Issues");

  const existingPosition = await collection.find().toArray();

  return existingPosition;
}

export function formatPositions(data: any): InformationInDB[] {
  let result: InformationInDB[] = [];
  for (let index = 0; index < data.length; index++) {
    const element = data[index];
    let object = {
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
    let object = {
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
        bb_ticker, isin, cusip, currency, "type", issue_price, trade_date, settle_date, email_id, reoffer_price, treasury_and_spread
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
        treasury_and_spread = EXCLUDED.treasury_and_spread;
    `;

    for (const ticker of dataInput) {
      await client.query(insertQuery, [ticker.bb_ticker, ticker.isin, ticker.cusip, ticker.currency, ticker.type, ticker.issue_price, ticker.trade_date, ticker.settle_date, ticker.email_id, ticker.reoffer_price, ticker.treasury_and_spread]);
    }

    await client.query("COMMIT");
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error inserting data", err.stack);
  } finally {
    client.release();
  }
}

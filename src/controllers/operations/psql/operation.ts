import { FactSheetBenchMarkDataInDB } from "../../../models/factSheet";
import { getFactSheetData } from "../../reports/factSheet";

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

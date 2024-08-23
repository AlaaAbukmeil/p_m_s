import { InformationInDB } from "../../models/positionsInformation";
import { insertEditLogs } from "../operations/logs";
import { positionsInfomrationPool } from "../operations/psql/operation";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { client } from "../userManagement/auth";

export async function insertPositionsInfo(positions: InformationInDB[]): Promise<void> {
  const connection = await positionsInfomrationPool.connect();
  try {
    await connection.query("BEGIN");

    const query = `
      INSERT INTO public.positions_information_positions (
        bb_ticker, isin, cusip, currency, "type", issue_price, trade_date, settle_date, email_id, reoffer_price, treasury_and_spread
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (isin)
      DO UPDATE SET
        bb_ticker = EXCLUDED.bb_ticker,
        cusip = EXCLUDED.cusip,
        currency = EXCLUDED.currency,
        "type" = EXCLUDED."type",
        issue_price = EXCLUDED.issue_price,
        trade_date = EXCLUDED.trade_date,
        settle_date = EXCLUDED.settle_date,
        email_id = EXCLUDED.email_id,
        reoffer_price = EXCLUDED.reoffer_price,
        treasury_and_spread = EXCLUDED.treasury_and_spread
    `;

    for (const position of positions) {
      await connection.query(query, [position.bb_ticker, position.isin, position.cusip, position.currency, position.type, position.issue_price, position.trade_date, position.settle_date, position.email_id, position.reoffer_price, position.treasury_and_spread]);
    }

    await connection.query("COMMIT");
  } catch (error) {
    await connection.query("ROLLBACK");
    console.error("Error inserting or updating positions:", error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    await insertEditLogs([errorMessage], "errors", dateTime, "insertPositionsInfo", "controllers/analytics/data.ts");
  } finally {
    connection.release();
  }
}

export async function getAllPositionsInformation(): Promise<any[]> {
  const connection = await positionsInfomrationPool.connect();

  try {
    const query = `
      SELECT bb_ticker
      FROM public.positions_information_positions;
    `;

    const result = await connection.query(query);
    const tickers = result.rows.map((row: any) => row.bb_ticker);

    return tickers;
  } catch (error) {
    console.error("Error connecting to PostgreSQL or querying data:", error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    await insertEditLogs([errorMessage], "errors", dateTime, "getAllPositionsInformation", "controllers/analytics/data.ts");
    return [];
  } finally {
    connection.release();
  }
}

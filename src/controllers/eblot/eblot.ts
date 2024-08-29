import { CentralizedTrade, CentralizedTradeInDB } from "../../models/trades";
import { convertTradesSQLToCentralized } from "../db/convert";
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


import { Indexing } from "../../models/portfolio";
import { formatDateUS } from "../common";
import { indexPool, insertIndexingData } from "./psql/operation";

export async function getIndexingData(portfolioId: string): Promise<{ timestamp: number; name: string }[]> {
  try {
    const client = await indexPool.connect();
    try {
      const query = `
    SELECT *
    FROM public.indexing
    WHERE portfolio_id = $1
    LIMIT 1;
  `;
      const values = [portfolioId];

      const result = await client.query(query, values);
      return result.rows[0].portfolio_document_ids;
    } finally {
      client.release();
    }
  } catch (error: any) {
    return [];
  }
}

export async function insertNewIndex(portfolioId: string, newIndex: string) {
  let allIndexes = await getIndexingData(portfolioId);

  let newIndexObject: { timestamp: number; name: string } = {
    name: newIndex,
    timestamp: new Date(newIndex).getTime(),
  };
  allIndexes.push(newIndexObject);
  let newIndexingRow: Indexing = {
    portfolio_id: portfolioId,
    portfolio_document_ids: allIndexes,
  };

  await insertIndexingData([newIndexingRow]);
}

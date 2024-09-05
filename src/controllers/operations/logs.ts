import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { errorEmailALert } from "./emails";
import { ObjectId } from "mongodb";
import { logsPool } from "./psql/operation";
const { v4: uuidv4 } = require("uuid");

export async function insertEditLogs(changes: any[], logType: string, dateTime: string, editNote: string, identifier: string, portfolioId: string = "portfolio_main") {
  const client = await logsPool.connect();
  try {
    await client.query("BEGIN");
    let id = uuidv4();

    const insertQuery = `
  INSERT INTO public.logs_${portfolioId} (
    id, changes,log_type, date_time, edit_note, identifier, timestamp, portfolio_id
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (portfolio_id, id) DO NOTHING;`;
    if (typeof changes[0] != "object") {
      for (let index = 0; index < changes.length; index++) {
        let temp = changes[index];
        changes[index] = {};
        changes[index]["Error " + index] = temp;
      }
    }

    await client.query(insertQuery, [id, changes, logType, dateTime, editNote, identifier, new Date().getTime(), portfolioId]);

    await client.query("COMMIT");
    if (logType == "Errors") {
      let errorEmail = { errorMessage: changes[0], functionName: editNote, location: identifier, date: dateTime };

      let test = await errorEmailALert(errorEmail);
    }
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("Error inserting", err.stack);
  } finally {
    client.release();
  }
}

export async function getEditLogs(logsType: any, portfolioId: string) {
  try {
    const client = await logsPool.connect();
    try {
      const query = `
  SELECT *
  FROM public.logs_${portfolioId}
  WHERE log_type = $1
  ORDER BY timestamp DESC
`;
      const values = [logsType];

      const result = await client.query(query, values);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.log(error);

    return [];
  }
}

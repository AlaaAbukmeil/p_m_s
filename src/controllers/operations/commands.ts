import { ObjectId } from "mongodb";
import { client } from "../userManagement/auth";
import { automationPool } from "./psql/operation";

export async function editFactSheetDisplay(data: { command: "view"; disabled: boolean }): Promise<any> {
  try {
    const client = await automationPool.connect();
    try {
      let upsertQuery = `
      INSERT INTO public.commands (command, status, type)
      VALUES ($1, $2, $3)
      ON CONFLICT (command)
      DO UPDATE SET status = EXCLUDED.status, type = EXCLUDED.type;
      `;
      const values = [data["command"], data["disabled"], "factsheet-display"];

      const result = await client.query(upsertQuery, values);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.log(error);
  }
}

export async function getFactSheetDisplay(commandId: string): Promise<any> {
  try {
    const client = await automationPool.connect();
    try {
      const query = `
  SELECT *
  FROM public.commands
  WHERE command = $1
  LIMIT 1;
`;
      const values = [commandId];

      const result = await client.query(query, values);
      return result.rows[0].status == "true" ? true : false;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.log(error);
  }
}

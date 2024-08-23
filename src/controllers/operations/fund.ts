const ObjectId = require("mongodb").ObjectId;

import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { FundDetails, FundDetailsInDB } from "../../models/portfolio";
import { insertEditLogs } from "./logs";
import { fundMTDPool } from "./psql/operation";
const { v4: uuidv4 } = require("uuid");

export async function getFundDetails(date: string, portfolioId: string): Promise<FundDetails | {}> {
  try {
    const client = await fundMTDPool.connect();
    let dateComponents: any = date.split("/");
    let timestampInput = new Date(dateComponents[0], dateComponents[1], 25).getTime();
    try {
      const query = `
  SELECT *
  FROM public.fund
  WHERE portfolio_id = $1 AND timestamp < $2
  ORDER BY timestamp DESC
  LIMIT 1;
`;
      const values = [portfolioId, timestampInput];

      const result = await client.query(query, values);
      let formatted = convertFundSQL(result.rows);
      return formatted;
    } finally {
      client.release();
    }
  } catch (error: any) {
    const dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getFundDetails", "controllers/operations/fund.ts");

    return {};
  }
}

export async function getAllFundDetails(date: string, portfolioId: string): Promise<FundDetails[]> {
  try {
    const client = await fundMTDPool.connect();
    try {
      const query = "SELECT * FROM public.fund WHERE portfolio_id = $1 ORDER BY timestamp DESC;";
      const values = [portfolioId];

      const result = await client.query(query, values);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error: any) {
    const dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    await insertEditLogs([errorMessage], "errors", dateTime, "getAllFundDetails", "controllers/operations/fund.ts");

    return [];
  }
}

export async function editFund(data: any): Promise<any> {
  const client = await fundMTDPool.connect();
  try {
    await client.query("BEGIN");

    const updates = [];
    const values = [];
    const tableTitles = ["month", "nav", "holdback_ratio", "share_price", "borrowing_amount", "expenses"];
    let index = 1;

    for (const title of tableTitles) {
      if (data[title] !== "" && data[title] != null) {
        updates.push(`${title} = $${index}`);
        values.push(data[title]);
        index++;
      }
    }

    if (updates.length === 0) {
      throw new Error("No valid fields to update");
    }

    const query = `
      UPDATE public.fund
      SET ${updates.join(", ")}
      WHERE id = $${index};
    `;
    values.push(data["id"]);

    const result = await client.query(query, values);

    await client.query("COMMIT");

    if (result.rows.length === 0) {
      return { error: "Document does not exist or was not updated" };
    }

    return result.rows[0];
  } catch (error: any) {
    await client.query("ROLLBACK");
    return { error: error.message };
  } finally {
    client.release();
  }
}

export async function deleteFund(data: any): Promise<any> {
  const client = await fundMTDPool.connect();
  try {
    const id = data["id"];

    const query = `
      DELETE FROM public.fund
      WHERE id = $1;
    `;

    const result = await client.query(query, [id]);

    if (result.rowCount === 0) {
      return { error: `Trade does not exist!` };
    } else {
      const dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      return { error: null };
    }
  } catch (error: any) {
    console.error(`An error occurred while deleting the trade: ${error}`);
    const dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    await insertEditLogs([error], "errors", dateTime, "deleteFund", `${data["month"]}`);
    return { error: error.toString() };
  } finally {
    client.release();
  }
}

export async function addFund(data: FundDetailsInDB): Promise<any> {
  const client = await fundMTDPool.connect();
  try {
    await client.query("BEGIN");

    const insertQuery = `
  INSERT INTO public.fund (
    portfolio_id, share_price,borrowing_amount, month, nav, expenses, holdback_ratio, timestamp, id
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (portfolio_id, month) DO NOTHING;`;
    let id = uuidv4();
    let date: any = data["month"].split("/");
    let timestamp = new Date(date[0], date[1], 1).getTime();
    let values = [data.portfolio_id, data.share_price, data.borrowing_amount, data.month, data.nav, data.expenses, data.holdback_ratio, timestamp, id];
    await client.query(insertQuery, values);

    await client.query("COMMIT");
    return { error: null };
  } catch (err: any) {
    await client.query("ROLLBACK");
    return { error: err };
  } finally {
    client.release();
  }
}

export function convertFundSQL(funds: FundDetailsInDB[]): FundDetails[] {
  let copy: FundDetails[] = [];
  for (let index = 0; index < funds.length; index++) {
    const element = funds[index];
    let object: FundDetails = {
      month: element["month"],
      nav: element["nav"],
      expenses: element["expenses"],
      holdBackRatio: element["holdback_ratio"],
      "borrowing amount": element["borrowing_amount"],
      "share price": element["share_price"],
    };
    copy.push(object);
  }
  return copy;
}

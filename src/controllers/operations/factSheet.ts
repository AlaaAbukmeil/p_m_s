import { ObjectId } from "mongodb";
import { factsheetPool } from "./psql/operation";
import { FactSheetFundDataInDB } from "../../models/factSheet";
const { v4: uuidv4 } = require("uuid");

export async function addFactSheet(data: FactSheetFundDataInDB, name: "LEGATRUU Index" | "EMUSTRUU Index" | "BEUCTRUU Index" | "BEUYTRUU Index" | "LG30TRUU Index" | "FIDITBD LX Equity" | "PIMGLBA ID Equity" | "3 Month Treasury" | "Triada" | "Triada Master" | "BEBGTRUU Index"): Promise<any> {
  const client = await factsheetPool.connect();
  let psqlFactSheetDBNames: any = {
    "LEGATRUU Index": "bbg_global_aggregate",
    "EMUSTRUU Index": "bbg_em_aggregate",
    "BEUCTRUU Index": "bbg_em_asia",
    "BEUYTRUU Index": "bbg_em_asia_hy",
    "LG30TRUU Index": "bbg_global_hy",
    "FIDITBD LX Equity": "fidelity_global_bond",
    "PIMGLBA ID Equity": "pimco_global_bond",
    "3 Month Treasury": "3_month_treasury",
    Triada: "triada_main",
    "Triada Master": "triada_master",
    "BEBGTRUU Index": "bbg_em_global_hy",
  };
  try {
    const tableName = `public.factsheet_${psqlFactSheetDBNames[name]}`;

    const insertQuery = `
      INSERT INTO ${tableName} (timestamp, date, data, fund, id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    const values = [
      data.timestamp,
      data.date,
      data.data, // Assuming 'data' column is of JSONB type
      psqlFactSheetDBNames[name],
      data.id,
    ];
    const result = await client.query(insertQuery, values);

    if (result.rowCount === 0) {
      return { error: "Failed to insert document" };
    }

    return { success: true, insertedId: result.rows[0].id, error: null };
  } catch (error: any) {
    console.error("Error inserting document:", error);
    return { error: error.message };
  } finally {
    client.release();
  }
}

export async function editFactSheet(data: { data: { [key: string]: number }; month: string }, name: "LEGATRUU Index" | "EMUSTRUU Index" | "BEUCTRUU Index" | "BEUYTRUU Index" | "LG30TRUU Index" | "FIDITBD LX Equity" | "PIMGLBA ID Equity" | "3 Month Treasury" | "Triada" | "Triada Master" | "BEBGTRUU Index", param: string, id: any): Promise<any> {
  const client = await factsheetPool.connect();

  const psqlFactSheetDBNames: any = {
    "LEGATRUU Index": "bbg_global_aggregate",
    "EMUSTRUU Index": "bbg_em_aggregate",
    "BEUCTRUU Index": "bbg_em_asia",
    "BEUYTRUU Index": "bbg_em_asia_hy",
    "LG30TRUU Index": "bbg_global_hy",
    "FIDITBD LX Equity": "fidelity_global_bond",
    "PIMGLBA ID Equity": "pimco_global_bond",
    "3 Month Treasury": "3_month_treasury",
    Triada: "triada_main",
    "Triada Master": "triada_master",
    "BEBGTRUU Index": "bbg_em_global_hy",
  };

  try {
    const tableName = `public.factsheet_${psqlFactSheetDBNames[name]}`;

    if (id) {
      // Update existing document
      const selectQuery = `
        SELECT data FROM ${tableName} WHERE id = $1
      `;
      const originalResult = await client.query(selectQuery, [id]);

      if (originalResult.rows.length === 0) {
        return { error: "No document found with the provided ID" };
      }

      const originalData = originalResult.rows[0].data;
      let updatedData = { ...originalData };
      updatedData[param] = data.data[param];
      const updateQuery = `
        UPDATE ${tableName}
        SET data = $1
        WHERE id = $2
      `;
      const values = [updatedData, id];

      const updateResult = await client.query(updateQuery, values);

      if (updateResult.rowCount === 0) {
        return { error: "No document found with the provided ID" };
      }

      return { success: true, matchedCount: updateResult.rowCount, modifiedCount: updateResult.rowCount, error: null };
    } else {
      // Add new row
      let id = uuidv4();
      const fullDate = data.month.split("/");
      const newRow: any = {
        date: data.month,
        data: { [param]: data.data[param] },
        timestamp: new Date(`${fullDate[0]}/01/${fullDate[1]}`).getTime(),
        fund: psqlFactSheetDBNames[name],
        id: id,
      };
      return await addFactSheet(newRow, name);
    }
  } catch (error: any) {
    console.error("Error editing document:", error);
    return { error: error.message };
  } finally {
    client.release();
  }
}

export async function deleteFactSheet(data: any, name: string): Promise<any> {
  const client = await factsheetPool.connect();

  const psqlFactSheetDBNames: any = {
    "LEGATRUU Index": "bbg_global_aggregate",
    "EMUSTRUU Index": "bbg_em_aggregate",
    "BEUCTRUU Index": "bbg_em_asia",
    "BEUYTRUU Index": "bbg_em_asia_hy",
    "LG30TRUU Index": "bbg_global_hy",
    "FIDITBD LX Equity": "fidelity_global_bond",
    "PIMGLBA ID Equity": "pimco_global_bond",
    "3 Month Treasury": "3_month_treasury",
    Triada: "triada_main",
    "Triada Master": "triada_master",
    "BEBGTRUU Index": "bbg_em_global_hy",
  };

  try {
    const tableName = `public.factsheet_${psqlFactSheetDBNames[name]}`;
    const id = data["id"];

    const deleteQuery = `
      DELETE FROM ${tableName}
      WHERE id = $1
    `;
    const result = await client.query(deleteQuery, [id]);

    if (result.rowCount === 0) {
      return { error: "Document does not exist" };
    }

    return { success: true, rowCount: result.rowCount, error: null };
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return { error: error.message };
  } finally {
    client.release();
  }
}

export function formatUpdateEmail(emailTemplate: string, users: any) {
  let emails = [];
  for (let index = 0; index < users.length; index++) {
    let user = users[index];
    let object: any = {};
    object["email"] = user["email"];
    object["text"] = emailTemplate
      .replace(/\$name/g, user["name"])
      .replace(/\$shareClass/g, user["shareClass"].replace("mkt", ""));
    emails.push(object);
  }
  return emails;
}

import { CentralizedTrade } from "../../models/trades";
import { client } from "../auth";
import { insertEditLogs } from "../operations/portfolio";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";

export async function getAllTrades(from: number, to: number): Promise<CentralizedTrade[]> {
  try {
    const database = client.db("trades_v_2");
    const collections = [database.collection("vcons"), database.collection("ib"), database.collection("emsx"),database.collection("gs")];

    // The query to be used on all collections
    const query = {
      timestamp: {
        $gte: from, // Greater than or equal to "from" timestamp
        $lte: to, // Less than or equal to "to" timestamp
      },
    };

    // An array to hold all the documents from all collections
    let allDocuments: any = [];

    // Loop through each collection and retrieve the documents
    for (const collection of collections) {
      const documents = await collection.find(query).toArray();
      allDocuments = allDocuments.concat(documents);
    }

    for (let index = 0; index < allDocuments.length; index++) {
      let trade = allDocuments[index];
      if (!trade["BB Ticker"] && trade["Issue"]) {
        trade["BB Ticker"] = trade["Issue"];
        delete trade["Issue"];
      }
    }

    return allDocuments;
  } catch (error: any) {
    // Handle the error appropriately
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "Get All Trades", "controllers/eblot/eblot.ts");

    return [];
  }
}

import { insertEditLogs } from "../operations/logs";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { client } from "../userManagement/auth";

export async function insertPositionsInfo(positions: any[]): Promise<void> {
  try {
    const database = client.db("Information");
    const collection = database.collection("positions");

    for (const position of positions) {
      const result = await collection.updateOne({ ISIN: position.ISIN }, { $set: position }, { upsert: true });

      if (result.matchedCount > 0) {
        console.log(`Updated position with ISIN: ${position.ISIN}`);
      } else {
        console.log(`Inserted new position with ISIN: ${position.ISIN}`);
      }
    }
  } catch (error) {
    console.error("Error connecting to MongoDB or inserting documents:", error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    await insertEditLogs([errorMessage], "Errors", dateTime, "insertPositionsInfo", "controllers/analytics/data.ts");
  }
}
export async function getAllPositionsInformation(): Promise<any> {
  try {
    const database = client.db("Information");
    const collection = database.collection("positions");

    const existingPosition = await collection.find().toArray();
    let tickers = [];
    for (let index = 0; index < existingPosition.length; index++) {
      tickers.push(existingPosition[index]["BB Ticker"]);
    }
    return tickers;
  } catch (error) {
    console.error("Error connecting to MongoDB or inserting documents:", error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    await insertEditLogs([errorMessage], "Errors", dateTime, "getAllPositionsInformation", "controllers/analytics/data.ts");
  }
}

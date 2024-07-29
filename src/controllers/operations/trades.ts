import { ObjectId } from "mongodb";
import { client } from "../userManagement/auth";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { CentralizedTrade } from "../../models/trades";
import { insertEditLogs } from "./logs";

export async function getAllTradesForSpecificPosition(tradeType: string, isin: string, location: string, date: string) {
  try {
    // Connect to the MongoDB client
    let timestamp = new Date(date).getTime();

    // Access the 'structure' database
    const database = client.db("trades_v_2");

    // Access the collection named by the 'customerId' parameter
    const collection = database.collection(tradeType);

    // Perform your operations, such as find documents in the collection
    // This is an example operation that fetches all documents in the collection
    // Empty query object means "match all documents"
    const options = {}; // You can set options for the find operation if needed
    const query = { ISIN: isin, Location: location, timestamp: { $lt: timestamp } }; // Replace yourIdValue with the actual ID you're querying
    const results = await collection.find(query, options).toArray();
    for (let index = 0; index < results.length; index++) {
      let trade = results[index];
      if (!trade["BB Ticker"] && trade["Issue"]) {
        trade["BB Ticker"] = trade["Issue"];
        delete trade["Issue"];
      }
    }
    // The 'results' variable now contains an array of documents from the collection
    return results;
  } catch (error) {
    // Handle any errors that occurred during the operation
    console.error("An error occurred while retrieving data from MongoDB:", error);
  }
}

export async function getTrade(tradeType: string, tradeId: string) {
  try {
    // Connect to the MongoDB client

    // Access the 'structure' database
    const database = client.db("trades_v_2");

    // Access the collection named by the 'customerId' parameter
    const collection = database.collection(tradeType);

    // Perform your operations, such as find documents in the collection
    // This is an example operation that fetches all documents in the collection
    // Empty query object means "match all documents"
    const options = {}; // You can set options for the find operation if needed
    const query = { _id: new ObjectId(tradeId) }; // Replace yourIdValue with the actual ID you're querying
    const results = await collection.find(query, options).toArray();
    for (let index = 0; index < results.length; index++) {
      let trade = results[index];
      if (!trade["BB Ticker"] && trade["Issue"]) {
        trade["BB Ticker"] = trade["Issue"];
        delete trade["Issue"];
      }
    }
    // The 'results' variable now contains an array of documents from the collection
    return results[0];
  } catch (error) {
    // Handle any errors that occurred during the operation
    console.error("An error occurred while retrieving data from MongoDB:", error);
  }
}

export async function editTrade(editedTrade: any, tradeType: any, logs = false, source = "main") {
  try {
    let tradeInfo = await getTrade(tradeType, editedTrade["_id"]);
    let unEditableParams = ["_id", "Updated Notional", "B/S", "BB Ticker", "Location", "Trade Date", "Trade Time", "Settle Date", "Price", "Notional Amount", "Settlement Amount", "Principal", "Triada Trade Id", "Seq No", "ISIN", "Currency", "Yield", "Accrued Interest", "Trade Type", "App Check Test", "Trade App Status", "Nomura Upload Status", "Broker Email Status", "App Check Test", "Front Office Check", "Trade Type", ];

    if (tradeInfo) {
      let beforeModify = JSON.parse(JSON.stringify(tradeInfo));
      beforeModify["_id"] = new ObjectId(beforeModify["_id"]);

      let centralizedBlotKeys: any = [
        "B/S",
        "BB Ticker",
        "Location",
        "Trade Date",
        "Trade Time",
        "Settle Date",
        "Price",
        "Notional Amount",
        "Settlement Amount",
        "Principal",
        "Counter Party",
        "Triada Trade Id",
        "Seq No",
        "ISIN",
        "Cuisp",
        "Currency",
        "Yield",
        "Accrued Interest",
        "Original Face",
        "Comm/Fee",
        "Trade Type",
        "Nomura Upload Status",
        "Broker Full Name & Account",
        "Broker Email Status",
        "Broker Email",
        "Primary (True/False)",
        "Settlement Venue",
        "Edit Note",
        "Resolved",
        "Front Office Check",
        
      ];

      let changes = 0;
      let changesText = [];
      for (let index = 0; index < centralizedBlotKeys.length; index++) {
        let key: any = centralizedBlotKeys[index];
        if (source == "main") {
          if (editedTrade[key] != "" && editedTrade[key]) {
            changesText.push(`${key} changed from ${tradeInfo[key]} to ${editedTrade[key]} `);
            tradeInfo[key] = editedTrade[key];

            changes++;
          }
        } else {
          if (editedTrade[key] != "" && editedTrade[key] && !unEditableParams.includes(key)) {
            changesText.push(`${key} changed from ${tradeInfo[key]} to ${editedTrade[key]} `);
            tradeInfo[key] = editedTrade[key];

            changes++;
          }
        }
      }
      if (!changes) {
        return { error: "The trade is still the same." };
      }

      // Access the 'structure' database
      const database = client.db("trades_v_2");

      // Access the collection named by the 'customerId' parameter
      const collection = database.collection(tradeType);

      let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      if (logs) {
        await insertEditLogs(changesText, "Edit Trade", dateTime, tradeInfo["Edit Note"], tradeInfo["BB Ticker"] + " " + tradeInfo["Location"]);
      }

      let action = await collection.updateOne(
        { _id: tradeInfo["_id"] }, // Filter to match the document
        { $set: tradeInfo } // Update operation
      );

      if (action) {
        return { error: null };
      } else {
        return {
          error: "unexpected error, please contact Triada team",
        };
      }
    } else {
      return { error: "Trade does not exist, please referesh the page!" };
    }
  } catch (error: any) {
    console.log(error);
    return { error: error };
  }
}

export async function deleteTrade(tradeType: string, tradeId: string, tradeIssue: string, location: string) {
  try {
    // Connect to the MongoDB client

    // Get the database and the specific collection
    const database = client.db("trades_v_2");
    const collection = database.collection(tradeType);

    let query = { _id: new ObjectId(tradeId) };

    // Delete the document with the specified _id
    const result = await collection.deleteOne(query);

    if (result.deletedCount === 0) {
      return { error: `Trade does not exist!` };
    } else {
      let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      await insertEditLogs(["deleted"], "Edit Trade", dateTime, "deleted", tradeIssue + " " + location);
      console.log("deleted");
      return { error: null };
    }
  } catch (error) {
    console.error(`An error occurred while deleting the document: ${error}`);
    return { error: "Unexpected error 501" };
  }
}
export async function deleteNewTrade(triadaTradeId: string) {
  try {
    // Connect to the MongoDB client

    // Get the database and the specific collection
    const database = client.db("trades_v_2");
    const collection = database.collection("new_trades");

    let query = { "Triada Trade Id": triadaTradeId };

    // Delete the document with the specified _id
    const result = await collection.deleteOne(query);

    if (result.deletedCount === 0) {
      return { error: `Trade does not exist!` };
    } else {
      return { error: null };
    }
  } catch (error) {
    console.error(`An error occurred while deleting the document: ${error}`);
    return { error: "Unexpected error 501" };
  }
}
export async function modifyTradesDueToRecalculate(trades: any, tradeType: any) {
  const database = client.db("trades_v_2");

  let operations = trades.map((trade: any) => {
    // Start with the known filters
    let filters: any = [];

    // If "ISIN", "BB Ticker", or "Issue" exists, check for both the field and "Location"

    filters.push({
      _id: new ObjectId(trade["_id"].toString()),
    });

    return {
      updateOne: {
        filter: { $or: filters },
        update: { $set: trade },
        upsert: false,
      },
    };
  });

  // Execute the operations in bulk
  try {
    const historicalReportCollection = database.collection(tradeType);
    let action = await historicalReportCollection.bulkWrite(operations);
    console.log(action);
    return action;
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "modifyTradesDueToRecalculate", "controllers/operations/operations.ts");

    return "";
  }
}
export async function allTrades(start: any, end: any): Promise<CentralizedTrade[]> {
  try {
    const database = client.db("trades_v_2");
    const reportCollection1 = database.collection("vcons");
    const reportCollection2 = database.collection("ib");
    const reportCollection3 = database.collection("emsx");
    const query = {
      timestamp: {
        $gte: new Date(start).getTime() - 5 * 24 * 60 * 60 * 1000, // Greater than or equal to "from" timestamp
        $lte: new Date(end).getTime() + 5 * 24 * 60 * 60 * 1000, // Less than or equal to "to" timestamp
      },
    };
    const document1 = await reportCollection1.find(query).toArray();
    const document2 = await reportCollection2.find(query).toArray();
    const document3 = await reportCollection3.find(query).toArray();
    let document = [...document1.sort((a: any, b: any) => new Date(a["Trade Date"]).getTime() - new Date(b["Trade Date"]).getTime()), ...document2.sort((a: any, b: any) => new Date(a["Trade Date"]).getTime() - new Date(b["Trade Date"]).getTime()), ...document3.sort((a: any, b: any) => new Date(a["Trade Date"]).getTime() - new Date(b["Trade Date"]).getTime())];
    for (let index = 0; index < document.length; index++) {
      let trade = document[index];
      if (!trade["BB Ticker"] && trade["Issue"]) {
        trade["BB Ticker"] = trade["Issue"];
        delete trade["Issue"];
      }
    }
    return document;
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "Get Vcons", "controllers/operations/mufgOperations.ts");
    return [];
  }
}

export async function allTradesCDS(start: any, end: any): Promise<CentralizedTrade[]> {
  try {
    const database = client.db("trades_v_2");
    const reportCollection1 = database.collection("gs");
    const query = {
      timestamp: {
        $gte: new Date(start).getTime() - 5 * 24 * 60 * 60 * 1000, // Greater than or equal to "from" timestamp
        $lte: new Date(end).getTime() + 5 * 24 * 60 * 60 * 1000, // Less than or equal to "to" timestamp
      },
    };
    const document1 = await reportCollection1.find(query).toArray();
    let document = [...document1.sort((a: any, b: any) => new Date(a["Trade Date"]).getTime() - new Date(b["Trade Date"]).getTime())];
    for (let index = 0; index < document.length; index++) {
      let trade = document[index];
      if (!trade["BB Ticker"] && trade["Issue"]) {
        trade["BB Ticker"] = trade["Issue"];
        delete trade["Issue"];
      }
    }
    return document;
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "Get Vcons", "controllers/operations/mufgOperations.ts");
    return [];
  }
}

export async function getTriadaTrades(tradeType: any, fromTimestamp: number | null = 0, toTimestamp: number | null = 0) {
  const database = client.db("trades_v_2");

  let options: any = [];

  // If both timestamps are provided, use them to filter the results
  if (fromTimestamp !== null && toTimestamp !== null) {
    options.push({ timestamp: { $gte: fromTimestamp, $lte: toTimestamp } });
    // If only fromTimestamp is provided
  } else if (fromTimestamp !== null) {
    options.push({ timestamp: { $gte: fromTimestamp } });
    // If only toTimestamp is provided
  } else if (toTimestamp !== null) {
    options.push({ timestamp: { $lte: toTimestamp } });
  }

  let query: any = {};

  // If there are any timestamp options, use them in the query
  if (options.length > 0) {
    query.$and = options;
  }

  let reportCollection = await database.collection(`${tradeType}`).find(query).toArray();
  if (fromTimestamp && toTimestamp) {
    reportCollection = reportCollection.filter((trade: any, index: any) => {
      // Include trade if tradeDate property does not exist

      // Convert tradeDate to a timestamp if necessary
      const tradeDateTimestamp = new Date(trade["Trade Date"]).getTime();

      // Check if tradeDate falls within the specified range
      return tradeDateTimestamp >= fromTimestamp && tradeDateTimestamp <= toTimestamp;
    });
  }
  for (let index = 0; index < reportCollection.length; index++) {
    let trade = reportCollection[index];
    trade["Trade App Status"] = "uploaded_to_app";
    trade["BB Ticker"] = trade["BB Ticker"] ? trade["BB Ticker"] : trade["Issue"];
    trade["Notional Amount"] = trade["Notional Amount"] && parseFloat(trade["Notional Amount"]) != 0 ? trade["Notional Amount"] : trade["Quantity"];
    delete trade["_id"];
    delete trade["Quantity"];
    delete trade["Issue"];
    delete trade["timestamp"];
  }
  return reportCollection;
}
export async function addNewTrade(data: any): Promise<any> {
  try {
    const database = client.db("trades_v_2");
    const reportCollection = database.collection("new_trades");
    // Insert the new document into the collection
    const insertResult = await reportCollection.insertOne(data);

    // The insertOne operation returns an InsertOneResult object
    // You can check the result by inspecting `insertedCount` and `insertedId`
    if (insertResult.insertedCount === 0) {
      return { error: "Failed to insert document" };
    }

    return { success: true, insertedId: insertResult.insertedId, error: null };
  } catch (error: any) {
    return { error: error.message }; // Return the error message
  }
}

export async function numberOfNewTrades(): Promise<any> {
  try {
    const database = client.db("trades_v_2");
    const reportCollection = database.collection("new_trades");

    // Define the query to count documents with 'Resolved' equal to an empty string
    const query = { Resolved: "False" };

    // Count the documents that match the query
    const stats = await reportCollection.countDocuments(query);
    return stats;
    // The insertOne operation returns an InsertOneResult object
  } catch (error: any) {
    return { error: error.message }; // Return the error message
  }
}

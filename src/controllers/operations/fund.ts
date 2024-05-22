const ObjectId = require("mongodb").ObjectId;

import { getDateTimeInMongoDBCollectionFormat, monthlyRlzdDate } from "../reports/common";
import { client } from "../auth";
import { FundDetails } from "../../models/portfolio";
import { getEarliestCollectionNameFund } from "../reports/portfolios";
import { insertEditLogs } from "./logs";
import { compareMonths } from "./tools";

export async function getFundDetails(date: string): Promise<FundDetails | {}> {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    let test = await getEarliestCollectionNameFund(date);
    // console.log(test, date);
    let documents = await reportCollection.find({ month: test }).toArray();
    return documents;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getFundDetails", "controllers/operations/operations.ts");

    return {};
  }
}

export async function getAllFundDetails(date: string): Promise<FundDetails[]> {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    let documents = await reportCollection.find().toArray();
    return documents.sort(compareMonths);
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getAllFundDetails", "controllers/operations/operations.ts");

    return [];
  }
}

export async function editFund(data: any): Promise<any> {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    const id = new ObjectId(data["_id"]);
    const updates = {} as any;
    const tableTitles = ["month", "nav", "holdBackRatio", "a2 price", "borrowing amount", "expenses"];

    // Build the updates object based on `data` and `tableTitles`
    for (const title of tableTitles) {
      if (data[title] !== "" && data[title] != null) {
        updates[title] = data[title];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No valid fields to update");
    }
    console.log(id);
    // Update the document with the built updates object
    const updateResult = await reportCollection.updateOne({ _id: id }, { $set: updates });

    if (updateResult.matchedCount === 0) {
      return { error: "Document does not exist" };
    } else if (updateResult.modifiedCount === 0) {
      return { error: "Document not updated. It may already have the same values" };
    }

    return updateResult;
  } catch (error: any) {
    return { error: error.message }; // Return the error message
  }
}
export async function deleteFund(data: any): Promise<any> {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    const id = new ObjectId(data["_id"]);

    // Update the document with the built updates object
    const updateResult = await reportCollection.deleteOne({ _id: id });

    if (updateResult.matchedCount === 0) {
      return { error: "Document does not exist" };
    } else if (updateResult.modifiedCount === 0) {
      return { error: "Document not updated. It may already have the same values" };
    }

    return updateResult;
  } catch (error: any) {
    return { error: error.message }; // Return the error message
  }
}

export async function addFund(data: any): Promise<any> {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    const newFundData = {} as any;
    const tableTitles = ["month", "nav", "holdBackRatio", "a2 price", "borrowing amount", "expenses"];

    // Build the newFundData object based on `data` and `tableTitles`
    for (const title of tableTitles) {
      if (data[title] !== undefined && data[title] !== null) {
        newFundData[title] = data[title];
      }
    }

    // You might want to check if all required fields are present
    // if some fields are mandatory e.g.,
    if (!newFundData.month || !newFundData.nav) {
      return { error: "missing params" };
    }

    // Insert the new document into the collection
    const insertResult = await reportCollection.insertOne(newFundData);

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

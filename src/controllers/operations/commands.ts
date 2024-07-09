import { ObjectId } from "mongodb";
import { client } from "../userManagement/auth";

export async function editFactSheetDisplay(data: any): Promise<any> {
  try {
    const database = client.db("commands");
    const reportCollection = database.collection("factsheet");
    const command = data["command"];
    const updates = {} as any;
    const tableTitles = ["disabled"];
    // Build the updates object based on `data` and `tableTitles`
    for (const title of tableTitles) {
      if (data[title] !== "" && data[title] != null) {
        updates[title] = data[title];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new Error("No valid fields to update");
    }
    // Update the document with the built updates object
    const updateResult = await reportCollection.updateOne({ command: command }, { $set: updates }, { upsert: true });

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

export async function getFactSheetDisplay(commandId: string): Promise<any> {
  try {
    const database = client.db("commands");
    const reportCollection = database.collection("factsheet");

    // Find the document based on the command ObjectId
    const document = await reportCollection.findOne({ command: commandId });

    if (document) {
      return document.disabled;
    } else {
      return true;
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

import { client } from "../userManagement/auth";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { errorEmailALert } from "./errorEmail";
import { ObjectId } from "mongodb";

export async function insertEditLogs(changes: any[], type: string, dateTime: string, editNote: string, identifier: string) {
  let object = {
    changes: changes,
    type: type,
    dateTime: dateTime,
    editNote: editNote,
    identifier: identifier,
    timestamp: new Date().getTime(),
  };

  const database = client.db("edit_logs");
  const reportCollection = database.collection(`${type}`);
  try {
    const result = await reportCollection.insertOne(object);
    if (type == "Errors") {
      let errorEmail = { errorMessage: changes[0], functionName: editNote, location: identifier, date: dateTime };

      let test = await errorEmailALert(errorEmail);
    }
    return result;
  } catch (err) {
    console.error(`Failed to insert item: ${err}`);
  }
}

export async function getEditLogs(logsType: any) {
  try {
    const database = client.db("edit_logs");
    const reportCollection = database.collection(`${logsType}`);
    let documents = await reportCollection.find().sort({ dateTime: -1 }).toArray();
    return documents;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getEditLogs", "controllers/operations/operations.ts");

    return [];
  }
}
export async function updateEditLogs(logsType: any, logs: any[]) {
  try {
    const database = client.db("edit_logs");
    const reportCollection = database.collection(`${logsType}`);

    // Prepare bulk operations
    const bulkOperations = logs.map((log) => {
      const { _id, ...restLogs } = log;
      const objectId = typeof _id === "string" ? new ObjectId(_id) : _id;
      return {
        updateOne: {
          filter: { _id: objectId },
          update: { $set: restLogs },
          upsert: false, // Set to true if you want to insert the document if it doesn't exist
        },
      };
    });

    // Perform bulk write
    const result = await reportCollection.bulkWrite(bulkOperations);

    return { message: "Logs updated successfully", result };
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "updateEditLogs", "controllers/operations/operations.ts");

    return { error: errorMessage };
  }
}

import { ObjectId } from "mongodb";
import { client } from "../userManagement/auth";

export async function addFactSheet(data: any, name: any): Promise<any> {
  try {
    const database = client.db("factsheet");
    const reportCollection = database.collection(name);

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

export async function editFactSheet(data: any, name: any, param: any): Promise<any> {
  try {
    const database = client.db("factsheet");
    const reportCollection = database.collection(name);

    // Extract the ID and the rest of the data
    const { id, ...updateData } = data;

    if (id) {
      // Fetch the original document
      const originalDoc = await reportCollection.findOne({ _id: new ObjectId(id) });
      if (!originalDoc) {
        return { error: "No document found with the provided ID" };
      }
      // Modify the original document with the provided data
      const updatedDoc = { ...originalDoc };

      for (const key in updateData) {
        if (key === "data" && typeof updateData[key] === "object") {
          for (const subKey in updateData[key]) {
            updatedDoc.data[subKey] = updateData[key][subKey];
          }
        } else {
          updatedDoc[key] = updateData[key];
        }
      }

      // Update the document in the collection
      const updateResult = await reportCollection.replaceOne({ _id: new ObjectId(id) }, updatedDoc);

      // The replaceOne operation returns an UpdateResult object
      // You can check the result by inspecting `matchedCount` and `modifiedCount`
      if (updateResult.matchedCount === 0) {
        return { error: "No document found with the provided ID" };
      }

      return { success: true, matchedCount: updateResult.matchedCount, modifiedCount: updateResult.modifiedCount, error: null };
    } else {
      let fullDate = data.month.split("/");

      let newRow: any = { date: data.month, data: {}, timestamp: new Date(fullDate[0] + "/01/" + fullDate[1]).getTime() };
      newRow.data[param] = parseFloat(data.price);
      let result = await addFactSheet(newRow, name);
    }
  } catch (error: any) {
    return { error: error.message }; // Return the error message
  }
}
export async function deleteFactSheet(data: any, name: any): Promise<any> {
  try {
    const database = client.db("factsheet");
    const reportCollection = database.collection(name);
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

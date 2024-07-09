const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();

import { getDateTimeInMongoDBCollectionFormat, monthlyRlzdDate } from "../reports/common";
import { client } from "../userManagement/auth";
import { insertEditLogs } from "./logs";
import { compareMonths } from "./tools";
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.SECRET;

const SibApiV3Sdk = require("sib-api-v3-sdk");
SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey = process.env.SEND_IN_BLUE_API_KEY;

export async function getLinks(): Promise<any> {
  try {
    const database = client.db("auth");
    const reportCollection = database.collection("links");
    // console.log(test, date);
    let documents = await reportCollection.find().toArray();
    return documents;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getLinks", "controllers/operations/operations.ts");

    return {};
  }
}

export async function editLink(data: any): Promise<any> {
  try {
    const database = client.db("auth");
    const reportCollection = database.collection("links");
    const id = new ObjectId(data["_id"]);
    const updates = {} as any;
    const tableTitles = ["name"];

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
export async function deleteLink(data: any): Promise<any> {
  try {
    const database = client.db("auth");
    const reportCollection = database.collection("links");
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

export async function addLink(data: any): Promise<any> {
  try {
    const database = client.db("auth");
    const reportCollection = database.collection("links");
    const newData = {} as any;
    const tableTitles = ["name", "accessRight", "email"];
    // Build the newData object based on `data` and `tableTitles`
    for (const title of tableTitles) {
      if (data[title] !== undefined && data[title] !== null) {
        newData[title] = data[title];
      }
    }
    const jwtObject = { name: data["name"], accessRole: "member (factsheet report)", shareClass: data["accessRight"], link: true };
    const token = jwt.sign(jwtObject, jwtSecret, { expiresIn: "30d" });
    let base = "https://admin.triadacapital.com/links-redirect?token=" + token;
    newData["link"] = base;
    newData["token"] = token;
    newData["createdOn"] = getDateTimeInMongoDBCollectionFormat(new Date());
    newData["expiration"] = getDateTimeInMongoDBCollectionFormat(new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000));
    newData["accessRole"] = "member (factsheet report)";
    // You might want to check if all required fields are present
    // if some fields are mandatory e.g.,

    // Insert the new document into the collection
    const insertResult = await reportCollection.insertOne(newData);
    let email = newData["email"];
    let name = newData["name"];
    let result = await sendLinkEmail({ email, name, link: base });
    console.log(result);
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
export async function sendLinkEmail({ email, name, link }: { email: any; name: any; link: any }) {
  try {
    let action = new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
      sender: { email: "reporting@triadacapital.com", name: "Triada IR Team" },
      subject: `Admin Triada - Invitation `,
      htmlContent: "<!DOCTYPE html><html><body><p>Invitation .</p></body></html>",
      params: {
        greeting: "Hello " + name,
        headline: `Access to Triada Capital Investment Documentation`,
      },
      messageVersions: [
        {
          to: [
            {
              email: email,
            },
          ],

          htmlContent: `<!DOCTYPE html><html><body>Dear ${name},<br />
                      <p>Please see below Triada monthly factsheet with analytics.<br /><br />
                      <b>Access Details:</b>
                      <ul>
                      <li><b>Link: </b><a href="${link}">Triada shares factsheet with analytical tables</a></li>
                      </ul><br />
                      Please note, this access will expire in 30 days.
                      <br /><br /> For additional support or inquiries, please do not reply to this automated message. Instead, contact us directly at jm@triadacapital.com <br/><br/> </p> Thank you,<br /><br />Triada IR Team</body></html>`,
          subject: `Access to Triada Capital Investment Documentation`,
        },
      ],
    });
    return { statusCode: 200 };
  } catch (error) {
    return error;
  }
}

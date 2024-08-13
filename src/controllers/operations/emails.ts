import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { insertEditLogs } from "./logs";

const axios = require("axios");
const xlsx = require("xlsx");

require("dotenv").config();

const SibApiV3Sdk = require("sib-api-v3-sdk");
SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey = process.env.SEND_IN_BLUE_API_KEY;

export async function errorEmailALert({ errorMessage, functionName, location, date }: { errorMessage: any; functionName: any; location: any; date: any }) {
  try {
    let email = new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
      sender: { email: "developer@triadacapital.com", name: "Developer Triada" },
      subject: `Error Function: ${functionName} on ${date}`,
      htmlContent: "<!DOCTYPE html><html><body><p>Error .</p></body></html>",
      params: {
        greeting: "Please review error logs",
        headline: `Error Function: ${functionName} on ${date}`,
      },
      messageVersions: [
        //Definition for Message Version 1
        {
          to: [
            {
              email: "developer@triadacapital.com",
            },
          ],
          htmlContent:
            `<!DOCTYPE html><html><body>Hi team,<br /><br />
                    <p>Please review error logs. Function: ${functionName} Location: ${location} on ${date}. Error Message: ` +
            errorMessage +
            ` </p> Thanks,<br /><br /> Developer</body></html>`,
          subject: `Error Function: ${functionName} on ${date}`,
        },
      ],
    });
    return { statusCode: 200 };
  } catch (error) {
    return error;
  }
}
export async function sendUpdateEmail({ email, content, subject, attachment }: { email: any; content: any; subject: any; attachment: { url: string }[] }) {
  try {
    let object: any = {
      sender: { email: "jm@triadacapital.com", name: "Jean-Marie Barreau" },
      subject: subject,
      htmlContent: "<!DOCTYPE html><html><body><p>Error .</p></body></html>",
      params: {
        greeting: "Please review error logs",
      },
      messageVersions: [
        //Definition for Message Version 1
        {
          to: [
            {
              email: email,
            },
          ],
          htmlContent: content,
          subject: subject,
        },
      ],
    };
    if (attachment.length) {
      object.attachment = attachment;
    }
    let emailAction = new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail(object);
    return { statusCode: 200 };
  } catch (error) {
    console.error("Error connecting to MongoDB or inserting documents:", error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    await insertEditLogs([errorMessage], "Errors", dateTime, "errorEmailFactSheetUser", "controllers/operation/emails.ts");
  }
}

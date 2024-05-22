import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { getDateAndOneWeekLater } from "./tools";

const axios = require("axios");
const xlsx = require("xlsx");

require("dotenv").config();

const SibApiV3Sdk = require("sib-api-v3-sdk");
SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey = process.env.SEND_IN_BLUE_API_KEY;

export async function errorEmailALert({ errorMessage, functionName, location, date }: { errorMessage: any; functionName: any; location: any; date: any }) {
  try {
    let email = new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
      sender: { email: "developer.triada@gmail.com", name: "Developer Triada" },
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
              email: "developer.triada@gmail.com",
            },
          ],
          cc: [
            {
              email: "alaa.abukmeil@triadacapital.com",
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

export async function sendRegsiterationEmail({ email, password, name }: { email: any; password: any; name: any }) {
  try {
    let date = getDateAndOneWeekLater();
    let action = new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
      sender: { email: "developer.triada@gmail.com", name: "Developer Triada" },
      subject: `Admin Triada - Invitation `,
      htmlContent: "<!DOCTYPE html><html><body><p>Invitation .</p></body></html>",
      params: {
        greeting: "Hello " + name,
        headline: `Admin Triada Account Set Up`,
      },
      messageVersions: [
        {
          to: [
            {
              email: email,
            },
          ],
          cc: [
            {
              email: "alaa.abukmeil@triadacapital.com",
            },
          ],
          htmlContent:
            `<!DOCTYPE html><html><body>Hello ${name},<br />
                    <p>An Admin Triada Account was created under the email: ${email} with password: ${password} <br /><br /> Please login with the provided credentials and reset your password between ${date.startDate} -> ${date.endDate} . Otherwise, your account will be deleted. ` + ` </p> Thanks,<br /><br /> Developer</body></html>`,
          subject: `Admin Triada - Invitation `,
        },
      ],
    });
    return { statusCode: 200 };
  } catch (error) {
    return error;
  }
}

export async function sendEmailToResetPassword(userEmail: string, verificationCode: string) {
  try {
    let email = new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
      sender: { email: "developer.triada@gmail.com", name: "Triada Capital" },
      subject: "Reset Your Password",
      htmlContent: "<!DOCTYPE html><html><body><p>Reset your Triada Account Password.</p></body></html>",
      params: {
        greeting: "Hello there!",
        headline: "Reset Your Password",
      },
      messageVersions: [
        //Definition for Message Version 1
        {
          to: [
            {
              email: userEmail,
            },
          ],
          htmlContent: "<!DOCTYPE html><html><body><p>Hello there, <br /> Your verification code is " + verificationCode + ". <br /> <br /> If you have not asked to reset your Triada Capital account's password, please ignore this email. <br /><br /> Cheers!<br /> Developer</p></body></html>",
          subject: "Reset Your Password",
        },
      ],
    });
    return { statusCode: 200 };
  } catch (error) {
    return error;
  }
}

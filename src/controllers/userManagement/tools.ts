import { platform } from "../common";
import { getDateAndOneWeekLater } from "../operations/tools";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";

const axios = require("axios");
const xlsx = require("xlsx");

require("dotenv").config();

const SibApiV3Sdk = require("sib-api-v3-sdk");
SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey = process.env.SEND_IN_BLUE_API_KEY;

export function generateRandomIntegers(n = 5, min = 1, max = 10) {
  let resetCode = "";
  for (let i = 0; i < n; i++) {
    resetCode += Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return resetCode;
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
                      <p>An Admin Triada Account was created under the email: ${email} with password: ${password} <br /><br /> Please login with the provided credentials and reset your password between ${date.startDate} -> ${date.endDate} . Otherwise, your account will be deleted. <br /><br /> Platform Link:  ${platform}` + ` </p> Thanks,<br /><br /> Developer</body></html>`,
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

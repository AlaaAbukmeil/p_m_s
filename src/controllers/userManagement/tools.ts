import { generateRandomString, platform } from "../common";
import { getDateAndOneWeekLater } from "../operations/tools";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";

const axios = require("axios");
const xlsx = require("xlsx");

require("dotenv").config();

const SibApiV3Sdk = require("sib-api-v3-sdk");
SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey = process.env.SEND_IN_BLUE_API_KEY;
const multerGoogleStorage = require("multer-google-storage");
const multer = require("multer");
const path = require("path");
const { Storage } = require("@google-cloud/storage");
process.env.GOOGLE_APPLICATION_CREDENTIALS;
export const uploadToBucket = multer({
  storage: multerGoogleStorage.storageEngine({
    autoRetry: true,
    bucket: process.env.BUCKET,
    projectId: process.env.PROJECTID,
    keyFilename: process.env.KEYPATHFILE,

    filename: (req: Request, file: any, cb: (err: boolean, fileName: string) => void) => {
      cb(false, `v2/${generateRandomString(6)}_${file.originalname.replace(/[!@#$%^&*(),?":{}|<>/\[\]\\;'\-=+`~ ]/g, "_")}`);
    },
  }),
});
export const uploadToBucketPublic = multer({
  storage: multerGoogleStorage.storageEngine({
    autoRetry: true,
    bucket: process.env.BUCKET_PUBLIC,
    projectId: process.env.PROJECTID,
    keyFilename: process.env.KEYPATHFILE,

    filename: (req: Request, file: any, cb: (err: boolean, fileName: string) => void) => {
      cb(false, `v2/${generateRandomString(6)}_${file.originalname.replace(/[!@#$%^&*(),?":{}|<>/\[\]\\;'\-=+`~ ]/g, "_")}`);
    },
  }),
});

const storage = new Storage();
export const multerTest = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // no larger than 5mb, you can change as needed.
  },
});
export const bucketPublicTest = storage.bucket(process.env.BUCKET_PUBLIC);

export function generateRandomIntegers(n = 5, min = 1, max = 10) {
  let resetCode = "";
  for (let i = 0; i < n; i++) {
    resetCode += Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return resetCode;
}

export async function sendRegsiterationEmail({ email, name, resetCode }: { email: any; name: any; resetCode: string }) {
  try {
    let date = getDateAndOneWeekLater();
    let action = new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
      sender: { email: "IR@triadacapital.com", name: "Developer Triada" },
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
          htmlContent: `<!DOCTYPE html><html><body>Hello ${name},<br />
                      <p>A Triada Account was created under the email: ${email}. <br /><br /> Please login with the provided credentials and reset your password between ${date.startDate} -> ${date.endDate} . Otherwise, your account will be deleted. <br /><br /> Platform Link:  ${platform}&email=${email} </p><br /><br /> Verification Code: ${resetCode} <br />< br/> Thanks,<br /><br /> Developer</body></html>`,
          subject: `Admin Triada - Invitation `,
        },
      ],
    });
    return { statusCode: 200 };
  } catch (error) {
    return error;
  }
}

export async function sendWelcomeEmail({ email, name, resetCode }: { email: any; name: any; resetCode: any }) {
  try {
    let date = getDateAndOneWeekLater();
    let action = new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
      sender: { email: "jm@triadacapital.com", name: "Jean-Marie Barreau" },
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

          htmlContent: `<!DOCTYPE html><html><body>Dear ${name},<br />
                      <p>Starting this month (with the Triada May 2024 Factsheet), we will provide a monthly updated factsheet for the share class in which you are invested through our new web platform. Your username is your email address: ${email}. You will only need to reset your password by clicking on this link: <a href="${platform}&email=${email}">Triada Capital Platform</a><br/><br/>Your verification code is ${resetCode}<br /><br />
                      Going forward, we will post monthly factsheets, quarterly reports, and other documentation related to the fund using this new Triada web platform. <br /><br /> Please do not reply to this email, This is an automated message. Please email jm@triadacapital.com seperatly if you have any questions. <br/><br/> </p> Thank you,<br /><br />JM</body></html>`,
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
      sender: { email: "developer@triadacapital.com", name: "Triada Capital" },
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
          htmlContent: "<!DOCTYPE html><html><body><p>Hello there, <br /> <br /> Your verification code is " + verificationCode + "<br /> <br /> If you have not asked to reset your Triada Capital account's password, please ignore this email. <br /><br /> Thank you!<br /><br /> Triada's Developement Team</p></body></html>",
          subject: "Reset Your Password",
        },
      ],
    });
    return { statusCode: 200 };
  } catch (error) {
    return error;
  }
}

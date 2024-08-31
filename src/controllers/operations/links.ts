const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();

import { getDateTimeInMongoDBCollectionFormat, monthlyRlzdDate } from "../reports/common";
import { insertEditLogs } from "./logs";
import { authPool } from "./psql/operation";
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.SECRET;
const { v4: uuidv4 } = require("uuid");

const SibApiV3Sdk = require("sib-api-v3-sdk");
SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey = process.env.SEND_IN_BLUE_API_KEY;

export async function getLinks(): Promise<any> {
  try {
    const client = await authPool.connect();

    try {
      const res = await client.query("SELECT * FROM public.auth_links");
      return res.rows;
    } finally {
      client.release();
    }
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getLinks", "controllers/operations/operations.ts");

    return {};
  }
}

export async function deleteLink(data: any): Promise<any> {
  try {
    const client = await authPool.connect();

    try {
      const deleteQuery = `
        DELETE FROM public.auth_links
        WHERE id = $1
      `;

      const result = await client.query(deleteQuery, [data["id"]]);

      if (result.rowCount === 0) {
        return { error: "Document does not exist" };
      }

      return { success: "Document deleted successfully" };
    } finally {
      client.release();
    }
  } catch (error: any) {
    return { error: error.message }; // Return the error message
  }
}

export async function addLink(data: { email: string; name: string; share_class: string }, route: string): Promise<any> {
  const client = await authPool.connect();

  try {
    const jwtObject = {
      name: data["name"],
      accessRole: "member (factsheet report)",
      shareClass: data["share_class"],
      link: true,
    };
    const token = jwt.sign(jwtObject, jwtSecret, { expiresIn: "30d" });
    const base = `https://admin.triadacapital.com/links-redirect${route}?token=${token}`;
    const id = uuidv4();

    const newData = {
      email: data["email"],
      password: null,
      share_class: data["share_class"],
      access_role_portfolio: null,
      access_role_instance: "member (factsheet report)",
      last_time_accessed: "",
      reset_password: null,
      created_on: getDateTimeInMongoDBCollectionFormat(new Date()),
      type: "link",
      name: data["name"],
      link: base,
      expiration: getDateTimeInMongoDBCollectionFormat(new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000)),
      token: token,
      id: id,
    };

    const insertQuery = `
      INSERT INTO public.auth_links (
        email, password, share_class, access_role_portfolio, access_role_instance,
        last_time_accessed, reset_password, created_on, type, name, link, expiration, token, id, route
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `;

    const values = [newData.email, newData.password, newData.share_class, newData.access_role_portfolio, newData.access_role_instance, newData.last_time_accessed, newData.reset_password, newData.created_on, newData.type, newData.name, newData.link, newData.expiration, newData.token, newData.id, route];

    const result = await client.query(insertQuery, values);

    if (result.rowCount === 0) {
      return { error: "Failed to insert document" };
    }

    return { success: true, insertedId: result.rows[0].id, error: null };
  } catch (error: any) {
    return { error: error.message }; // Return the error message
  } finally {
    client.release();
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

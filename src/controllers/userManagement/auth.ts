require("dotenv").config();

import { ObjectId } from "mongodb";
import { uri } from "../common";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { insertEditLogs } from "../operations/logs";
import { copyFileSync } from "fs";
import { generateRandomIntegers, sendEmailToResetPassword, sendWelcomeEmail } from "./tools";
import { authPool } from "../operations/psql/operation";
import { UserAuth } from "../../models/auth";

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.SECRET;
const bcrypt = require("bcrypt");
const { MongoClient, ServerApiVersion } = require("mongodb");
const saltRounds: any = process.env.SALT_ROUNDS;
const { v4: uuidv4 } = require("uuid");

export const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

mongoose.connect(uri, {
  useNewUrlParser: true,
});

const SibApiV3Sdk = require("sib-api-v3-sdk");
SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey = process.env.SEND_IN_BLUE_API_KEY;

export async function registerUser(email: string, password: string, verificationCode: string): Promise<any> {
  try {
    const client = await authPool.connect();

    try {
      const verificationCodeDB = process.env.VERIFICATIONCODEDB;
      const salt = await bcrypt.genSalt(parseInt(saltRounds));
      const cryptedPassword = await bcrypt.hash(password, salt);
      const result = verificationCode === verificationCodeDB;

      if (result) {
        const id = uuidv4();

        const insertQuery = `
          INSERT INTO public.auth_users (
            email, password, access_role_instance, access_role_portfolio, share_class,
            last_time_accessed, reset_password, created_on, type, name, link, expiration, token, id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (email) DO NOTHING
        `;

        const values = [email, cryptedPassword, "admin", "portfolio_main", "", "", true, getDateTimeInMongoDBCollectionFormat(new Date()), "user", null, null, null, null, id];

        const result = await client.query(insertQuery, values);

        if (result.rowCount > 0) {
          return { message: "registered", status: 200 };
        } else {
          return { message: "User already exists", status: 404 };
        }
      } else {
        return { message: "Unauthorized", status: 401 };
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    return { error: error.message };
  }
}
export async function checkIfUserExists(
  email: string,
  password: string
): Promise<{
  status: 200 | 401;
  message: null | string;
  token: string | null;
  email: string | null;
  accessRole: string | null;
  shareClass: string | null;
}> {
  try {
    const client = await authPool.connect();

    try {
      const userQuery = `SELECT * FROM public.auth_users WHERE email = $1`;
      const userResult = await client.query(userQuery, [email]);

      if (userResult.rows.length > 0) {
        const user: UserAuth = userResult.rows[0];
        const result = await bcrypt.compare(password, user.password);

        if (result) {
          const jwtObject = { email: email, accessRole: user["access_role_instance"], shareClass: user["share_class"] };
          const token = jwt.sign(jwtObject, jwtSecret, { expiresIn: "7d" });

          const updateQuery = `
            UPDATE public.auth_users
            SET last_time_accessed = $1
            WHERE email = $2
          `;
          await client.query(updateQuery, [getDateTimeInMongoDBCollectionFormat(new Date()), email]);

          return {
            message: "authenticated",
            status: 200,
            token: token,
            email: email,
            accessRole: user.access_role_instance,
            shareClass: user.share_class,
          };
        } else {
          return {
            message: "Wrong Password",
            status: 401,
            token: null,
            email: null,
            accessRole: null,
            shareClass: null,
          };
        }
      } else {
        return {
          message: "user does not exist",
          status: 401,
          token: null,
          email: null,
          accessRole: null,
          shareClass: null,
        };
      }
    } finally {
      client.release();
    }
  } catch (error: any) {
    return {
      message: "unexpected error",
      status: 401,
      token: null,
      email: null,
      accessRole: null,
      shareClass: null,
    };
  }
}

export async function sendResetPasswordRequest(userEmail: string) {
  const client = await authPool.connect();
  try {
    const userQuery = `SELECT * FROM public.auth_users WHERE email = $1`;
    const userResult = await client.query(userQuery, [userEmail]);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      try {
        let resetPasswordCode = generateRandomIntegers();

        const updateQuery = `
      UPDATE public.auth_users
      SET reset_password = $1
      WHERE email = $2
    `;
        await client.query(updateQuery, [resetPasswordCode, userEmail]);
        let actionEmail: any = await sendEmailToResetPassword(user.email, resetPasswordCode);
        if (actionEmail.statusCode != 200) {
          let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());

          await insertEditLogs([`${userEmail} did not recieve email`], "errors", dateTime, "sendResetPasswordRequest", "controllers/userManagement/auth.ts");
        }
        return { status: 200, message: "Reset code has been sent to your email!", email: user.email, actionEmail: actionEmail };
      } catch (error) {
        return error;
        // handle error appropriately
      }
    } else {
      return { message: "User does not exist, please sign up!", status: 401 };
    }
  } finally {
    client.release();
  }
}

export async function resetPassword(userEmail: string, resetCode: string, enteredPassword: string): Promise<any> {
  const client = await authPool.connect();
  try {
    const userQuery = `SELECT * FROM public.auth_users WHERE email = $1`;
    const userResult = await client.query(userQuery, [userEmail]);

    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];

      try {
        const resetPasswordCode = user.reset_code;
        if (resetPasswordCode === resetCode) {
          const salt = await bcrypt.genSalt(parseInt(saltRounds));
          const cryptedPassword = await bcrypt.hash(enteredPassword, salt);

          const updateQuery = `
          UPDATE public.auth_users
          SET password = $1, reset_code = $3, reset_password = $4
          WHERE email = $2
        `;
          await client.query(updateQuery, [cryptedPassword, userEmail, "", true]);

          return {
            message: "Password Reset!",
            status: 200,
            email: user.email,
          };
        } else {
          return { message: "Code does not match", status: 401 };
        }
      } catch (error) {
        console.log({ error });
        return { message: error, status: 500 };
      }
    } else {
      return { message: "User does not exist, please sign up!", status: 401 };
    }
  } finally {
    client.release();
  }
}

export async function getAllUsers(): Promise<any[]> {
  try {
    const client = await authPool.connect();

    try {
      const query = `SELECT * FROM public.auth_users ORDER BY access_role_instance ASC, name ASC;`;
      const result = await client.query(query);
      return result.rows;
    } finally {
      client.release();
    }
  } catch (error: any) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
}

export async function checkUserRight(email: string, accessRole: string, shareClass: string): Promise<boolean> {
  const client = await authPool.connect();

  try {
    const userQuery = `
      SELECT * FROM public.auth_users 
      WHERE email = $1 AND access_role_instance = $2 AND share_class = $3
    `;
    const userResult = await client.query(userQuery, [email, accessRole, shareClass]);

    // Return true if a matching user is found, otherwise false
    return userResult.rows.length > 0;
  } finally {
    client.release();
  }
}

export async function checkLinkRight(token: string, accessRole: string, shareClass: string): Promise<boolean> {
  const client = await authPool.connect();

  try {
    const linkQuery = `
      SELECT * FROM public.auth_links
      WHERE token = $1 AND access_role_instance = $2 AND share_class = $3
    `;
    const linkResult = await client.query(linkQuery, [token, accessRole, shareClass]);

    if (linkResult.rows.length > 0) {
      const user = linkResult.rows[0];
      const currentTime = getDateTimeInMongoDBCollectionFormat(new Date());

      const updateQuery = `
        UPDATE public.auth_links
        SET last_time_accessed = $1
        WHERE id = $2
      `;
      await client.query(updateQuery, [currentTime, user.id]);

      return true;
    }
    return false;
  } finally {
    client.release();
  }
}

export async function editUser(editedUser: any): Promise<any> {
  const client = await authPool.connect();

  try {
    let userInfo = await getUser(editedUser.id);

    editedUser.email = editedUser.email.toLowerCase();
    if (userInfo) {
      let beforeModify = { ...userInfo };

      let userKeys = ["name", "access_role_instance", "share_class"];
      let changes = 0;
      let changesText = [];

      for (let key of userKeys) {
        if (editedUser[key] !== "" && editedUser[key] !== undefined) {
          changesText.push(`${key} changed from ${userInfo[key]} to ${editedUser[key]}`);
          userInfo[key] = editedUser[key];
          changes++;
        }
      }

      if (changes === 0) {
        return { error: "The User is still the same." };
      }

      const dateTime = new Date().toISOString();
      await insertEditLogs(changesText, "edit_user", dateTime, userInfo["Edit Note"], `${userInfo.email} ${userInfo.name}`);

      const updateQuery = `
        UPDATE public.auth_users
        SET name = $1, access_role_instance = $2, share_class = $3
        WHERE id = $4;
      `;
      const values = [userInfo.name, userInfo.access_role_instance, userInfo.share_class, userInfo.id];

      const result = await client.query(updateQuery, values);

      if (result.rowCount > 0) {
        return { error: null };
      } else {
        return { error: "unexpected error, please contact Triada team" };
      }
    } else {
      return { error: "User does not exist, please refresh the page!" };
    }
  } catch (error: any) {
    const dateTime = new Date().toISOString();
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "editUser", "src/controllers/auth.ts");
  } finally {
    client.release();
  }
}

export async function getUser(userId: string): Promise<any> {
  const client = await authPool.connect();

  try {
    const userQuery = `
      SELECT * FROM public.auth_users
      WHERE id = $1
    `;
    const result = await client.query(userQuery, [userId]);

    // Return the first result if available
    return result.rows[0] || null;
  } catch (error) {
    console.error("An error occurred while retrieving data from PostgreSQL:", error);
    return null;
  } finally {
    client.release();
  }
}

export async function getUserByEmail(email: string): Promise<any> {
  const client = await authPool.connect();

  try {
    const userQuery = `
      SELECT * FROM public.auth_users
      WHERE email = $1
    `;
    const result = await client.query(userQuery, [email]);

    // Return the first result if available
    return result.rows[0] || null;
  } catch (error) {
    console.error("An error occurred while retrieving data from PostgreSQL:", error);
    return null;
  } finally {
    client.release();
  }
}

export async function deleteUser(userId: string, userName: string, userEmail: string): Promise<any> {
  const client = await authPool.connect();

  try {
    const deleteQuery = `
      DELETE FROM public.auth_users
      WHERE id = $1
    `;
    const result = await client.query(deleteQuery, [userId]);

    if (result.rowCount === 0) {
      return { error: "User does not exist!" };
    } else {
      const dateTime = new Date().toISOString();
      await insertEditLogs(["deleted"], "delete_user", dateTime, "deleted", `${userName} ${userEmail}`);
      return { error: null };
    }
  } catch (error) {
    console.error(`An error occurred while deleting the user: ${error}`);
    return { error: "Unexpected error 501" };
  } finally {
    client.release();
  }
}

export async function addUser({ email, name, access_role_instance, access_role_portfolio, share_class, welcome }: { email: string; name: string; access_role_instance: string; access_role_portfolio: string; share_class: string; welcome: boolean }): Promise<any> {
  const client = await authPool.connect();

  try {
    email = email.toLowerCase();
    const password = uuidv4();
    const salt = await bcrypt.genSalt(parseInt(saltRounds));
    const cryptedPassword = await bcrypt.hash(password, salt);

    const userQuery = `
      SELECT * FROM public.auth_users
      WHERE email = $1
    `;
    const userResult = await client.query(userQuery, [email]);

    if (userResult.rows.length === 0) {
      const resetPasswordCode = generateRandomIntegers();
      const id = uuidv4();

      const insertQuery = `
        INSERT INTO public.auth_users (
          email, password, access_role_instance, share_class, created_on,
          reset_password, reset_code, name, id, access_role_portfolio, last_time_accessed, type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `;
      const values = [email, cryptedPassword, access_role_instance, share_class, getDateTimeInMongoDBCollectionFormat(new Date()), false, resetPasswordCode, name, id, access_role_portfolio, "", "user"];

      await client.query(insertQuery, values);

      let emailRegisteration = await sendWelcomeEmail({ email: email, name: name, resetCode: resetPasswordCode });
      await sendWelcomeEmail({ email, name, resetCode: resetPasswordCode });

      return { message: "registered", status: 200, error: "" };
    } else {
      return { error: "user already exists", status: 404 };
    }
  } catch (error: any) {
    console.error("An error occurred:", error);
    return { error: "unauthorized", status: 401 };
  } finally {
    client.release();
  }
}
export function checkPasswordStrength(password: any) {
  // Regular expressions to check for different character types
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = /[\W_]/.test(password); // \W matches any non-word character, _ includes underscore
  const isLongEnough = password.length >= 8;

  // Check if all conditions are met
  if (hasUppercase && hasLowercase && hasDigit && hasSpecialChar && isLongEnough) {
    return true;
  }

  // Collect missing conditions
  let missingConditions = [];
  if (!hasUppercase) missingConditions.push("Uppercase Letter");
  if (!hasLowercase) missingConditions.push("Lowercase Letter");
  if (!hasDigit) missingConditions.push("Digit");
  if (!hasSpecialChar) missingConditions.push("Special Character");
  if (!isLongEnough) missingConditions.push("Minimum Length of 8 Characters");

  // Create a description string of missing conditions
  let description = "Password is missing the following conditions: " + missingConditions.join(", ") + ".";

  // Return the description string
  return description;
}

export async function updateUser(userInfo: any, newFileNames: any): Promise<any> {
  const client = await authPool.connect();

  try {
    const dateTime = new Date().toISOString();
    await insertEditLogs(newFileNames, "upload_user", dateTime, "User uploaded a new file", `${userInfo.email} ${userInfo.name}`);

    const updateQuery = `
      UPDATE public.auth_users
      SET files = $1
      WHERE id = $2
    `;
    const values = [userInfo.files, userInfo.id];

    const result = await client.query(updateQuery, values);

    if (result.rowCount > 0) {
      return { error: null };
    } else {
      return { error: "unexpected error, please contact Triada team" };
    }
  } catch (error: any) {
    const dateTime = new Date().toISOString();
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "updateUser", "src/controllers/auth.ts");
  } finally {
    client.release();
  }
}

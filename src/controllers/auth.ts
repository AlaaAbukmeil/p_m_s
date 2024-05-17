require("dotenv").config();

import { ObjectId } from "mongodb";
import { uri } from "./common";
import { getDateTimeInMongoDBCollectionFormat } from "./reports/common";
import { insertEditLogs } from "./operations/portfolio";

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.SECRET;
const bcrypt = require("bcrypt");
const { MongoClient, ServerApiVersion } = require("mongodb");
const saltRounds: any = process.env.SALT_ROUNDS;

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

export async function registerUser(email: string, password: string, verificationCode: string) {
  try {
    const database = client.db("auth");
    const usersCollection = database.collection("users");
    const secretCollection = database.collection("secrets");
    const verificationCodeDB = await secretCollection.findOne({
      function: "verificationCode",
    });
    let salt = await bcrypt.genSalt(parseInt(saltRounds));
    let cryptedPassword = await bcrypt.hash(password, salt);

    const user = await usersCollection.findOne({ email: email });
    if (user == null && verificationCode == verificationCodeDB.code) {
      const updateDoc = {
        email: email,
        password: cryptedPassword,
        accessRole: "admin",
      };
      const action = await usersCollection.insertOne(updateDoc);
      return { message: "registered", status: 200 };
    } else if (user) {
      return { message: "user already exist", status: 404 };
    } else {
      return { message: "unauthorized", status: 401 };
    }
  } catch (error) {
    return error;
  }
}
export async function checkIfUserExists(email: string, password: string): Promise<{ status: 200 | 401; message: null | string; token: string | null; email: string | null; accessRole: string | null }> {
  try {
    const database = client.db("auth");
    const usersCollection = database.collection("users");

    const user: any = await usersCollection.findOne({ email: email });
    if (user) {
      try {
        const result = await bcrypt.compare(password, user.password);
        if (result) {
          const jwtObject = { email: email, accessRole: user["accessRole"] };
          const token = jwt.sign(jwtObject, jwtSecret, { expiresIn: "24h" });
          return {
            message: "authenticated",
            status: 200,
            token: token,
            email: email,
            accessRole: user["accessRole"],
          };
        } else {
          return { message: "wrong password", status: 401, token: null, email: null, accessRole: null };
        }
      } catch (error) {
        return { message: "unexpected error", status: 401, token: null, email: null, accessRole: null };

        // handle error appropriately
      }
    } else {
      return { message: "user does not exist", status: 401, token: null, email: null, accessRole: null };
    }
  } catch (error) {
    return { message: "unexpected error", status: 401, token: null, email: null, accessRole: null };
  }
}

export async function sendResetPasswordRequest(userEmail: string) {
  const database = client.db("auth");
  const usersCollection = database.collection("users");

  const user = await usersCollection.findOne({ email: userEmail });
  if (user) {
    try {
      let resetPasswordCode = generateRandomIntegers();
      const filter = {
        email: userEmail,
      };
      const updateDoc = {
        $set: {
          resetCode: resetPasswordCode,
        },
      };
      let actionInsetResetCode = await usersCollection.updateOne(filter, updateDoc);
      let actionEmail = await sendEmailToResetPassword(user.email, resetPasswordCode);

      return { status: 200, message: "Reset code have been sent!", email: user.email };
    } catch (error) {
      return error;
      // handle error appropriately
    }
  } else {
    return { message: "User does not exist, please sign up!", status: 401 };
  }
}
export function generateRandomIntegers(n = 5, min = 1, max = 10) {
  let resetCode = "";
  for (let i = 0; i < n; i++) {
    resetCode += Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return resetCode;
}
function sendEmailToResetPassword(userEmail: string, verificationCode: string) {
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
          htmlContent: "<!DOCTYPE html><html><body><p>Hello there, <br /> Your verification code is " + verificationCode + ". <br /> <br /> If you have not asked to reset your LesGo Epic account's password, please ignore this email. <br /><br /> Cheers!<br /> LesGo Epic</p></body></html>",
          subject: "Reset Your Password",
        },
      ],
    });
    return { statusCode: 200 };
  } catch (error) {
    return error;
  }
}

export async function resetPassword(userEmail: string, resetCode: string, enteredPassword: string) {
  const database = client.db("auth");
  const usersCollection = database.collection("users");

  const user = await usersCollection.findOne({ email: userEmail });
  if (user) {
    try {
      let resetPasswordCode = user.resetCode;
      if (resetPasswordCode == resetCode) {
        let salt = await bcrypt.genSalt(parseInt(saltRounds));
        let cryptedPassword = await bcrypt.hash(enteredPassword, salt);
        const filter = {
          email: user.email,
        };
        const updateDoc = {
          $set: {
            password: cryptedPassword,
            resetCode: "",
          },
        };

        const action = await usersCollection.updateOne(filter, updateDoc);
        return {
          message: "Password Reset!",
          status: 200,
          email: user.email,
        };
      } else {
        return { message: "code does not match" };
      }
    } catch (error) {
      return error;
      // handle error appropriately
    }
  } else {
    return { message: "User does not exist, please sign up!", status: 401 };
  }
}

export async function getAllUsers() {
  const database = client.db("auth");
  const usersCollection = database.collection("users");
  const users = await usersCollection.find().toArray();

  return users;
}

export async function editUser(editedUser: any) {
  try {
    let userInfo = await getUser(editedUser["_id"]);

    if (userInfo) {
      let beforeModify = JSON.parse(JSON.stringify(userInfo));
      beforeModify["_id"] = new ObjectId(beforeModify["_id"]);

      let centralizedBlotKeys: any = ["name", "email", "accessRole"];
      let changes = 0;
      let changesText = [];
      for (let index = 0; index < centralizedBlotKeys.length; index++) {
        let key: any = centralizedBlotKeys[index];
        if (editedUser[key] != "" && editedUser[key]) {
          changesText.push(`${key} changed from ${userInfo[key]} to ${editedUser[key]} `);
          userInfo[key] = editedUser[key];

          changes++;
        }
      }
      if (!changes) {
        return { error: "The User is still the same." };
      }

      // Access the 'structure' database
      const database = client.db("auth");

      // Access the collection named by the 'customerId' parameter
      const collection = database.collection("users");

      let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      await insertEditLogs(changesText, "Edit User", dateTime, userInfo["Edit Note"], userInfo["email"] + " " + userInfo["name"]);

      let action = await collection.updateOne(
        { _id: userInfo["_id"] }, // Filter to match the document
        { $set: userInfo } // Update operation
      );

      if (action) {
        return { error: null };
      } else {
        return {
          error: "unexpected error, please contact Triada team",
        };
      }
    } else {
      return { error: "Trade does not exist, please referesh the page!" };
    }
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "editUser", "src/controllers/auth.ts");
  }
}
export async function getUser(userId: string) {
  try {
    // Connect to the MongoDB client

    // Access the 'structure' database
    const database = client.db("auth");

    // Access the collection named by the 'customerId' parameter
    const collection = database.collection("users");

    // Perform your operations, such as find documents in the collection
    // This is an example operation that fetches all documents in the collection
    // Empty query object means "match all documents"
    const options = {}; // You can set options for the find operation if needed
    const query = { _id: new ObjectId(userId) }; // Replace yourIdValue with the actual ID you're querying
    const results = await collection.find(query, options).toArray();

    // The 'results' variable now contains an array of documents from the collection
    return results[0];
  } catch (error) {
    // Handle any errors that occurred during the operation
    console.error("An error occurred while retrieving data from MongoDB:", error);
    return {};
  }
}

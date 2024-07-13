require("dotenv").config();

import { ObjectId } from "mongodb";
import { uri } from "../common";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { insertEditLogs } from "../operations/logs";
import { copyFileSync } from "fs";
import { generateRandomIntegers, sendEmailToResetPassword, sendRegsiterationEmail, sendWelcomeEmail } from "./tools";

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
    const result = await bcrypt.compare(verificationCode, verificationCodeDB.code);

    const user = await usersCollection.findOne({ email: email });
    if (user == null && result) {
      const updateDoc = {
        email: email,
        password: cryptedPassword,
        accessRole: "admin",
        createdOn: getDateTimeInMongoDBCollectionFormat(new Date()),
        resetPassword: "false",
        lastTimeAccessed: getDateTimeInMongoDBCollectionFormat(new Date()),
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
export async function checkIfUserExists(email: string, password: string): Promise<{ status: 200 | 401; message: null | string; token: string | null; email: string | null; accessRole: string | null; shareClass: string | null }> {
  try {
    const database = client.db("auth");
    const usersCollection = database.collection("users");

    const user: any = await usersCollection.findOne({ email: email });
    if (user) {
      try {
        const result = await bcrypt.compare(password, user.password);
        if (result) {
          const jwtObject = { email: email, accessRole: user["accessRole"], shareClass: user["shareClass"] };
          const token = jwt.sign(jwtObject, jwtSecret, { expiresIn: "24h" });
          const updateDoc = {
            $set: {
              lastTimeAccessed: getDateTimeInMongoDBCollectionFormat(new Date()),
            },
          };
          let action = await usersCollection.updateOne(
            { _id: user["_id"] },
            updateDoc // Filter to match the document
          );
          return {
            message: "authenticated",
            status: 200,
            token: token,
            email: email,
            accessRole: user["accessRole"],
            shareClass: user["shareClass"],
          };
        } else {
          return { message: "Wrong Password", status: 401, token: null, email: null, accessRole: null, shareClass: null };
        }
      } catch (error) {
        return { message: "unexpected error", status: 401, token: null, email: null, accessRole: null, shareClass: null };

        // handle error appropriately
      }
    } else {
      return { message: "user does not exist", status: 401, token: null, email: null, accessRole: null, shareClass: null };
    }
  } catch (error) {
    return { message: "unexpected error", status: 401, token: null, email: null, accessRole: null, shareClass: null };
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
      let actionEmail: any = await sendEmailToResetPassword(user.email, resetPasswordCode);
      if (actionEmail.statusCode != 200) {
        let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());

        await insertEditLogs([`${userEmail} did not recieve email`], "Errors", dateTime, "sendResetPasswordRequest", "controllers/userManagement/auth.ts");
      }
      return { status: 200, message: "Reset code has been sent to your email!", email: user.email, actionEmail: actionEmail };
    } catch (error) {
      return error;
      // handle error appropriately
    }
  } else {
    return { message: "User does not exist, please sign up!", status: 401 };
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
            resetPassword: "true",
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

export async function checkUserRight(email: string, accessRole: string, shareClass: string) {
  const database = client.db("auth");
  const usersCollection = database.collection("users");

  // Find the user with the specified email, access role, and share class
  const user = await usersCollection.findOne({
    email: email,
    accessRole: accessRole,
    shareClass: shareClass,
  });

  // Return true if a matching user is found, otherwise false
  return user !== null;
}

export async function checkLinkRight(token: string, accessRole: string, shareClass: string) {
  const database = client.db("auth");
  const linksCollection = database.collection("links");

  // Find the user with the specified email, access role, and share class
  const user = await linksCollection.findOne({
    token: token,
    accessRole: accessRole,
    accessRight: shareClass,
  });
  if (user) {
    // User exists, update lastAccessedTime
    const currentTime = getDateTimeInMongoDBCollectionFormat(new Date());
    await linksCollection.updateOne({ _id: user._id }, { $set: { lastAccessedTime: currentTime } });
    return true;
  }
  // Return true if a matching user is found, otherwise false
  return user !== null;
}
export async function editUser(editedUser: any) {
  try {
    let userInfo = await getUser(editedUser["_id"]);
    editedUser["email"] = editedUser["email"].toLowerCase();
    if (userInfo) {
      let beforeModify = JSON.parse(JSON.stringify(userInfo));
      beforeModify["_id"] = new ObjectId(beforeModify["_id"]);

      let userKeys: any = ["name", "email", "accessRole", "resetPassword", "shareClass"];
      let changes = 0;
      let changesText = [];
      for (let index = 0; index < userKeys.length; index++) {
        let key: any = userKeys[index];
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
export async function getUserByEmail(email: string) {
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
    const query = { email: email }; // Replace yourIdValue with the actual ID you're querying
    const results = await collection.find(query, options).toArray();

    // The 'results' variable now contains an array of documents from the collection
    return results[0];
  } catch (error) {
    // Handle any errors that occurred during the operation
    console.error("An error occurred while retrieving data from MongoDB:", error);
    return {};
  }
}

export async function deleteUser(userId: string, userName: string, userEmail: any) {
  try {
    // Connect to the MongoDB client

    // Get the database and the specific collection
    const database = client.db("auth");
    const collection = database.collection("users");

    let query = { _id: new ObjectId(userId) };

    // Delete the document with the specified _id
    const result = await collection.deleteOne(query);

    if (result.deletedCount === 0) {
      return { error: `User does not exist!` };
    } else {
      let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      await insertEditLogs(["deleted"], "Delete User", dateTime, "deleted", userName + " " + userEmail);
      return { error: null };
    }
  } catch (error) {
    console.error(`An error occurred while deleting the document: ${error}`);
    return { error: "Unexpected error 501" };
  }
}

export async function addUser({ email, name, accessRole, shareClass, welcome }: { email: string; name: string; accessRole: string; shareClass: string; welcome: boolean }): Promise<any> {
  try {
    email = email.toLocaleLowerCase();
    const database = client.db("auth");
    const usersCollection = database.collection("users");
    let password = uuidv4();
    let salt = await bcrypt.genSalt(parseInt(saltRounds));
    let cryptedPassword = await bcrypt.hash(password, salt);

    const user = await usersCollection.findOne({ email: email });
    if (user == null) {
      let resetPasswordCode = generateRandomIntegers();

      const updateDoc = {
        name: name,
        email: email,
        password: cryptedPassword,
        accessRole: accessRole,
        shareClass: shareClass,
        createdOn: getDateTimeInMongoDBCollectionFormat(new Date()),
        resetPassword: "false",
        resetCode: resetPasswordCode,
      };
      const action = await usersCollection.insertOne(updateDoc);
      if (welcome) {
        let emailRegisteration = await sendWelcomeEmail({ email: email, name: name, resetCode: resetPasswordCode });
      } else {
        let emailRegisteration = await sendRegsiterationEmail({ email: email, name: name });
      }
      return { message: "registered", status: 200, error: "" };
    } else if (user) {
      return { error: "user already exist", status: 404 };
    } else {
      return { error: "unauthorized", status: 401 };
    }
  } catch (error) {
    return { error: "unauthorized", status: 401 };
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

export async function updateUser(userInfo: any, newFileNames: any) {
  try {
    // Access the 'structure' database
    const database = client.db("auth");

    // Access the collection named by the 'customerId' parameter
    const collection = database.collection("users");

    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    await insertEditLogs(newFileNames, "Upload User", dateTime, "User uploaded a new file", userInfo["email"] + " " + userInfo["name"]);

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
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "updateUser", "src/controllers/auth.ts");
  }
}

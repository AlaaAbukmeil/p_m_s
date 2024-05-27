"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addUser = exports.deleteUser = exports.getUser = exports.editUser = exports.getAllUsers = exports.resetPassword = exports.generateRandomIntegers = exports.sendResetPasswordRequest = exports.checkIfUserExists = exports.registerUser = exports.client = void 0;
require("dotenv").config();
const mongodb_1 = require("mongodb");
const common_1 = require("./common");
const common_2 = require("./reports/common");
const logs_1 = require("./operations/logs");
const email_1 = require("./operations/email");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const jwtSecret = process.env.SECRET;
const bcrypt = require("bcrypt");
const { MongoClient, ServerApiVersion } = require("mongodb");
const saltRounds = process.env.SALT_ROUNDS;
const { v4: uuidv4 } = require("uuid");
exports.client = new MongoClient(common_1.uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
mongoose.connect(common_1.uri, {
    useNewUrlParser: true,
});
const SibApiV3Sdk = require("sib-api-v3-sdk");
SibApiV3Sdk.ApiClient.instance.authentications["api-key"].apiKey = process.env.SEND_IN_BLUE_API_KEY;
async function registerUser(email, password, verificationCode) {
    try {
        const database = exports.client.db("auth");
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
                createdOn: (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date()),
                lastTimeAccessed: (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date()),
            };
            const action = await usersCollection.insertOne(updateDoc);
            return { message: "registered", status: 200 };
        }
        else if (user) {
            return { message: "user already exist", status: 404 };
        }
        else {
            return { message: "unauthorized", status: 401 };
        }
    }
    catch (error) {
        return error;
    }
}
exports.registerUser = registerUser;
async function checkIfUserExists(email, password) {
    try {
        const database = exports.client.db("auth");
        const usersCollection = database.collection("users");
        const user = await usersCollection.findOne({ email: email });
        if (user) {
            try {
                const result = await bcrypt.compare(password, user.password);
                if (result) {
                    const jwtObject = { email: email, accessRole: user["accessRole"] };
                    const token = jwt.sign(jwtObject, jwtSecret, { expiresIn: "24h" });
                    const updateDoc = {
                        $set: {
                            lastTimeAccessed: (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date()),
                        },
                    };
                    let action = await usersCollection.updateOne({ _id: user["_id"] }, updateDoc // Filter to match the document
                    );
                    return {
                        message: "authenticated",
                        status: 200,
                        token: token,
                        email: email,
                        accessRole: user["accessRole"],
                    };
                }
                else {
                    return { message: "wrong password", status: 401, token: null, email: null, accessRole: null };
                }
            }
            catch (error) {
                return { message: "unexpected error", status: 401, token: null, email: null, accessRole: null };
                // handle error appropriately
            }
        }
        else {
            return { message: "user does not exist", status: 401, token: null, email: null, accessRole: null };
        }
    }
    catch (error) {
        return { message: "unexpected error", status: 401, token: null, email: null, accessRole: null };
    }
}
exports.checkIfUserExists = checkIfUserExists;
async function sendResetPasswordRequest(userEmail) {
    const database = exports.client.db("auth");
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
            let actionEmail = await (0, email_1.sendEmailToResetPassword)(user.email, resetPasswordCode);
            return { status: 200, message: "Reset code have been sent!", email: user.email };
        }
        catch (error) {
            return error;
            // handle error appropriately
        }
    }
    else {
        return { message: "User does not exist, please sign up!", status: 401 };
    }
}
exports.sendResetPasswordRequest = sendResetPasswordRequest;
function generateRandomIntegers(n = 5, min = 1, max = 10) {
    let resetCode = "";
    for (let i = 0; i < n; i++) {
        resetCode += Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return resetCode;
}
exports.generateRandomIntegers = generateRandomIntegers;
async function resetPassword(userEmail, resetCode, enteredPassword) {
    const database = exports.client.db("auth");
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
            }
            else {
                return { message: "code does not match" };
            }
        }
        catch (error) {
            return error;
            // handle error appropriately
        }
    }
    else {
        return { message: "User does not exist, please sign up!", status: 401 };
    }
}
exports.resetPassword = resetPassword;
async function getAllUsers() {
    const database = exports.client.db("auth");
    const usersCollection = database.collection("users");
    const users = await usersCollection.find().toArray();
    return users;
}
exports.getAllUsers = getAllUsers;
async function editUser(editedUser) {
    try {
        let userInfo = await getUser(editedUser["_id"]);
        if (userInfo) {
            let beforeModify = JSON.parse(JSON.stringify(userInfo));
            beforeModify["_id"] = new mongodb_1.ObjectId(beforeModify["_id"]);
            let centralizedBlotKeys = ["name", "email", "accessRole", "verified"];
            let changes = 0;
            let changesText = [];
            for (let index = 0; index < centralizedBlotKeys.length; index++) {
                let key = centralizedBlotKeys[index];
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
            const database = exports.client.db("auth");
            // Access the collection named by the 'customerId' parameter
            const collection = database.collection("users");
            let dateTime = (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date());
            await (0, logs_1.insertEditLogs)(changesText, "Edit User", dateTime, userInfo["Edit Note"], userInfo["email"] + " " + userInfo["name"]);
            let action = await collection.updateOne({ _id: userInfo["_id"] }, // Filter to match the document
            { $set: userInfo } // Update operation
            );
            if (action) {
                return { error: null };
            }
            else {
                return {
                    error: "unexpected error, please contact Triada team",
                };
            }
        }
        else {
            return { error: "Trade does not exist, please referesh the page!" };
        }
    }
    catch (error) {
        let dateTime = (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date());
        console.log(error);
        let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        await (0, logs_1.insertEditLogs)([errorMessage], "Errors", dateTime, "editUser", "src/controllers/auth.ts");
    }
}
exports.editUser = editUser;
async function getUser(userId) {
    try {
        // Connect to the MongoDB client
        // Access the 'structure' database
        const database = exports.client.db("auth");
        // Access the collection named by the 'customerId' parameter
        const collection = database.collection("users");
        // Perform your operations, such as find documents in the collection
        // This is an example operation that fetches all documents in the collection
        // Empty query object means "match all documents"
        const options = {}; // You can set options for the find operation if needed
        const query = { _id: new mongodb_1.ObjectId(userId) }; // Replace yourIdValue with the actual ID you're querying
        const results = await collection.find(query, options).toArray();
        // The 'results' variable now contains an array of documents from the collection
        return results[0];
    }
    catch (error) {
        // Handle any errors that occurred during the operation
        console.error("An error occurred while retrieving data from MongoDB:", error);
        return {};
    }
}
exports.getUser = getUser;
async function deleteUser(userId, userName, userEmail) {
    try {
        // Connect to the MongoDB client
        // Get the database and the specific collection
        const database = exports.client.db("auth");
        const collection = database.collection("users");
        let query = { _id: new mongodb_1.ObjectId(userId) };
        // Delete the document with the specified _id
        const result = await collection.deleteOne(query);
        if (result.deletedCount === 0) {
            return { error: `User does not exist!` };
        }
        else {
            let dateTime = (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date());
            await (0, logs_1.insertEditLogs)(["deleted"], "Delete User", dateTime, "deleted", userName + " " + userEmail);
            return { error: null };
        }
    }
    catch (error) {
        console.error(`An error occurred while deleting the document: ${error}`);
        return { error: "Unexpected error 501" };
    }
}
exports.deleteUser = deleteUser;
async function addUser({ email, name, accessRole }) {
    try {
        const database = exports.client.db("auth");
        const usersCollection = database.collection("users");
        let password = uuidv4();
        let salt = await bcrypt.genSalt(parseInt(saltRounds));
        let cryptedPassword = await bcrypt.hash(password, salt);
        const user = await usersCollection.findOne({ email: email });
        if (user == null) {
            const updateDoc = {
                name: name,
                email: email,
                password: cryptedPassword,
                accessRole: accessRole,
                createdOn: (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date()),
            };
            const action = await usersCollection.insertOne(updateDoc);
            let emailRegisteration = await (0, email_1.sendRegsiterationEmail)({ email: email, password: password, name: name });
            return { message: "registered", status: 200, error: `user's password: ${password}` };
        }
        else if (user) {
            return { error: "user already exist", status: 404 };
        }
        else {
            return { error: "unauthorized", status: 401 };
        }
    }
    catch (error) {
        return { error: "unauthorized", status: 401 };
    }
}
exports.addUser = addUser;

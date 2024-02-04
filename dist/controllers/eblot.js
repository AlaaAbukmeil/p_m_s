"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTrades = void 0;
const auth_1 = require("./auth");
async function getAllTrades(from, to) {
    try {
        const database = auth_1.client.db("trades_v_2");
        const collections = [database.collection("vcons"), database.collection("ib"), database.collection("emsx")];
        // The query to be used on all collections
        const query = {
            timestamp: {
                $gte: from,
                $lte: to, // Less than or equal to "to" timestamp
            },
        };
        // An array to hold all the documents from all collections
        let allDocuments = [];
        // Loop through each collection and retrieve the documents
        for (const collection of collections) {
            const documents = await collection.find(query).toArray();
            allDocuments = allDocuments.concat(documents);
        }
        return allDocuments;
    }
    catch (error) {
        // Handle the error appropriately
        return { error: error };
    }
}
exports.getAllTrades = getAllTrades;

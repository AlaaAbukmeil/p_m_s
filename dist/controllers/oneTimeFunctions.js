"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertTradesInPortfolioAtASpecificDate = exports.changeMTDRlzd = exports.editMTDRlzd = exports.appendLogs = void 0;
const util_1 = __importDefault(require("util"));
const reports_1 = require("./reports");
const common_1 = require("./common");
const reports_2 = require("./reports");
const fs = require("fs");
const writeFile = util_1.default.promisify(fs.writeFile);
const { MongoClient, ServerApiVersion } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const client = new MongoClient(common_1.uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
let month = (0, common_1.monthlyRlzdDate)(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000).toString());
async function appendLogs(positions) {
    for (let obj of positions) {
        let trades = obj["MTD Rlzd"][month].map((trade) => JSON.stringify(trade)).join("\n,");
        let logs = `${obj["Issue"]}: \n\n ${trades}\n\n,`;
        await writeFile("trades-logs.txt", logs, { flag: "a" });
    }
}
exports.appendLogs = appendLogs;
let changes = {
    "1393 HK": {
        data: [
            { price: 0.132, quantity: 10000 },
            { price: 0.138, quantity: 200000 },
            { price: 0.136, quantity: 196000 },
            { price: 0.143, quantity: 200000 },
        ],
        location: "E004",
    },
};
async function editMTDRlzd() {
    let portfolio = await (0, reports_1.getPortfolio)();
    let positionIssues = Object.keys(changes);
    let positionChanged = 0;
    for (let index = 0; index < portfolio.length; index++) {
        if (positionIssues.includes(portfolio[index]["Issue"]) && changes[portfolio[index]["Issue"]].location == portfolio[index]["Location"]) {
            portfolio[index]["MTD Rlzd"] = {};
            portfolio[index]["MTD Rlzd"][month] = changes[portfolio[index]["Issue"]].data;
            positionChanged++;
        }
    }
    await insertTradesInPortfolioAtASpecificDate(portfolio);
    return;
}
exports.editMTDRlzd = editMTDRlzd;
async function changeMTDRlzd() {
    let portfolio = await (0, reports_1.getPortfolio)();
    for (let index = 0; index < portfolio.length; index++) {
        if (portfolio[index]["MTD Rlzd"]) {
            let object = portfolio[index]["MTD Rlzd"];
            portfolio[index]["MTD Rlzd"] = {};
            portfolio[index]["MTD Rlzd"][(0, common_1.monthlyRlzdDate)(new Date().toString())] = object;
        }
    }
    await (0, reports_2.insertTradesInPortfolio)(portfolio);
    return;
}
exports.changeMTDRlzd = changeMTDRlzd;
async function insertTradesInPortfolioAtASpecificDate(trades) {
    const database = client.db("portfolios");
    let operations = trades
        .filter((trade) => trade["Location"])
        .map((trade) => {
        // Start with the known filters
        let filters = [];
        // If "ISIN", "BB Ticker", or "Issue" exists, check for both the field and "Location"
        if (trade["ISIN"]) {
            filters.push({
                ISIN: trade["ISIN"],
                Location: trade["Location"],
                _id: new ObjectId(trade["_id"]),
            });
        }
        else if (trade["BB Ticker"]) {
            filters.push({
                "BB Ticker": trade["BB Ticker"],
                Location: trade["Location"],
                _id: new ObjectId(trade["_id"]),
            });
        }
        else if (trade["Issue"]) {
            filters.push({
                Issue: trade["Issue"],
                Location: trade["Location"],
                _id: new ObjectId(trade["_id"]),
            });
        }
        return {
            updateOne: {
                filter: { $or: filters },
                update: { $set: trade },
                upsert: true,
            },
        };
    });
    // Execute the operations in bulk
    try {
        const historicalReportCollection = database.collection(`portfolio-2024-01-07 17:32`);
        let action = await historicalReportCollection.bulkWrite(operations);
        console.log(action);
        return action;
    }
    catch (error) {
        return error;
    }
}
exports.insertTradesInPortfolioAtASpecificDate = insertTradesInPortfolioAtASpecificDate;

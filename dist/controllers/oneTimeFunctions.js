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
        let logs = `"${JSON.stringify(obj)}"}\n\n,`;
        await writeFile("trades-logs.txt", logs, { flag: "a" });
    }
}
exports.appendLogs = appendLogs;
let changes = {
    "LLOYDS 4 ⅜ 04/05/34 EMTN": { data: [{ price: 0.9948999999999999, quantity: -1000000 }], location: "B255" },
    "DBR 0 ¼ 02/15/29": { data: [{ price: 0.91983, quantity: 1000000 }], location: "B255" },
    "STANDARD CHARTERED BANK 6.0% Perpr Regs": { data: [{ price: 0.985, quantity: 200000 }], location: "B129" },
    "SOCGEN 10 PERP REGS": { data: [{ price: 1.0515, quantity: 500000 }], location: "B227" },
    "HSBC 8.0% PERP Corp": { data: [{ price: 1.0301, quantity: 300000 }], location: "B143" },
    "CFLD Cayman 2.5% 31-Jan-2031 RegS (NB1)": { data: [{ price: 0.025, quantity: 4491000 }], location: "NB1" },
    "BNP PARIBAS SA 8.5% Perp": {
        data: [
            { price: 1.03375, quantity: 500000 },
            { price: 1.036, quantity: 500000 },
        ],
        location: "B191",
    },
    "BNP Paribas 6.625% PerpectualRegS": { data: [{ price: 0.9952, quantity: 300000 }], location: "B198" },
    "BHRAIN 7 ¾ 04/18/35 REGS": { data: [{ price: 1.03125, quantity: 1000000 }], location: "B135" },
    "Bangkok Bank Public Co Ltd 5.5% 21-Sep-2033 RegS": { data: [{ price: 1.0214, quantity: 1000000 }], location: "B206" },
    "U.S. GOVT -TREASURY DEPT 3.875% 15-Aug-2033": { data: [{ price: 0.99296875, quantity: -960000 }], location: "B206" },
    "ICELTD 10 ⅞ 12/15/27 REGS": { data: [{ price: 1.0425, quantity: 500000 }], location: "B184" },
    "BACR 9 ⅝ PERP": { data: [{ price: 1.025, quantity: 500000 }], location: "B233" },
    "POSCO Holdings Inc 5.875% 17-Jan-2033 RegS": { data: [{ price: 1.04125, quantity: 500000 }], location: "B070" },
    "U.S. GOVT -TREASURY DEPT 3.5% 15-Feb-2033": { data: [{ price: 0.9677734375, quantity: -438000 }], location: "B070" },
    "ROTH Float PERP": { data: [], location: "B256" },
    "NIPPON LIFE INSURANCE CO 6.250% 13-Sep-2053": { data: [{ price: 1.045, quantity: 500000 }], location: "B204" },
    "UPLLIN 5 ¼ PERP": { data: [], location: "B257" },
    "T 4 ½ 11/15/33": {
        data: [
            { price: 1.0385546875, quantity: -860000 },
            { price: 1.0385546875, quantity: -1000000 },
        ],
        location: "B260",
    },
    "TCZIRA 8 01/16/29": { data: [{ price: 0.996, quantity: 1000000 }], location: "B259" },
    "STTGDC 5.7 PERP": { data: [{ price: 1.01, quantity: 250000 }], location: "B259" },
    "KSA 5 01/16/34 REGS": { data: [{ price: 0.99193, quantity: 2000000 }], location: "B260" },
    "ANZ Float 01/16/34 MTN": {
        data: [
            { price: 1, quantity: -2000000 },
            { price: 1.0005, quantity: -1500000 },
        ],
        location: "B261",
    },
    "ANZ 5.888 01/16/34 MTN": { data: [{ price: 1, quantity: -2000000 }], location: "B261" },
    "YKBNK 9 ¼ 01/17/34 REGS": { data: [], location: "B264" },
    "SAMTOT 5 ½ 07/18/29": { data: [{ price: 1.0006300000000001, quantity: 1000000 }], location: "B262" },
    "ECOPET 8 ⅜ 01/19/36": { data: [], location: "B263" },
    "AXASA 6 ⅜ PERP EMTN": { data: [], location: "B264" },
    "T 3 ¾ 12/31/28": { data: [{ price: 0.9903125, quantity: -1060000 }], location: "B262" },
    "ECOPET 5 ⅞ 05/28/45": { data: [], location: "B263" },
    "ESH4 IB": {
        data: [
            { price: 4787.5, quantity: -50 },
            { price: 4746.5, quantity: -150 },
            { price: 4734, quantity: 50 },
        ],
        location: "TA3",
    },
    "ZN   MAR 24 IB": { data: [], location: "TA4" },
    "1393 HK": {
        data: [
            { price: 0.143, quantity: 200000 },
            { price: 0.136, quantity: 196000 },
            { price: 0.138, quantity: 200000 },
            { price: 0.132, quantity: 10000 },
            { price: 0.142, quantity: 200000 },
            { price: 0.135, quantity: 200000 },
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
        const historicalReportCollection = database.collection(`portfolio-2024-01-10 19:39`);
        let action = await historicalReportCollection.bulkWrite(operations);
        console.log(action);
        return action;
    }
    catch (error) {
        return error;
    }
}
exports.insertTradesInPortfolioAtASpecificDate = insertTradesInPortfolioAtASpecificDate;

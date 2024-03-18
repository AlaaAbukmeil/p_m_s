"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeMTDRlzd = exports.editDayRlzd = exports.editMTDRlzd = exports.appendLogs = void 0;
const util_1 = __importDefault(require("util"));
const reports_1 = require("./reports");
const common_1 = require("./common");
const reports_2 = require("./reports");
const operations_1 = require("./operations");
const common_2 = require("./reports/common");
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
let month = (0, common_2.monthlyRlzdDate)(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000).toString());
async function appendLogs(positions) {
    for (let obj of positions) {
        // Create a new object with only the _id and Day Rlzd properties
        const logEntry = {
            _id: obj._id,
            "Day Rlzd": obj["Day Rlzd"],
        };
        // Convert the log entry to a string
        let logs = `${JSON.stringify(logEntry)}\n\n,`;
        // Append the log entry to the file
        await writeFile("trades-logs.txt", logs, { flag: "a" });
    }
}
exports.appendLogs = appendLogs;
let changes = {
    "6594fabed36b5469e8326efe": {
        "MTD Rlzd": {
            "2024/01": [
                { price: 0.91983, quantity: 1000000 },
                { price: 0.9134099999999999, quantity: -1000000 },
            ],
        },
    },
};
async function editMTDRlzd(collectionDate) {
    let action = await (0, operations_1.getPortfolioOnSpecificDate)(collectionDate);
    let portfolio = action[0];
    collectionDate = action[1];
    let positionChanged = 0;
    for (let index = 0; index < portfolio.length; index++) {
        if (changes[portfolio[index]["_id"]]) {
            portfolio[index]["MTD Rlzd"] = changes[portfolio[index]["_id"]]["MTD Rlzd"];
            positionChanged++;
        }
    }
    console.log(collectionDate);
    await (0, reports_1.insertTradesInPortfolioAtASpecificDate)(portfolio, `portfolio-${collectionDate}`);
    return;
}
exports.editMTDRlzd = editMTDRlzd;
async function editDayRlzd(collectionDate) {
    let action = await (0, operations_1.getPortfolioOnSpecificDate)(collectionDate);
    let portfolio = action[0];
    collectionDate = action[1];
    let positionChanged = 0;
    for (let index = 0; index < portfolio.length; index++) {
        if (changes[portfolio[index]["_id"]]) {
            portfolio[index]["Day Rlzd"] = {};
            portfolio[index]["Day Rlzd"] = changes[portfolio[index]["_id"]]["Day Rlzd"];
            positionChanged++;
        }
    }
    console.log(collectionDate);
    await (0, reports_1.insertTradesInPortfolioAtASpecificDate)(portfolio, `portfolio-${collectionDate}`);
    return;
}
exports.editDayRlzd = editDayRlzd;
async function changeMTDRlzd() {
    let portfolio = await (0, reports_1.getPortfolio)();
    for (let index = 0; index < portfolio.length; index++) {
        if (portfolio[index]["MTD Rlzd"]) {
            let object = portfolio[index]["MTD Rlzd"];
            portfolio[index]["MTD Rlzd"] = {};
            portfolio[index]["MTD Rlzd"][(0, common_2.monthlyRlzdDate)(new Date().toString())] = object;
        }
    }
    await (0, reports_2.insertTradesInPortfolio)(portfolio);
    return;
}
exports.changeMTDRlzd = changeMTDRlzd;

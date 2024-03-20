"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertTradesInPortfolioAtASpecificDate = exports.insertTradesInPortfolioAtASpecificDateBasedOnID = exports.editPosition = exports.calculateMTDURlzd = exports.calculateAccruedSinceInception = exports.findTrade = exports.tradesTriadaIds = exports.insertTrade = exports.getTrades = void 0;
require("dotenv").config();
const util_1 = __importDefault(require("util"));
const common_1 = require("./common");
const operations_1 = require("./operations");
const common_2 = require("./common");
const common_3 = require("./reports/common");
const fs = require("fs");
const writeFile = util_1.default.promisify(fs.writeFile);
const axios = require("axios");
const { MongoClient, ServerApiVersion } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const client = new MongoClient(common_2.uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
async function getTrades(tradeType) {
    try {
        const database = client.db("trades_v_2");
        const reportCollection = database.collection(`${tradeType}`);
        let documents = await reportCollection.find().sort({ "Trade Date": -1 }).toArray();
        for (let index = 0; index < documents.length; index++) {
            let trade = documents[index];
            if (!trade["BB Ticker"] && trade["Issue"]) {
                trade["BB Ticker"] = trade["Issue"];
                delete trade["Issue"];
            }
        }
        return documents;
    }
    catch (error) {
        return error;
    }
}
exports.getTrades = getTrades;
async function insertTrade(trades, tradeType) {
    const database = client.db("trades_v_2");
    const reportCollection = database.collection(`${tradeType}`);
    const operations = trades.map((trade) => ({
        updateOne: {
            filter: { "Triada Trade Id": trade["Triada Trade Id"] },
            update: { $set: trade },
            upsert: true,
        },
    }));
    // Execute the operations in bulk
    try {
        const result = await reportCollection.bulkWrite(operations);
        return result;
    }
    catch (error) {
        return error;
    }
}
exports.insertTrade = insertTrade;
async function tradesTriadaIds() {
    try {
        const database = client.db("trades_v_2");
        const reportCollection1 = database.collection("vcons");
        const reportCollection2 = database.collection("ib");
        const reportCollection3 = database.collection("emsx");
        const document1 = await reportCollection1.find().toArray();
        const document2 = await reportCollection2.find().toArray();
        const document3 = await reportCollection3.find().toArray();
        let document = [...document1, ...document2, ...document3];
        if (document) {
            let sequalNumbers = [];
            for (let index = 0; index < document.length; index++) {
                let trade = document[index];
                sequalNumbers.push(trade["Triada Trade Id"]);
            }
            return sequalNumbers;
        }
        else {
            return [];
        }
    }
    catch (error) {
        return error;
    }
}
exports.tradesTriadaIds = tradesTriadaIds;
async function findTrade(tradeType, tradeTriadaId, seqNo = null) {
    try {
        const database = client.db("trades_v_2");
        const reportCollection = database.collection(tradeType);
        let query;
        if (seqNo != null) {
            query = { $and: [{ "Triada Trade Id": tradeTriadaId }, { "Seq No": seqNo }] };
        }
        else {
            query = { "Triada Trade Id": tradeTriadaId };
        }
        const documents = await reportCollection.find(query).toArray();
        if (documents) {
            return documents[0];
        }
        else {
            return [];
        }
    }
    catch (error) {
        return error;
    }
}
exports.findTrade = findTrade;
function calculateAccruedSinceInception(interestInfo, couponRate, numOfDaysInAYear, isin) {
    let quantityDates = Object.keys(interestInfo).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    quantityDates.push((0, common_1.formatDateUS)(new Date()));
    couponRate = couponRate ? couponRate : 0;
    let quantity = interestInfo[quantityDates[0]];
    let interest = 0;
    for (let index = 0; index < quantityDates.length; index++) {
        if (quantityDates[index + 1]) {
            let numOfDays = getDaysBetween(quantityDates[index], quantityDates[index + 1]);
            interest += (couponRate / numOfDaysInAYear) * numOfDays * quantity;
        }
        quantity += interestInfo[quantityDates[index + 1]] ? interestInfo[quantityDates[index + 1]] : 0;
    }
    return interest;
}
exports.calculateAccruedSinceInception = calculateAccruedSinceInception;
function calculateMTDURlzd(portfolio, dateInput) {
    for (let index = 0; index < portfolio.length; index++) {
        let thisMonth = (0, common_3.monthlyRlzdDate)(dateInput);
        if (!portfolio[index]["Mid"]) {
            portfolio[index]["Mid"] = portfolio[index]["Entry Price"][thisMonth];
        }
        portfolio[index]["MTD URlzd"] = portfolio[index]["Type"] == "CDS" ? ((parseFloat(portfolio[index]["Mid"]) - parseFloat(portfolio[index]["MTD Mark"])) * portfolio[index]["Notional Amount"]) / portfolio[index]["Original Face"] : (parseFloat(portfolio[index]["Mid"]) - parseFloat(portfolio[index]["MTD Mark"])) * portfolio[index]["Notional Amount"];
        if (portfolio[index]["MTD URlzd"] == 0) {
            portfolio[index]["MTD URlzd"] = 0;
        }
        else if (!portfolio[index]["MTD URlzd"]) {
            portfolio[index]["MTD URlzd"] = "0";
        }
    }
    return portfolio;
}
exports.calculateMTDURlzd = calculateMTDURlzd;
async function editPosition(editedPosition, date) {
    try {
        const database = client.db("portfolios");
        let earliestPortfolioName = await getEarliestCollectionName(date);
        console.log(earliestPortfolioName.predecessorDate, "get edit portfolio");
        const reportCollection = database.collection(`portfolio-${earliestPortfolioName.predecessorDate}`);
        let portfolio = await reportCollection
            .aggregate([
            {
                $sort: {
                    "BB Ticker": 1, // replace 'BB Ticker' with the name of the field you want to sort alphabetically
                },
            },
        ])
            .toArray();
        delete editedPosition["Quantity"];
        let positionInPortfolio = {};
        let editedPositionTitles = Object.keys(editedPosition);
        let id = editedPosition["_id"];
        let unEditableParams = [
            "Value",
            "Duration",
            "MTD Mark",
            "Previous Mark",
            "Day P&L (BC)",
            "MTD Rlzd (BC)",
            "MTD URlzd (BC)",
            "MTD Int.Income (BC)",
            "MTD P&L (BC)",
            "Cost (LC)",
            "Day Accrual",
            "_id",
            "Value (BC)",
            "Value (LC)",
            "MTD Int. (BC)",
            "Day URlzd (BC)",
            "Day Rlzd (BC)",
            "Day Int. (LC)",
            "Day Accrual (LC)",
            "Cost MTD (LC)",
            "Quantity",
            "Day Int. (BC)",
            "S&P Outlook",
            "Moody's Bond Rating",
            "Moody's Outlook",
            "Fitch Bond Rating",
            "Fitch Outlook",
            // "BBG Composite Rating",
            "Day P&L FX",
            "MTD P&L FX",
            "S&P Bond Rating",
            "MTD FX",
            "Day URlzd",
            "Day P&L (LC)",
            "MTD Rlzd (LC)",
            "MTD URlzd (LC)",
            "MTD Int.Income (LC)",
            "MTD P&L (LC)",
            "Previous FX",
            "Day Rlzd",
            "Spread Change",
            "OAS W Change",
            "Last Day Since Realizd",
            "Day Rlzd (LC)",
            "Day URlzd (LC)",
            "MTD Int. (LC)",
            "Currency)	Day Int. (LC)",
            "YTD P&L (LC)",
            "YTD Rlzd (LC)",
            "YTD URlzd (LC)",
            "YTD Int. (LC)",
            "YTD P&L (BC)",
            "YTD Rlzd (BC)",
            "YTD URlzd (BC)",
            "YTD Int. (BC)",
            "YTD FX",
            "Total Gain/ Loss (USD)",
            "Accrued Int. Since Inception",
        ];
        // these keys are made up by the function frontend table, it reverts keys to original keys
        let positionIndex = null;
        for (let index = 0; index < portfolio.length; index++) {
            let position = portfolio[index];
            if (position["_id"].toString() == id) {
                positionInPortfolio = position;
                positionIndex = index;
            }
        }
        if (!positionIndex && positionIndex != 0) {
            return { error: "Fatal Error" };
        }
        let changes = [];
        for (let indexTitle = 0; indexTitle < editedPositionTitles.length; indexTitle++) {
            let title = editedPositionTitles[indexTitle];
            let todayDate = (0, common_1.formatDateUS)(new Date().toString());
            let monthDate = (0, common_3.monthlyRlzdDate)(new Date().toString());
            if (!unEditableParams.includes(title) && editedPosition[title] != "") {
                if (title == "Notional Amount") {
                    positionInPortfolio["Interest"] = positionInPortfolio["Interest"] ? positionInPortfolio["Interest"] : {};
                    positionInPortfolio["Interest"][todayDate] = parseFloat(editedPosition[title]) - parseFloat(positionInPortfolio["Notional Amount"]);
                    changes.push(`Notional Amount changed from ${positionInPortfolio["Notional Amount"]} to ${editedPosition[title]}`);
                    positionInPortfolio["Notional Amount"] = parseFloat(editedPosition[title]);
                    console.log(editedPosition[title], title);
                    positionInPortfolio["Net"] = parseFloat(editedPosition[title]);
                }
                else if ((title == "Mid" || title == "Ask" || title == "Bid" || title == "Average Cost") && editedPosition[title] != "") {
                    if (!positionInPortfolio["Type"]) {
                        positionInPortfolio["Type"] = positionInPortfolio["BB Ticker"].split(" ")[0] == "T" || positionInPortfolio["Issuer"] == "US TREASURY N/B" ? "UST" : "BND";
                    }
                    if (positionInPortfolio["Type"] == "BND" || positionInPortfolio["Type"] == "UST") {
                        positionInPortfolio[title] = parseFloat(editedPosition[title]) / 100;
                    }
                    else {
                        positionInPortfolio[title] = parseFloat(editedPosition[title]);
                    }
                }
                else {
                    changes.push(`${title} changed from ${positionInPortfolio[title] || "''"} to ${editedPosition[title]}`);
                    positionInPortfolio[title] = editedPosition[title];
                }
            }
        }
        let dateTime = (0, common_3.getDateTimeInMongoDBCollectionFormat)(new Date());
        portfolio[positionIndex] = positionInPortfolio;
        // console.log(positionInPortfolio, `portfolio-${earliestPortfolioName.predecessorDate}`, "portfolio edited name");
        await (0, operations_1.insertEditLogs)(changes, editedPosition["Event Type"], dateTime, editedPosition["Edit Note"], positionInPortfolio["BB Ticker"] + " " + positionInPortfolio["Location"]);
        let action = await insertTradesInPortfolioAtASpecificDateBasedOnID(portfolio, `portfolio-${earliestPortfolioName.predecessorDate}`);
        if (action) {
            return { status: 200 };
        }
        else {
            return { error: "fatal error" };
        }
    }
    catch (error) {
        console.log(error);
        return { error: error.toString() };
    }
}
exports.editPosition = editPosition;
async function insertTradesInPortfolioAtASpecificDateBasedOnID(trades, date) {
    const database = client.db("portfolios");
    let operations = trades
        .filter((trade) => trade["Location"])
        .map((trade) => {
        // Start with the known filters
        let filters = [];
        // If "ISIN", "BB Ticker", or "Issue" exists, check for both the field and "Location"
        if (trade["ISIN"]) {
            filters.push({
                _id: new ObjectId(trade["_id"].toString()),
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
        const historicalReportCollection = database.collection(date);
        let action = await historicalReportCollection.bulkWrite(operations);
        console.log(action);
        return action;
    }
    catch (error) {
        return error;
    }
}
exports.insertTradesInPortfolioAtASpecificDateBasedOnID = insertTradesInPortfolioAtASpecificDateBasedOnID;
async function insertTradesInPortfolioAtASpecificDate(trades, date) {
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
            });
        }
        else if (trade["BB Ticker"]) {
            filters.push({
                "BB Ticker": trade["BB Ticker"],
                Location: trade["Location"],
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
        const historicalReportCollection = database.collection(date);
        let action = await historicalReportCollection.bulkWrite(operations);
        return action;
    }
    catch (error) {
        return error;
    }
}
exports.insertTradesInPortfolioAtASpecificDate = insertTradesInPortfolioAtASpecificDate;

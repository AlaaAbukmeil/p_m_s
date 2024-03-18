"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertTradesInPortfolioAtASpecificDate = exports.insertTradesInPortfolioAtASpecificDateBasedOnID = exports.editPosition = exports.calculateMTDURlzd = exports.calculateAccruedSinceInception = exports.getDaysBetween = exports.insertPricesUpdatesInPortfolio = exports.updatePricesPortfolio = exports.insertTradesInPortfolio = exports.updatePositionPortfolio = exports.updateExisitingPosition = exports.returnPositionProgress = exports.getBBTicker = exports.findTrade = exports.tradesTriadaIds = exports.insertTrade = exports.getSecurityInPortfolio = exports.getTrades = exports.getHistoricalPortfolio = exports.getPortfolio = exports.getAllCollectionDatesSinceStartMonth = exports.getEarliestCollectionName = void 0;
require("dotenv").config();
const tools_1 = require("./reports/tools");
const util_1 = __importDefault(require("util"));
const common_1 = require("./common");
const operations_1 = require("./operations");
const common_2 = require("./common");
const operations_2 = require("./operations");
const common_3 = require("./reports/common");
const readExcel_1 = require("./reports/readExcel");
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
async function getEarliestCollectionName(originalDate) {
    const database = client.db("portfolios");
    let collections = await database.listCollections().toArray();
    let collectionNames = [];
    for (let index = 0; index < collections.length; index++) {
        let collection = collections[index];
        let collectionDateName = collection.name.split("-");
        let collectionDate = collectionDateName[1] + "-" + collectionDateName[2] + "-" + collectionDateName[3].split(" ")[0];
        if (originalDate.includes(collectionDate)) {
            collectionNames.push(collection.name);
        }
    }
    let dates = [];
    for (let collectionIndex = 0; collectionIndex < collections.length; collectionIndex++) {
        let collection = collections[collectionIndex];
        let collectionDateName = collection.name.split("-");
        let collectionDate = collectionDateName[1] + "/" + collectionDateName[2] + "/" + collectionDateName[3];
        if (new Date(collectionDate)) {
            dates.push(new Date(collectionDate));
        }
    }
    let inputDate = new Date(originalDate);
    let predecessorDates = dates.filter((date) => date < inputDate);
    if (predecessorDates.length == 0) {
        return { predecessorDate: "", collectionNames: collectionNames };
    }
    let predecessorDate = new Date(Math.max.apply(null, predecessorDates));
    //hong kong time difference with utc
    if (predecessorDate) {
        predecessorDate = (0, common_3.getDateTimeInMongoDBCollectionFormat)(new Date(predecessorDate));
    }
    return { predecessorDate: predecessorDate, collectionNames: collectionNames };
}
exports.getEarliestCollectionName = getEarliestCollectionName;
async function getAllCollectionDatesSinceStartMonth(originalDate) {
    const database = client.db("portfolios");
    let collections = await database.listCollections().toArray();
    let currentDayDate = new Date(new Date(originalDate).getTime()).toISOString().slice(0, 10);
    let previousMonthDates = (0, common_3.getAllDatesSinceLastMonthLastDay)(currentDayDate);
    let dates = [];
    for (let collectionIndex = 0; collectionIndex < collections.length; collectionIndex++) {
        let collection = collections[collectionIndex];
        let collectionDateName = collection.name.split("-");
        let collectionDate = collectionDateName[1] + "/" + collectionDateName[2] + "/" + collectionDateName[3];
        collectionDate = new Date(collectionDate);
        if (collectionDate.getTime() > new Date(previousMonthDates[0]) && collectionDate.getTime() < new Date(previousMonthDates[previousMonthDates.length - 1])) {
            dates.push(collection.name);
        }
    }
    return dates;
}
exports.getAllCollectionDatesSinceStartMonth = getAllCollectionDatesSinceStartMonth;
async function getPortfolio() {
    try {
        let day = (0, common_3.getDateTimeInMongoDBCollectionFormat)(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000));
        const database = client.db("portfolios");
        let latestCollectionTodayDate = day.split(" ")[0] + " 23:59";
        let earliestCollectionName = await getEarliestCollectionName(latestCollectionTodayDate);
        console.log(earliestCollectionName.predecessorDate, "get portfolio date");
        const reportCollection = database.collection(`portfolio-${earliestCollectionName.predecessorDate}`);
        let documents = await reportCollection.find().toArray();
        for (let index = 0; index < documents.length; index++) {
            documents[index]["Notional Amount"] = documents[index]["Notional Amount"] || parseFloat(documents[index]["Notional Amount"]) == 0 ? documents[index]["Notional Amount"] : documents[index]["Quantity"];
        }
        return documents;
    }
    catch (error) {
        return error;
    }
}
exports.getPortfolio = getPortfolio;
async function getHistoricalPortfolio(date) {
    const database = client.db("portfolios");
    const reportCollection = database.collection(`portfolio-${date}`);
    let documents = await reportCollection.find().toArray();
    for (let index = 0; index < documents.length; index++) {
        documents[index]["Notional Amount"] = documents[index]["Notional Amount"] || parseFloat(documents[index]["Notional Amount"]) == 0 ? documents[index]["Notional Amount"] : documents[index]["Quantity"];
    }
    return documents;
}
exports.getHistoricalPortfolio = getHistoricalPortfolio;
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
function getSecurityInPortfolio(portfolio, identifier, location) {
    let document = 404;
    if (identifier == "" || !identifier) {
        return document;
    }
    for (let index = 0; index < portfolio.length; index++) {
        let issue = portfolio[index];
        if ((identifier.includes(issue["ISIN"]) || identifier.includes(issue["BB Ticker"])) && issue["Location"].trim() == location.trim()) {
            if (issue["ISIN"] != "") {
                document = issue;
            }
        }
        else if (identifier.includes(issue["BB Ticker"]) && issue["Location"].trim() == location.trim()) {
            if (issue["BB Ticker"] != "") {
                document = issue;
            }
        }
        else if (identifier == new ObjectId(issue["_id"])) {
            document = issue;
        }
    }
    // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
    return document;
}
exports.getSecurityInPortfolio = getSecurityInPortfolio;
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
async function getBBTicker(obj) {
    let index = 0;
    let bbTicker = {};
    try {
        while (index < obj.length) {
            let end = index + 99;
            if (end > obj.length) {
                end = obj.length;
            }
            let params = obj.slice(index, end);
            index += 99;
            let action = await axios.post("https://api.openfigi.com/v3/mapping", params, {
                headers: {
                    "X-OPENFIGI-APIKEY": process.env.OPEN_FIGI_API_KEY,
                },
            });
            let responseArr = action.data;
            for (let responseIndex = 0; responseIndex < responseArr.length; responseIndex++) {
                if (responseArr[responseIndex] && !responseArr[responseIndex].error) {
                    let response = responseArr[responseIndex].data ? responseArr[responseIndex].data[0] : "";
                    bbTicker[params[responseIndex]["idValue"]] = response["ticker"];
                }
            }
        }
        return bbTicker;
    }
    catch (error) {
        return error;
    }
}
exports.getBBTicker = getBBTicker;
function returnPositionProgress(positions, identifier, location) {
    let updateingPosition;
    for (let index = 0; index < positions.length; index++) {
        let position = positions[index];
        if ((position["ISIN"] == identifier || position["BB Ticker"] == identifier) && position["Location"] == location) {
            updateingPosition = position;
        }
    }
    return updateingPosition;
}
exports.returnPositionProgress = returnPositionProgress;
function updateExisitingPosition(positions, identifier, location, updatedPosition) {
    for (let index = 0; index < positions.length; index++) {
        let position = positions[index];
        if ((position["ISIN"] == identifier || position["BB Ticker"] == identifier) && position["Location"] == location) {
            positions[index] = updatedPosition;
        }
    }
    return positions;
}
exports.updateExisitingPosition = updateExisitingPosition;
async function updatePositionPortfolio(path) {
    let allTrades = await (0, readExcel_1.readCentralizedEBlot)(path);
    if (allTrades.error) {
        return { error: allTrades.error };
    }
    else {
        try {
            let data = allTrades[3];
            let positions = [];
            let portfolio = await getPortfolio();
            let triadaIds = [];
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                let originalFace = parseFloat(row["Original Face"]);
                let identifier = row["ISIN"] !== "" ? row["ISIN"].trim() : row["BB Ticker"].trim();
                let object = {};
                let location = row["Location"].trim();
                let securityInPortfolio = getSecurityInPortfolio(portfolio, identifier, location);
                let type = row["Trade Type"] == "vcon" ? "vcons" : row["Trade Type"].trim();
                if (securityInPortfolio !== 404) {
                    object = securityInPortfolio;
                    securityInPortfolio["Notional Amount"] = securityInPortfolio["Notional Amount"] ? securityInPortfolio["Notional Amount"] : securityInPortfolio["Quantity"];
                }
                let couponDaysYear = securityInPortfolio !== 404 ? securityInPortfolio["Coupon Duration"] : row["BB Ticker"].split(" ")[0] == "T" || row["BB Ticker"].includes("U.S") ? 365.0 : 360.0;
                let previousQuantity = securityInPortfolio["Notional Amount"];
                let previousAverageCost = securityInPortfolio["Average Cost"] ? securityInPortfolio["Average Cost"] : 0;
                let tradeType = row["B/S"];
                let operation = tradeType == "B" ? 1 : -1;
                let currentPrice = row["Price"] / (type == "vcons" ? 100 : 1);
                let currentQuantity = parseFloat(row["Notional Amount"].toString().replace(/,/g, "")) * operation;
                let currentNet = parseFloat(row["Settlement Amount"].toString().replace(/,/g, "")) * operation;
                let currentPrincipal = parseFloat(row["Principal"].toString().replace(/,/g, ""));
                let currency = row["Currency"];
                let bondCouponMaturity = (0, tools_1.parseBondIdentifier)(row["BB Ticker"]);
                let tradeDB = await findTrade(type, row["Triada Trade Id"], row["Seq No"] && row["Seq No"] != "" ? row["Seq No"] : null);
                let tradeExistsAlready = tradeDB || triadaIds.includes(row["Triada Trade Id"]);
                let updatingPosition = returnPositionProgress(positions, identifier, location);
                let tradeDate = new Date(row["Trade Date"]);
                let thisMonth = (0, common_3.monthlyRlzdDate)(tradeDate);
                let thisDay = (0, common_1.getDate)(tradeDate);
                let rlzdOperation = -1;
                if (updatingPosition) {
                    let accumlatedQuantityState = updatingPosition["Notional Amount"] > 0 ? 1 : -1;
                    if (operation == -1 * accumlatedQuantityState && updatingPosition["Notional Amount"] != 0) {
                        rlzdOperation = 1;
                    }
                }
                else {
                    let accumlatedQuantityState = previousQuantity > 0 ? 1 : -1;
                    if (operation == -1 * accumlatedQuantityState && previousQuantity) {
                        rlzdOperation = 1;
                    }
                }
                if (tradeExistsAlready) {
                    console.log(row["BB Ticker"], row["Trade Date"], row["Triada Trade Id"], " already exists", tradeDB, triadaIds.includes(row["Triada Trade Id"]));
                    if (allTrades[0]) {
                        allTrades[0] = allTrades[0].filter((trade, index) => trade["Triada Trade Id"] != row["Triada Trade Id"]);
                    }
                    if (allTrades[1]) {
                        allTrades[1] = allTrades[1].filter((trade, index) => trade["Triada Trade Id"] != row["Triada Trade Id"]);
                    }
                    if (allTrades[2]) {
                        allTrades[2] = allTrades[2].filter((trade, index) => trade["Triada Trade Id"] != row["Triada Trade Id"]);
                    }
                    return { error: "Trade: " + row["BB Ticker"] + " on date: " + row["Trade Date"] + " with id: " + row["Triada Trade Id"] + " already exists" };
                }
                if (!tradeExistsAlready && identifier !== "") {
                    triadaIds.push(row["Triada Trade Id"]);
                    if (!updatingPosition) {
                        let shortLongType = securityInPortfolio !== 404 ? (securityInPortfolio["Notional Amount"] >= 0 ? 1 : -1) : currentQuantity >= 0 ? 1 : -1;
                        let settlementDate = row["Settle Date"];
                        object["Location"] = row["Location"].trim();
                        object["Last Modified Date"] = new Date();
                        if (securityInPortfolio == 404) {
                            object["Entry Yield"] = row["Yield"] || 0;
                        }
                        object["BB Ticker"] = row["BB Ticker"];
                        object["ISIN"] = row["ISIN"].trim();
                        object["CUSIP"] = row["Cuisp"].trim() || "";
                        object["Notional Amount"] = securityInPortfolio !== 404 ? securityInPortfolio["Notional Amount"] + currentQuantity : currentQuantity;
                        let tradeRecord = null;
                        if (!tradeRecord) {
                            tradeRecord = (0, tools_1.findTradeRecord)(allTrades[0], row["Triada Trade Id"]);
                            if (tradeRecord.length > 0) {
                                tradeRecord[0]["Updated Notional"] = object["Notional Amount"];
                            }
                        }
                        // Attempt to find the trade record in allTrades[1], if not found previously
                        if (!tradeRecord || tradeRecord.length === 0) {
                            tradeRecord = (0, tools_1.findTradeRecord)(allTrades[1], row["Triada Trade Id"]);
                            if (tradeRecord.length > 0) {
                                tradeRecord[0]["Updated Notional"] = object["Notional Amount"];
                            }
                        }
                        // Attempt to find the trade record in allTrades[2], if not found previously
                        if (!tradeRecord || tradeRecord.length === 0) {
                            tradeRecord = (0, tools_1.findTradeRecord)(allTrades[2], row["Triada Trade Id"]);
                            if (tradeRecord.length > 0) {
                                tradeRecord[0]["Updated Notional"] = object["Notional Amount"];
                            }
                        }
                        object["Net"] = securityInPortfolio !== 404 ? securityInPortfolio["Net"] + currentNet : currentNet;
                        object["Currency"] = currency;
                        object["Average Cost"] = rlzdOperation == -1 ? (securityInPortfolio !== 404 ? (0, tools_1.getAverageCost)(currentQuantity, previousQuantity, currentPrice, previousAverageCost) : currentPrice) : securityInPortfolio["Average Cost"];
                        object["Coupon Rate"] = bondCouponMaturity.rate || 0;
                        object["Maturity"] = bondCouponMaturity.date || 0;
                        object["Interest"] = securityInPortfolio !== 404 ? (securityInPortfolio["Interest"] ? securityInPortfolio["Interest"] : {}) : {};
                        object["Interest"][settlementDate] = object["Interest"][settlementDate] ? object["Interest"][settlementDate] + currentQuantity : currentQuantity;
                        object["MTD Rlzd"] = securityInPortfolio !== 404 ? (securityInPortfolio["MTD Rlzd"] ? securityInPortfolio["MTD Rlzd"] : {}) : {};
                        object["MTD Rlzd"][thisMonth] = securityInPortfolio !== 404 ? (securityInPortfolio["MTD Rlzd"] ? (securityInPortfolio["MTD Rlzd"][thisMonth] ? securityInPortfolio["MTD Rlzd"][thisMonth] : []) : []) : [];
                        let MTDRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };
                        if (rlzdOperation == 1) {
                            object["MTD Rlzd"][thisMonth].push(MTDRlzdForThisTrade);
                        }
                        object["Day Rlzd"] = securityInPortfolio !== 404 ? (securityInPortfolio["Day Rlzd"] ? securityInPortfolio["Day Rlzd"] : {}) : {};
                        object["Day Rlzd"][thisDay] = securityInPortfolio !== 404 ? (securityInPortfolio["Day Rlzd"] ? (securityInPortfolio["Day Rlzd"][thisDay] ? securityInPortfolio["Day Rlzd"][thisDay] : []) : []) : [];
                        let dayRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };
                        if (rlzdOperation == 1) {
                            object["Day Rlzd"][thisDay].push(dayRlzdForThisTrade);
                        }
                        if (securityInPortfolio !== 404) {
                            securityInPortfolio["Cost MTD"] = {};
                        }
                        object["Cost MTD"] = securityInPortfolio !== 404 ? securityInPortfolio["Cost MTD"] : {};
                        let curentMonthCost = securityInPortfolio !== 404 ? (parseFloat(securityInPortfolio["Cost MTD"][thisMonth]) ? parseFloat(securityInPortfolio["Cost MTD"][thisMonth]) : 0) : 0;
                        object["Cost MTD"][thisMonth] = operation == 1 ? (securityInPortfolio !== 404 ? curentMonthCost + parseFloat(currentPrincipal) : parseFloat(currentPrincipal)) : 0;
                        object["Original Face"] = originalFace;
                        if (!object["Entry Price"]) {
                            object["Entry Price"] = {};
                        }
                        if (!object["Entry Price"][thisMonth]) {
                            object["Entry Price"][thisMonth] = currentPrice;
                        }
                        object["Last Individual Upload Trade"] = new Date();
                        positions.push(object);
                    }
                    else if (returnPositionProgress(positions, identifier, location)) {
                        let shortLongType = securityInPortfolio !== 404 ? (securityInPortfolio["Notional Amount"] + updatingPosition["Notional Amount"] >= 0 ? 1 : -1) : updatingPosition["Notional Amount"] >= 0 ? 1 : -1;
                        let settlementDate = row["Settle Date"];
                        object["Location"] = row["Location"].trim();
                        object["Last Modified Date"] = new Date();
                        object["BB Ticker"] = row["BB Ticker"];
                        object["ISIN"] = row["ISIN"];
                        object["Currency"] = currency;
                        object["Notional Amount"] = currentQuantity + updatingPosition["Notional Amount"];
                        let tradeRecord = null;
                        if (!tradeRecord) {
                            tradeRecord = (0, tools_1.findTradeRecord)(allTrades[0], row["Triada Trade Id"]);
                            if (tradeRecord.length > 0) {
                                tradeRecord[0]["Updated Notional"] = object["Notional Amount"];
                            }
                        }
                        if (!tradeRecord) {
                            tradeRecord = (0, tools_1.findTradeRecord)(allTrades[1], row["Triada Trade Id"]);
                            if (tradeRecord.length > 0) {
                                tradeRecord[0]["Updated Notional"] = object["Notional Amount"];
                            }
                        }
                        if (!tradeRecord) {
                            tradeRecord = (0, tools_1.findTradeRecord)(allTrades[2], row["Triada Trade Id"]);
                            if (tradeRecord.length > 0) {
                                tradeRecord[0]["Updated Notional"] = object["Notional Amount"];
                            }
                        }
                        object["Net"] = currentNet + updatingPosition["Net"];
                        object["Average Cost"] = rlzdOperation == -1 ? (0, tools_1.getAverageCost)(currentQuantity, updatingPosition["Notional Amount"], currentPrice, parseFloat(updatingPosition["Average Cost"])) : updatingPosition["Average Cost"];
                        // this is reversed because the quantity is negated
                        object["Cost MTD"] = updatingPosition["Cost MTD"];
                        object["Cost MTD"][thisMonth] += operation == 1 ? currentPrincipal : 0;
                        object["Coupon Rate"] = bondCouponMaturity.rate || 0;
                        object["Maturity"] = bondCouponMaturity.date || 0;
                        object["Interest"] = updatingPosition["Interest"];
                        object["Interest"][settlementDate] = object["Interest"][settlementDate] ? object["Interest"][settlementDate] + currentQuantity : currentQuantity;
                        object["Original Face"] = originalFace;
                        object["Coupon Duration"] = object["Coupon Rate"] ? couponDaysYear : "";
                        object["Entry Price"] = updatingPosition["Entry Price"];
                        object["MTD Rlzd"] = updatingPosition["MTD Rlzd"];
                        let MTDRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };
                        if (rlzdOperation == 1) {
                            object["MTD Rlzd"][thisMonth] = object["MTD Rlzd"][thisMonth] ? object["MTD Rlzd"][thisMonth] : [];
                            object["MTD Rlzd"][thisMonth].push(MTDRlzdForThisTrade);
                        }
                        object["Day Rlzd"] = updatingPosition["Day Rlzd"];
                        let dayRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };
                        if (rlzdOperation == 1) {
                            object["Day Rlzd"][thisDay] = object["Day Rlzd"][thisDay] ? object["Day Rlzd"][thisDay] : [];
                            object["Day Rlzd"][thisDay].push(dayRlzdForThisTrade);
                        }
                        object["Last Individual Upload Trade"] = new Date();
                        positions = updateExisitingPosition(positions, identifier, location, object);
                    }
                }
            }
            try {
                let updatedPortfolio = (0, tools_1.formatUpdatedPositions)(positions, portfolio, "Last Upload Trade");
                let insertion = await insertTradesInPortfolio(updatedPortfolio[0]);
                let action3 = await insertTrade(allTrades[2], "emsx");
                let action2 = await insertTrade(allTrades[1], "ib");
                let action1 = await insertTrade(allTrades[0], "vcons");
                let dateTime = (0, common_3.getDateTimeInMongoDBCollectionFormat)(new Date());
                await (0, operations_1.insertEditLogs)([insertion.toString()], "Upload Trades", dateTime, "Num of updated/created positions: " + Object.keys(positions).length, "Link: " + path);
                return insertion;
            }
            catch (error) {
                return { error: error };
            }
        }
        catch (error) {
            return { error: error };
        }
    }
}
exports.updatePositionPortfolio = updatePositionPortfolio;
async function insertTradesInPortfolio(trades) {
    const database = client.db("portfolios");
    // Create an array of updateOne operations
    let day = (0, common_3.getDateTimeInMongoDBCollectionFormat)(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000));
    let operations = trades
        .filter((trade) => trade["Location"])
        .map((trade) => {
        // Start with the known filters
        let filters = [];
        // If "ISIN", "BB Ticker", or "BB Ticker" exists, check for both the field and "Location"
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
        const date = day;
        console.log(date, "inserted date");
        const historicalReportCollection = database.collection(`portfolio-${date}`);
        let action = await historicalReportCollection.bulkWrite(operations);
        return action;
    }
    catch (error) {
        return error;
    }
}
exports.insertTradesInPortfolio = insertTradesInPortfolio;
async function updatePricesPortfolio(path) {
    try {
        let data = await (0, readExcel_1.readPricingSheet)(path);
        if (data.error) {
            return data;
        }
        else {
            let updatedPricePortfolio = [];
            let portfolio = await getPortfolio();
            let currencyInUSD = {};
            let currencyStart = true;
            currencyInUSD["USD"] = 1;
            let divider = 1;
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                if (row["BB Ticker"] == "Bonds") {
                    currencyStart = false;
                    divider = 100;
                }
                else if (row["BB Ticker"] == "CDS") {
                    divider = 1;
                }
                else if (row["BB Ticker"] == "Futures") {
                    divider = 1;
                }
                if (!currencyStart) {
                    let positions = (0, operations_2.getSecurityInPortfolioWithoutLocation)(portfolio, row["Bloomberg ID"]);
                    if (positions == 404) {
                        positions = (0, operations_2.getSecurityInPortfolioWithoutLocation)(portfolio, row["ISIN"]);
                    }
                    if (positions == 404) {
                        positions = (0, operations_2.getSecurityInPortfolioWithoutLocation)(portfolio, row["BB Ticker"]);
                    }
                    if (positions == 404) {
                        positions = (0, operations_2.getSecurityInPortfolioWithoutLocation)(portfolio, row["CUSIP"]);
                    }
                    if (positions == 404) {
                        continue;
                    }
                    for (let index = 0; index < positions.length; index++) {
                        let object = positions[index];
                        object["Mid"] = parseFloat(row["Today's Mid"]) / divider;
                        object["Ask"] = parseFloat(row["Override Ask"]) > 0 ? parseFloat(row["Override Ask"]) / divider : parseFloat(row["Today's Ask (Broker)"]) > 0 ? parseFloat(row["Today's Ask (Broker)"]) / divider : parseFloat(row["Today's Ask"]) / divider;
                        object["Bid"] = parseFloat(row["Override Bid"]) > 0 ? parseFloat(row["Override Bid"]) / divider : parseFloat(row["Today's Bid (Broker)"]) > 0 ? parseFloat(row["Today's Bid (Broker)"]) / divider : parseFloat(row["Today's Bid"]) / divider;
                        object["YTM"] = row["Mid Yield call"].toString().includes("N/A") ? 0 : row["Mid Yield call"];
                        object["Broker"] = row["Broker"].toString().includes("N/A") ? "" : row["Broker"];
                        object["DV01"] = row["DV01"].toString().includes("N/A") ? 0 : row["DV01"];
                        object["YTW"] = row["Mid Yield Worst"].toString().includes("N/A") ? 0 : row["Mid Yield Worst"];
                        object["OAS"] = row["OAS Spread"].toString().includes("N/A") ? 0 : row["OAS Spread"];
                        object["Z Spread"] = row["Z Spread"].toString().includes("N/A") ? 0 : row["Z Spread"];
                        object["S&P Bond Rating"] = row["S&P Bond Rating"].toString().includes("N/A") ? "" : row["S&P Bond Rating"];
                        object["S&P Outlook"] = row["S&P Outlook"].toString().includes("N/A") ? "" : row["S&P Outlook"];
                        object["Moody's Bond Rating"] = row["Moody's Bond Rating"].toString().includes("N/A") ? "" : row["Moody's Bond Rating"];
                        object["Moody's Outlook"] = row["Moody's Outlook"].toString().includes("N/A") ? "" : row["Moody's Outlook"];
                        object["Fitch Bond Rating"] = row["Fitch Bond Rating"].toString().includes("N/A") ? "" : row["Fitch Bond Rating"];
                        object["Fitch Outlook"] = row["Fitch Outlook"].toString().includes("N/A") ? "" : row["Fitch Outlook"];
                        object["BBG Composite Rating"] = row["BBG Composite Rating"].toString().includes("N/A") ? "" : row["BBG Composite Rating"];
                        object["BB Ticker"] = row["BB Ticker"].toString().includes("N/A") ? "" : row["BB Ticker"];
                        object["Issuer"] = row["Issuer Name"].toString().includes("N/A") ? "" : row["Issuer Name"];
                        object["Bloomberg ID"] = row["Bloomberg ID"];
                        object["CUSIP"] = row["CUSIP"].toString().includes("N/A") ? "" : row["CUSIP"];
                        if (!row["Call Date"].includes("N/A") && !row["Call Date"].includes("#")) {
                            object["Call Date"] = row["Call Date"];
                        }
                        if (!row["Maturity"].includes("N/A") && !row["Maturity"].includes("#")) {
                            object["Maturity"] = row["Maturity"];
                        }
                        if (currencyInUSD[object["Currency"]]) {
                            object["FX Rate"] = currencyInUSD[object["Currency"]];
                        }
                        else {
                            object["FX Rate"] = 1;
                        }
                        if (row["Country"] && !row["Country"].includes("N/A")) {
                            object["Country"] = row["Country"];
                        }
                        if (row["Sector"] && !row["Sector"].includes("N/A")) {
                            object["Sector"] = row["Sector"];
                        }
                        updatedPricePortfolio.push(object);
                    }
                }
                else if (row["BB Ticker"].includes("Curncy") && currencyStart) {
                    let rate = row["Today's Mid"];
                    let currency = row["BB Ticker"].split(" ")[0];
                    if (currency == "USD") {
                        rate = 1 / rate;
                        currency = row["BB Ticker"].split(" ")[1];
                    }
                    currencyInUSD[currency] = rate;
                }
            }
            try {
                let dateTime = (0, common_3.getDateTimeInMongoDBCollectionFormat)(new Date());
                console.log(currencyInUSD);
                let updatedPortfolio = (0, tools_1.formatUpdatedPositions)(updatedPricePortfolio, portfolio, "Last Price Update");
                let insertion = await insertPricesUpdatesInPortfolio(updatedPortfolio[0]);
                await (0, operations_1.insertEditLogs)([updatedPortfolio[1]], "Update Prices", dateTime, "Num of Positions that did not update: " + Object.keys(updatedPortfolio[1]).length, "Link: " + path);
                if (!Object.keys(updatedPortfolio[1]).length) {
                    return updatedPortfolio[1];
                }
                else {
                    return { error: updatedPortfolio[1] };
                }
            }
            catch (error) {
                console.log(error);
                return { error: "Template does not match" };
            }
        }
    }
    catch (error) {
        console.log(error);
        return { error: error.toString() };
    }
}
exports.updatePricesPortfolio = updatePricesPortfolio;
async function insertPricesUpdatesInPortfolio(updatedPortfolio) {
    const database = client.db("portfolios");
    let portfolio = updatedPortfolio;
    let day = (0, common_3.getDateTimeInMongoDBCollectionFormat)(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000));
    // Create an array of updateOne operations
    // Execute the operations in bulk
    try {
        //so the latest updated version portfolio profits will not be copied into a new instance
        const updatedOperations = portfolio.map((position) => {
            // Start with the known filters
            const filters = [];
            // Only add the "BB Ticker" filter if it's present in the trade object
            if (position["ISIN"]) {
                filters.push({
                    ISIN: position["ISIN"],
                    Location: position["Location"],
                    _id: new ObjectId(position["_id"]),
                });
            }
            else if (position["BB Ticker"]) {
                filters.push({
                    "BB Ticker": position["BB Ticker"],
                    Location: position["Location"],
                    _id: new ObjectId(position["_id"]),
                });
            }
            return {
                updateOne: {
                    filter: { $or: filters },
                    update: { $set: position },
                    upsert: true,
                },
            };
        });
        console.log(day, "inserted date");
        let updatedCollection = database.collection(`portfolio-${day}`);
        let updatedResult = await updatedCollection.bulkWrite(updatedOperations);
        return updatedResult;
    }
    catch (error) {
        return error;
    }
}
exports.insertPricesUpdatesInPortfolio = insertPricesUpdatesInPortfolio;
function getDaysBetween(startDate, endDate) {
    // Parse the start and end dates into Date objects
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    // Calculate the difference in milliseconds
    const diffInMs = end - start;
    // Convert milliseconds to days (1 day = 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
    const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
    // Return the absolute value of the difference in days
    return Math.abs(Math.round(diffInDays)) || 0;
}
exports.getDaysBetween = getDaysBetween;
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
async function calculateMTDURlzd(portfolio, dateInput) {
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

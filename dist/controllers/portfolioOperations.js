"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertPricesUpdatesInPortfolio = exports.updatePricesPortfolio = exports.insertTradesInPortfolio = exports.updatePositionPortfolio = exports.uploadPortfolioFromLivePortfolio = exports.uploadPortfolioFromMufg = exports.uploadPortfolioFromImagine = exports.getBBTicker = exports.insertTrade = exports.getDailyEarnedInterestRlzPtf = exports.getSecurityInPortfolio = exports.getTrades = exports.getHistoricalPortfolio = exports.getPortfolio = exports.getAllCollectionDatesSinceStartMonth = exports.getEarliestCollectionName = exports.getHistoricalPortfolioWithAnalytics = void 0;
require("dotenv").config();
const portfolioFunctions_1 = require("./portfolioFunctions");
const util_1 = __importDefault(require("util"));
const common_1 = require("./common");
const xlsx = require("xlsx");
const fs = require('fs');
const writeFile = util_1.default.promisify(fs.writeFile);
const { PassThrough } = require('stream');
const axios = require("axios");
const { MongoClient, ServerApiVersion } = require('mongodb');
const mongoose = require('mongoose');
const uri = "mongodb+srv://alaa:" + process.env.MONGODBPASSWORD + "@atlascluster.zpfpywq.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
let day = new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
mongoose.connect(uri, {
    useNewUrlParser: true
});
async function getHistoricalPortfolioWithAnalytics(date) {
    const database = client.db("portfolios");
    let lastDate = await getEarliestCollectionName(date);
    let yesterdayPortfolioName = new Date(new Date(date).getTime() - 1 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let lastDayBeforeToday = await getEarliestCollectionName(yesterdayPortfolioName);
    const reportCollection = database.collection(`portfolio-${lastDate}`);
    let documents = await reportCollection.aggregate([
        {
            $sort: {
                "BB Ticker": 1 // replace 'BB Ticker' with the name of the field you want to sort alphabetically
            }
        }
    ]).toArray();
    let now = new Date(date);
    let currentMonth = now.getMonth();
    let currentYear = now.getFullYear();
    let thisMonth = (0, common_1.monthlyRlzdDate)(date);
    documents = documents.filter((position) => {
        let lastModifiedDate = new Date(position["Last Modified Date"]);
        if (position["Quantity"] == 0) {
            let monthsTrades = Object.keys(position["Monthly Capital Gains Rlzd"]);
            if (monthsTrades.includes(thisMonth)) {
                return position;
            }
        }
        else {
            return position;
        }
    });
    documents.sort((current, next) => {
        if (current["Quantity"] === 0 && next["Quantity"] !== 0) {
            return 1; // a should come after b
        }
        if (current["Quantity"] !== 0 && next["Quantity"] === 0) {
            return -1; // a should come before b
        }
        // if both a and b have Quantity 0 or both have Quantity not 0, sort alphabetically by name
        return current["Issue"].localeCompare(next["Issue"]);
    });
    let currentDayDate = new Date(new Date(date).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let previousMonthDates = (0, portfolioFunctions_1.getAllDatesSinceLastMonthLastDay)(currentDayDate);
    let lastMonthLastCollectionName = await getEarliestCollectionName(previousMonthDates[0]);
    try {
        let lastMonthPortfolio = await getHistoricalPortfolio(lastMonthLastCollectionName);
        let previousDayDate = new Date(new Date(date).getTime() - 16 * 60 * 60 * 1000).toISOString().slice(0, 10);
        let previousDayPortfolio = await getHistoricalPortfolio(lastDayBeforeToday);
        documents = await getMTDParams(documents, lastMonthPortfolio);
        documents = await getPreviousDayMarkPTFURLZD(documents, previousDayPortfolio);
    }
    catch (error) {
        console.log(error);
    }
    documents = await calculateMonthlyInterest(documents, new Date(date));
    documents = await calculateDailyInterestUnRlzdCapitalGains(documents, new Date(date));
    documents = await calculateMonthlyURlzd(documents);
    documents = calculateMonthlyDailyRlzdPTFPL(documents, date);
    // documents = removeWeirdIsin(documents)
    return documents;
}
exports.getHistoricalPortfolioWithAnalytics = getHistoricalPortfolioWithAnalytics;
async function getEarliestCollectionName(originalDate) {
    const database = client.db("portfolios");
    let collections = await database.listCollections().toArray();
    for (let index = 0; index < collections.length; index++) {
        let collection = collections[index];
        if (collection.name == `portfolio-${originalDate}`) {
            return originalDate;
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
    let predecessorDates = dates.filter(date => date < inputDate);
    if (predecessorDates.length == 0) {
        return null;
    }
    let predecessorDate = new Date(Math.max.apply(null, predecessorDates));
    //hong kong time difference with utc
    if (predecessorDate) {
        predecessorDate = new Date(new Date(predecessorDate).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
    return predecessorDate;
}
exports.getEarliestCollectionName = getEarliestCollectionName;
async function getAllCollectionDatesSinceStartMonth(originalDate) {
    const database = client.db("portfolios");
    let collections = await database.listCollections().toArray();
    let currentDayDate = new Date(new Date(originalDate).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let previousMonthDates = (0, portfolioFunctions_1.getAllDatesSinceLastMonthLastDay)(currentDayDate);
    let dates = [];
    for (let collectionIndex = 0; collectionIndex < collections.length; collectionIndex++) {
        let collection = collections[collectionIndex];
        let collectionDateName = collection.name.split("-");
        let collectionDate = collectionDateName[1] + "/" + collectionDateName[2] + "/" + collectionDateName[3];
        collectionDate = new Date(collectionDate);
        if (collectionDate.getTime() > new Date(previousMonthDates[0]) && collectionDate.getTime() < new Date(previousMonthDates[(previousMonthDates.length - 1)])) {
            collectionDate = new Date(new Date(collectionDate).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
            dates.push(`portfolio-${collectionDate}`);
        }
    }
    return dates;
}
exports.getAllCollectionDatesSinceStartMonth = getAllCollectionDatesSinceStartMonth;
async function getPortfolio() {
    try {
        const database = client.db("portfolios");
        let lastDate = await getEarliestCollectionName(day);
        const reportCollection = database.collection(`portfolio-${lastDate}`);
        let documents = await reportCollection.find().toArray();
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
    return documents;
}
exports.getHistoricalPortfolio = getHistoricalPortfolio;
async function getTrades(tradeType) {
    try {
        const database = client.db("trades");
        const reportCollection = database.collection(`${tradeType}`);
        let documents = await reportCollection.find().sort({ "Trade Date": -1 }).toArray();
        return documents;
    }
    catch (error) {
        return error;
    }
}
exports.getTrades = getTrades;
function getSecurityInPortfolio(portfolio, identifier, location) {
    let document = 404;
    for (let index = 0; index < portfolio.length; index++) {
        let issue = portfolio[index];
        if ((identifier.includes(issue["ISIN"]) || identifier.includes(issue["Issue"])) && issue["Location"] == location) {
            if (issue["ISIN"] != "") {
                document = issue;
            }
        }
        else if (identifier.includes(issue["BB Ticker"]) && issue["Location"] == location) {
            if (issue["BB Ticker"] != "") {
                document = issue;
            }
        }
    }
    // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
    return document;
}
exports.getSecurityInPortfolio = getSecurityInPortfolio;
async function getDailyEarnedInterestRlzPtf(dates) {
    let dailyInterestSum = {};
    let realizedProfit = {};
    let lastMonthLastDayPortfolio = await getHistoricalPortfolio(dates[0]);
    let mtd = {};
    for (let index = 1; index < dates.length; index++) {
        let date = dates[index];
        let portfolio = await getHistoricalPortfolio(date).then((responese) => {
            for (let y = 0; y < responese.length; y++) {
                let security = responese[y];
                if (dailyInterestSum[security["Issue"]]) {
                    dailyInterestSum[security["Issue"]] += security["Daily P&L Interest"];
                }
                else {
                    dailyInterestSum[security["Issue"]] = security["Daily P&L Interest"];
                }
                if (realizedProfit[security["Issue"]]) {
                    realizedProfit[security["Issue"]] += security["Daily P&L Rlzd"];
                }
                else {
                    // If it doesn't exist, set it equal to dailyInterest
                    realizedProfit[security["Issue"]] = security["Daily P&L Rlzd"];
                }
            }
        });
    }
    for (let z = 0; z < lastMonthLastDayPortfolio.length; z++) {
        const security = lastMonthLastDayPortfolio[z];
        mtd[security["Issue"]] = security["Mid"];
    }
    let object = {
        "monthlyInterest": dailyInterestSum,
        "monthlyRealizedProfit": realizedProfit,
        "lastMonthLastDayPortfolio": mtd
    };
    return object;
}
exports.getDailyEarnedInterestRlzPtf = getDailyEarnedInterestRlzPtf;
async function insertTrade(trades, tradeType) {
    const database = client.db("trades");
    const reportCollection = database.collection(`${tradeType}`);
    const operations = trades.map((trade) => ({
        updateOne: {
            filter: { "Triada Trade Id": trade["Triada Trade Id"] },
            update: { $set: trade },
            upsert: true
        }
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
async function tradesSequalNumbers() {
    try {
        const database = client.db("trades");
        const reportCollection = database.collection("vcons");
        const document = await reportCollection.find().toArray();
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
                    "X-OPENFIGI-APIKEY": process.env.OPEN_FIGI_API_KEY
                }
            });
            let responseArr = action.data;
            for (let responseIndex = 0; responseIndex < responseArr.length; responseIndex++) {
                if (responseArr[responseIndex] && (!responseArr[responseIndex].error)) {
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
async function uploadPortfolioFromImagine(path) {
    let data = await (0, portfolioFunctions_1.readPortfolioFromImagine)(path);
    if (data.error) {
        return data;
    }
    else {
        try {
            let positions = {};
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                let identifier = (row["BB Ticker"]);
                let object = {};
                let previousAverageCost = 0;
                let tradeType = row["Buy/Sell"];
                let operation = tradeType == "B" ? 1 : -1;
                let currentPrice = row["Price"];
                let currentQuantity = parseFloat(row["Quantity"]); //
                let currentNet = parseFloat(row["Net"]); //
                let bondCouponMaturity = (0, portfolioFunctions_1.parseBondIdentifier)(row["BB Ticker"]); //Issue
                let settlementDate = (0, portfolioFunctions_1.getSettlementDateYear)(row["Trade Date"], row["Settle Date"]);
                object["Mid"] = row["Mid"]; //only for upload portfolio from imagine
                object["BB Ticker"] = row["BB Ticker"];
                object["Location"] = row["Location"];
                object["ISIN"] = row["ISIN"];
                object["Quantity"] = currentQuantity;
                object["Net"] = currentNet;
                object["Currency"] = row["Currency"] == "" ? "USD" : row["Currency"];
                object["Average Cost"] = (currentPrice) ? currentPrice / 100.00 : 0;
                object["Coupon Rate"] = bondCouponMaturity[0] == "" ? "Not Applicable" : bondCouponMaturity[0];
                object["Maturity"] = bondCouponMaturity[1] == "Invalid Date" ? "Not Applicable" : bondCouponMaturity[1];
                let interestQuantity;
                object["Interest"] = {};
                interestQuantity = currentQuantity;
                object["Interest"][settlementDate] = interestQuantity;
                object["Daily P&L Rlzd"] = operation == -1 ? (parseFloat(currentQuantity) * (previousAverageCost - currentPrice)) : 0;
                object["Day Rlzd K G/L"] = 0;
                object["Monthly Capital Gains Rlzd"] = {};
                object["Monthly Capital Gains Rlzd"]["2023/09"] = 0;
                positions[identifier] = object;
            }
            try {
                let insertion = await insertTradesInPortfolio(Object.values(positions));
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
exports.uploadPortfolioFromImagine = uploadPortfolioFromImagine;
async function uploadPortfolioFromMufg(path) {
    let data = await (0, portfolioFunctions_1.readMUFGEBlot)(path);
    if (data.error) {
        return data;
    }
    else {
        try {
            let positions = [];
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                let identifier = (row["Issue"]);
                let object = {};
                let previousAverageCost = 0;
                let tradeType = row["Buy/Sell"];
                let operation = tradeType == "B" ? 1 : -1;
                let currentPrice = row["Price"];
                let currentQuantity = parseFloat(row["Quantity"]); //
                let currentNet = parseFloat(row["Net"]); //
                let bondCouponMaturity = (0, portfolioFunctions_1.parseBondIdentifier)(row["BB Ticker"]); //Issue
                let settlementDate = (0, portfolioFunctions_1.getSettlementDateYear)(row["Trade Date"], row["Settle Date"]);
                object["Mid"] = row["Mid"]; //only for upload portfolio from imagine
                object["BB Ticker"] = row["BB Ticker"];
                object["Location"] = row["Location"];
                object["Issue"] = row["Issue"];
                object["ISIN"] = row["ISIN"];
                object["Quantity"] = currentQuantity;
                object["Net"] = currentNet;
                object["Average Cost"] = row["Average Cost"] ? row["Average Cost"] : 0;
                object["Coupon Rate"] = bondCouponMaturity[0] == "" ? "Not Applicable" : bondCouponMaturity[0];
                object["Maturity"] = bondCouponMaturity[1] == "Invalid Date" ? "Not Applicable" : bondCouponMaturity[1];
                let interestQuantity;
                object["Interest"] = {};
                interestQuantity = currentQuantity;
                object["Interest"][settlementDate] = interestQuantity;
                object["Daily P&L Rlzd"] = operation == -1 ? (parseFloat(currentQuantity) * (previousAverageCost - currentPrice)) : 0;
                object["Day Rlzd K G/L"] = {};
                object["Monthly Capital Gains Rlzd"] = {};
                object["Monthly Capital Gains Rlzd"]["2023/09"] = 0;
                object["Currency"] = row["Currency"];
                positions.push(object);
            }
            try {
                let insertion = await insertTradesInPortfolio(positions);
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
exports.uploadPortfolioFromMufg = uploadPortfolioFromMufg;
async function uploadPortfolioFromLivePortfolio(path) {
    let data = await (0, portfolioFunctions_1.readPortfolioFromLivePorfolio)(path);
    if (data.error) {
        return data;
    }
    else {
        try {
            let positions = {};
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                let identifier = row["BB Ticker"];
                let object = {};
                let tradeType = row["Buy/Sell"];
                let operation = tradeType == "B" ? 1 : -1;
                let currentPrice = row["Price"] / 100.00;
                let currentQuantity = parseFloat(row["Quantity"]);
                let currentNet = row["Quantity"];
                let bondCouponMaturity = (0, portfolioFunctions_1.parseBondIdentifier)(row["BB Ticker"]);
                let settlementDate = (0, portfolioFunctions_1.getSettlementDateYear)(row["Trade Date"], row["Settle Date"]);
                object["BB Ticker"] = row["BB Ticker"];
                object["Issue"] = row["BB Ticker"];
                object["Quantity"] = currentQuantity;
                object["Net"] = currentNet;
                object["Currency"] = row["Currency"] == "" ? "USD" : row["Currency"];
                object["Average Cost"] = row["Average Cost"];
                object["Coupon Rate"] = bondCouponMaturity[0];
                object["Maturity"] = bondCouponMaturity[1];
                let interestQuantity;
                object["Interest"] = {};
                interestQuantity = currentQuantity;
                object["Interest"][settlementDate] = interestQuantity;
                object["Day Rlzd K G/L"] = 0;
                object["Monthly Capital Gains Rlzd"] = {};
                object["Monthly Capital Gains Rlzd"]["2023/09"] = 0;
                positions[identifier] = object;
            }
            try {
                let logs = `date: ${(0, common_1.getDate)(null) + " " + (0, common_1.getTime)()} e-blot-link: ${path}} \n\n`;
                await writeFile('trades-logs.txt', logs, { flag: 'a' });
                let updatedPortfolio = (0, portfolioFunctions_1.formatUpdatedPositions)(positions, []);
                let insertion = await insertTradesInPortfolio(updatedPortfolio);
                return updatedPortfolio;
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
exports.uploadPortfolioFromLivePortfolio = uploadPortfolioFromLivePortfolio;
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
function updateExisitingPosition(positions, identifier, location, updatedPosition) {
    for (let index = 0; index < positions.length; index++) {
        let position = positions[index];
        if ((position["ISIN"] == identifier || position["BB Ticker"] == identifier) && position["Location"] == location) {
            positions[index] = updatedPosition;
        }
    }
    return positions;
}
async function updatePositionPortfolio(pathBbg, pathIb) {
    let data1 = pathBbg ? await (0, portfolioFunctions_1.readVconEBlot)(pathBbg) : [];
    let data2 = pathIb ? await (0, portfolioFunctions_1.readIBTrades)(pathIb) : [];
    let ibTradesInVcon = (0, portfolioFunctions_1.formatIbTradesToVcon)(data2);
    let data = [...data1, ...ibTradesInVcon];
    if (data1.error || data2.error) {
        return { error: (data1.error || data2.error) };
    }
    else {
        try {
            let positions = [];
            let portfolio = await getPortfolio();
            let sequalNumbers = await tradesSequalNumbers();
            let thisMonth = (0, common_1.monthlyRlzdDate)(day);
            let bbbCurrency = {
                "$": "USD",
                "A$": "AUD",
                "€": "EURO",
                "£": "GBP",
                "SGD": "SGD"
            };
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                let identifier = (row["ISIN"] !== "") ? row["ISIN"] : (row["BB Ticker"] ? row["BB Ticker"] : row["Issue"]);
                let object = {};
                let location = row["Location"].trim();
                let securityInPortfolio = getSecurityInPortfolio(portfolio, identifier, location);
                let previousQuantity = securityInPortfolio["Quantity"];
                let previousAverageCost = (securityInPortfolio["Average Cost"]) ? (securityInPortfolio["Average Cost"]) : 0;
                let tradeType = row["Buy/Sell"];
                let operation = tradeType == "B" ? 1 : -1;
                let currentPrice = row["Price"] / 100.00;
                let currentQuantity = parseFloat(row["Quantity"].replace(/,/g, '')) * operation;
                let currentNet = parseFloat(row["Net"].replace(/,/g, '')) * operation;
                let currency = row["Currency Symbol"] ? (row["Currency Symbol"] == "" ? "USD" : bbbCurrency[row["Currency Symbol"]]) : row["Currency"];
                let bondCouponMaturity = (0, portfolioFunctions_1.parseBondIdentifier)(row["BB Ticker"]);
                let tradeExistsAlready = sequalNumbers.includes(row["Triada Trade Id"]);
                let updatingPosition = returnPositionProgress(positions, identifier, location);
                let thisDay = (0, common_1.getDate)(day);
                let rlzdOperation = -1;
                if (updatingPosition) {
                    let accumlatedQuantityState = previousQuantity < 0 || updatingPosition["Quantity"] < 0 ? -1 : 1;
                    if (operation == -1 * accumlatedQuantityState) {
                        rlzdOperation = 1;
                    }
                }
                else {
                    let accumlatedQuantityState = previousQuantity < 0 ? -1 : 1;
                    if (operation == -1 * accumlatedQuantityState) {
                        rlzdOperation = 1;
                    }
                }
                if (row["Status"] == "Accepted" && !(tradeExistsAlready) && identifier !== "") {
                    sequalNumbers.push(row["Triada Trade Id"]);
                    if (!updatingPosition) {
                        let settlementDate = (0, portfolioFunctions_1.getSettlementDateYear)(row["Trade Date"], row["Settle Date"]);
                        object["Location"] = row["Location"];
                        object["Last Modified Date"] = new Date();
                        object["BB Ticker"] = row["BB Ticker"];
                        object["Issue"] = row["Issue"];
                        object["ISIN"] = row["ISIN"];
                        object["Quantity"] = securityInPortfolio !== 404 ? securityInPortfolio["Quantity"] + currentQuantity : currentQuantity;
                        object["Net"] = securityInPortfolio !== 404 ? securityInPortfolio["Net"] + currentNet : currentNet;
                        object["Currency"] = currency;
                        object["Average Cost"] = securityInPortfolio !== 404 ? (0, portfolioFunctions_1.getAverageCost)(currentQuantity, previousQuantity, currentPrice, previousAverageCost) : currentPrice;
                        object["Coupon Rate"] = bondCouponMaturity[0] == "" ? "Not Applicable" : bondCouponMaturity[0];
                        object["Maturity"] = bondCouponMaturity[1] == "Invalid Date" ? "Not Applicable" : bondCouponMaturity[1];
                        object["Interest"] = securityInPortfolio !== 404 ? (securityInPortfolio["Interest"] ? securityInPortfolio["Interest"] : {}) : {};
                        object["Interest"][settlementDate] = object["Interest"][settlementDate] ? object["Interest"][settlementDate] + currentQuantity : currentQuantity;
                        if (previousAverageCost != 0) {
                            object["Day Rlzd K G/L"] = securityInPortfolio !== 404 ? securityInPortfolio["Day Rlzd K G/L"] : {};
                            let currentDayRlzdPl = parseFloat(securityInPortfolio["Day Rlzd K G/L"][thisDay]) ? parseFloat(securityInPortfolio["Day Rlzd K G/L"][thisDay]) : 0;
                            let priceDifference = (parseFloat(previousAverageCost) - parseFloat(currentPrice));
                            object["Day Rlzd K G/L"][thisDay] = rlzdOperation == 1 ? parseFloat(currentQuantity) * parseFloat(priceDifference) + currentDayRlzdPl : 0;
                        }
                        else {
                            object["Day Rlzd K G/L"] = securityInPortfolio !== 404 ? securityInPortfolio["Day Rlzd K G/L"] : {};
                            if (rlzdOperation == 1) {
                                let currentDayRlzdPl = securityInPortfolio !== 404 ? parseFloat(securityInPortfolio["Day Rlzd K G/L"][thisDay]) ? parseFloat(securityInPortfolio["Day Rlzd K G/L"][thisDay]) : 0 : 0;
                                object["Day Rlzd K G/L"][thisDay] = currentDayRlzdPl;
                            }
                            else {
                                let currentDayRlzdPl = securityInPortfolio !== 404 ? parseFloat(securityInPortfolio["Day Rlzd K G/L"][thisDay]) ? parseFloat(securityInPortfolio["Day Rlzd K G/L"][thisDay]) : 0 : 0;
                                object["Day Rlzd K G/L"][thisDay] = currentDayRlzdPl;
                            }
                        }
                        object["Monthly Capital Gains Rlzd"] = securityInPortfolio !== 404 ? securityInPortfolio["Monthly Capital Gains Rlzd"] : {};
                        let curentMonthRlzdPL = securityInPortfolio !== 404 ? parseFloat(securityInPortfolio["Monthly Capital Gains Rlzd"][thisMonth]) ? parseFloat(securityInPortfolio["Monthly Capital Gains Rlzd"][thisMonth]) : 0 : 0;
                        object["Monthly Capital Gains Rlzd"][thisMonth] = securityInPortfolio !== 404 ? curentMonthRlzdPL + object["Day Rlzd K G/L"][thisDay] : object["Day Rlzd K G/L"][thisDay];
                        positions.push(object);
                    }
                    else if (returnPositionProgress(positions, identifier, location)) {
                        let settlementDate = (0, portfolioFunctions_1.getSettlementDateYear)(row["Trade Date"], row["Settle Date"]);
                        object["Location"] = row["Location"];
                        object["Last Modified Date"] = new Date();
                        object["BB Ticker"] = row["BB Ticker"];
                        object["Issue"] = row["Issue"];
                        object["ISIN"] = row["ISIN"];
                        object["Currency"] = currency;
                        object["Quantity"] = currentQuantity + updatingPosition["Quantity"];
                        object["Net"] = (currentNet) + updatingPosition["Net"];
                        object["Average Cost"] = (0, portfolioFunctions_1.getAverageCost)(currentQuantity + updatingPosition["Quantity"], previousQuantity, currentPrice, parseFloat(updatingPosition["Average Cost"]));
                        object["Day Rlzd K G/L"] = updatingPosition["Day Rlzd K G/L"];
                        object["Day Rlzd K G/L"][thisDay] = object["Day Rlzd K G/L"][thisDay] ? object["Day Rlzd K G/L"][thisDay] : 0;
                        let currentDailyProfitLoss = (parseFloat(currentQuantity) * (parseFloat(updatingPosition["Average Cost"]) - parseFloat(currentPrice)));
                        object["Day Rlzd K G/L"][thisDay] = rlzdOperation == 1 ? currentDailyProfitLoss + updatingPosition["Day Rlzd K G/L"][thisDay] : 0;
                        object["Monthly Capital Gains Rlzd"] = updatingPosition["Monthly Capital Gains Rlzd"];
                        object["Monthly Capital Gains Rlzd"][thisMonth] = rlzdOperation == 1 ? parseFloat(updatingPosition["Monthly Capital Gains Rlzd"][thisMonth]) + currentDailyProfitLoss : parseFloat(updatingPosition["Monthly Capital Gains Rlzd"][thisMonth]);
                        object["Coupon Rate"] = bondCouponMaturity[0] == "" ? "Not Applicable" : bondCouponMaturity[0];
                        object["Maturity"] = bondCouponMaturity[1] == "Invalid Date" ? "Not Applicable" : bondCouponMaturity[1];
                        object["Interest"] = updatingPosition["Interest"];
                        object["Interest"][settlementDate] = object["Interest"][settlementDate] ? object["Interest"][settlementDate] + currentQuantity : currentQuantity;
                        positions = updateExisitingPosition(positions, identifier, location, object);
                    }
                }
            }
            try {
                let logs = `date: ${(0, common_1.getDate)(null) + " " + (0, common_1.getTime)()} e-blot-link: ${pathBbg}} \n\n`;
                await writeFile('trades-logs.txt', logs, { flag: 'a' });
                let action1 = await insertTrade(data1, "vcons");
                let action2 = await insertTrade(data2, "ib");
                let updatedPortfolio = (0, portfolioFunctions_1.formatUpdatedPositions)(positions, portfolio);
                let insertion = await insertTradesInPortfolio(updatedPortfolio);
                return positions;
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
    const operations = trades.filter((trade) => trade["Location"]).map((trade) => {
        // Start with the known filters
        const filters = [];
        // If "ISIN", "BB Ticker", or "Issue" exists, check for both the field and "Location"
        if (trade["ISIN"]) {
            filters.push({
                "ISIN": trade["ISIN"], "Location": trade["Location"]
            });
        }
        if (trade["BB Ticker"]) {
            filters.push({
                "BB Ticker": trade["BB Ticker"], "Location": trade["Location"]
            });
        }
        if (trade["Issue"]) {
            filters.push({
                "Issue": trade["Issue"], "Location": trade["Location"]
            });
        }
        delete trade["_id"];
        return {
            updateOne: {
                filter: { $or: filters },
                update: { $setOnInsert: trade },
                upsert: true
            }
        };
    });
    // Execute the operations in bulk
    try {
        const date = day;
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
        const data = await (0, portfolioFunctions_1.readPricingSheet)(path);
        if (data.error) {
            return data;
        }
        else {
            let updatedPricePortofolio = [];
            let portfolio = await getPortfolio();
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                let object = getSecurityInPortfolio(portfolio, row["ISIN"], row["Trade Idea Code"]);
                if (object == 404) {
                    object = getSecurityInPortfolio(portfolio, row["BB Ticker"], row["Trade Idea Code"]);
                }
                if (object == 404) {
                    continue;
                }
                object["Mid"] = parseFloat(row["Today's Mid"]) / 100.00;
                object["Ask"] = parseFloat(row["Today's Ask"]) / 100.00;
                object["Bid"] = parseFloat(row["Today's Bid"]) / 100.00;
                object["YTM"] = row["Mid Yield Maturity"];
                object["DV01"] = row["DV01"];
                object["Country"] = row["Country"];
                object["Call Date"] = row["Call Date"];
                object["Last Price Update"] = new Date();
                updatedPricePortofolio.push(object);
            }
            try {
                let logs = `date: ${new Date()} e-blot-link: ${path} \n\n`;
                await writeFile('prices-logs.txt', logs, { flag: 'a' }); // 'a' flag for append mode
                let action = await insertPricesUpdatesInPortfolio(updatedPricePortofolio);
                return action;
            }
            catch (error) {
                return error;
            }
        }
    }
    catch (error) {
        return error;
    }
}
exports.updatePricesPortfolio = updatePricesPortfolio;
async function insertPricesUpdatesInPortfolio(prices) {
    const database = client.db("portfolios");
    let portfolio = await getPortfolio();
    // Create an array of updateOne operations
    const operations = prices.map((price) => {
        // Start with the known filters
        const filters = [];
        // Only add the "Issue" filter if it's present in the trade object
        if (price["Issue"]) {
            filters.push({
                "Issue": price["Issue"], "Location": price["Location"]
            });
        }
        if (price["ISIN"]) {
            filters.push({
                "ISIN": price["ISIN"], "Location": price["Location"]
            });
        }
        if (price["BB Ticker"]) {
            filters.push({
                "BB Ticker": price["BB Ticker"], "Location": price["Location"]
            });
        }
        delete price["_id"];
        return {
            updateOne: {
                filter: { $or: filters },
                update: { $set: price },
            }
        };
    });
    // Execute the operations in bulk
    try {
        const date = day;
        let collections = await database.listCollections({ name: `portfolio-${date}` }).toArray();
        if (collections.length > 0) {
            const historicalReportCollection = database.collection(`portfolio-${date}`);
            let action = await historicalReportCollection.bulkWrite(operations);
            return action;
        }
        else {
            //so the latest updated version portfolio profits will not be copied into a new instance
            const updatedOperations = portfolio.map((position) => {
                // Start with the known filters
                const filters = [];
                // Only add the "Issue" filter if it's present in the trade object
                if (position["Issue"]) {
                    filters.push({ "Issue": position["Issue"], "Location": position["Location"] });
                }
                if (position["ISIN"]) {
                    filters.push({ "ISIN": position["ISIN"], "Location": position["Location"] });
                }
                if (position["BB Ticker"]) {
                    filters.push({ "BB Ticker": position["BB Ticker"], "Location": position["Location"] });
                }
                delete position["_id"];
                return {
                    updateOne: {
                        filter: { $or: filters },
                        update: { $set: position },
                        upsert: true
                    }
                };
            });
            let updatedCollection = database.collection(`portfolio-${date}`);
            let updatedResult = await updatedCollection.bulkWrite(updatedOperations);
            let updateNewPortfolio = await insertPricesUpdatesInPortfolio(prices);
            return updateNewPortfolio;
        }
    }
    catch (error) {
        return error;
    }
}
exports.insertPricesUpdatesInPortfolio = insertPricesUpdatesInPortfolio;
function calculateDailyInterestUnRlzdCapitalGains(portfolio, date) {
    for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        let quantityGeneratingInterest = position["Quantity"];
        let interestInfo = position["Interest"];
        let yesterdayPrice = parseFloat(position["Previous Mark"]);
        let todayPrice = parseFloat(position["Mid"]);
        portfolio[index]["Day URlzd K G/L"] = (todayPrice - yesterdayPrice) * parseFloat(position["Quantity"]) || 0;
        let settlementDates = Object.keys(interestInfo);
        for (let indexSettlementDate = 0; indexSettlementDate < settlementDates.length; indexSettlementDate++) {
            let settlementDate = settlementDates[indexSettlementDate];
            let settlementDateTimestamp = new Date(settlementDate).getTime();
            if (settlementDateTimestamp >= new Date(date).getTime()) {
                quantityGeneratingInterest -= interestInfo[settlementDate];
            }
        }
        let couponDaysYear = portfolio[index]["Issue"] ? (portfolio[index]["Issue"].split(" ")[0] == "T" ? 365.00 : 360.00) : (portfolio[index]["BB Ticker"].split(" ")[0] == "T" ? 365.00 : 360.00);
        portfolio[index]["Daily Interest Income"] = (parseFloat(quantityGeneratingInterest) * (portfolio[index]["Coupon Rate"] / 100.00)) / couponDaysYear;
        if (!portfolio[index]["Daily Interest Income"]) {
            portfolio[index]["Daily Interest Income"] = 0;
        }
    }
    return portfolio;
}
function calculateMonthlyInterest(portfolio, date) {
    let currentDayDate = new Date(new Date(date).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let previousMonthDates = (0, portfolioFunctions_1.getAllDatesSinceLastMonthLastDay)(currentDayDate);
    let monthlyInterest = {};
    for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        let quantityGeneratingInterest = position["Quantity"];
        let interestInfo = position["Interest"];
        portfolio[index]["Monthly Interest Income"] = 0;
        let settlementDates = Object.keys(interestInfo);
        monthlyInterest[position["Issue"]] = {};
        // reason why 1, to ignore last day of last month
        for (let indexPreviousMonthDates = 1; indexPreviousMonthDates < previousMonthDates.length; indexPreviousMonthDates++) {
            let dayInCurrentMonth = previousMonthDates[indexPreviousMonthDates];
            monthlyInterest[position["Issue"]][dayInCurrentMonth] = quantityGeneratingInterest;
            for (let indexSettlementDate = 0; indexSettlementDate < settlementDates.length; indexSettlementDate++) {
                let settlementDate = settlementDates[indexSettlementDate];
                let settlementDateTimestamp = new Date(settlementDate).getTime();
                if (settlementDateTimestamp >= new Date(dayInCurrentMonth).getTime()) {
                    monthlyInterest[position["Issue"]][dayInCurrentMonth] -= interestInfo[settlementDate];
                }
            }
            let couponDaysYear = position["Issue"] ? (position["Issue"].split(" ")[0] == "T" ? 365 : 360) : (position["BB Ticker"].split(" ")[0] == "T" ? 365 : 360);
            let dayInCurrentMonthInterestEarned = (parseFloat(monthlyInterest[position["Issue"]][dayInCurrentMonth]) * (portfolio[index]["Coupon Rate"] / 100.00)) / couponDaysYear;
            if (!dayInCurrentMonthInterestEarned) {
                dayInCurrentMonthInterestEarned = 0;
            }
            monthlyInterest[position["Issue"]][dayInCurrentMonth] = dayInCurrentMonthInterestEarned;
            portfolio[index]["Monthly Interest Income"] += dayInCurrentMonthInterestEarned;
        }
    }
    return portfolio;
}
async function getMTDParams(portfolio, lastMonthPortfolio) {
    try {
        for (let index = 0; index < portfolio.length; index++) {
            let position = portfolio[index];
            let lastMonthPosition;
            for (let lastMonthIndex = 0; lastMonthIndex < lastMonthPortfolio.length; lastMonthIndex++) {
                lastMonthPosition = lastMonthPortfolio[lastMonthIndex];
                if ((lastMonthPosition["ISIN"] == position["ISIN"] || lastMonthPosition["BB Ticker"] == position["BB Ticker"]) && lastMonthPosition["Location"] == position["Location"]) {
                    portfolio[index]["MTD Mark"] = lastMonthPosition["Mid"];
                }
            }
        }
        return portfolio;
    }
    catch (error) {
        return portfolio;
    }
}
async function calculateMonthlyURlzd(portfolio) {
    for (let index = 0; index < portfolio.length; index++) {
        portfolio[index]["Monthly Capital Gains URlzd"] = ((parseFloat(portfolio[index]["Mid"]) - parseFloat(portfolio[index]["MTD Mark"]))) * portfolio[index]["Quantity"];
        if (portfolio[index]["Monthly Capital Gains URlzd"] == 0) {
            portfolio[index]["Monthly Capital Gains URlzd"] = 0;
        }
        else if (!portfolio[index]["Monthly Capital Gains URlzd"]) {
            portfolio[index]["Monthly Capital Gains URlzd"] = "Not Applicable";
        }
    }
    return portfolio;
}
async function getPreviousDayMarkPTFURLZD(portfolio, previousDayPortfolio) {
    // try {
    for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        let previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue) => previousDayIssue["BB Ticker"] == position["BB Ticker"] && previousDayIssue["Location"] == position["Location"]) : null;
        if (!previousDayPosition) {
            previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue) => previousDayIssue["Issue"] == position["Issue"] && previousDayIssue["Location"] == position["Location"]) : null;
        }
        let previousMark = previousDayPosition ? previousDayPosition["Mid"] : -1;
        portfolio[index]["Previous Mark"] = previousMark;
        if (portfolio[index]["Previous Mark"] == 0) {
            portfolio[index]["Previous Mark"] = 0;
        }
        else if (!portfolio[index]["Previous Mark"]) {
            portfolio[index]["Previous Mark"] = "Not Applicable";
        }
    }
    return portfolio;
}
function calculateMonthlyDailyRlzdPTFPL(portfolio, date) {
    let thisMonth = (0, common_1.monthlyRlzdDate)(date);
    let thisDay = (0, portfolioFunctions_1.formatDateRlzdDaily)(date);
    for (let index = 0; index < portfolio.length; index++) {
        portfolio[index]["Monthly Capital Gains Rlzd"] = portfolio[index]["Monthly Capital Gains Rlzd"] ? portfolio[index]["Monthly Capital Gains Rlzd"][thisMonth] || 0 : 0;
        portfolio[index]["Day Rlzd K G/L"] = portfolio[index]["Day Rlzd K G/L"] ? portfolio[index]["Day Rlzd K G/L"][thisDay] || 0 : 0;
        if (portfolio[index]["Monthly Capital Gains Rlzd"] != "Not Applicable" && portfolio[index]["Monthly Capital Gains URlzd"] != "Not Applicable" && portfolio[index]["Monthly Interest Income"] != "Not Applicable") {
            portfolio[index]["Ptf MTD P&L"] = portfolio[index]["Monthly Capital Gains Rlzd"] + portfolio[index]["Monthly Capital Gains URlzd"] + portfolio[index]["Monthly Interest Income"] || 0;
        }
        else {
            portfolio[index]["Ptf MTD P&L"] = 0;
        }
        portfolio[index]["Ptf Day P&L"] = (parseFloat(portfolio[index]["Daily Interest Income"]) + parseFloat(portfolio[index]["Day URlzd K G/L"]) + parseFloat(portfolio[index]["Day Rlzd K G/L"])) ? (parseFloat(portfolio[index]["Daily Interest Income"]) + parseFloat(portfolio[index]["Day URlzd K G/L"]) + parseFloat(portfolio[index]["Day Rlzd K G/L"])) : 0;
        if (portfolio[index]["Ptf Day P&L"] == 0) {
            portfolio[index]["Ptf Day P&L"] = 0;
        }
        else if (!portfolio[index]["Ptf Day P&L"]) {
            portfolio[index]["Ptf Day P&L"] = 0;
        }
    }
    return portfolio;
}
function removeWeirdIsin(portfolio) {
    for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        if (position["ISIN"].length !== 12) {
            portfolio[index]["ISIN"] = "";
        }
    }
    return portfolio;
}

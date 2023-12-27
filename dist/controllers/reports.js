"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.editPosition = exports.insertPricesUpdatesInPortfolio = exports.updatePricesPortfolio = exports.insertTradesInPortfolio = exports.editPositionPortfolio = exports.updatePositionPortfolio = exports.uploadPortfolioFromLivePortfolio = exports.uploadPortfolioFromMufg = exports.uploadPortfolioFromImagine = exports.getBBTicker = exports.insertTrade = exports.getDailyEarnedInterestRlzPtf = exports.getSecurityInPortfolio = exports.getTrades = exports.getHistoricalPortfolio = exports.getPortfolio = exports.getAllCollectionDatesSinceStartMonth = exports.getEarliestCollectionName = exports.getHistoricalRiskReportWithAnalytics = exports.getHistoricalPortfolioWithAnalytics = void 0;
require("dotenv").config();
const portfolioFunctions_1 = require("./portfolioFunctions");
const util_1 = __importDefault(require("util"));
const common_1 = require("./common");
const operations_1 = require("./operations");
const xlsx = require("xlsx");
const fs = require("fs");
const writeFile = util_1.default.promisify(fs.writeFile);
const { PassThrough } = require("stream");
const axios = require("axios");
const { MongoClient, ServerApiVersion } = require("mongodb");
const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;
const common_2 = require("./common");
const client = new MongoClient(common_2.uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
mongoose.connect(common_2.uri, {
    useNewUrlParser: true,
});
async function getHistoricalPortfolioWithAnalytics(date) {
    const database = client.db("portfolios");
    let earliestPortfolioName = await getEarliestCollectionName(date);
    let sameDayCollectionsPublished = earliestPortfolioName[1];
    let yesterdayPortfolioName = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date(new Date(earliestPortfolioName[0]).getTime() - 1 * 24 * 60 * 60 * 1000)).split(" ")[0] + " 23:59";
    let lastDayBeforeToday = await getEarliestCollectionName(yesterdayPortfolioName);
    const reportCollection = database.collection(`portfolio-${earliestPortfolioName[0]}`);
    let documents = await reportCollection
        .aggregate([
        {
            $sort: {
                "BB Ticker": 1, // replace 'BB Ticker' with the name of the field you want to sort alphabetically
            },
        },
    ])
        .toArray();
    let now = new Date(date);
    let currentMonth = now.getMonth();
    let currentYear = now.getFullYear();
    let thisMonth = (0, common_1.monthlyRlzdDate)(date);
    documents = documents.filter((position) => {
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
    let currentDayDate = new Date(date);
    let previousMonthDates = (0, portfolioFunctions_1.getAllDatesSinceLastMonthLastDay)(currentDayDate);
    //+ 23:59 to make sure getEarliestcollectionname get the lastest date on last day of the month
    let lastMonthLastCollectionName = await getEarliestCollectionName(previousMonthDates[0] + " 23:59");
    try {
        let lastMonthPortfolio = await getHistoricalPortfolio(lastMonthLastCollectionName[0]);
        let previousDayPortfolio = await getHistoricalPortfolio(lastDayBeforeToday[0]);
        documents = await getMTDParams(documents, lastMonthPortfolio, earliestPortfolioName[0]);
        documents = await getPreviousDayMarkPTFURLZD(documents, previousDayPortfolio, lastDayBeforeToday[0]);
    }
    catch (error) {
        console.log(error);
    }
    documents = await calculateMonthlyInterest(documents, new Date(date));
    documents = await calculateDailyInterestUnRlzdCapitalGains(documents, new Date(date));
    documents = await calculateMonthlyURlzd(documents);
    documents = calculateMonthlyDailyRlzdPTFPL(documents, date);
    documents = formatFrontEndTable(documents, date);
    return [documents, sameDayCollectionsPublished];
}
exports.getHistoricalPortfolioWithAnalytics = getHistoricalPortfolioWithAnalytics;
async function getHistoricalRiskReportWithAnalytics(date) {
    const database = client.db("portfolios");
    let earliestPortfolioName = await getEarliestCollectionName(date);
    let sameDayCollectionsPublished = earliestPortfolioName[1];
    let yesterdayPortfolioName = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date(new Date(earliestPortfolioName[0]).getTime() - 1 * 24 * 60 * 60 * 1000)).split(" ")[0] + " 23:59";
    let lastDayBeforeToday = await getEarliestCollectionName(yesterdayPortfolioName);
    const reportCollection = database.collection(`portfolio-${earliestPortfolioName[0]}`);
    let documents = await reportCollection
        .aggregate([
        {
            $sort: {
                "BB Ticker": 1, // replace 'BB Ticker' with the name of the field you want to sort alphabetically
            },
        },
    ])
        .toArray();
    let now = new Date(date);
    let currentMonth = now.getMonth();
    let currentYear = now.getFullYear();
    let thisMonth = (0, common_1.monthlyRlzdDate)(date);
    documents = documents.filter((position) => {
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
    let currentDayDate = new Date(date);
    let previousMonthDates = (0, portfolioFunctions_1.getAllDatesSinceLastMonthLastDay)(currentDayDate);
    //+ 23:59 to make sure getEarliestcollectionname get the lastest date on last day of the month
    let lastMonthLastCollectionName = await getEarliestCollectionName(previousMonthDates[0] + " 23:59");
    try {
        let lastMonthPortfolio = await getHistoricalPortfolio(lastMonthLastCollectionName[0]);
        let previousDayPortfolio = await getHistoricalPortfolio(lastDayBeforeToday[0]);
        documents = await getMTDParams(documents, lastMonthPortfolio, earliestPortfolioName[0]);
        documents = await getPreviousDayMarkPTFURLZD(documents, previousDayPortfolio, lastDayBeforeToday[0]);
    }
    catch (error) {
        console.log(error);
    }
    documents = await calculateMonthlyInterest(documents, new Date(date));
    documents = await calculateDailyInterestUnRlzdCapitalGains(documents, new Date(date));
    documents = await calculateMonthlyURlzd(documents);
    documents = calculateMonthlyDailyRlzdPTFPL(documents, date);
    documents = formatFrontEndTable(documents, date);
    documents = formatFrontEndRiskReport(documents);
    return [documents, sameDayCollectionsPublished];
}
exports.getHistoricalRiskReportWithAnalytics = getHistoricalRiskReportWithAnalytics;
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
        return [null, collectionNames];
    }
    let predecessorDate = new Date(Math.max.apply(null, predecessorDates));
    //hong kong time difference with utc
    if (predecessorDate) {
        predecessorDate = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date(predecessorDate));
    }
    return [predecessorDate, collectionNames];
}
exports.getEarliestCollectionName = getEarliestCollectionName;
async function getAllCollectionDatesSinceStartMonth(originalDate) {
    const database = client.db("portfolios");
    let collections = await database.listCollections().toArray();
    let currentDayDate = new Date(new Date(originalDate).getTime()).toISOString().slice(0, 10);
    let previousMonthDates = (0, portfolioFunctions_1.getAllDatesSinceLastMonthLastDay)(currentDayDate);
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
        let day = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000));
        const database = client.db("portfolios");
        let latestCollectionTodayDate = day.split(" ")[0] + " 23:59";
        let earliestCollectionName = await getEarliestCollectionName(latestCollectionTodayDate);
        console.log(earliestCollectionName[0], "get portfolio date");
        const reportCollection = database.collection(`portfolio-${earliestCollectionName[0]}`);
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
        const database = client.db("trades_v_2");
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
    if (identifier == "" || !identifier) {
        return document;
    }
    for (let index = 0; index < portfolio.length; index++) {
        let issue = portfolio[index];
        if ((identifier.includes(issue["ISIN"]) || identifier.includes(issue["Issue"])) && issue["Location"].trim() == location.trim()) {
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
        monthlyInterest: dailyInterestSum,
        monthlyRealizedProfit: realizedProfit,
        lastMonthLastDayPortfolio: mtd,
    };
    return object;
}
exports.getDailyEarnedInterestRlzPtf = getDailyEarnedInterestRlzPtf;
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
                let identifier = row["BB Ticker"];
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
                object["Average Cost"] = currentPrice ? currentPrice / 100.0 : 0;
                object["Coupon Rate"] = bondCouponMaturity[0] == "" ? "0" : bondCouponMaturity[0];
                object["Maturity"] = bondCouponMaturity[1] == "Invalid Date" ? "0" : bondCouponMaturity[1];
                let interestQuantity;
                object["Interest"] = {};
                interestQuantity = currentQuantity;
                object["Interest"][settlementDate] = interestQuantity;
                object["Daily P&L Rlzd"] = operation == -1 ? parseFloat(currentQuantity) * (previousAverageCost - currentPrice) : 0;
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
            let originalFaceMultiplier = {
                "6BZ3 IB": 62500,
                "ESZ3 IB": 50,
                "ECZ3 IB": 125000,
                "ZN IB": 1000,
                "6EX3 IB": 250000,
                "ZN   DEC 23 IB": 1000,
                "6EZ3 IB": 125000,
                "6EV3 IB": 125000,
            };
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                let identifier = row["Issue"];
                let object = {};
                let previousAverageCost = 0;
                let tradeType = row["Buy/Sell"];
                let operation = tradeType == "B" ? 1 : -1;
                let currentPrice = row["Price"];
                let currentQuantity = parseFloat(row["Quantity"]); //
                let currentNet = parseFloat(row["Net"]); //
                let bondCouponMaturity = (0, portfolioFunctions_1.parseBondIdentifier)(row["BB Ticker"]); //Issue
                let couponDaysYear = row["Issue"] ? (row["Issue"].split(" ")[0] == "T" ? 365.0 : 360.0) : row["BB Ticker"].split(" ")[0] == "T" ? 365.0 : 360.0;
                let settlementDate = (0, portfolioFunctions_1.getSettlementDateYear)(row["Trade Date"], row["Settle Date"]);
                object["Mid"] = row["Mid"]; //only for upload portfolio from imagine
                object["BB Ticker"] = row["BB Ticker"];
                object["Location"] = row["Location"];
                object["Issue"] = row["Issue"];
                object["ISIN"] = row["ISIN"];
                object["Quantity"] = currentQuantity;
                object["Net"] = currentNet;
                object["Average Cost"] = row["Average Cost"] ? row["Average Cost"] : 0;
                object["Coupon Rate"] = bondCouponMaturity[0] == "" ? 0 : bondCouponMaturity[0];
                object["Maturity"] = bondCouponMaturity[1] == "Invalid Date" ? "0" : bondCouponMaturity[1];
                let interestQuantity;
                object["Interest"] = {};
                interestQuantity = currentQuantity;
                object["Interest"][settlementDate] = interestQuantity;
                object["Daily P&L Rlzd"] = operation == -1 ? parseFloat(currentQuantity) * (previousAverageCost - currentPrice) : 0;
                object["Day Rlzd K G/L"] = {};
                object["Monthly Capital Gains Rlzd"] = {};
                object["Monthly Capital Gains Rlzd"]["2023/09"] = 0;
                object["Currency"] = row["Currency"];
                object["Coupon Duration"] = couponDaysYear;
                object["Entry Price"] = { "2023/09": row["Mid"] };
                object["Original Face"] = row["ISIN"].includes("IB") ? originalFaceMultiplier[row["ISIN"]] : 1000;
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
                let currentPrice = row["Price"] / 100.0;
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
                await writeFile("trades-logs.txt", logs, { flag: "a" });
                let updatedPortfolio = (0, portfolioFunctions_1.formatUpdatedPositions)(positions, []);
                let insertion = await insertTradesInPortfolio(updatedPortfolio[0]);
                return updatedPortfolio[0];
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
async function updatePositionPortfolio(path) {
    let allTrades = await (0, portfolioFunctions_1.readCenterlizedEBlot)(path);
    if (allTrades.error) {
        return { error: allTrades.error };
    }
    else {
        try {
            let data = allTrades[3];
            let positions = [];
            let portfolio = await getPortfolio();
            let triadaIds = await tradesTriadaIds();
            let bbbCurrency = {
                $: "USD",
                A$: "AUD",
                "€": "EUR",
                "£": "GBP",
                SGD: "SGD",
            };
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                let originalFace = parseFloat(row["Original Face"]);
                let identifier = row["ISIN"] !== "" ? row["ISIN"] : row["BB Ticker"] ? row["BB Ticker"] : row["Issue"];
                let object = {};
                let location = row["Location"].trim();
                let securityInPortfolio = getSecurityInPortfolio(portfolio, identifier, location);
                if (securityInPortfolio !== 404) {
                    object["Type"] = securityInPortfolio["Type"];
                    object["Coupon Rate"] = securityInPortfolio["Coupon Rate"];
                    object["Group"] = securityInPortfolio["Group"];
                    object["Sector"] = securityInPortfolio["Sector"];
                    object["Mid"] = securityInPortfolio["Mid"];
                    object["Bid"] = securityInPortfolio["Bid"];
                    object["Ask"] = securityInPortfolio["Ask"];
                    object["Issue"] = securityInPortfolio["Issue"] && securityInPortfolio["Issue"] != "" ? securityInPortfolio["Issue"] : null;
                    object["_id"] = securityInPortfolio["_id"];
                    object["Country"] = securityInPortfolio["Country"];
                    object["Rating Class"] = securityInPortfolio["Rating Class"];
                }
                let couponDaysYear = securityInPortfolio !== 404 ? securityInPortfolio["Coupon Duration"] : row["Issue"].split(" ")[0] == "T" ? 365.0 : 360.0;
                let previousQuantity = securityInPortfolio["Quantity"];
                let previousAverageCost = securityInPortfolio["Average Cost"] ? securityInPortfolio["Average Cost"] : 0;
                let tradeType = row["B/S"];
                let operation = tradeType == "B" ? 1 : -1;
                let currentPrice = row["ISIN"].includes("IB") || row["ISIN"].includes("1393 HK") ? row["Price"] : row["Price"] / 100.0;
                let currentQuantity = parseFloat(row["Quantity"].toString().replace(/,/g, "")) * operation;
                let currentNet = parseFloat(row["Settlement Amount"].toString().replace(/,/g, "")) * operation;
                let currentPrincipal = parseFloat(row["Principal"].toString().replace(/,/g, ""));
                let currency = row["Currency"];
                let bondCouponMaturity = (0, portfolioFunctions_1.parseBondIdentifier)(row["BB Ticker"]);
                let tradeExistsAlready = triadaIds.includes(row["Triada Trade Id"]);
                let updatingPosition = returnPositionProgress(positions, identifier, location);
                let tradeDate = new Date(row["Trade Date"]);
                let thisMonth = (0, common_1.monthlyRlzdDate)(tradeDate);
                let thisDay = (0, common_1.getDate)(tradeDate);
                let rlzdOperation = -1;
                if (updatingPosition) {
                    let accumlatedQuantityState = updatingPosition["Quantity"] > 0 ? 1 : -1;
                    if (operation == -1 * accumlatedQuantityState && updatingPosition["Quantity"] != 0) {
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
                    console.log(row["Triada Trade Id"], " already exists");
                }
                if (!tradeExistsAlready && identifier !== "") {
                    triadaIds.push(row["Triada Trade Id"]);
                    if (!updatingPosition) {
                        let settlementDate = row["Settle Date"];
                        object["Location"] = row["Location"];
                        object["Last Modified Date"] = new Date();
                        object["BB Ticker"] = row["BB Ticker"];
                        if (!object["Issue"]) {
                            object["Issue"] = row["Issue"];
                        }
                        object["ISIN"] = row["ISIN"];
                        object["Quantity"] = securityInPortfolio !== 404 ? securityInPortfolio["Quantity"] + currentQuantity : currentQuantity;
                        object["Net"] = securityInPortfolio !== 404 ? securityInPortfolio["Net"] + currentNet : currentNet;
                        object["Currency"] = currency;
                        object["Average Cost"] = rlzdOperation == -1 ? (securityInPortfolio !== 404 ? (0, portfolioFunctions_1.getAverageCost)(currentQuantity, previousQuantity, currentPrice, previousAverageCost) : currentPrice) : securityInPortfolio["Average Cost"];
                        object["Coupon Rate"] = bondCouponMaturity[0] == "" ? 0 : bondCouponMaturity[0];
                        object["Maturity"] = bondCouponMaturity[1] == "Invalid Date" ? "0" : bondCouponMaturity[1];
                        object["Interest"] = securityInPortfolio !== 404 ? (securityInPortfolio["Interest"] ? securityInPortfolio["Interest"] : {}) : {};
                        object["Interest"][settlementDate] = object["Interest"][settlementDate] ? object["Interest"][settlementDate] + currentQuantity : currentQuantity;
                        if (previousAverageCost != 0) {
                            object["Day Rlzd K G/L"] = securityInPortfolio !== 404 ? securityInPortfolio["Day Rlzd K G/L"] : {};
                            // this is reversed because the quantity is negated
                            let currentDayRlzdPl = parseFloat(securityInPortfolio["Day Rlzd K G/L"][thisDay]) ? parseFloat(securityInPortfolio["Day Rlzd K G/L"][thisDay]) : 0;
                            let priceDifference = parseFloat(previousAverageCost) - parseFloat(currentPrice);
                            object["Day Rlzd K G/L"][thisDay] = rlzdOperation == 1 ? parseFloat(currentQuantity) * parseFloat(priceDifference) + currentDayRlzdPl : 0;
                        }
                        else {
                            object["Day Rlzd K G/L"] = securityInPortfolio !== 404 ? securityInPortfolio["Day Rlzd K G/L"] : {};
                            if (rlzdOperation == 1) {
                                let currentDayRlzdPl = securityInPortfolio !== 404 ? (parseFloat(securityInPortfolio["Day Rlzd K G/L"][thisDay]) ? parseFloat(securityInPortfolio["Day Rlzd K G/L"][thisDay]) : 0) : 0;
                                object["Day Rlzd K G/L"][thisDay] = currentDayRlzdPl;
                            }
                            else {
                                let currentDayRlzdPl = securityInPortfolio !== 404 ? (parseFloat(securityInPortfolio["Day Rlzd K G/L"][thisDay]) ? parseFloat(securityInPortfolio["Day Rlzd K G/L"][thisDay]) : 0) : 0;
                                object["Day Rlzd K G/L"][thisDay] = currentDayRlzdPl;
                            }
                        }
                        object["Monthly Capital Gains Rlzd"] = securityInPortfolio !== 404 ? securityInPortfolio["Monthly Capital Gains Rlzd"] : {};
                        let curentMonthRlzdPL = securityInPortfolio !== 404 ? (parseFloat(securityInPortfolio["Monthly Capital Gains Rlzd"][thisMonth]) ? parseFloat(securityInPortfolio["Monthly Capital Gains Rlzd"][thisMonth]) : 0) : 0;
                        object["Monthly Capital Gains Rlzd"][thisMonth] = securityInPortfolio !== 404 ? curentMonthRlzdPL + object["Day Rlzd K G/L"][thisDay] : object["Day Rlzd K G/L"][thisDay];
                        if (securityInPortfolio !== 404) {
                            securityInPortfolio["Cost MTD Ptf"] = {};
                        }
                        object["Cost MTD Ptf"] = securityInPortfolio !== 404 ? securityInPortfolio["Cost MTD Ptf"] : {};
                        let curentMonthCost = securityInPortfolio !== 404 ? (parseFloat(securityInPortfolio["Cost MTD Ptf"][thisMonth]) ? parseFloat(securityInPortfolio["Cost MTD Ptf"][thisMonth]) : 0) : 0;
                        object["Cost MTD Ptf"][thisMonth] = operation == 1 ? (securityInPortfolio !== 404 ? curentMonthCost + parseFloat(currentPrincipal) : parseFloat(currentPrincipal)) : 0;
                        object["Original Face"] = originalFace;
                        if (!object["Entry Price"]) {
                            object["Entry Price"] = {};
                        }
                        if (!object["Entry Price"][thisMonth]) {
                            object["Entry Price"][thisMonth] = currentPrice;
                        }
                        positions.push(object);
                    }
                    else if (returnPositionProgress(positions, identifier, location)) {
                        let settlementDate = row["Settle Date"];
                        object["Location"] = row["Location"];
                        object["Last Modified Date"] = new Date();
                        object["BB Ticker"] = row["BB Ticker"];
                        if (!object["Issue"]) {
                            object["Issue"] = row["Issue"];
                        }
                        object["ISIN"] = row["ISIN"];
                        object["Currency"] = currency;
                        object["Quantity"] = currentQuantity + updatingPosition["Quantity"];
                        object["Net"] = currentNet + updatingPosition["Net"];
                        object["Average Cost"] = rlzdOperation == -1 ? (0, portfolioFunctions_1.getAverageCost)(currentQuantity, updatingPosition["Quantity"], currentPrice, parseFloat(updatingPosition["Average Cost"])) : updatingPosition["Average Cost"];
                        // this is reversed because the quantity is negated
                        let currentDailyProfitLoss = parseFloat(currentQuantity) * (parseFloat(updatingPosition["Average Cost"]) - parseFloat(currentPrice));
                        object["Day Rlzd K G/L"] = updatingPosition["Day Rlzd K G/L"];
                        object["Day Rlzd K G/L"][thisDay] = object["Day Rlzd K G/L"][thisDay] ? object["Day Rlzd K G/L"][thisDay] : 0;
                        object["Day Rlzd K G/L"][thisDay] += rlzdOperation == 1 ? currentDailyProfitLoss : 0;
                        object["Monthly Capital Gains Rlzd"] = updatingPosition["Monthly Capital Gains Rlzd"];
                        object["Monthly Capital Gains Rlzd"][thisMonth] += rlzdOperation == 1 ? currentDailyProfitLoss : 0;
                        object["Cost MTD Ptf"] = updatingPosition["Cost MTD Ptf"];
                        object["Cost MTD Ptf"][thisMonth] += operation == 1 ? currentPrincipal : 0;
                        object["Coupon Rate"] = bondCouponMaturity[0] == "" ? 0 : bondCouponMaturity[0];
                        object["Maturity"] = bondCouponMaturity[1] == "Invalid Date" ? "0" : bondCouponMaturity[1];
                        object["Interest"] = updatingPosition["Interest"];
                        object["Interest"][settlementDate] = object["Interest"][settlementDate] ? object["Interest"][settlementDate] + currentQuantity : currentQuantity;
                        object["Original Face"] = originalFace;
                        object["Coupon Duration"] = object["Coupon Rate"] ? couponDaysYear : "";
                        object["Entry Price"] = updatingPosition["Entry Price"];
                        positions = updateExisitingPosition(positions, identifier, location, object);
                    }
                }
            }
            try {
                let logs = JSON.stringify(positions, null, 2);
                let dateTime = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
                await (0, operations_1.insertEditLogs)(["trades upload"], "Upload Trades", dateTime, "Centarlized Blotter", "Link: " + path);
                let action3 = await insertTrade(allTrades[2], "emsx");
                let action2 = await insertTrade(allTrades[1], "ib");
                let action1 = await insertTrade(allTrades[0], "vcons");
                let updatedPortfolio = (0, portfolioFunctions_1.formatUpdatedPositions)(positions, portfolio);
                let insertion = await insertTradesInPortfolio(updatedPortfolio[0]);
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
exports.updatePositionPortfolio = updatePositionPortfolio;
async function editPositionPortfolio(path) {
    let data = await (0, portfolioFunctions_1.readEditInput)(path);
    if (data.error) {
        return { error: data.error };
    }
    else {
        try {
            let positions = [];
            let portfolio = await getPortfolio();
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                let identifier = row["ISIN"] ? row["ISIN"] : row["Issue"];
                let object = {};
                let location = row["Location"].trim();
                let securityInPortfolio = getSecurityInPortfolio(portfolio, identifier, location);
                if (securityInPortfolio == 404) {
                    identifier = row["BB Ticker"];
                    securityInPortfolio = getSecurityInPortfolio(portfolio, identifier, location);
                }
                // if (securityInPortfolio == 404) {
                //   identifier = row["Holding Id"];
                //   securityInPortfolio = getSecurityInPortfolio(portfolio, identifier, location);
                // }
                if (securityInPortfolio != 404) {
                    object = securityInPortfolio;
                    // object["Type"] = row["Type"];
                    // object["Group"] = row["Group"];
                    // // object["holdPortfXrate"] = row["holdPortfXrate"];
                    // object["Sector"] = row["Sector"];
                    // object["Rating Class"] = row["Rating Class"];
                    // object["holdPortfXrate"] = row["holdPortfXrate"];
                    // object["Call Date"] = row["Call Date"] == "" ? "" : formatDateReadable(row["Call Date"]);
                    // object["Maturity"] = row["Maturity"] == "" ? "" : formatDateReadable(row["Maturity"]);
                    // object["Issuer"] = row["Issuer"];
                    // object["Country"] = row["Country"];
                    object["Issue"] = row["Issue"];
                    positions.push(object);
                }
            }
            try {
                // console.log(positions)
                let updatedPortfolio = (0, portfolioFunctions_1.formatUpdatedPositions)(positions, portfolio);
                let insertion = await insertTradesInPortfolio(updatedPortfolio[0]);
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
exports.editPositionPortfolio = editPositionPortfolio;
async function insertTradesInPortfolio(trades) {
    const database = client.db("portfolios");
    // Create an array of updateOne operations
    let day = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000));
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
        let data = await (0, portfolioFunctions_1.readPricingSheet)(path);
        if (data.error) {
            return data;
        }
        else {
            let updatedPricePortfolio = [];
            let portfolio = await getPortfolio();
            let currencyInUSD = {};
            currencyInUSD["USD"] = 1;
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                if (!row["Long Security Name"].includes("Spot") && !row["Long Security Name"].includes("ignore")) {
                    let object = getSecurityInPortfolio(portfolio, row["ISIN"], row["Trade Idea Code"]);
                    if (object == 404) {
                        object = getSecurityInPortfolio(portfolio, row["BB Ticker"], row["Trade Idea Code"]);
                    }
                    if (object == 404) {
                        object = getSecurityInPortfolio(portfolio, row["Long Security Name"], row["Trade Idea Code"]);
                    }
                    if (object == 404) {
                        continue;
                    }
                    let faceValue = object["ISIN"].includes("CDX") || object["ISIN"].includes("ITRX") || object["ISIN"].includes("1393") || object["ISIN"].includes("IB") ? 100 : 1;
                    object["Mid"] = (parseFloat(row["Today's Mid"]) / 100.0) * faceValue;
                    object["Ask"] = parseFloat(row["Override Ask"]) > 0 ? (parseFloat(row["Override Ask"]) / 100.0) * faceValue : (parseFloat(row["Today's Ask"]) / 100.0) * faceValue;
                    object["Bid"] = parseFloat(row["Override Bid"]) > 0 ? (parseFloat(row["Override Bid"]) / 100.0) * faceValue : (parseFloat(row["Today's Bid"]) / 100.0) * faceValue;
                    object["YTM"] = row["Mid  Yield call"].toString().includes("N/A") ? 0 : row["Mid  Yield call"];
                    object["DV01"] = row["DV01"].toString().includes("N/A") ? 0 : row["DV01"];
                    object["OAS"] = row["Spread to benchmark"].toString().includes("N/A") ? 0 : row["Spread to benchmark"];
                    // object["Issuer"] = row["Issuer Name"].includes("#") ? "0" : row["Issuer Name"];
                    if (row["ModDurPerp"]) {
                        object["Modified Duration"] = row["ModDurPerp"].toString().includes("#") ? (row["ModDur"].toString().includes("N/A") ? 0 : row["ModDur"]) : row["ModDurPerp"];
                    }
                    if (!row["Call Date"].includes("N/A") || !row["Call Date"].includes("#")) {
                        object["Call Date"] = row["Call Date"];
                    }
                    if (currencyInUSD[object["Currency"]]) {
                        object["holdPortfXrate"] = currencyInUSD[object["Currency"]];
                    }
                    object["Last Price Update"] = new Date();
                    if (!object["Country"] && row["Country"] && !row["Country"].includes("#N/A")) {
                        object["Country"] = row["Country"];
                    }
                    if (!object["Sector"] && row["Country2"]) {
                        object["Sector"] = row["Country2"];
                    }
                    updatedPricePortfolio.push(object);
                }
                else if (row["Long Security Name"].includes("Spot") && !row["Long Security Name"].includes("ignore")) {
                    let firstCurrency = row["Long Security Name"].split(" ")[0];
                    let secondCurrency = row["Long Security Name"].split(" ")[1];
                    let rate = row["Today's Mid"];
                    if (firstCurrency !== "USD") {
                        currencyInUSD[firstCurrency] = rate;
                    }
                    else {
                        rate = 1 / rate;
                        currencyInUSD[secondCurrency] = rate;
                    }
                }
            }
            try {
                let dateTime = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
                let updatedPortfolio = (0, portfolioFunctions_1.formatUpdatedPositions)(updatedPricePortfolio, portfolio);
                console.log(updatedPortfolio[1], "positions that did not update");
                let insertion = await insertPricesUpdatesInPortfolio(updatedPortfolio[0]);
                await (0, operations_1.insertEditLogs)(["prices update"], "Update Prices", dateTime, `Bloomberg Pricing Sheet - positions that did not update: ${updatedPortfolio[1]}`, "Link: " + path);
                if (!updatedPortfolio[1].length) {
                    return updatedPortfolio[1];
                }
                else {
                    return { error: `positions that did not update ${updatedPortfolio[1]}` };
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
    let day = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000));
    // Create an array of updateOne operations
    // Execute the operations in bulk
    try {
        //so the latest updated version portfolio profits will not be copied into a new instance
        const updatedOperations = portfolio.map((position) => {
            // Start with the known filters
            const filters = [];
            // Only add the "Issue" filter if it's present in the trade object
            if (position["ISIN"]) {
                filters.push({
                    ISIN: position["ISIN"],
                    Location: position["Location"],
                    _id: new ObjectId(position["_id"]),
                });
            }
            else if (position["Issue"]) {
                filters.push({
                    Issue: position["Issue"],
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
function calculateDailyInterestUnRlzdCapitalGains(portfolio, date) {
    let thisMonth = (0, common_1.monthlyRlzdDate)(date);
    for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        let quantityGeneratingInterest = position["Quantity"];
        let interestInfo = position["Interest"];
        let yesterdayPrice;
        if (position["Previous Mark"] && position["Previous Mark"] != "0") {
            yesterdayPrice = position["Previous Mark"];
        }
        else {
            yesterdayPrice = parseFloat(position["Entry Price"][thisMonth]);
            portfolio[index]["Notes"] += "Previous Mark was not found, used entry price instead";
        }
        position["Previous Mark"] = yesterdayPrice;
        let todayPrice = parseFloat(position["Mid"]);
        portfolio[index]["Day URlzd K G/L"] = portfolio[index]["ISIN"].includes("CDX") || portfolio[index]["ISIN"].includes("ITRX") ? ((parseFloat(todayPrice) - parseFloat(yesterdayPrice)) * portfolio[index]["Quantity"]) / portfolio[index]["Original Face"] : (parseFloat(todayPrice) - parseFloat(yesterdayPrice)) * portfolio[index]["Quantity"] || 0;
        let settlementDates = Object.keys(interestInfo);
        for (let indexSettlementDate = 0; indexSettlementDate < settlementDates.length; indexSettlementDate++) {
            let settlementDate = settlementDates[indexSettlementDate];
            let settlementDateTimestamp = new Date(settlementDate).getTime();
            if (settlementDateTimestamp >= new Date(date).getTime()) {
                quantityGeneratingInterest -= interestInfo[settlementDate];
            }
        }
        let couponDaysYear = portfolio[index]["Issue"] ? (portfolio[index]["Issue"].split(" ")[0] == "T" ? 365.0 : 360.0) : portfolio[index]["BB Ticker"].split(" ")[0] == "T" ? 365.0 : 360.0;
        portfolio[index]["Daily Interest Income"] = (parseFloat(quantityGeneratingInterest) * (portfolio[index]["Coupon Rate"] / 100.0)) / couponDaysYear;
        if (!portfolio[index]["Daily Interest Income"]) {
            portfolio[index]["Daily Interest Income"] = 0;
        }
    }
    return portfolio;
}
function calculateMonthlyInterest(portfolio, date) {
    let currentDayDate = new Date(date).toISOString().slice(0, 10);
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
            let dayInCurrentMonth = previousMonthDates[indexPreviousMonthDates]; //OCT 1st -
            monthlyInterest[position["Issue"]][dayInCurrentMonth] = quantityGeneratingInterest; // 2000 000
            for (let indexSettlementDate = 0; indexSettlementDate < settlementDates.length; indexSettlementDate++) {
                let settlementDate = settlementDates[indexSettlementDate]; // oct 11th
                let settlementDateTimestamp = new Date(settlementDate).getTime();
                if (settlementDateTimestamp >= new Date(dayInCurrentMonth).getTime()) {
                    monthlyInterest[position["Issue"]][dayInCurrentMonth] -= interestInfo[settlementDate]; // 25 00 000
                }
            }
            let couponDaysYear = position["Coupon Duration"] ? position["Coupon Duration"] : 360;
            let dayInCurrentMonthInterestEarned = (parseFloat(monthlyInterest[position["Issue"]][dayInCurrentMonth]) * (portfolio[index]["Coupon Rate"] / 100.0)) / couponDaysYear;
            if (!dayInCurrentMonthInterestEarned) {
                dayInCurrentMonthInterestEarned = 0;
            }
            monthlyInterest[position["Issue"]][dayInCurrentMonth] = dayInCurrentMonthInterestEarned;
            portfolio[index]["Monthly Interest Income"] += dayInCurrentMonthInterestEarned;
        }
    }
    return portfolio;
}
async function getTradeEntryPrice(location, identifier, type) {
    try {
        const database = client.db("trades_v_2");
        let type = identifier.includes("IB") ? "ib" : identifier.includes("1393 HK") ? "emsx" : "vcons";
        const reportCollection = database.collection(`${type}`);
        // find document with matching id
        let doc = await reportCollection.findOne({ Location: location });
        // return the found document
        return doc;
    }
    catch (error) {
        return error;
    }
}
async function getMTDParams(portfolio, lastMonthPortfolio, dateInput) {
    try {
        let thisMonth = (0, common_1.monthlyRlzdDate)(dateInput);
        for (let index = 0; index < portfolio.length; index++) {
            let position = portfolio[index];
            let lastMonthPosition;
            for (let lastMonthIndex = 0; lastMonthIndex < lastMonthPortfolio.length; lastMonthIndex++) {
                lastMonthPosition = lastMonthPortfolio[lastMonthIndex];
                portfolio[index]["Notes"] = "";
                if ((lastMonthPosition["ISIN"] == position["ISIN"] || lastMonthPosition["BB Ticker"] == position["BB Ticker"]) && lastMonthPosition["Location"] == position["Location"]) {
                    portfolio[index]["MTD Mark"] = lastMonthPosition["Mid"];
                    portfolio[index]["MTD FX"] = lastMonthPosition["holdPortfXrate"] ? lastMonthPosition["holdPortfXrate"] : 1;
                }
            }
        }
        for (let index = 0; index < portfolio.length; index++) {
            if (!parseFloat(portfolio[index]["MTD Mark"]) && parseFloat(portfolio[index]["MTD Mark"]) != 0 && portfolio[index]["Entry Price"][thisMonth]) {
                portfolio[index]["MTD Mark"] = portfolio[index]["Entry Price"][thisMonth];
                portfolio[index]["Notes"] = "MTD Mark not found, used entry price for this month instead";
                // console.log(portfolio[index])
            }
            // if (!portfolio[index]["Mid"] && parseFloat(portfolio[index]["Mid"]) != 0 && portfolio[index]["Entry Price"][thisMonth]) {
            //   portfolio[index]["Mid"] = portfolio[index]["Entry Price"][thisMonth];
            //   portfolio[index]["Notes"] += "MTD Mark not found, used entry price for this month instead"
            //   // console.log(portfolio[index])
            // }
        }
        return portfolio;
    }
    catch (error) {
        return portfolio;
    }
}
async function calculateMonthlyURlzd(portfolio) {
    for (let index = 0; index < portfolio.length; index++) {
        if (!portfolio[index]["Mid"]) {
            continue;
        }
        portfolio[index]["Monthly Capital Gains URlzd"] = portfolio[index]["ISIN"].includes("CDX") || portfolio[index]["ISIN"].includes("ITRX") ? ((parseFloat(portfolio[index]["Mid"]) - parseFloat(portfolio[index]["MTD Mark"])) * portfolio[index]["Quantity"]) / portfolio[index]["Original Face"] : (parseFloat(portfolio[index]["Mid"]) - parseFloat(portfolio[index]["MTD Mark"])) * portfolio[index]["Quantity"];
        if (portfolio[index]["Monthly Capital Gains URlzd"] == 0) {
            portfolio[index]["Monthly Capital Gains URlzd"] = 0;
        }
        else if (!portfolio[index]["Monthly Capital Gains URlzd"]) {
            portfolio[index]["Monthly Capital Gains URlzd"] = "0";
        }
    }
    return portfolio;
}
async function getPreviousDayMarkPTFURLZD(portfolio, previousDayPortfolio, dateInput) {
    // try {
    for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        let previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue) => previousDayIssue["ISIN"] == position["ISIN"] && previousDayIssue["Location"] == position["Location"]) : null;
        if (!previousDayPosition) {
            previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue) => previousDayIssue["Issue"] == position["Issue"] && previousDayIssue["Location"] == position["Location"]) : null;
        }
        let previousMark = previousDayPosition ? previousDayPosition["Mid"] : "0";
        let previousFxRate = previousDayPosition ? previousDayPosition["holdPortfXrate"] : 0;
        portfolio[index]["Previous FX Rate"] = previousFxRate;
        portfolio[index]["Previous Mark"] = previousMark;
        if (portfolio[index]["Previous Mark"] == 0) {
            portfolio[index]["Previous Mark"] = 0;
        }
        else if (!portfolio[index]["Previous Mark"]) {
            portfolio[index]["Previous Mark"] = "0";
        }
    }
    return portfolio;
}
function calculateMonthlyDailyRlzdPTFPL(portfolio, date) {
    let thisMonth = (0, common_1.monthlyRlzdDate)(date);
    let thisDay = (0, portfolioFunctions_1.formatDateRlzdDaily)(date);
    for (let index = 0; index < portfolio.length; index++) {
        portfolio[index]["Monthly Capital Gains Rlzd"] = portfolio[index]["Monthly Capital Gains Rlzd"] ? portfolio[index]["Monthly Capital Gains Rlzd"][thisMonth] || 0 : 0;
        portfolio[index]["Cost MTD Ptf"] = portfolio[index]["Cost MTD Ptf"] ? portfolio[index]["Cost MTD Ptf"][thisMonth] || 0 : 0;
        portfolio[index]["Day Rlzd K G/L"] = portfolio[index]["Day Rlzd K G/L"] ? portfolio[index]["Day Rlzd K G/L"][thisDay] || 0 : 0;
        portfolio[index]["Ptf MTD P&L"] = parseFloat(portfolio[index]["Monthly Capital Gains Rlzd"]) + (parseFloat(portfolio[index]["Monthly Capital Gains URlzd"]) || 0) + parseFloat(portfolio[index]["Monthly Interest Income"]) || 0;
        portfolio[index]["Ptf Day P&L"] = parseFloat(portfolio[index]["Daily Interest Income"]) + parseFloat(portfolio[index]["Day URlzd K G/L"]) ? parseFloat(portfolio[index]["Daily Interest Income"]) + parseFloat(portfolio[index]["Day URlzd K G/L"]) : 0;
        if (portfolio[index]["Ptf Day P&L"] == 0) {
            portfolio[index]["Ptf Day P&L"] = 0;
        }
        else if (!portfolio[index]["Ptf Day P&L"]) {
            portfolio[index]["Ptf Day P&L"] = 0;
        }
    }
    return portfolio;
}
function formatFrontEndTable(portfolio, date) {
    for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        let originalFace = position["Original Face"] || 1;
        let usdRatio = parseFloat(position["holdPortfXrate"]) || 1;
        position["Cost"] = position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") ? Math.round(position["Average Cost"] * position["Quantity"] * 10000) / (10000 * position["Original Face"]) : Math.round(position["Average Cost"] * position["Quantity"] * 1000000) / 1000000;
        position["Daily Interest Income"] = Math.round(position["Daily Interest Income"] * 1000000) / 1000000;
        position["holdPortfXrate"] = Math.round(position["holdPortfXrate"] * 1000000) / 1000000;
        position["Value"] = position["ISIN"].includes("CDS") || position["ISIN"].includes("ITRX") ? Math.round((position["Quantity"] * position["Mid"] * 10000 * usdRatio) / originalFace) / 10000 : Math.round(position["Quantity"] * position["Mid"] * usdRatio * 10000) / 10000;
        position["Mid"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Mid"] * 1000000) / 1000000 : Math.round(position["Mid"] * 1000000) / 10000;
        position["Bid"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Bid"] * 1000000) / 1000000 : Math.round(position["Bid"] * 1000000) / 10000;
        position["Ask"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Ask"] * 1000000) / 1000000 : Math.round(position["Ask"] * 1000000) / 10000;
        position["Average Cost"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Average Cost"] * 1000000) / 1000000 : Math.round(position["Average Cost"] * 1000000) / 10000;
        position["YTM"] = Math.round(position["YTM"] * 1000000) / 1000000 || 0;
        position["CR01"] = "0";
        position["MTD Mark"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["MTD Mark"] * 1000000) / 1000000 : Math.round(position["MTD Mark"] * 1000000) / 10000;
        position["Previous Mark"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Previous Mark"] * 1000000) / 1000000 : Math.round(position["Previous Mark"] * 1000000) / 10000;
        position["Monthly Interest Income"] = Math.round(position["Monthly Interest Income"] * 1000000 * usdRatio) / 1000000;
        position["Monthly Capital Gains Rlzd"] = Math.round(position["Monthly Capital Gains Rlzd"] * 1000000 * usdRatio) / 1000000;
        position["Monthly Capital Gains URlzd"] = Math.round(position["Monthly Capital Gains URlzd"] * 1000000 * usdRatio) / 1000000;
        position["Cost MTD Ptf"] = Math.round(position["Cost MTD Ptf"] * 1000000 * usdRatio) / 1000000;
        position["Cost"] = Math.round(position["Cost"] * 1000000 * usdRatio) / 1000000;
        position["Average Cost"] = Math.round(position["Average Cost"] * 1000000) / 1000000;
        position["holdPortfXrate"] = position["holdPortfXrate"] ? position["holdPortfXrate"] : 1;
        position["MTD FX"] = position["MTD FX"] ? position["MTD FX"] : 1;
        if (!position["Previous FX Rate"]) {
            position["Previous FX Rate"] = position["holdPortfXrate"];
        }
        position["Day Int.Income USD"] = position["Daily Interest Income"] * usdRatio;
        position["Daily Interest FX P&L"] = Math.round((position["holdPortfXrate"] - position["Previous FX Rate"]) * 1000000 * position["Daily Interest Income"]) / 1000000;
        position["Notional Total"] = position["Quantity"];
        position["Quantity"] = position["Quantity"] / originalFace;
        position["#"] = index + 1;
        position["ISIN"] = position["ISIN"].length != 12 ? "" : position["ISIN"];
        if (position["Issue"].includes("CDS")) {
            position["Day P&L FX"] = Math.round((parseFloat(position["holdPortfXrate"]) - parseFloat(position["Previous FX Rate"])) * position["Quantity"] * position["Previous Mark"] * 1000000) / 1000000 || 0;
            position["MTD P&L FX"] = Math.round((parseFloat(position["holdPortfXrate"]) - parseFloat(position["MTD FX"] || 1)) * position["Quantity"] * position["MTD Mark"] * 1000000) / 1000000 || 0;
        }
        else {
            position["Day P&L FX"] = Math.round((((parseFloat(position["holdPortfXrate"]) - parseFloat(position["Previous FX Rate"])) * position["Notional Total"] * position["Previous Mark"]) / 100) * 1000000) / 1000000 || 0;
            position["MTD P&L FX"] = Math.round((((parseFloat(position["holdPortfXrate"]) - parseFloat(position["MTD FX"] || 1)) * position["Notional Total"] * position["MTD Mark"]) / 100) * 1000000) / 1000000 || 0;
        }
        position["Ptf Day P&L"] = Math.round((position["Ptf Day P&L"] * usdRatio + position["Day P&L FX"]) * 1000000) / 1000000;
        position["Ptf MTD P&L"] = Math.round((position["Ptf MTD P&L"] + position["MTD P&L FX"] * usdRatio) * 1000000) / 1000000;
        position["Previous FX Rate"] = Math.round(position["Previous FX Rate"] * 1000000) / 1000000;
        position["Maturity"] = position["Maturity"] ? position["Maturity"] : 0;
        position["Call Date"] = position["Call Date"] ? position["Call Date"] : 0;
        position["Color"] = position["Maturity"] ? (areDatesInSameMonthAndYear(position["Maturity"], date) ? "red" : "") : "";
        position["Holding ID"] = position["_id"];
        position["Duration(Mkt)"] = yearsUntil(position["Maturity"], date);
        position["Security"] = position["Issue"];
        position["Coupon Duration"] = position["Coupon Duration"] ? position["Coupon Duration"] : position["Issue"].split(" ")[0] == "T" || position["Issue"].includes("GOVT") ? 365.0 : 360.0;
        position["Coupon Rate"] = position["Coupon Rate"] ? position["Coupon Rate"] : 0;
        position["Issuer"] = position["Issuer"] == "0" ? "" : position["Issuer"];
        position["DV01"] = (position["DV01"] / 1000000) * position["Notional Total"];
        position["DV01"] = Math.round(position["DV01"] * 1000000) / 1000000 || 0;
    }
    return portfolio;
}
function yearsUntil(dateString, dateInput) {
    // Parse the date string and create a new Date object
    // if(dateString == 0 || "0"){
    //   return dateString
    // }
    const date = new Date(dateString).getTime();
    // Get the current date
    const now = new Date(dateInput).getTime();
    // Calculate the difference in milliseconds
    const diff = date - now;
    // Convert the difference from milliseconds to years
    let years = diff / (1000 * 60 * 60 * 24 * 365.25);
    // If the difference is negative (i.e., the date is in the future), take the absolute value
    if (years < 0) {
        years = 0;
    }
    // Round to two decimal places and return
    return Math.round(years * 100) / 100;
}
async function getPositionBasedOnId(id) {
    try {
        let day = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000));
        const database = client.db("portfolios");
        let earliestCollectionName = await getEarliestCollectionName(day);
        const reportCollection = database.collection(`portfolio-${earliestCollectionName[0]}`);
        let objectId = new ObjectId(id);
        // find document with matching id
        let doc = await reportCollection.findOne({ _id: objectId });
        // return the found document
        return doc;
    }
    catch (error) {
        return error;
    }
}
async function editPosition(editedPosition) {
    try {
        let portfolio = await getPortfolio();
        let positionInPortfolio = {};
        let editedPositionTitles = Object.keys(editedPosition);
        let id = editedPosition["Holding ID"];
        let unEditableParams = [
            "#",
            "$ Value",
            "Duration(Mkt)",
            "Notional Amount",
            "MTD Mark",
            "PreviousMark",
            "Ptf Day P&L",
            // "Ptf MTD Rlzd",
            "Ptf MTD URlzd",
            "Ptf MTD Int.Income",
            "Ptf MTD P&L",
            "Holding ID",
            "holdPortfXrate",
            "Daily Accrual",
            "Quantity",
            "Day Int.Income USD",
            "Value",
            "Previous Mark",
            "Monthly Capital Gains URlzd",
            "Monthly Interest Income",
            "Daily Interest Income",
            "Event Type",
            "Edit Note",
        ];
        let titlesMeaningException = {
            "Notional Total": "Quantity",
            "Day Rlzd K G/L": "Day Rlzd K G/L",
            "Monthly Capital Gains Rlzd": "Monthly Capital Gains Rlzd",
        };
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
            let todayDate = (0, common_1.formatDateReadable)(new Date().toString());
            let monthDate = (0, common_1.monthlyRlzdDate)(new Date().toString());
            if (!unEditableParams.includes(title) && editedPosition[title] != "" && editedPosition[title] != 0) {
                if (titlesMeaningException[title]) {
                    if (titlesMeaningException[title] == "Quantity") {
                        positionInPortfolio["Interest"][todayDate] = parseFloat(editedPosition[title]) - parseFloat(positionInPortfolio["Quantity"]);
                        changes.push(`Quantity changed from ${positionInPortfolio["Quantity"]} to ${editedPosition[title]}`);
                        positionInPortfolio["Quantity"] = parseFloat(editedPosition[title]);
                    }
                    if (titlesMeaningException[title] == "Day Rlzd K G/L") {
                        changes.push(`Day Rlzd K G/L changed from ${positionInPortfolio["Day Rlzd K G/L"][todayDate]} to ${editedPosition[title]}`);
                        positionInPortfolio["Day Rlzd K G/L"][todayDate] = parseFloat(editedPosition[title]);
                    }
                    if (titlesMeaningException[title] == "Monthly Capital Gains Rlzd") {
                        changes.push(`Monthly Capital Gains Rlzd changed from ${positionInPortfolio["Monthly Capital Gains Rlzd"][monthDate]} to ${editedPosition[title]}`);
                        positionInPortfolio["Monthly Capital Gains Rlzd"][monthDate] = parseFloat(editedPosition[title]);
                    }
                }
                else {
                    changes.push(`${title} changed from ${positionInPortfolio[title] || "''"} to ${editedPosition[title]}`);
                    positionInPortfolio[title] = editedPosition[title];
                }
            }
        }
        let dateTime = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
        portfolio[positionIndex] = positionInPortfolio;
        await (0, operations_1.insertEditLogs)(changes, editedPosition["Event Type"], dateTime, editedPosition["Edit Note"], positionInPortfolio["Issue"]);
        let action = await insertTradesInPortfolio(portfolio);
        if (1) {
            return { status: 200 };
        }
        else {
            return { error: "fatal error" };
        }
    }
    catch (error) {
        return { error: error.toString() };
    }
}
exports.editPosition = editPosition;
function areDatesInSameMonthAndYear(customDate, todaysDate) {
    return new Date(customDate).getMonth() === new Date(todaysDate).getMonth() && new Date(customDate).getFullYear() === new Date(todaysDate).getFullYear();
}
function formatFrontEndRiskReport(portfolio) {
    let tableTitle = [
        "#",
        "Type",
        "Strategy",
        "Trade Idea Code",
        "Credit Name",
        "BB Ticker",
        "H-Notional",
        "o/r Dv01",
        "o/r Cr01",
        "o/r Price",
        "Text23",
        "Text10",
        "Accrued $",
        "Rating Name: SP",
        "Curr",
        "Isin",
        "Maturity",
        "CallDate",
        "Notional Total",
        "Duration(Mkt)",
        "Duration(C/P,Mkt)",
        "Implied ZCS",
        "YTM",
        "Dv01 $ (C/P,Mkt) (USD)",
        "Dv01 (USD) (Mkt)",
        "Notional Calc (Mkt)",
        "Cr01 (USD) (Mkt)",
        "Implied CS",
        "Mid",
        "Bid",
        "Ask",
        "Average Cost",
        "MTD P&L",
        "Day P&L",
        "Total P&L",
        "R - Capital Gain/Loss",
        "U - Capital Gain/Loss",
        "Accrued Interest",
        "Cash Dispmnt Accrued Int",
        "Long Security Name",
        "Issue Amt",
        "YC +25",
        "CS +100",
        "MTD Int.Income",
        "MTD Mark",
        "Ptf MTD P&L",
        "Ptf MTD Rlzd",
        "Ptf MTD URlzd",
        "Adjusted OAS",
        "Implied ZCS2",
        "Issuer Name",
        "Ref Bond",
        "Ref Fair",
        "Ref YTM",
        "Ref Spread o/r",
        "AccAdj MTD",
        "$ Fair",
        "FX",
        "Quantity",
        "Q_Sector",
        "Q_Country",
        "$ Full Econ(Mkt)",
    ];
    let tableTitleConversion = {
        "#": "#",
        Type: "Type",
        Strategy: "Group",
        "Trade Idea Code": "Location",
        "Credit Name": "Issuer",
        "BB Ticker": "Issue",
        "H-Notional": "0",
        "o/r Dv01": "0",
        "o/r Cr01": "0",
        "o/r Price": "0",
        Text23: "Rating Class",
        "Accrued $": "Monthly Interest Income",
        "Rating Name: SP": "0",
        Curr: "Currency",
        Isin: "ISIN",
        Maturity: "Maturity",
        CallDate: "Call Date",
        "Notional Total": "Notional Total",
        "Duration(Mkt)": "Duration(Mkt)",
        "Duration(C/P,Mkt)": "Modified Duration",
        "Implied ZCS": "0",
        YTM: "YTM",
        "Dv01 $ (C/P,Mkt) (USD)": "DV01",
        "Dv01 (USD) (Mkt)": "DV01",
        "Notional Calc (Mkt)": "0",
        "Cr01 (USD) (Mkt)": "DV01",
        "Implied CS": "0",
        Mid: "Mid",
        Bid: "Bid",
        Ask: "Ask",
        "Average Cost": "Average Cost",
        "MTD P&L": "Ptf MTD P&L",
        "Day P&L": "Ptf Day P&L",
        "Total P&L": "0",
        "R - Capital Gain/Loss": "0",
        "U - Capital Gain/Loss": "0",
        "Accrued Interest": "Monthly Interest Income",
        "Cash Dispmnt Accrued Int": "0",
        "Long Security Name": "Issue",
        "Issue Amt": "Quantity",
        "YC +25": "0",
        "CS +100": "0",
        "MTD Int.Income": "Monthly Interest Income",
        "MTD Mark": "MTD Mark",
        "Ptf MTD P&L": "Ptf MTD P&L",
        "Ptf MTD Rlzd": "Monthly Capital Gains Rlzd",
        "Ptf MTD URlzd": "Monthly Capital Gains URlzd",
        "Adjusted OAS": "0",
        "Implied ZCS2": "0",
        "Issuer Name": "Issuer",
        "Ref Bond": "0",
        "Ref Fair": "0",
        "Ref YTM": "0",
        "Ref Spread o/r": "0",
        "AccAdj MTD": "0",
        "$ Fair": "0",
        FX: "holdPortfXrate",
        Quantity: "Quantity",
        Q_Sector: "Sector",
        Q_Country: "Country",
        "$ Full Econ(Mkt)": "Value",
    };
    let updatedPortfolio = [];
    for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        let updatedPosition = {};
        for (let titleIndex = 0; titleIndex < tableTitle.length; titleIndex++) {
            let title = tableTitle[titleIndex];
            updatedPosition[title] = tableTitleConversion[title] == "0" ? "0" : position[tableTitleConversion[title]];
        }
        if (position["Issue"].includes(" IB")) {
            updatedPosition["Acct"] = "NOM_IB";
        }
        else if (!position["Issue"].includes(" IB")) {
            updatedPosition["Acct"] = "NOM_PB";
        }
        if (position["Call Date"] && position["Call Date"] != "0") {
            updatedPosition["Text10"] = "AT1";
        }
        if (position["Issue"].includes("CDS")) {
            updatedPosition["Notional Total"] = -1 * position["Notional Total"];
            updatedPosition["$ Full Econ(Mkt)"] = -1 * position["Notional Total"];
        }
        updatedPortfolio.push(updatedPosition);
    }
    return updatedPortfolio;
}

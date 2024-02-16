"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertTradesInPortfolioAtASpecificDate = exports.editPosition = exports.calculateAccruedSinceInception = exports.insertPricesUpdatesInPortfolio = exports.updatePricesPortfolio = exports.insertTradesInPortfolio = exports.updatePositionPortfolio = exports.updateExisitingPosition = exports.returnPositionProgress = exports.getBBTicker = exports.findTrade = exports.tradesTriadaIds = exports.insertTrade = exports.getDailyEarnedInterestRlzPtf = exports.getSecurityInPortfolio = exports.getTrades = exports.getHistoricalPortfolio = exports.getPortfolio = exports.getAllCollectionDatesSinceStartMonth = exports.getEarliestCollectionName = exports.getRiskReportWithAnalytics = exports.getHistoricalSummaryPortfolioWithAnalytics = exports.getHistoricalPortfolioWithAnalytics = void 0;
require("dotenv").config();
const portfolioFunctions_1 = require("./portfolioFunctions");
const util_1 = __importDefault(require("util"));
const common_1 = require("./common");
const operations_1 = require("./operations");
const tableFormatter_1 = require("./tableFormatter");
const tableFormatter_2 = require("./tableFormatter");
const common_2 = require("./common");
const oneTimeFunctions_1 = require("./oneTimeFunctions");
const operations_2 = require("./operations");
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
async function getHistoricalPortfolioWithAnalytics(date, sort, sign) {
    const database = client.db("portfolios");
    let earliestPortfolioName = await getEarliestCollectionName(date);
    let sameDayCollectionsPublished = earliestPortfolioName[1];
    let yesterdayPortfolioName = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date(new Date(earliestPortfolioName[0]).getTime() - 1 * 24 * 60 * 60 * 1000)).split(" ")[0] + " 23:59";
    let lastDayBeforeToday = await getEarliestCollectionName(yesterdayPortfolioName);
    console.log(earliestPortfolioName[0], "get portfolio");
    const reportCollection = database.collection(`portfolio-${earliestPortfolioName[0]}`);
    let documents = await reportCollection
        .aggregate([
        {
            $sort: {
                Issue: 1, // replace 'BB Ticker' with the name of the field you want to sort alphabetically
            },
        },
    ])
        .toArray();
    let now = new Date(date);
    let currentMonth = now.getMonth();
    let currentYear = now.getFullYear();
    let uploadTradesDate = "";
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
        if (current["Last Upload Trade"]) {
            if (uploadTradesDate != "" && new Date(uploadTradesDate).getTime() < new Date(current["Last Upload Trade"]).getTime()) {
                uploadTradesDate = current["Last Upload Trade"];
            }
            else if (uploadTradesDate == "") {
                uploadTradesDate = current["Last Upload Trade"];
            }
        }
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
        documents = await getPreviousMarkPreviousFX(documents, previousDayPortfolio, lastDayBeforeToday[0]);
    }
    catch (error) {
        console.log(error);
    }
    documents = await calculateMTDInterest(documents, new Date(date));
    documents = await calculateDailyIntURlzdDaily(documents, new Date(date));
    documents = await calculateMTDURlzd(documents, new Date(date));
    documents = calculateMTDPLDayPL(documents, date);
    let dates = {
        today: earliestPortfolioName[0],
        yesterday: lastDayBeforeToday[0],
        lastMonth: lastMonthLastCollectionName[0],
    };
    let fundDetailsInfo = await (0, operations_1.getFundDetails)(thisMonth);
    let fund = fundDetailsInfo[0];
    let portfolioFormattedSorted = (0, tableFormatter_1.formatFrontEndTable)(documents, date, fund, dates, sort, sign);
    let fundDetails = portfolioFormattedSorted.fundDetails;
    documents = portfolioFormattedSorted.portfolio;
    return { portfolio: documents, sameDayCollectionsPublished: sameDayCollectionsPublished, fundDetails: fundDetails, analysis: portfolioFormattedSorted.analysis, uploadTradesDate: uploadTradesDate };
}
exports.getHistoricalPortfolioWithAnalytics = getHistoricalPortfolioWithAnalytics;
async function getHistoricalSummaryPortfolioWithAnalytics(date, sort, sign) {
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
    let uploadTradesDate = "";
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
        if (current["Last Upload Trade"]) {
            if (uploadTradesDate != "" && new Date(uploadTradesDate).getTime() < new Date(current["Last Upload Trade"]).getTime()) {
                uploadTradesDate = current["Last Upload Trade"];
            }
            else if (uploadTradesDate == "") {
                uploadTradesDate = current["Last Upload Trade"];
            }
        }
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
        documents = await getPreviousMarkPreviousFX(documents, previousDayPortfolio, lastDayBeforeToday[0]);
    }
    catch (error) {
        console.log(error);
    }
    let dates = {
        today: earliestPortfolioName[0],
        yesterday: lastDayBeforeToday[0],
        lastMonth: lastMonthLastCollectionName[0],
    };
    let fundDetailsInfo = await (0, operations_1.getFundDetails)(thisMonth);
    let fund = fundDetailsInfo[0];
    documents = await calculateMTDInterest(documents, new Date(date));
    documents = await calculateDailyIntURlzdDaily(documents, new Date(date));
    documents = await calculateMTDURlzd(documents, new Date(date));
    documents = calculateMTDPLDayPL(documents, date);
    let portfolioFormattedSorted = (0, tableFormatter_1.formatFrontEndSummaryTable)(documents, date, fund, dates, sort, sign);
    let fundDetails = portfolioFormattedSorted.fundDetails;
    documents = portfolioFormattedSorted.portfolio;
    return { portfolio: documents, sameDayCollectionsPublished: sameDayCollectionsPublished, fundDetails: fundDetails, analysis: portfolioFormattedSorted.analysis, uploadTradesDate: uploadTradesDate };
}
exports.getHistoricalSummaryPortfolioWithAnalytics = getHistoricalSummaryPortfolioWithAnalytics;
async function getRiskReportWithAnalytics(date, sort, sign) {
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
    let uploadTradesDate = "";
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
        if (current["Last Upload Trade"]) {
            if (uploadTradesDate != "" && new Date(uploadTradesDate).getTime() < new Date(current["Last Upload Trade"]).getTime()) {
                uploadTradesDate = current["Last Upload Trade"];
            }
            else if (uploadTradesDate == "") {
                uploadTradesDate = current["Last Upload Trade"];
            }
        }
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
        documents = await getPreviousMarkPreviousFX(documents, previousDayPortfolio, lastDayBeforeToday[0]);
    }
    catch (error) {
        console.log(error);
    }
    let dates = {
        today: earliestPortfolioName[0],
        yesterday: lastDayBeforeToday[0],
        lastMonth: lastMonthLastCollectionName[0],
    };
    let fundDetailsInfo = await (0, operations_1.getFundDetails)(thisMonth);
    let fund = fundDetailsInfo[0];
    documents = await calculateMTDInterest(documents, new Date(date));
    documents = await calculateDailyIntURlzdDaily(documents, new Date(date));
    documents = await calculateMTDURlzd(documents, new Date(date));
    documents = calculateMTDPLDayPL(documents, date);
    let portfolioFormattedSorted = (0, tableFormatter_1.formatFrontEndRiskTable)(documents, date, fund, dates, sort, sign);
    let fundDetails = portfolioFormattedSorted.fundDetails;
    documents = portfolioFormattedSorted.portfolio;
    return { portfolio: documents, sameDayCollectionsPublished: sameDayCollectionsPublished, fundDetails: fundDetails, analysis: portfolioFormattedSorted.analysis, uploadTradesDate: uploadTradesDate };
}
exports.getRiskReportWithAnalytics = getRiskReportWithAnalytics;
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
function getPairTrades(document) {
    let countLocations = {};
    let pairPositionsIds = [];
    for (let index = 0; index < document.length; index++) {
        let position = document[index];
        if (countLocations[position["Location"]]) {
            pairPositionsIds.push(position["_id"].toString());
        }
        else {
            countLocations[position["Location"]] = true;
        }
    }
    return pairPositionsIds;
}
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
exports.tradesTriadaIds = tradesTriadaIds;
async function findTrade(tradeType, tradeTriadaId, seqNo = null) {
    try {
        const database = client.db("trades_v_2");
        const reportCollection = database.collection(tradeType);
        let query;
        if (seqNo != null) {
            query = { $or: [{ "Triada Trade Id": tradeTriadaId }, { "Seq No": seqNo }] };
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
    let allTrades = await (0, portfolioFunctions_1.readCentralizedEBlot)(path);
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
                let identifier = row["ISIN"] !== "" ? row["ISIN"] : row["BB Ticker"] ? row["BB Ticker"] : row["Issue"];
                let object = {};
                let location = row["Location"].trim();
                let securityInPortfolio = getSecurityInPortfolio(portfolio, identifier, location);
                let type = row["Trade Type"] == "vcon" ? "vcons" : row["Trade Type"];
                if (securityInPortfolio !== 404) {
                    object = securityInPortfolio;
                }
                let couponDaysYear = securityInPortfolio !== 404 ? securityInPortfolio["Coupon Duration"] : row["Issue"].split(" ")[0] == "T" || row["Issue"].includes("U.S") ? 365.0 : 360.0;
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
                let tradeDB = await findTrade(type, row["Triada Trade Id"], row["Seq No"] && (row["Seq No"] != "") ? row["Seq No"] : null);
                let tradeExistsAlready = tradeDB || triadaIds.includes(row["Triada Trade Id"]);
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
                    console.log(row["Issue"], row["Trade Date"], row["Triada Trade Id"], " already exists");
                }
                if (!tradeExistsAlready && identifier !== "") {
                    triadaIds.push(row["Triada Trade Id"]);
                    if (!updatingPosition) {
                        let shortLongType = securityInPortfolio !== 404 ? (securityInPortfolio["Quantity"] >= 0 ? 1 : -1) : currentQuantity >= 0 ? 1 : -1;
                        let settlementDate = row["Settle Date"];
                        object["Location"] = row["Location"].trim();
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
                        object["Last Individual Upload Trade"] = new Date();
                        positions.push(object);
                    }
                    else if (returnPositionProgress(positions, identifier, location)) {
                        let shortLongType = securityInPortfolio !== 404 ? (securityInPortfolio["Quantity"] + updatingPosition["Quantity"] >= 0 ? 1 : -1) : updatingPosition["Quantity"] >= 0 ? 1 : -1;
                        let settlementDate = row["Settle Date"];
                        object["Location"] = row["Location"].trim();
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
                let logs = JSON.stringify(positions, null, 2);
                let dateTime = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
                await (0, oneTimeFunctions_1.appendLogs)(positions);
                let updatedPortfolio = (0, portfolioFunctions_1.formatUpdatedPositions)(positions, portfolio, "Last Upload Trade");
                let insertion = await insertTradesInPortfolio(updatedPortfolio[0]);
                let action3 = await insertTrade(allTrades[2], "emsx");
                let action2 = await insertTrade(allTrades[1], "ib");
                let action1 = await insertTrade(allTrades[0], "vcons");
                await (0, operations_1.insertEditLogs)(["trades upload"], "Upload Trades", dateTime, "Centarlized Blotter", "Link: " + path);
                return "insertion";
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
                    let positions = (0, operations_2.getSecurityInPortfolioWithoutLocation)(portfolio, row["ISIN"]);
                    if (positions == 404) {
                        positions = (0, operations_2.getSecurityInPortfolioWithoutLocation)(portfolio, row["BB Ticker"]);
                    }
                    if (positions == 404) {
                        positions = (0, operations_2.getSecurityInPortfolioWithoutLocation)(portfolio, row["Long Security Name"]);
                    }
                    if (positions == 404) {
                        continue;
                    }
                    for (let index = 0; index < positions.length; index++) {
                        let object = positions[index];
                        let faceValue = object["ISIN"].includes("CDX") || object["ISIN"].includes("ITRX") || object["ISIN"].includes("1393") || object["ISIN"].includes("IB") ? 100 : 1;
                        object["Mid"] = (parseFloat(row["Today's Mid"]) / 100.0) * faceValue;
                        object["Ask"] = parseFloat(row["Override Ask"]) > 0 ? (parseFloat(row["Override Ask"]) / 100.0) * faceValue : (parseFloat(row["Today's Ask"]) / 100.0) * faceValue;
                        object["Bid"] = parseFloat(row["Override Bid"]) > 0 ? (parseFloat(row["Override Bid"]) / 100.0) * faceValue : (parseFloat(row["Today's Bid"]) / 100.0) * faceValue;
                        object["YTM"] = row["Mid  Yield call"].toString().includes("N/A") ? 0 : row["Mid  Yield call"];
                        object["DV01"] = row["DV01"].toString().includes("N/A") ? 0 : row["DV01"];
                        object["OAS"] = row["OAS Spread"].toString().includes("N/A") ? 0 : row["OAS Spread"];
                        object["Z Spread"] = row["Z Spread"].toString().includes("N/A") ? 0 : row["Z Spread"];
                        object["S&P Bond Rating"] = row["S&P Bond Rating"].toString().includes("N/A") ? "" : row["S&P Bond Rating"];
                        object["S&P Outlook"] = row["S&P Outlook"].toString().includes("N/A") ? "" : row["S&P Outlook"];
                        object["Moody's Bond Rating"] = row["Moody's Bond Rating"].toString().includes("N/A") ? "" : row["Moody's Bond Rating"];
                        object["Moddy's Outlook"] = row["Moddy's Outlook"].toString().includes("N/A") ? "" : row["Moody's Outlook"];
                        object["Fitch Bond Rating"] = row["Fitch Bond Rating"].toString().includes("N/A") ? "" : row["Fitch Bond Rating"];
                        object["Fitch Outlook"] = row["Fitch Outlook"].toString().includes("N/A") ? "" : row["Fitch Outlook"];
                        object["BBG Composite Rating"] = row["BBG Composite Rating"].toString().includes("N/A") ? "" : row["BBG Composite Rating"];
                        object["BB Ticker"] = row["BB Ticker"].toString().includes("N/A") ? "" : row["BB Ticker"];
                        object["Issuer"] = row["Issuer Name"].toString().includes("N/A") ? "" : row["Issuer Name"];
                        // object["Issuer"] = row["Issuer Name"].includes("#") ? "0" : row["Issuer Name"];
                        if (row["ModDurPerp"]) {
                            object["Modified Duration"] = row["ModDurPerp"].toString().includes("#") ? (row["ModDur"].toString().includes("N/A") ? 0 : row["ModDur"]) : row["ModDurPerp"];
                        }
                        if (!row["Call Date"].includes("N/A") && !row["Call Date"].includes("#")) {
                            object["Call Date"] = row["Call Date"];
                        }
                        if (currencyInUSD[object["Currency"]]) {
                            object["FX Rate"] = currencyInUSD[object["Currency"]];
                        }
                        else {
                            object["FX Rate"] = 1;
                        }
                        if (!object["Country"] && row["Country"] && !row["Country"].includes("#N/A")) {
                            object["Country"] = row["Country"];
                        }
                        if (!object["Sector"] && row["Industry Sector"]) {
                            object["Sector"] = row["Industry Sector"];
                        }
                        updatedPricePortfolio.push(object);
                    }
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
                let updatedPortfolio = (0, portfolioFunctions_1.formatUpdatedPositions)(updatedPricePortfolio, portfolio, "Last Price Update");
                let insertion = await insertPricesUpdatesInPortfolio(updatedPortfolio[0]);
                await (0, operations_1.insertEditLogs)(["prices update"], "Update Prices", dateTime, `Bloomberg Pricing Sheet - positions that did not update: ${updatedPortfolio[1]}`, "Link: " + path);
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
function calculateDailyIntURlzdDaily(portfolio, date) {
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
        portfolio[index]["Day URlzd"] = portfolio[index]["ISIN"].includes("CDX") || portfolio[index]["ISIN"].includes("ITRX") ? ((parseFloat(todayPrice) - parseFloat(yesterdayPrice)) * portfolio[index]["Quantity"]) / portfolio[index]["Original Face"] : (parseFloat(todayPrice) - parseFloat(yesterdayPrice)) * portfolio[index]["Quantity"] || 0;
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
function calculateAccruedSinceInception(interestInfo, couponRate, numOfYears) {
    let quantityDates = Object.keys(interestInfo).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    quantityDates.push((0, common_1.formatTradeDate)(new Date()));
    couponRate = couponRate ? couponRate : 0;
    let quantity = interestInfo[quantityDates[0]];
    let interest = 0;
    for (let index = 0; index < quantityDates.length; index++) {
        if (quantityDates[index + 1]) {
            let numOfDays = getDaysBetween(quantityDates[index], quantityDates[index + 1]);
            interest += (couponRate / numOfYears) * numOfDays * quantity;
        }
        quantity += interestInfo[quantityDates[index + 1]] ? interestInfo[quantityDates[index + 1]] : 0;
    }
    return interest;
}
exports.calculateAccruedSinceInception = calculateAccruedSinceInception;
function calculateMTDInterest(portfolio, date) {
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
                let settlementDateTimestamp = new Date(settlementDate).getTime() + 24 * 60 * 60 * 1000;
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
async function getMTDParams(portfolio, lastMonthPortfolio, dateInput) {
    try {
        let thisMonth = (0, common_1.monthlyRlzdDate)(dateInput);
        for (let index = 0; index < portfolio.length; index++) {
            let position = portfolio[index];
            let lastMonthPosition;
            for (let lastMonthIndex = 0; lastMonthIndex < lastMonthPortfolio.length; lastMonthIndex++) {
                lastMonthPosition = lastMonthPortfolio[lastMonthIndex];
                portfolio[index]["Notes"] = "";
                if ((lastMonthPosition["ISIN"] == position["ISIN"] && position["ISIN"] && lastMonthPosition["ISIN"]) || (lastMonthPosition["Issue"] == position["Issue"] && position["Issue"] && lastMonthPosition["Issue"])) {
                    portfolio[index]["MTD Mark"] = lastMonthPosition["Mid"];
                    portfolio[index]["MTD FX"] = lastMonthPosition["FX Rate"] ? lastMonthPosition["FX Rate"] : lastMonthPosition["holdPortfXrate"] ? lastMonthPosition["holdPortfXrate"] : null;
                }
            }
        }
        for (let index = 0; index < portfolio.length; index++) {
            if (!parseFloat(portfolio[index]["MTD Mark"]) && parseFloat(portfolio[index]["MTD Mark"]) != 0 && portfolio[index]["Entry Price"][thisMonth]) {
                portfolio[index]["MTD Mark"] = portfolio[index]["Entry Price"][thisMonth];
                portfolio[index]["Notes"] = "MTD Mark not found, used entry price for this month instead";
            }
        }
        return portfolio;
    }
    catch (error) {
        return portfolio;
    }
}
async function calculateMTDURlzd(portfolio, dateInput) {
    for (let index = 0; index < portfolio.length; index++) {
        let thisMonth = (0, common_1.monthlyRlzdDate)(dateInput);
        if (!portfolio[index]["Mid"]) {
            portfolio[index]["Mid"] = portfolio[index]["Entry Price"][thisMonth];
        }
        portfolio[index]["MTD URlzd"] = portfolio[index]["ISIN"].includes("CDX") || portfolio[index]["ISIN"].includes("ITRX") ? ((parseFloat(portfolio[index]["Mid"]) - parseFloat(portfolio[index]["MTD Mark"])) * portfolio[index]["Quantity"]) / portfolio[index]["Original Face"] : (parseFloat(portfolio[index]["Mid"]) - parseFloat(portfolio[index]["MTD Mark"])) * portfolio[index]["Quantity"];
        if (portfolio[index]["MTD URlzd"] == 0) {
            portfolio[index]["MTD URlzd"] = 0;
        }
        else if (!portfolio[index]["MTD URlzd"]) {
            portfolio[index]["MTD URlzd"] = "0";
        }
    }
    return portfolio;
}
async function getPreviousMarkPreviousFX(portfolio, previousDayPortfolio, dateInput) {
    // try {
    for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        let previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue) => previousDayIssue["ISIN"] == position["ISIN"] && previousDayIssue["ISIN"] && position["ISIN"]) : null;
        if (!previousDayPosition) {
            previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue) => previousDayIssue["Issue"] == position["Issue"] && previousDayIssue["Issue"] && position["Issue"]) : null;
        }
        let previousMark = previousDayPosition ? previousDayPosition["Mid"] : "0";
        let previousFxRate = previousDayPosition ? (previousDayPosition["FX Rate"] ? previousDayPosition["FX Rate"] : previousDayPosition["holdPortfXrate"] ? previousDayPosition["holdPortfXrate"] : 0) : 0;
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
function calculateMTDPLDayPL(portfolio, date) {
    let thisMonth = (0, common_1.monthlyRlzdDate)(date);
    let thisDay = (0, portfolioFunctions_1.formatDateRlzdDaily)(date);
    for (let index = 0; index < portfolio.length; index++) {
        portfolio[index]["MTD Rlzd"] = portfolio[index]["MTD Rlzd"] ? (portfolio[index]["MTD Rlzd"][thisMonth] ? (0, tableFormatter_2.calculateRlzd)(portfolio[index]["MTD Rlzd"][thisMonth], portfolio[index]["MTD Mark"], portfolio[index]["Issue"]) : 0) : 0;
        portfolio[index]["Day Rlzd"] = portfolio[index]["Day Rlzd"] ? (portfolio[index]["Day Rlzd"][thisDay] ? (0, tableFormatter_2.calculateRlzd)(portfolio[index]["Day Rlzd"][thisDay], portfolio[index]["Previous Mark"], portfolio[index]["Issue"]) : 0) : 0;
        portfolio[index]["Monthly Capital Gains Rlzd"] = portfolio[index]["Monthly Capital Gains Rlzd"] ? portfolio[index]["Monthly Capital Gains Rlzd"][thisMonth] || 0 : 0;
        portfolio[index]["Cost MTD Ptf"] = portfolio[index]["Cost MTD Ptf"] ? portfolio[index]["Cost MTD Ptf"][thisMonth] || 0 : 0;
        portfolio[index]["Day Rlzd K G/L"] = portfolio[index]["Day Rlzd K G/L"] ? portfolio[index]["Day Rlzd K G/L"][thisDay] || 0 : 0;
        portfolio[index]["Ptf MTD P&L"] = parseFloat(portfolio[index]["MTD Rlzd"]) + (parseFloat(portfolio[index]["MTD URlzd"]) || 0) + parseFloat(portfolio[index]["Monthly Interest Income"]) || 0;
        portfolio[index]["Ptf Day P&L"] = parseFloat(portfolio[index]["Daily Interest Income"]) + parseFloat(portfolio[index]["Day Rlzd"]) + parseFloat(portfolio[index]["Day URlzd"]) ? parseFloat(portfolio[index]["Daily Interest Income"]) + parseFloat(portfolio[index]["Day Rlzd"]) + parseFloat(portfolio[index]["Day URlzd"]) : 0;
        if (portfolio[index]["Ptf Day P&L"] == 0) {
            portfolio[index]["Ptf Day P&L"] = 0;
        }
        else if (!portfolio[index]["Ptf Day P&L"]) {
            portfolio[index]["Ptf Day P&L"] = 0;
        }
    }
    return portfolio;
}
async function editPosition(editedPosition, date) {
    try {
        const database = client.db("portfolios");
        let earliestPortfolioName = await getEarliestCollectionName(date);
        console.log(earliestPortfolioName[0], "get edit portfolio");
        const reportCollection = database.collection(`portfolio-${earliestPortfolioName[0]}`);
        let portfolio = await reportCollection
            .aggregate([
            {
                $sort: {
                    Issue: 1, // replace 'BB Ticker' with the name of the field you want to sort alphabetically
                },
            },
        ])
            .toArray();
        console.log(editedPosition);
        let positionInPortfolio = {};
        let editedPositionTitles = Object.keys(editedPosition);
        let id = editedPosition["_id"];
        let unEditableParams = [
            "Value",
            "Duration(Mkt)",
            "MTD Mark",
            "Previous Mark",
            "Ptf Day P&L (Base Currency)",
            "Ptf MTD Rlzd (Base Currency)",
            "Ptf MTD URlzd (Base Currency)",
            "Ptf MTD Int.Income (Base Currency)",
            "Ptf MTD P&L (Base Currency)",
            "Cost (Local Currency)",
            "Daily Accrual",
            "_id",
            "Daily Accrual (Local Currency)",
            "Cost MTD Ptf (Local Currency)",
            "Quantity",
            "Daily Interest Income (Base Currency)",
            "S&P Outlook",
            "Moody's Bond Rating",
            "Moddy's Outlook",
            "Fitch Bond Rating",
            "Fitch Outlook",
            // "BBG Composite Rating",
            "Day P&L FX",
            "MTD P&L FX",
            "S&P Bond Rating",
            "MTD FX",
            "Day URlzd",
            "Day Rlzd K G/L",
            "Ptf Day P&L (Local Currency)",
            "Ptf MTD Rlzd (Local Currency)",
            "Ptf MTD URlzd (Local Currency)",
            "Ptf MTD Int.Income (Local Currency)",
            "Ptf MTD P&L (Local Currency)",
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
            let todayDate = (0, common_1.formatDateReadable)(new Date().toString());
            let monthDate = (0, common_1.monthlyRlzdDate)(new Date().toString());
            if (!unEditableParams.includes(title) && editedPosition[title] != "") {
                if (title == "Notional Total") {
                    positionInPortfolio["Interest"][todayDate] = parseFloat(editedPosition[title]) - parseFloat(positionInPortfolio["Quantity"]);
                    changes.push(`Quantity changed from ${positionInPortfolio["Quantity"]} to ${editedPosition[title]}`);
                    positionInPortfolio["Quantity"] = parseFloat(editedPosition[title]);
                    positionInPortfolio["Net"] = parseFloat(editedPosition[title]);
                }
                else if (title == "Long Security Name") {
                    changes.push(`${title} changed from ${positionInPortfolio[title] || "''"} to ${editedPosition[title]}`);
                    positionInPortfolio["Issue"] = editedPosition[title];
                }
                else {
                    changes.push(`${title} changed from ${positionInPortfolio[title] || "''"} to ${editedPosition[title]}`);
                    if (isFinite(editedPosition[title]) && editedPosition[title] != null && editedPosition[title] != "") {
                        positionInPortfolio[title] = parseFloat(editedPosition[title]);
                    }
                    else {
                        positionInPortfolio[title] = editedPosition[title];
                    }
                }
            }
        }
        let dateTime = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
        portfolio[positionIndex] = positionInPortfolio;
        console.log(positionInPortfolio, `portfolio-${earliestPortfolioName[0]}`, "portfolio edited name");
        await (0, operations_1.insertEditLogs)(changes, editedPosition["Event Type"], dateTime, editedPosition["Edit Note"], positionInPortfolio["Issue"]);
        let action = await insertTradesInPortfolioAtASpecificDate(portfolio, `portfolio-${earliestPortfolioName[0]}`);
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
        const historicalReportCollection = database.collection(date);
        let action = await historicalReportCollection.bulkWrite(operations);
        console.log(action);
        return action;
    }
    catch (error) {
        return error;
    }
}
exports.insertTradesInPortfolioAtASpecificDate = insertTradesInPortfolioAtASpecificDate;

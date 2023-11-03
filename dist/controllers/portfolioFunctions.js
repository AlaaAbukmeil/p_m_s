"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDateRlzdDaily = exports.formatUpdatedPositions = exports.sortVconTrades = exports.getAllDatesSinceLastMonthLastDay = exports.uploadTriadaAndReturnFilePath = exports.calculateMonthlyProfitLoss = exports.calculateDailyProfitLoss = exports.readPricingSheet = exports.readBloombergTriadaEBlot = exports.readPortfolioFromLivePorfolio = exports.readPortfolioFromImagine = exports.readMUFGEBlot = exports.readIBEBlot = exports.readIBTrades = exports.formatIbTradesToVcon = exports.formatIbTrades = exports.readVconEBlot = exports.uploadToGCloudBucket = exports.getSettlementDateYear = exports.bloombergToTriada = exports.parseBondIdentifier = exports.formatTradesObj = exports.settlementDatePassed = exports.getAverageCost = exports.formatExcelDate = void 0;
const common_1 = require("./common");
const portfolioOperations_1 = require("./portfolioOperations");
const graphApiConnect_1 = require("./graphApiConnect");
const xlsx = require("xlsx");
const axios = require("axios");
const { Storage } = require('@google-cloud/storage');
const storage = new Storage({ keyFilename: process.env.KEYPATHFILE });
const { PassThrough } = require('stream');
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
mongoose.connect(uri, {
    useNewUrlParser: true
});
function calculateUSTreasuryPrice(input) {
    const fractionMap = {
        '⅛': 0.125,
        '¼': 0.25,
        '⅓': 0.3333333333333333,
        '⅜': 0.375,
        '½': 0.5,
        '⅝': 0.625,
        '⅔': 0.6666666666666666,
        '¾': 0.75,
        '⅞': 0.875
    };
    if (typeof input === "number") {
        return input;
    }
    if (input.includes("-")) {
        const parts = input.split("-");
        const base = parseFloat(parts[0]);
        let fraction = 0;
        for (let key in fractionMap) {
            if (parts[1].includes(key)) {
                fraction = parseFloat(parts[1].replace(key, "")) + fractionMap[key];
                break;
            }
        }
        if (fraction === 0) {
            if (parts[1].includes("+")) {
                fraction = parseFloat(parts[1].replace("+", "")) + 0.5;
            }
            else {
                fraction = parseFloat(parts[1]);
            }
        }
        return base + (fraction / 32);
    }
    return parseFloat(input);
}
function formatExcelDate(date) {
    if (typeof date === 'number') {
        // If date is a number, parse it as an Excel date code
        const parsedDate = xlsx.SSF.parse_date_code(date);
        return `${parsedDate.d < 10 ? '0' + parsedDate.d : parsedDate.d}/${parsedDate.m < 10 ? '0' + parsedDate.m : parsedDate.m}/${parsedDate.y}`;
    }
    else {
        // If date is a string, check if it needs to be updated to the yyyy format
        const parts = date.split("/");
        if (parts[2].length === 2) {
            parts[2] = "20" + parts[2];
        }
        return parts.join("/");
    }
}
exports.formatExcelDate = formatExcelDate;
function getAverageCost(currentQuantity, previousQuantity, currentPrice, previousAverageCost) {
    if (!previousQuantity) {
        previousQuantity = 0;
    }
    if (!previousAverageCost) {
        previousAverageCost = 0;
    }
    if ((currentQuantity + previousQuantity) == 0) {
        let previousPrice = previousAverageCost;
        return (previousPrice + currentPrice) / 2.00;
    }
    else {
        let previousPrice = previousAverageCost;
        let averageCost = ((currentQuantity * currentPrice) + (previousQuantity * previousPrice)) / (currentQuantity + previousQuantity);
        return averageCost;
    }
}
exports.getAverageCost = getAverageCost;
function settlementDatePassed(settlementDate, ticker) {
    let parts = settlementDate.split('/');
    let year = parseInt(parts[2], 10);
    year += year < 70 ? 2000 : 1900; // Adjust year
    let inputDate = new Date(year, parts[0] - 1, parts[1]);
    let today = new Date();
    // Set the time of both dates to be the same
    inputDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return today >= inputDate;
}
exports.settlementDatePassed = settlementDatePassed;
function formatTradesObj(data) {
    let object = {};
    object["isin"] = [];
    object["bb ticker"] = [];
    object["country"] = [];
    object["currency"] = [];
    object["average cost"] = [];
    object["accrued interest"] = [];
    object["strategy"] = [];
    object["date"] = [];
    for (let index = 0; index < data.length; index++) {
        const row = data[index];
        object["isin"].push(row["isin"]);
        object["bb ticker"].push(row["bb ticker"]);
        object["country"].push(row["country"]);
        object["currency"].push(row["currency"]);
        object["average cost"].push(row["average cost"]);
        object["accrued interest"].push(row["accrued interest"]);
        object["strategy"].push(row["strategy"]);
        object["date"].push(row["date"]);
    }
    return object;
}
exports.formatTradesObj = formatTradesObj;
function parseBondIdentifier(identifier) {
    // Split the identifier into components
    try {
        if (identifier) {
            const components = identifier.split(' ');
            const fractionMap = {
                '⅛': 0.125,
                '¼': 0.25,
                '⅓': 0.3333333333333333,
                '⅜': 0.375,
                '½': 0.5,
                '⅝': 0.625,
                '⅔': 0.6666666666666666,
                '¾': 0.75,
                '⅞': 0.875
            };
            try {
                let rate = (parseFloat(components[1].replace("V", "").trim())) ? parseFloat(components[1].replace("V", "").trim()) : "Not Applicable";
                let dateComponents = components[2].split('/');
                let date = (parseInt(dateComponents[1]) < 12 ? new Date(`${"20" + dateComponents[2]}-${dateComponents[1]}-${dateComponents[0]}`) : new Date(`${"20" + dateComponents[2]}-${dateComponents[0]}-${dateComponents[1]}`));
                // let date: any = new Date(components[2])
                if (date) {
                    date = (0, common_1.formatDate)(date);
                }
                return [rate, date];
            }
            catch (error) {
                return error;
            }
        }
        else {
            return ["Not Applicable", "Invalid Date"];
        }
    }
    catch (error) {
        return "Not Applicable";
    }
}
exports.parseBondIdentifier = parseBondIdentifier;
async function bloombergToTriada(path, inputTrader, inputStrategy) {
    const data = await readBloombergEBlot(path);
    if (data.error) {
        return data.error;
    }
    else {
        let arr = [];
        const date = (0, common_1.getDate)(null);
        const time = (0, common_1.getTime)();
        for (let index = 0; index < data.length; index++) {
            let row = data[index];
            let bS = row["Side"];
            let bondCDS = row["Security"];
            let price = row["Price (Dec)"];
            let notionalAmount = row["Qty (M)"];
            let counterParty = row["BrkrName"];
            let settlementDate = formatExcelDate(row["SetDt"]);
            let settlmenet = row["Net"];
            let eBlot = {
                "Date": date,
                "Time": time,
                "B/S": bS,
                "Bond/CDS": bondCDS,
                "Price": price || 0,
                "Notional Amount": notionalAmount,
                "Trader": inputTrader,
                "Counterparty": counterParty,
                "Settlement Date": settlementDate,
                "Settlement and CDS/Other Notes": settlmenet,
                "Strategy": inputStrategy
            };
            if (row["Block Status"] == "Accepted") {
                arr.push(eBlot);
            }
        }
        return arr;
    }
}
exports.bloombergToTriada = bloombergToTriada;
function getSettlementDateYear(date1, date2) {
    // Parse the month and year from the first date
    const [month1, day1, year1] = date1.split('/').map(Number);
    // Parse the month from the second date
    let [month2, day2] = date2.split('/').map(Number);
    // If the month of the second date is less than the month of the first date,
    // it means we've crossed into a new year, so increment the year
    const year2 = month2 < month1 ? year1 + 1 : year1;
    // Add leading zero if month2 or day2 is less than 10
    month2 = month2 < 10 ? month2.toString().padStart(2, '0') : month2;
    day2 = day2 < 10 ? day2.toString().padStart(2, '0') : day2;
    // Return the second date with the year appended
    return `${month2}/${day2}/${year2}`;
}
exports.getSettlementDateYear = getSettlementDateYear;
async function uploadToGCloudBucket(data, bucketName, fileName) {
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);
    const stream = file.createWriteStream({
        metadata: {
            contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        resumable: false,
    });
    stream.write(data);
    stream.end();
    return new Promise((resolve, reject) => stream.on('error', reject).on('finish', resolve));
}
exports.uploadToGCloudBucket = uploadToGCloudBucket;
async function readBloombergEBlot(path) {
    const response = await axios.get(path, { responseType: 'arraybuffer' });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: 'buffer' });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headersFormat = [
        'Block Status', 'Alloc Status',
        'ISIN', 'Cusip',
        'Side', 'Qty (M)',
        'Price (Dec)', 'Customer',
        'Security', 'Seq#',
        'BrkrName', 'App',
        'Rcvd Time', 'Workflow',
        'ReferenceID', 'AsOfDate',
        'Trade Dt', 'Acc Int',
        'Net', 'Sender',
        'Dest', 'SetDt',
        'Ticker'
    ];
    const arraysAreEqual = headersFormat.length === headers[2].length && headersFormat.every((value, index) => value === headers[2][index]);
    if (!arraysAreEqual) {
        return { error: "Incompatible format, please upload bloomberg e-blot xlsx/csv file" };
    }
    else {
        const data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A3:W10000' });
        return data;
    }
}
function mergeSort(array) {
    if (array.length <= 1) {
        return array;
    }
    const middle = Math.floor(array.length / 2);
    const left = array.slice(0, middle);
    const right = array.slice(middle);
    return merge(mergeSort(left), mergeSort(right));
}
function merge(left, right) {
    let resultArray = [], leftIndex = 0, rightIndex = 0;
    while (leftIndex < left.length && rightIndex < right.length) {
        const dateLeft = new Date(left[leftIndex]["Trade Date"]);
        const dateRight = new Date(right[rightIndex]["Trade Date"]);
        if (dateLeft < dateRight) {
            resultArray.push(left[leftIndex]);
            leftIndex++;
        }
        else {
            resultArray.push(right[rightIndex]);
            rightIndex++;
        }
    }
    return resultArray
        .concat(left.slice(leftIndex))
        .concat(right.slice(rightIndex));
}
async function readVconEBlot(path) {
    const response = await axios.get(path, { responseType: 'arraybuffer' });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: 'buffer' });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headersFormat = [
        "Broker Code",
        "Status",
        "Buy/Sell",
        "Quantity",
        // "Location code",
        "Issue",
        "Benchmark",
        "Price",
        "Yield",
        "Principal",
        "Trade Date",
        "Acc Int",
        "Settle Date",
        "Net",
        "Spread",
        "Entry Time",
        "Customer",
        "Seq No",
    ];
    const arraysAreEqual = headersFormat.every((value, index) => value === headers[0][index]);
    if (!arraysAreEqual) {
        return { error: "Incompatible format, please upload vcon e-blot xlsx/csv file" };
    }
    else {
        let data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A1:CZ10000' });
        if (data.length > 2500) {
            return { error: "Max Trades Limit is 250 per minute" };
        }
        else {
            let isinRequest = [];
            for (let index = 0; index < data.length; index++) {
                let trade = data[index];
                let isinObjReq = { "idType": "ID_ISIN", "idValue": trade["ISIN"] };
                isinRequest.push(isinObjReq);
            }
            let bbTickers = await (0, portfolioOperations_1.getBBTicker)(isinRequest);
            for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
                data[rowIndex]["BB Ticker"] = bbTickers[data[rowIndex]["ISIN"]];
                data[rowIndex]["Price"] = data[rowIndex]["Price (Decimal)"];
            }
            data = mergeSort(data);
            return data;
        }
    }
}
exports.readVconEBlot = readVconEBlot;
function formatIbTrades(data, ibTrades, portfolio) {
    let trades = [];
    try {
        let count = ibTrades.length + 1;
        for (let index = 0; index < data.length; index++) {
            let trade = data[index];
            let id;
            let object = {};
            if (trade["Header"] == "Data") {
                let tradeDate = (0, common_1.convertExcelDateToJSDate)(data[index]["Date/Time"]);
                trade["Trade Date"] = (0, common_1.formatTradeDateVcon)(tradeDate);
                trade["Settle Date"] = (0, common_1.formatSettleDateVcon)(tradeDate);
                let existingTrade = null;
                for (let ibIndex = 0; ibIndex < ibTrades.length; ibIndex++) {
                    let ibTrade = ibTrades[ibIndex];
                    if (trade["Symbol"] == ibTrade["Symbol"] && trade["Quantity"] == ibTrade["Quantity"] &&
                        trade["Trade Date"] == ibTrade["Trade Date"] && trade["Settle Date"] == ibTrade["Settle Date"] &&
                        trade["T. Price"] == ibTrade["T Price"] && trade["C. Price"] == ibTrade["C Price"]) {
                        existingTrade = ibTrade;
                    }
                }
                let identifier = trade["Symbol"] + " Index";
                let securityInPortfolioLocation = (0, graphApiConnect_1.getSecurityInPortfolioWithoutLocation)(portfolio, identifier);
                if (existingTrade) {
                    id = existingTrade["Triada Trade Id"];
                }
                else {
                    id = `Triada-IB-${trade["Trade Date"]}-${count}`;
                    count++;
                }
                object["Currency"] = trade["Currency"];
                object["Symbol"] = trade["Symbol"] + " Index";
                object["Quantity"] = trade["Quantity"];
                object["T Price"] = trade["T. Price"];
                object["C Price"] = data[index]["C. Price"];
                object["Notional Value"] = trade["Notional Value"];
                object["Comm/Fee"] = trade["Comm/Fee"];
                object["Basis"] = trade["Basis"];
                object["Realized P/L"] = trade["Realized P/L"];
                object["MTM P/L"] = trade["MTM P/L"];
                object["Code"] = trade["Code"];
                object["Trade Date"] = trade["Trade Date"];
                object["Settle Date"] = trade["Settle Date"];
                object["Triada Trade Id"] = id;
                object["Location"] = securityInPortfolioLocation;
                trades.push(object);
            }
        }
    }
    catch (error) {
        return { error: error };
    }
    return trades;
}
exports.formatIbTrades = formatIbTrades;
function formatIbTradesToVcon(data) {
    let object = [];
    try {
        for (let index = 0; index < data.length; index++) {
            let updatedTrade = {};
            let trade = data[index];
            let originalFace = trade["Symbol"].includes("6") ? 125000 : 50;
            updatedTrade["Buy/Sell"] = trade["Quantity"] < 0 ? "S" : "B";
            updatedTrade["ISIN"] = trade["Symbol"];
            updatedTrade["BB Ticker"] = trade["Symbol"];
            updatedTrade["Issue"] = trade["Symbol"];
            updatedTrade["Quantity"] = (Math.abs(trade["Quantity"])).toString();
            //this to pass the bond divider 
            updatedTrade["Price"] = trade["C Price"] * 100.00;
            updatedTrade["Currency"] = trade["Currency"];
            updatedTrade["Net"] = (Math.abs(parseFloat(trade["Quantity"])) * originalFace * parseFloat(trade["C Price"])).toString();
            updatedTrade["Trade Date"] = (0, common_1.convertExcelDateToJSDate)(trade["Trade Date"]);
            updatedTrade["Settle Date"] = (0, common_1.convertExcelDateToJSDate)(trade["Settle Date"]);
            updatedTrade["Triada Trade Id"] = trade["Triada Trade Id"];
            updatedTrade["Location"] = trade["Location"].trim();
            updatedTrade["Status"] = "Accepted";
            object.push(updatedTrade);
        }
    }
    catch (error) {
        return { error: error };
    }
    return object;
}
exports.formatIbTradesToVcon = formatIbTradesToVcon;
async function readIBTrades(path) {
    const response = await axios.get(path, { responseType: 'arraybuffer' });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: 'buffer' });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headersFormat = [
        "Currency", "Symbol", "Quantity", "T Price", "C Price", "Notional Value", "Comm/Fee", "Basis", "Realized P/L", "MTM P/L", "Code", "Trade Date", "Settle Date", "Triada Trade Id", "Location"
    ];
    const arraysAreEqual = headersFormat.every((value, index) => value === headers[0][index] ? true : console.log(value, headers[0][index]));
    if (!arraysAreEqual) {
        return { error: "Incompatible format, please upload ib e-blot xlsx/csv file" };
    }
    else {
        let data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A1:CZ10000' });
        if (data.length > 2500) {
            return { error: "Max Trades Limit is 250 per minute" };
        }
        else {
            return data;
        }
    }
}
exports.readIBTrades = readIBTrades;
async function readIBEBlot(path) {
    try {
        const response = await axios.get(path, { responseType: 'arraybuffer' });
        /* Parse the data */
        const workbook = xlsx.read(response.data, { type: 'buffer' });
        /* Get first worksheet */
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        let data = xlsx.utils.sheet_to_row_object_array(worksheet);
        let headers = Object.keys(data[0]);
        let tradesRowIndex = -1; // Will hold the index of the row where "Trades" is found
        let tradesRowEndIndex = -1;
        for (let index = 0; index < data.length; index++) {
            let row = data[index];
            // Assuming the first column is named 'A'
            if (row[headers[0]] === 'Trades') {
                tradesRowIndex = index + 2;
                break;
            }
        }
        if (tradesRowIndex == -1) {
            return [];
        }
        else {
            for (let tradesIndex = tradesRowIndex; tradesIndex < data.length; tradesIndex++) {
                let trade = data[tradesIndex];
                if (trade[headers[1]] !== 'Data' && trade[headers[1]] != "SubTotal") {
                    tradesRowEndIndex = tradesIndex + 1;
                    break;
                }
            }
        }
        data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: `A${tradesRowIndex}:P${tradesRowEndIndex}` });
        return data;
    }
    catch (error) {
        return [];
    }
}
exports.readIBEBlot = readIBEBlot;
async function readMUFGEBlot(path) {
    const response = await axios.get(path, { responseType: 'arraybuffer' });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: 'buffer' });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const arraysAreEqual = true;
    if (!arraysAreEqual) {
        return { error: "Incompatible format, please upload vcon e-blot xlsx/csv file" };
    }
    else {
        let data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A1:V10000' });
        if (data.length > 2500) {
            return { error: "Max Trades Limit is 250 per minute" };
        }
        else {
            let isinRequest = [];
            for (let index = 0; index < data.length; index++) {
                let positionMufg = data[index];
                let isinObjReq = { "idType": "ID_ISIN", "idValue": positionMufg["Investment"] };
                isinRequest.push(isinObjReq);
            }
            let bbTickers = await (0, portfolioOperations_1.getBBTicker)(isinRequest);
            for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
                data[rowIndex]["BB Ticker"] = bbTickers[data[rowIndex]["Investment"]];
            }
            let portfolio = [];
            for (let index = 0; index < data.length; index++) {
                let object = {};
                let position = data[index];
                object["BB Ticker"] = position["BB Ticker"] ? position["BB Ticker"].replace("Corp", "").replace("Govt", "").trim() : position["BB Ticker"];
                object["Quantity"] = position["Quantity MUFG"];
                object["ISIN"] = position["Investment"];
                object["Issue"] = position[" Issue "].trim();
                object["Average Cost"] = parseFloat(position["Price"]) / 100.00;
                object["Buy/Sell"] = "B";
                object["Status"] = "Accepted";
                object["Trade Date"] = "09/29/23";
                object["Settle Date"] = "09/29";
                object["Net"] = position["Quantity MUFG"];
                object["Mid"] = parseFloat(position["Price"]) / 100.00;
                object["Location"] = position["Location"];
                object["Currency"] = position["CCY"];
                portfolio.push(object);
            }
            return portfolio;
        }
    }
}
exports.readMUFGEBlot = readMUFGEBlot;
async function readPortfolioFromImagine(path) {
    const response = await axios.get(path, { responseType: 'arraybuffer' });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: 'buffer' });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    const arraysAreEqual = true; //headersFormat.length === headers[0].length && headersFormat.every((value, index) => value === headers[0][index]);
    if (!arraysAreEqual) {
        return { error: "Incompatible format, please upload vcon e-blot xlsx/csv file" };
    }
    else {
        try {
            let data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A1:AM10000' });
            if (data.length > 2500) {
                return { error: "Max Trades Limit is 250 per minute" };
            }
            else {
                let portfolio = [];
                for (let index = 0; index < data.length; index++) {
                    let object = {};
                    let position = data[index];
                    object["BB Ticker"] = position["BB Ticker"].replace("Corp", "").replace("Govt", "").trim();
                    object["Quantity"] = position["Notional Total"];
                    object["ISIN"] = position["Isin"];
                    object["Price"] = (parseFloat(position["Average Cost"])) || 0;
                    object["Buy/Sell"] = "B";
                    object["Status"] = "Accepted";
                    object["Trade Date"] = "09/29/23";
                    object["Settle Date"] = "09/29";
                    object["Net"] = position["Notional Total"];
                    object["Mid"] = position["Mid"];
                    object["Location"] = position["Location"];
                    object["Currency"] = position["Curr"];
                    portfolio.push(object);
                }
                return portfolio;
            }
        }
        catch (error) {
            return { error: error };
        }
    }
}
exports.readPortfolioFromImagine = readPortfolioFromImagine;
async function readPortfolioFromLivePorfolio(path) {
    const response = await axios.get(path, { responseType: 'arraybuffer' });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: 'buffer' });
    /* Get first worksheet */
    // const worksheetName = workbook.SheetNames[3];
    const worksheet = workbook.Sheets["Summary"];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    const arraysAreEqual = true; //headersFormat.length === headers[0].length && headersFormat.every((value, index) => value === headers[0][index]);
    if (!arraysAreEqual) {
        return { error: "Incompatible format, please upload vcon e-blot xlsx/csv file" };
    }
    else {
        try {
            let data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A15:BO127' });
            if (data.length > 2500) {
                return { error: "Max Trades Limit is 250 per minute" };
            }
            else {
                let portfolio = [];
                for (let index = 0; index < data.length; index++) {
                    let object = {};
                    let position = data[index];
                    object["BB Ticker"] = position["BBG Ticker"].replace("Corp", "").trim();
                    object["Quantity"] = position["Notional Total"];
                    object["Average Cost"] = (parseFloat(position["Avg Cost"])) / 100.0;
                    object["Buy/Sell"] = "B";
                    object["Status"] = "Accepted";
                    object["Trade Date"] = "09/30/23";
                    object["Settle Date"] = "08/31";
                    object["Net"] = position["Notional Total"];
                    object["Currency"] = position["Curr"];
                    if (object["BB Ticker"] === "") {
                        break;
                    }
                    portfolio.push(object);
                }
                return portfolio;
            }
        }
        catch (error) {
            return { error: error };
        }
    }
}
exports.readPortfolioFromLivePorfolio = readPortfolioFromLivePorfolio;
async function readBloombergTriadaEBlot(path) {
    const response = await axios.get(path, { responseType: 'arraybuffer' });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: 'buffer' });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headersFormat = [
        'Block Status', 'Alloc Status',
        'ISIN', 'Cusip',
        'Side', 'Qty (M)',
        'Price (Dec)', 'Customer',
        'Security', 'Seq#',
        'BrkrName', 'App',
        'Rcvd Time', 'Workflow',
        'ReferenceID', 'AsOfDate',
        'Trade Dt', 'Acc Int',
        'Net', 'Sender',
        'Dest', 'SetDt',
        'Ticker', "Country", "Curreny In USD Ratio", "Strategy", "Interest Rate"
    ];
    const arraysAreEqual = headersFormat.length === headers[2].length && headersFormat.every((value, index) => value === headers[2][index]);
    if (!arraysAreEqual) {
        return { error: "Incompatible format, please upload bloomberg-triada e-blot xlsx/csv file" };
    }
    else {
        const data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A3:AA10000' });
        return data;
    }
}
exports.readBloombergTriadaEBlot = readBloombergTriadaEBlot;
async function readPricingSheet(path) {
    const response = await axios.get(path, { responseType: 'arraybuffer' });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: 'buffer' });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headersFormat = [
        '#', 'Trade Idea Code',
        'Long Security Name', 'BB Ticker',
        'Column1', 'Bid',
        'Ask', 'Mid',
        'Broker', 'Override Bid',
        'Override Ask', "Today's Bid",
        "Today's Ask", "Today's Mid",
    ];
    const arraysAreEqual = headersFormat.every((value, index) => value === headers[2][index]); //headersFormat.length === headers[2].length && headersFormat.every((value, index) => value === headers[2][index]);
    if (!arraysAreEqual) {
        return { error: "Incompatible format, please upload pricing sheet xlsx/csv file" };
    }
    else {
        const data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A3:AN30000' });
        return data;
    }
}
exports.readPricingSheet = readPricingSheet;
function calculateDailyProfitLoss(documents, previousDayPortfolio) {
    let position = documents;
    let couponRate = position["Coupon Rate"];
    position["Daily P&L Interest"] = ((couponRate / 100) * position["Quantity"]) / 360;
    for (let y = 0; y < previousDayPortfolio.length; y++) {
        let previousDayPortfolioObj = previousDayPortfolio[y];
        if (previousDayPortfolioObj["Issue"] == position["BB Ticker"]) {
            position["Previous Mark"] = previousDayPortfolioObj["Mid"];
            position["Daily P&L Urlzd"] = (((position["Mid"] - previousDayPortfolioObj["Mid"])) * position["Quantity"]) / 100;
            documents = position;
        }
    }
    return documents;
}
exports.calculateDailyProfitLoss = calculateDailyProfitLoss;
function calculateMonthlyProfitLoss(documents, previousMonthPortfolio) {
    for (let index = 0; index < documents.length; index++) {
        const currentPortfolioObj = documents[index];
        for (let y = 0; y < previousMonthPortfolio.length; y++) {
            const previousMonthPortfolioObj = previousMonthPortfolio[y];
            if (previousMonthPortfolioObj["bb ticker"] == currentPortfolioObj["bb ticker"]) {
                currentPortfolioObj["mtd mark"] = previousMonthPortfolioObj["mid"];
                currentPortfolioObj["ptf mtd unrlzd"] = (currentPortfolioObj["mid"] - previousMonthPortfolioObj["mid"]) * currentPortfolioObj["notional amount"];
                // currentPortfolioObj["monthly P&L interest"] = ((interestRate / 100) *  currentPortfolioObj["notional amount"]) / 12
                documents[index] = currentPortfolioObj;
            }
        }
    }
    return documents;
}
exports.calculateMonthlyProfitLoss = calculateMonthlyProfitLoss;
async function uploadTriadaAndReturnFilePath(arr) {
    let binaryWS = xlsx.utils.json_to_sheet(arr);
    // Create a new Workbook
    var wb = xlsx.utils.book_new();
    // Name your sheet
    xlsx.utils.book_append_sheet(wb, binaryWS, 'Binary values');
    // export your excel
    const stream = new PassThrough();
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    let fileName = `after-excel/${Date.now()}_output.xlsx`;
    uploadToGCloudBucket(buffer, process.env.BUCKET, fileName)
        .then()
        .catch(console.error);
    return fileName;
}
exports.uploadTriadaAndReturnFilePath = uploadTriadaAndReturnFilePath;
function getAllDatesSinceLastMonthLastDay(date) {
    const today = date == null ? new Date() : new Date(date);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    const dates = [];
    for (let d = lastDayOfLastMonth; d <= today; d.setDate(d.getDate() + 1)) {
        let month = '' + (d.getMonth() + 1);
        let day = '' + d.getDate();
        let year = d.getFullYear();
        if (month.length < 2)
            month = '0' + month;
        if (day.length < 2)
            day = '0' + day;
        dates.push([year, month, day].join('-'));
    }
    return dates;
}
exports.getAllDatesSinceLastMonthLastDay = getAllDatesSinceLastMonthLastDay;
function sortVconTrades(object) {
    let issues = Object.keys(object);
    let trades = [];
    for (let index = 0; index < issues.length; index++) {
        let issue = object[issues[index]];
        trades.push(issue);
    }
    return trades;
}
exports.sortVconTrades = sortVconTrades;
function formatUpdatedPositions(positions, portfolio) {
    try {
        portfolio = portfolio.map((position) => {
            delete position["_id"];
            const item1 = positions.find((updatedPosition) => updatedPosition["ISIN"] === position["ISIN"] && updatedPosition["Location"] === position["Location"]);
            return item1 ? item1 : position;
        });
        const arr2 = positions.filter((updatedPosition) => !portfolio.some((position) => position["ISIN"] === updatedPosition["ISIN"] && updatedPosition["Location"] === position["Location"]));
        portfolio = [...portfolio, ...arr2];
        return portfolio;
    }
    catch (error) {
        return error;
    }
}
exports.formatUpdatedPositions = formatUpdatedPositions;
function formatDateRlzdDaily(date) {
    date = new Date(date);
    let day = date.getDate().toString().padStart(2, '0'); // Pad with a zero if needed
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // Pad with a zero if needed, and note that months are 0-indexed in JS
    let year = date.getFullYear();
    return `${day}/${month}/${year}`;
}
exports.formatDateRlzdDaily = formatDateRlzdDaily;

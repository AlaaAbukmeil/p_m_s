"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkIfSecurityExist = exports.uploadTradesPortfolio = exports.getReport = exports.insertEBlotTransactions = exports.uploadTriadaAndReturnFilePath = exports.uploadToGCloudBucket = exports.bloombergToTriada = void 0;
require("dotenv").config();
const common_1 = require("../controllers/common");
const portfolioOperations_1 = require("./portfolioOperations");
const axios = require("axios");
const xlsx = require("xlsx");
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
async function bloombergToTriada(path, inputTrader, inputStrategy) {
    const data = await readBloombergEBlot(path);
    if (data.error) {
        return data.error;
    }
    else {
        let arr = [];
        const date = (0, common_1.getDate)();
        const time = (0, common_1.getTime)();
        for (let index = 0; index < data.length; index++) {
            let row = data[index];
            let bS = row["Side"];
            let bondCDS = row["Security"];
            let price = row["Price (Dec)"];
            let notionalAmount = row["Qty (M)"];
            let counterParty = row["BrkrName"];
            let settlementDate = (0, portfolioOperations_1.formatExcelDate)(row["SetDt"]);
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
async function insertEBlotTransactions(transactions) {
    const database = client.db("master");
    const reportCollection = database.collection("portfolio");
    try {
        const action = await reportCollection.insertMany(transactions);
    }
    catch (error) {
        return error;
    }
}
exports.insertEBlotTransactions = insertEBlotTransactions;
async function getReport() {
    const database = client.db("master");
    const reportCollection = database.collection("transactions");
    const documents = await reportCollection.find().toArray();
    return documents;
}
exports.getReport = getReport;
function getInterestRate(bondDescription) {
    // Split the bond description into parts based on spaces
    var parts = bondDescription.split(" ");
    // Loop through each part
    for (var i = 0; i < parts.length; i++) {
        // If a part contains a dot, it's likely the interest rate
        if (parts[i].includes('.')) {
            // Try to convert the part to a float (in case there are parts with dots that aren't the interest rate)
            var potentialInterestRate = parseFloat(parts[i]);
            // If the conversion was successful (i.e., the result is a number), return the interest rate
            if (!isNaN(potentialInterestRate)) {
                return potentialInterestRate;
            }
        }
    }
    // If no interest rate was found, return a message indicating this
    return "No interest rate found.";
}
async function uploadTradesLog(data) {
    const database = client.db("master");
    const reportCollection = database.collection("trades");
    try {
        const action = await reportCollection.insertMany(data);
    }
    catch (error) {
        return error;
    }
}
async function getSecurityInPortfolio(bbTicker) {
    const database = client.db("master");
    const reportCollection = database.collection("portfolio");
    const document = await reportCollection.findOne({ "BB Ticker": bbTicker });
    // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
    return document ? document : 404;
}
async function uploadTradesPortfolio(path) {
    const data = await readBloombergEBlot(path);
    for (let index = 0; index < data.length; index++) {
        let row = data[index];
        //Isin	BB Ticker	Country	Quantity	Currency	Average Cost	Price (last month)	Price (yesterday)	Price (today)	Daily P&L	Monthly P&L	YTM	Dv01 (USD) (Mkt)	Cr01 (USD) (Mkt)	Accured Interest	Last Updated
        let object = {};
        let securityInPortfolio = await getSecurityInPortfolio(object["BB Ticker"]);
        if (row["Block Status"] == "Accepted") {
            object["ISIN"] = row["ISIN"];
            object["BB Ticker"] = row["Security"];
            object["Country"] = row["country"];
            object["Quantity"] = row["Qty (M)"];
            object["Currency"] = row["currency"];
            object["Average Cost"];
            object["Accrued Interest"] = row["Acc Int"];
        }
    }
    console.log(data);
    return;
}
exports.uploadTradesPortfolio = uploadTradesPortfolio;
function callImagineCheckIFP(isin) {
    return true;
}
async function checkIfSecurityExist(isin) {
    let check = callImagineCheckIFP(isin);
    if (check) {
    }
    else {
    }
}
exports.checkIfSecurityExist = checkIfSecurityExist;

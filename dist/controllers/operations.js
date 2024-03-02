"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePosition = exports.reformatCentralizedData = exports.deleteTrade = exports.editTrade = exports.getTrade = exports.addFund = exports.deleteFund = exports.editFund = exports.getAllFundDetails = exports.getEarliestCollectionNameFund = exports.getFundDetails = exports.getSecurityInPortfolioById = exports.editPositionPortfolio = exports.readMUFGEndOfMonthFile = exports.getEditLogs = exports.insertEditLogs = exports.updatePreviousPricesPortfolioBloomberg = exports.getSecurityInPortfolioWithoutLocation = exports.getPortfolioOnSpecificDate = exports.insertPreviousPricesUpdatesInPortfolio = exports.updatePreviousPricesPortfolioMUFG = exports.readMUFGPrices = exports.getCollectionDays = void 0;
const axios = require("axios");
const { MongoClient, ServerApiVersion } = require("mongodb");
const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;
const common_1 = require("./common");
const reports_1 = require("./reports");
const portfolioFunctions_1 = require("./portfolioFunctions");
const client = new MongoClient(common_1.uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
mongoose.connect(common_1.uri, {
    useNewUrlParser: true,
});
const xlsx = require("xlsx");
async function getCollectionDays() {
    try {
        const database = client.db("portfolios");
        let collections = await database.listCollections().toArray();
        let dates = [];
        for (let index = 0; index < collections.length; index++) {
            let collectionTime = collections[index].name.split("portfolio")[1];
            let date = (0, common_1.formatDateUS)(collectionTime);
            if (!dates.includes(date)) {
                dates.push(date);
            }
        }
        dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        return dates;
    }
    catch (error) {
        return error.toString();
    }
}
exports.getCollectionDays = getCollectionDays;
async function readMUFGPrices(path) {
    const response = await axios.get(path, { responseType: "arraybuffer" });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: "buffer" });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    let data = xlsx.utils.sheet_to_json(worksheet, {
        defval: "",
        range: "A1:R300",
    });
    return data;
}
exports.readMUFGPrices = readMUFGPrices;
async function updatePreviousPricesPortfolioMUFG(data, collectionDate, path) {
    try {
        if (data.error) {
            return data;
        }
        else {
            let updatedPricePortfolio = [];
            let action = await getPortfolioOnSpecificDate(collectionDate);
            let portfolio = action[0];
            collectionDate = action[1];
            console.log(collectionDate, "collection day used");
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                let object = getSecurityInPortfolioWithoutLocation(portfolio, row["Investment"].trim());
                if (object == 404) {
                    continue;
                }
                for (let index = 0; index < object.length; index++) {
                    let position = object[index];
                    position["Mid"] = parseFloat(row["Price"]);
                    position["Last Price Update"] = new Date();
                    updatedPricePortfolio.push(position);
                }
            }
            try {
                let updatedPortfolio = (0, portfolioFunctions_1.formatUpdatedPositions)(updatedPricePortfolio, portfolio, "Last Price Update");
                let dateTime = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
                await insertEditLogs(["prices update"], "Update Previous Prices based on MUFG", dateTime, "mufg Previous Pricing Sheet on " + collectionDate, "Link: " + path);
                let insertion = await insertPreviousPricesUpdatesInPortfolio(updatedPortfolio[0], collectionDate);
                console.log(updatedPricePortfolio.length, "number of positions prices updated");
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
        return { error: "error" };
    }
}
exports.updatePreviousPricesPortfolioMUFG = updatePreviousPricesPortfolioMUFG;
async function insertPreviousPricesUpdatesInPortfolio(updatedPortfolio, collectionDate) {
    const database = client.db("portfolios");
    let portfolio = updatedPortfolio;
    // Create an array of updateOne operations
    // Execute the operations in bulk
    let day = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(collectionDate);
    console.log(day, "updated collection");
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
            else if (position["CUSIP"]) {
                filters.push({
                    "CUSIP": position["CUSIP"],
                    Location: position["Location"],
                    _id: new ObjectId(position["_id"]),
                });
            }
            return {
                updateOne: {
                    filter: { $or: filters },
                    update: { $set: position },
                },
            };
        });
        let updatedCollection = database.collection(`portfolio-${day}`);
        let updatedResult = await updatedCollection.bulkWrite(updatedOperations);
        return updatedResult;
    }
    catch (error) {
        return error;
    }
}
exports.insertPreviousPricesUpdatesInPortfolio = insertPreviousPricesUpdatesInPortfolio;
async function getPortfolioOnSpecificDate(collectionDate) {
    try {
        const database = client.db("portfolios");
        let date = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date(collectionDate)).split(" ")[0] + " 23:59";
        let earliestCollectionName = await (0, reports_1.getEarliestCollectionName)(date);
        const reportCollection = database.collection(`portfolio-${earliestCollectionName.predecessorDate}`);
        let documents = await reportCollection.find().toArray();
        return [documents, earliestCollectionName.predecessorDate];
    }
    catch (error) {
        return error.toString();
    }
}
exports.getPortfolioOnSpecificDate = getPortfolioOnSpecificDate;
function getSecurityInPortfolioWithoutLocation(portfolio, identifier) {
    let document = [];
    if (identifier == "" || !identifier) {
        return document;
    }
    for (let index = 0; index < portfolio.length; index++) {
        let issue = portfolio[index];
        if (identifier.includes(issue["ISIN"])) {
            if (issue["ISIN"] != "") {
                document.push(issue);
            }
        }
        else if (identifier.includes(issue["BB Ticker"])) {
            if (issue["BB Ticker"] != "") {
                document.push(issue);
            }
        }
        else if (identifier.includes(issue["Bloomberg ID"])) {
            if (issue["Bloomber ID"] != "") {
                document.push(issue);
            }
        }
        else if (identifier.includes(issue["CUSIP"])) {
            if (issue["CUSIP"] != "") {
                document.push(issue);
            }
        }
    }
    // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
    return document.length ? document : 404;
}
exports.getSecurityInPortfolioWithoutLocation = getSecurityInPortfolioWithoutLocation;
async function updatePreviousPricesPortfolioBloomberg(data, collectionDate, path) {
    try {
        if (data.error) {
            return data;
        }
        else {
            let updatedPricePortfolio = [];
            let action = await getPortfolioOnSpecificDate(collectionDate);
            let portfolio = action[0];
            collectionDate = action[1];
            let currencyInUSD = {};
            currencyInUSD["USD"] = 1;
            let divider = 1;
            let currencyStart = true;
            currencyInUSD["USD"] = 1;
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
                    let positions = getSecurityInPortfolioWithoutLocation(portfolio, row["Bloomberg ID"]);
                    if (positions == 404) {
                        positions = getSecurityInPortfolioWithoutLocation(portfolio, row["ISIN"]);
                    }
                    if (positions == 404) {
                        positions = getSecurityInPortfolioWithoutLocation(portfolio, row["BB Ticker"]);
                    }
                    if (positions == 404) {
                        positions = getSecurityInPortfolioWithoutLocation(portfolio, row["CUSIP"]);
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
                        object["CUSIP"] = row["CUSIP"];
                        if (!row["Call Date"].includes("N/A") && !row["Call Date"].includes("#")) {
                            object["Call Date"] = row["Call Date"];
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
            console.log(currencyInUSD, "currency prices");
            try {
                let updatedPortfolio = (0, portfolioFunctions_1.formatUpdatedPositions)(updatedPricePortfolio, portfolio, "Last Price Update");
                let dateTime = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
                await insertEditLogs(["prices update"], "Update Previous Prices based on bloomberg", dateTime, "Bloomberg Previous Pricing Sheet on " + collectionDate, "Link: " + path);
                let insertion = await insertPreviousPricesUpdatesInPortfolio(updatedPortfolio[0], collectionDate);
                console.log(updatedPricePortfolio.length, "number of positions prices updated");
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
        return { error: "error" };
    }
}
exports.updatePreviousPricesPortfolioBloomberg = updatePreviousPricesPortfolioBloomberg;
async function insertEditLogs(changes, type, dateTime, editNote, identifier) {
    let object = {
        changes: changes,
        type: type,
        dateTime: dateTime,
        editNote: editNote,
        identifier: identifier,
        timestamp: new Date().getTime(),
    };
    const database = client.db("edit_logs");
    const reportCollection = database.collection(`${type}`);
    try {
        const result = await reportCollection.insertOne(object);
        return result;
    }
    catch (err) {
        console.error(`Failed to insert item: ${err}`);
    }
}
exports.insertEditLogs = insertEditLogs;
async function getEditLogs(logsType) {
    try {
        const database = client.db("edit_logs");
        const reportCollection = database.collection(`${logsType}`);
        let documents = await reportCollection.find().sort({ dateTime: -1 }).toArray();
        return documents;
    }
    catch (error) {
        return error;
    }
}
exports.getEditLogs = getEditLogs;
async function readMUFGEndOfMonthFile(path) {
    const response = await axios.get(path, { responseType: "arraybuffer" });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: "buffer" });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headersFormat = [`Sort1`, `Sort2`, `Sort3`, `Quantity`, `Investment`, `Description`, `CCY`, `LocalCost`, `BaseCost`, `Price`, `FXRate`, `LocalValue`, `BaseValue`, `UnrealizedMktGainLoss`, `UnrealizedFXGainLoss`, `TotalUnrealizedGainLoss`];
    const arraysAreEqual = headersFormat.every((value, index) => (value === headers[0][index] ? true : console.log(value, headers[0][index])));
    if (!arraysAreEqual) {
        return {
            error: "Incompatible format, please upload MUFG end of month xlsx/csv file",
        };
    }
    else {
        const data = xlsx.utils.sheet_to_json(worksheet, {
            defval: "",
            range: "A1:P300",
        });
        return data;
    }
}
exports.readMUFGEndOfMonthFile = readMUFGEndOfMonthFile;
async function editPositionPortfolio(path) {
    let data = await (0, portfolioFunctions_1.readEditInput)(path);
    if (data.error) {
        return { error: data.error };
    }
    else {
        try {
            let positions = [];
            let portfolio = await (0, reports_1.getPortfolio)();
            let titles = ["Type", "Strategy", "Country", "Asset Class", "Sector"];
            for (let index = 0; index < data.length; index++) {
                let row = data[index];
                let identifier = row["_id"];
                let securityInPortfolio = getSecurityInPortfolioById(portfolio, identifier);
                if (securityInPortfolio != 404) {
                    for (let titleIndex = 0; titleIndex < titles.length; titleIndex++) {
                        let title = titles[titleIndex];
                        securityInPortfolio[title] = row[title];
                    }
                    positions.push(securityInPortfolio);
                }
            }
            try {
                let updatedPortfolio = (0, portfolioFunctions_1.formatUpdatedPositions)(positions, portfolio, "Last edit operation");
                let insertion = await (0, reports_1.insertTradesInPortfolio)(updatedPortfolio[0]);
                let dateTime = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
                await insertEditLogs(["bulk edit"], "Bulk Edit", dateTime, "Bulk Edit E-blot", "Link: " + path);
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
function getSecurityInPortfolioById(portfolio, id) {
    let document = 404;
    if (id == "" || !id) {
        return document;
    }
    for (let index = 0; index < portfolio.length; index++) {
        let issue = portfolio[index];
        if (id.toString() == issue["_id"].toString()) {
            document = issue;
        }
    }
    // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
    return document;
}
exports.getSecurityInPortfolioById = getSecurityInPortfolioById;
async function getFundDetails(date) {
    try {
        const database = client.db("fund");
        const reportCollection = database.collection("details");
        let test = await getEarliestCollectionNameFund(date);
        let documents = await reportCollection.find({ month: test }).toArray();
        return documents;
    }
    catch (error) {
        return error;
    }
}
exports.getFundDetails = getFundDetails;
function compareMonths(a, b) {
    // Reformat the month string to 'MM/01/YYYY' for comparison
    let reformattedMonthA = a.month.substring(5) + "/01/" + a.month.substring(0, 4);
    let reformattedMonthB = b.month.substring(5) + "/01/" + b.month.substring(0, 4);
    console.log(reformattedMonthA, reformattedMonthB);
    // Convert the reformatted strings to date objects
    let dateA = new Date(reformattedMonthA).getTime();
    let dateB = new Date(reformattedMonthB).getTime();
    // Compare the date objects
    return dateB - dateA;
}
// Sort the array without modifying the original objects
async function getEarliestCollectionNameFund(originalDate) {
    const database = client.db("fund");
    let details = await database.collection("details").find().toArray();
    let dates = [];
    for (let index = 0; index < details.length; index++) {
        let fund_detail = details[index];
        if (originalDate.includes(fund_detail["month"])) {
            return fund_detail["month"];
        }
        if (new Date(fund_detail["month"])) {
            dates.push(new Date(fund_detail["month"]));
        }
    }
    let inputDate = new Date(originalDate);
    let predecessorDates = dates.filter((date) => date < inputDate);
    let predecessorDate = new Date(Math.max.apply(null, predecessorDates));
    //hong kong time difference with utc
    if (predecessorDate) {
        predecessorDate = getMonthInFundDetailsFormat(new Date(predecessorDate));
    }
    return predecessorDate;
}
exports.getEarliestCollectionNameFund = getEarliestCollectionNameFund;
function getMonthInFundDetailsFormat(date) {
    let fundDetailsMonth = "";
    date = new Date(date);
    let month = date.getMonth() + 1;
    if (month < 10) {
        month = "0" + month;
    }
    let year = date.getFullYear();
    return `${year}/${month}`;
}
async function getAllFundDetails(date) {
    try {
        const database = client.db("fund");
        const reportCollection = database.collection("details");
        let documents = await reportCollection.find().toArray();
        return documents.sort(compareMonths);
    }
    catch (error) {
        return { error: error };
    }
}
exports.getAllFundDetails = getAllFundDetails;
async function editFund(data) {
    try {
        const database = client.db("fund");
        const reportCollection = database.collection("details");
        const id = new ObjectId(data["_id"]);
        const updates = {};
        const tableTitles = ["month", "nav", "holdBackRatio"];
        // Build the updates object based on `data` and `tableTitles`
        for (const title of tableTitles) {
            if (data[title] !== "" && data[title] != null) {
                updates[title] = data[title];
            }
        }
        if (Object.keys(updates).length === 0) {
            throw new Error("No valid fields to update");
        }
        console.log(id);
        // Update the document with the built updates object
        const updateResult = await reportCollection.updateOne({ _id: id }, { $set: updates });
        if (updateResult.matchedCount === 0) {
            return { error: "Document does not exist" };
        }
        else if (updateResult.modifiedCount === 0) {
            return { error: "Document not updated. It may already have the same values" };
        }
        return updateResult;
    }
    catch (error) {
        return { error: error.message }; // Return the error message
    }
}
exports.editFund = editFund;
async function deleteFund(data) {
    try {
        const database = client.db("fund");
        const reportCollection = database.collection("details");
        const id = new ObjectId(data["_id"]);
        // Update the document with the built updates object
        const updateResult = await reportCollection.deleteOne({ _id: id });
        if (updateResult.matchedCount === 0) {
            return { error: "Document does not exist" };
        }
        else if (updateResult.modifiedCount === 0) {
            return { error: "Document not updated. It may already have the same values" };
        }
        return updateResult;
    }
    catch (error) {
        return { error: error.message }; // Return the error message
    }
}
exports.deleteFund = deleteFund;
async function addFund(data) {
    try {
        const database = client.db("fund");
        const reportCollection = database.collection("details");
        const newFundData = {};
        const tableTitles = ["month", "nav", "holdBackRatio"];
        // Build the newFundData object based on `data` and `tableTitles`
        for (const title of tableTitles) {
            if (data[title] !== undefined && data[title] !== null) {
                newFundData[title] = data[title];
            }
        }
        // You might want to check if all required fields are present
        // if some fields are mandatory e.g.,
        if (!newFundData.month || !newFundData.nav) {
            return { error: "missing params" };
        }
        // Insert the new document into the collection
        const insertResult = await reportCollection.insertOne(newFundData);
        // The insertOne operation returns an InsertOneResult object
        // You can check the result by inspecting `insertedCount` and `insertedId`
        if (insertResult.insertedCount === 0) {
            return { error: "Failed to insert document" };
        }
        return { success: true, insertedId: insertResult.insertedId };
    }
    catch (error) {
        return { error: error.message }; // Return the error message
    }
}
exports.addFund = addFund;
async function getTrade(tradeType, tradeId) {
    try {
        // Connect to the MongoDB client
        await client.connect();
        // Access the 'structure' database
        const database = client.db("trades_v_2");
        // Access the collection named by the 'customerId' parameter
        const collection = database.collection(tradeType);
        // Perform your operations, such as find documents in the collection
        // This is an example operation that fetches all documents in the collection
        // Empty query object means "match all documents"
        const options = {}; // You can set options for the find operation if needed
        const query = { _id: new ObjectId(tradeId) }; // Replace yourIdValue with the actual ID you're querying
        const results = await collection.find(query, options).toArray();
        // The 'results' variable now contains an array of documents from the collection
        return results[0];
    }
    catch (error) {
        // Handle any errors that occurred during the operation
        console.error("An error occurred while retrieving data from MongoDB:", error);
    }
}
exports.getTrade = getTrade;
async function editTrade(editedTrade, tradeType) {
    try {
        let tradeInfo = await getTrade(tradeType, editedTrade["_id"]);
        let beforeModify = JSON.parse(JSON.stringify(tradeInfo));
        beforeModify["_id"] = new ObjectId(beforeModify["_id"]);
        if (tradeInfo) {
            let centralizedBlotKeys = ["B/S", "BB Ticker", "Location", "Trade Date", "Trade Time", "Settle Date", "Price", "Notional Amount", "Settlement Amount", "Principal", "Counter Party", "Triada Trade Id", "Seq No", "ISIN", "Cuisp", "Currency", "Yield", "Accrued Interest", "Original Face", "Comm/Fee", "Trade Type", "Edit Note"];
            let changes = 0;
            let changesText = [];
            for (let index = 0; index < centralizedBlotKeys.length; index++) {
                let key = centralizedBlotKeys[index];
                if (editedTrade[key] != "") {
                    changesText.push(`${key} changed from ${tradeInfo[key]} to ${editedTrade[key]} `);
                    tradeInfo[key] = editedTrade[key];
                    changes++;
                }
            }
            if (!changes) {
                return { error: "The trade is still the same." };
            }
            await client.connect();
            // Access the 'structure' database
            const database = client.db("trades_v_2");
            // Access the collection named by the 'customerId' parameter
            const collection = database.collection(tradeType);
            let dateTime = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
            await insertEditLogs(changesText, "Update Trade", dateTime, tradeInfo["Edit Note"], tradeInfo["BB Ticker"]);
            let action = await collection.updateOne({ _id: tradeInfo["_id"] }, // Filter to match the document
            { $set: tradeInfo } // Update operation
            );
            if (action) {
                return { error: null };
            }
            else {
                return {
                    error: "unexpected error, please contact Triada team",
                };
            }
        }
        else {
            return { error: "Trade does not exist, please referesh the page!" };
        }
    }
    catch (error) {
        console.log(error);
        return { error: "unexpected error, please contact PWWP team" };
    }
}
exports.editTrade = editTrade;
async function deleteTrade(tradeType, tradeId, tradeIssue) {
    try {
        // Connect to the MongoDB client
        await client.connect();
        // Get the database and the specific collection
        const database = client.db("trades_v_2");
        const collection = database.collection(tradeType);
        let query = { _id: new ObjectId(tradeId) };
        // Delete the document with the specified _id
        const result = await collection.deleteOne(query);
        if (result.deletedCount === 0) {
            return { error: `Trade does not exist!` };
        }
        else {
            let dateTime = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
            await insertEditLogs(["deleted"], "Update Trade", dateTime, "deleted", tradeIssue);
            console.log("deleted");
            return { error: null };
        }
    }
    catch (error) {
        console.error(`An error occurred while deleting the document: ${error}`);
        return { error: "Unexpected error 501" };
    }
}
exports.deleteTrade = deleteTrade;
async function reformatCentralizedData(data) {
    let filtered = data.filter((trade, index) => trade["Trade App Status"] != "new");
    filtered.sort((a, b) => new Date(a["Trade Date"]).getTime() - new Date(b["Trade Date"]).getTime());
    let missingLocation = data.filter((trade, index) => trade["Location"] == "" || (trade["ISIN"] == "" && trade["Trade Type"] == "vcon") || !trade["Location"] || trade["Location"].trim().split(" ").length > 1);
    if (missingLocation.length) {
        let issueMissing = "";
        for (let indexMissingIssue = 0; indexMissingIssue < missingLocation.length; indexMissingIssue++) {
            let issueName = missingLocation[indexMissingIssue]["BB Ticker"];
            issueMissing += issueName + " //";
        }
        return { error: `BB Ticker ${issueMissing} has missing or more than one location/ISIN` };
    }
    let vconTrades = filtered.filter((trade, index) => trade["Trade Type"] == "vcon");
    let ibTrades = filtered.filter((trade, index) => trade["Trade Type"] == "ib");
    let emsxTrades = filtered.filter((trade, index) => trade["Trade Type"] == "emsx");
    let isinRequest = [];
    for (let index = 0; index < vconTrades.length; index++) {
        let trade = vconTrades[index];
        let isinObjReq = { idType: "ID_ISIN", idValue: trade["ISIN"] };
        isinRequest.push(isinObjReq);
    }
    for (let rowIndex = 0; rowIndex < vconTrades.length; rowIndex++) {
        vconTrades[rowIndex]["Quantity"] = vconTrades[rowIndex]["Notional Amount"];
        vconTrades[rowIndex]["Triada Trade Id"] = vconTrades[rowIndex]["Triada Trade Id"];
        vconTrades[rowIndex]["timestamp"] = new Date(vconTrades[rowIndex]["Trade Date"]).getTime();
        vconTrades[rowIndex]["Trade App Status"] = "uploaded_to_app";
    }
    for (let ibTradesIndex = 0; ibTradesIndex < ibTrades.length; ibTradesIndex++) {
        ibTrades[ibTradesIndex]["Quantity"] = Math.abs(ibTrades[ibTradesIndex]["Notional Amount"]);
        ibTrades[ibTradesIndex]["ISIN"] = ibTrades[ibTradesIndex]["BB Ticker"];
        ibTrades[ibTradesIndex]["timestamp"] = new Date(ibTrades[ibTradesIndex]["Trade Date"]).getTime();
        ibTrades[ibTradesIndex]["Trade App Status"] = "uploaded_to_app";
    }
    for (let emsxTradesIndex = 0; emsxTradesIndex < emsxTrades.length; emsxTradesIndex++) {
        emsxTrades[emsxTradesIndex]["Quantity"] = emsxTrades[emsxTradesIndex]["Settlement Amount"];
        emsxTrades[emsxTradesIndex]["ISIN"] = emsxTrades[emsxTradesIndex]["BB Ticker"];
        emsxTrades[emsxTradesIndex]["timestamp"] = new Date(emsxTrades[emsxTradesIndex]["Trade Date"]).getTime();
        emsxTrades[emsxTradesIndex]["Trade App Status"] = "uploaded_to_app";
    }
    return [...vconTrades, ...ibTrades, ...emsxTrades];
}
exports.reformatCentralizedData = reformatCentralizedData;
async function deletePosition(data) {
    try {
        const database = client.db("portfolios");
        let date = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date()).split(" ")[0] + " 23:59";
        let earliestPortfolioName = await (0, reports_1.getEarliestCollectionName)(date);
        const reportCollection = database.collection(`portfolio-${earliestPortfolioName.predecessorDate}`);
        const id = new ObjectId(data["_id"]);
        // Update the document with the built updates object
        const updateResult = await reportCollection.deleteOne({ _id: id });
        console.log(updateResult, id);
        if (updateResult.deletedCount === 0) {
            return { error: "Document does not exist" };
        }
        else if (updateResult.deletedCount === 0) {
            return { error: "Document not updated. It may already have the same values" };
        }
        return updateResult;
    }
    catch (error) {
        return { error: error.message }; // Return the error message
    }
}
exports.deletePosition = deletePosition;

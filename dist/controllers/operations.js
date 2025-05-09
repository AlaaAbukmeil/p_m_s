"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modifyTradesDueToRecalculate = exports.readCalculatePosition = exports.getAllTradesForSpecificPosition = exports.deletePosition = exports.reformatCentralizedData = exports.deleteTrade = exports.editTrade = exports.getTrade = exports.addFund = exports.deleteFund = exports.editFund = exports.getAllFundDetails = exports.getEarliestCollectionNameFund = exports.getFundDetails = exports.getSecurityInPortfolioById = exports.editPositionPortfolio = exports.readNomuraReconcileFile = exports.readMUFGReconcileFile = exports.getEditLogs = exports.insertEditLogs = exports.updatePreviousPricesPortfolioBloomberg = exports.getSecurityInPortfolioWithoutLocation = exports.getPortfolioOnSpecificDate = exports.getCollectionDays = void 0;
const axios = require("axios");
const ObjectId = require("mongodb").ObjectId;
const common_1 = require("./common");
const tools_1 = require("./reports/tools");
const common_2 = require("./reports/common");
const readExcel_1 = require("./operations/readExcel");
const positions_1 = require("./reports/positions");
const auth_1 = require("./auth");
const xlsx = require("xlsx");
async function getCollectionDays() {
    try {
        const database = auth_1.client.db("portfolios");
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
async function getPortfolioOnSpecificDate(collectionDate) {
    try {
        const database = auth_1.client.db("portfolios");
        let date = (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date(collectionDate)).split(" ")[0] + " 23:59";
        let earliestCollectionName = await (0, tools_1.getEarliestCollectionName)(date);
        const reportCollection = database.collection(`portfolio-${earliestCollectionName.predecessorDate}`);
        let documents = await reportCollection.find().toArray();
        for (let index = 0; index < documents.length; index++) {
            documents[index]["BB Ticker"] = documents[index]["BB Ticker"] ? documents[index]["BB Ticker"] : documents[index]["Issue"];
            documents[index]["Notional Amount"] = documents[index]["Notional Amount"] || parseFloat(documents[index]["Notional Amount"]) == 0 ? documents[index]["Notional Amount"] : documents[index]["Quantity"];
        }
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
            console.log(currencyInUSD, "currency prices");
            try {
                let updatedPortfolio = (0, tools_1.formatUpdatedPositions)(updatedPricePortfolio, portfolio, "Last Price Update");
                let dateTime = (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date());
                await insertEditLogs([updatedPortfolio[1]], "Update Previous Prices based on bloomberg", dateTime, "Num of Positions that did not update: " + Object.keys(updatedPortfolio[1]).length, "Link: " + path);
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
    const database = auth_1.client.db("edit_logs");
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
        const database = auth_1.client.db("edit_logs");
        const reportCollection = database.collection(`${logsType}`);
        let documents = await reportCollection.find().sort({ dateTime: -1 }).toArray();
        return documents;
    }
    catch (error) {
        return error;
    }
}
exports.getEditLogs = getEditLogs;
async function readMUFGReconcileFile(path) {
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
exports.readMUFGReconcileFile = readMUFGReconcileFile;
async function readNomuraReconcileFile(path) {
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
    const headersFormat = [
        "Account ID",
        "Account Name",
        "Long/Short Indicator",
        "Cusip",
        "Quick Code",
        "Sedol",
        "Isin",
        "Symbol",
        "Security Name",
        "Security Issue CCY",
        "Base CCY",
        "US Margin Ind",
        "TD Quantity",
        "SD Quantity",
        "Price",
        "TD Market Value Local",
        "SD Market Value Local",
        "TD Market Value Base",
        "SD Market Value Base",
        "Quantity Subject to Right of Use/Stock Loan",
        "FX Rate",
        "Last Activity Date",
        "Business Date",
        "Run Date",
        "Run Time",
        "OTC DerivativeType",
        "Ticker",
        "Ric Code",
        "Preferred ID",
        "Pricing Factor",
        "Price Type",
        "Product Type",
        "Expiration Date",
        "Option Contract Type",
        "Td Accrued Interest",
        "Sd Accrued Interest",
        "Clean Price",
        "Asset Class",
        "Stock Loan Financed Positions Base Ccy",
        "Stock Loan Financed Positions (USD)",
    ];
    const arraysAreEqual = headersFormat.every((value, index) => (value === headers[1][index] ? true : console.log(value, headers[1][index])));
    if (!arraysAreEqual) {
        return {
            error: "Incompatible format, please upload MUFG end of month xlsx/csv file",
        };
    }
    else {
        const data = xlsx.utils.sheet_to_json(worksheet, {
            defval: "",
            range: "A2:AP300",
        });
        return data;
    }
}
exports.readNomuraReconcileFile = readNomuraReconcileFile;
async function editPositionPortfolio(path) {
    let data = await (0, readExcel_1.readEditInput)(path);
    if (data.error) {
        return { error: data.error };
    }
    else {
        try {
            let positions = [];
            let portfolio = await (0, positions_1.getPortfolio)();
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
                let updatedPortfolio = (0, tools_1.formatUpdatedPositions)(positions, portfolio, "Last edit operation");
                let insertion = await (0, positions_1.insertTradesInPortfolio)(updatedPortfolio[0]);
                let dateTime = (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date());
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
        const database = auth_1.client.db("fund");
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
    const database = auth_1.client.db("fund");
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
        const database = auth_1.client.db("fund");
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
        const database = auth_1.client.db("fund");
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
        const database = auth_1.client.db("fund");
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
        const database = auth_1.client.db("fund");
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
        await auth_1.client.connect();
        // Access the 'structure' database
        const database = auth_1.client.db("trades_v_2");
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
            await auth_1.client.connect();
            // Access the 'structure' database
            const database = auth_1.client.db("trades_v_2");
            // Access the collection named by the 'customerId' parameter
            const collection = database.collection(tradeType);
            let dateTime = (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date());
            await insertEditLogs(changesText, "Edit Trade", dateTime, tradeInfo["Edit Note"], tradeInfo["BB Ticker"] + " " + tradeInfo["Location"]);
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
async function deleteTrade(tradeType, tradeId, tradeIssue, location) {
    try {
        // Connect to the MongoDB client
        await auth_1.client.connect();
        // Get the database and the specific collection
        const database = auth_1.client.db("trades_v_2");
        const collection = database.collection(tradeType);
        let query = { _id: new ObjectId(tradeId) };
        // Delete the document with the specified _id
        const result = await collection.deleteOne(query);
        if (result.deletedCount === 0) {
            return { error: `Trade does not exist!` };
        }
        else {
            let dateTime = (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date());
            await insertEditLogs(["deleted"], "Edit Trade", dateTime, "deleted", tradeIssue + " " + location);
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
        vconTrades[rowIndex]["Triada Trade Id"] = vconTrades[rowIndex]["Triada Trade Id"];
        vconTrades[rowIndex]["timestamp"] = new Date(vconTrades[rowIndex]["Trade Date"]).getTime();
        vconTrades[rowIndex]["Trade App Status"] = "uploaded_to_app";
    }
    for (let ibTradesIndex = 0; ibTradesIndex < ibTrades.length; ibTradesIndex++) {
        ibTrades[ibTradesIndex]["ISIN"] = ibTrades[ibTradesIndex]["BB Ticker"];
        ibTrades[ibTradesIndex]["timestamp"] = new Date(ibTrades[ibTradesIndex]["Trade Date"]).getTime();
        ibTrades[ibTradesIndex]["Trade App Status"] = "uploaded_to_app";
    }
    for (let emsxTradesIndex = 0; emsxTradesIndex < emsxTrades.length; emsxTradesIndex++) {
        emsxTrades[emsxTradesIndex]["ISIN"] = emsxTrades[emsxTradesIndex]["BB Ticker"];
        emsxTrades[emsxTradesIndex]["timestamp"] = new Date(emsxTrades[emsxTradesIndex]["Trade Date"]).getTime();
        emsxTrades[emsxTradesIndex]["Trade App Status"] = "uploaded_to_app";
    }
    return [...vconTrades, ...ibTrades, ...emsxTrades];
}
exports.reformatCentralizedData = reformatCentralizedData;
async function deletePosition(data, dateInput) {
    try {
        const database = auth_1.client.db("portfolios");
        let date = (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date(dateInput)).split(" ")[0] + " 23:59";
        let earliestPortfolioName = await (0, tools_1.getEarliestCollectionName)(date);
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
        let dateTime = (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date());
        await insertEditLogs([], "Delete Position", dateTime, "Delete Position", data["BB Ticker"] + " " + data["Location"]);
        return updateResult;
    }
    catch (error) {
        return { error: error.message }; // Return the error message
    }
}
exports.deletePosition = deletePosition;
async function getAllTradesForSpecificPosition(tradeType, isin, location, date) {
    try {
        // Connect to the MongoDB client
        await auth_1.client.connect();
        let timestamp = new Date(date).getTime();
        // Access the 'structure' database
        const database = auth_1.client.db("trades_v_2");
        // Access the collection named by the 'customerId' parameter
        const collection = database.collection(tradeType);
        // Perform your operations, such as find documents in the collection
        // This is an example operation that fetches all documents in the collection
        // Empty query object means "match all documents"
        const options = {}; // You can set options for the find operation if needed
        const query = { ISIN: isin, Location: location, timestamp: { $lt: timestamp } }; // Replace yourIdValue with the actual ID you're querying
        const results = await collection.find(query, options).toArray();
        // The 'results' variable now contains an array of documents from the collection
        return results;
    }
    catch (error) {
        // Handle any errors that occurred during the operation
        console.error("An error occurred while retrieving data from MongoDB:", error);
    }
}
exports.getAllTradesForSpecificPosition = getAllTradesForSpecificPosition;
async function readCalculatePosition(data, date, isin, location, tradeType) {
    try {
        let positions = [];
        const database = auth_1.client.db("portfolios");
        let earliestPortfolioName = await (0, tools_1.getEarliestCollectionName)(date);
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
        let triadaIds = [];
        for (let index = 0; index < data.length; index++) {
            let row = data[index];
            row["BB Ticker"] = row["BB Ticker"] ? row["BB Ticker"] : row["Issue"];
            let originalFace = parseFloat(row["Original Face"]);
            let identifier = row["ISIN"] !== "" ? row["ISIN"].trim() : row["BB Ticker"].trim();
            let object = {};
            let location = row["Location"].trim();
            let couponDaysYear = row["BB Ticker"].split(" ")[0] == "T" || row["BB Ticker"].includes("U.S") ? 365.0 : 360.0;
            let previousQuantity = 0;
            let previousAverageCost = 0;
            let tradeType = row["B/S"];
            let operation = tradeType == "B" ? 1 : -1;
            let divider = row["Trade Type"] == "vcon" ? 100 : 1;
            let currentPrice = row["Price"] / divider;
            let currentQuantity = parseFloat(row["Notional Amount"].toString().replace(/,/g, "")) * operation;
            let currentNet = parseFloat(row["Settlement Amount"].toString().replace(/,/g, "")) * operation;
            let currentPrincipal = parseFloat(row["Principal"].toString().replace(/,/g, ""));
            let currency = row["Currency"];
            let bondCouponMaturity = (0, tools_1.parseBondIdentifier)(row["BB Ticker"]);
            let tradeExistsAlready = triadaIds.includes(row["Triada Trade Id"]);
            let updatingPosition = (0, positions_1.returnPositionProgress)(positions, identifier, location);
            let tradeDate = new Date(row["Trade Date"]);
            let thisMonth = (0, common_2.monthlyRlzdDate)(tradeDate);
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
            if (!tradeExistsAlready && identifier !== "") {
                triadaIds.push(row["Triada Trade Id"]);
                if (!updatingPosition) {
                    let divider = row["tradeType"] == "vcon" ? 100 : 1;
                    let shortLongType = currentQuantity >= 0 ? 1 : -1;
                    let settlementDate = row["Settle Date"];
                    object["Location"] = row["Location"].trim();
                    object["Last Modified Date"] = new Date();
                    object["Entry Yield"] = row["Yield"] || 0;
                    object["BB Ticker"] = row["BB Ticker"];
                    object["ISIN"] = row["ISIN"].trim();
                    object["CUSIP"] = row["Cuisp"].trim() || "";
                    object["Notional Amount"] = currentQuantity;
                    object["Net"] = currentNet;
                    object["Currency"] = currency;
                    object["Average Cost"] = currentPrice;
                    object["Coupon Rate"] = bondCouponMaturity.rate || 0;
                    object["Maturity"] = bondCouponMaturity.date || 0;
                    object["Interest"] = {};
                    object["Interest"][settlementDate] = object["Interest"][settlementDate] ? object["Interest"][settlementDate] + currentQuantity : currentQuantity;
                    object["MTD Rlzd"] = {};
                    object["MTD Rlzd"][thisMonth] = [];
                    let MTDRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };
                    if (rlzdOperation == 1) {
                        object["MTD Rlzd"][thisMonth].push(MTDRlzdForThisTrade);
                    }
                    object["Day Rlzd"] = {};
                    object["Day Rlzd"][thisDay] = [];
                    let dayRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };
                    if (rlzdOperation == 1) {
                        object["Day Rlzd"][thisDay].push(dayRlzdForThisTrade);
                    }
                    object["Cost MTD"] = {};
                    object["Cost MTD"][thisMonth] = operation == 1 ? parseFloat(currentPrincipal) : 0;
                    object["Original Face"] = originalFace;
                    if (!object["Entry Price"]) {
                        object["Entry Price"] = {};
                    }
                    if (!object["Entry Price"][thisMonth]) {
                        object["Entry Price"][thisMonth] = currentPrice;
                    }
                    object["Last Individual Upload Trade"] = new Date();
                    let tradeRecord = null;
                    if (!tradeRecord) {
                        tradeRecord = (0, tools_1.findTradeRecord)(data, row["Triada Trade Id"]);
                        if (tradeRecord.length > 0) {
                            tradeRecord[0]["Updated Notional"] = object["Notional Amount"];
                        }
                    }
                    positions.push(object);
                }
                else if ((0, positions_1.returnPositionProgress)(positions, identifier, location)) {
                    let shortLongType = updatingPosition["Notional Amount"] >= 0 ? 1 : -1;
                    let settlementDate = row["Settle Date"];
                    object["Location"] = row["Location"].trim();
                    object["Last Modified Date"] = new Date();
                    object["BB Ticker"] = row["BB Ticker"];
                    object["ISIN"] = row["ISIN"];
                    object["Currency"] = currency;
                    object["Notional Amount"] = currentQuantity + updatingPosition["Notional Amount"];
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
                    let tradeRecord = null;
                    if (!tradeRecord) {
                        tradeRecord = (0, tools_1.findTradeRecord)(data, row["Triada Trade Id"]);
                        if (tradeRecord.length > 0) {
                            tradeRecord[0]["Updated Notional"] = object["Notional Amount"];
                        }
                    }
                    positions = (0, positions_1.updateExisitingPosition)(positions, identifier, location, object);
                }
            }
        }
        try {
            // console.log(positions);
            for (let index = 0; index < portfolio.length; index++) {
                let position = portfolio[index];
                if (position["ISIN"].trim() == isin.trim() && position["Location"] == location.trim()) {
                    portfolio[index] = positions[0];
                    portfolio[index]["Quantity"] = portfolio[index]["Notional Amount"];
                    // console.log(portfolio[index], "updateed", `portfolio-${earliestPortfolioName.predecessorDate}`);
                }
            }
            let action = await (0, positions_1.insertTradesInPortfolioAtASpecificDate)(portfolio, `portfolio-${earliestPortfolioName.predecessorDate}`);
            console.log(data, tradeType);
            let modifyTradesAction = await modifyTradesDueToRecalculate(data, tradeType);
            console.log(modifyTradesAction, "modified trades");
            let dateTime = (0, common_2.getDateTimeInMongoDBCollectionFormat)(new Date());
            await insertEditLogs([], "Recalculate Position", dateTime, "", data[0]["BB Ticker"] + " " + data[0]["Location"]);
            // console.log(positions)
            return action;
        }
        catch (error) {
            return { error: error };
        }
    }
    catch (error) {
        return { error: error };
    }
}
exports.readCalculatePosition = readCalculatePosition;
async function modifyTradesDueToRecalculate(trades, tradeType) {
    const database = auth_1.client.db("trades_v_2");
    let operations = trades.map((trade) => {
        // Start with the known filters
        let filters = [];
        // If "ISIN", "BB Ticker", or "Issue" exists, check for both the field and "Location"
        filters.push({
            _id: new ObjectId(trade["_id"].toString()),
        });
        return {
            updateOne: {
                filter: { $or: filters },
                update: { $set: trade },
                upsert: false,
            },
        };
    });
    // Execute the operations in bulk
    try {
        const historicalReportCollection = database.collection(tradeType);
        let action = await historicalReportCollection.bulkWrite(operations);
        console.log(action);
        return action;
    }
    catch (error) {
        return error;
    }
}
exports.modifyTradesDueToRecalculate = modifyTradesDueToRecalculate;

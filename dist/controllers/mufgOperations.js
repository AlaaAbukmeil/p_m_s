"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradesTriada = exports.formatFxTradesToMufg = exports.formatFxMufg = exports.formatMufg = exports.readFxTrades = exports.readBBE = exports.readIB = exports.readBBGBlot = void 0;
const auth_1 = require("./auth");
const common_1 = require("./common");
const xlsx = require("xlsx");
const axios = require("axios");
async function readBBGBlot(path) {
    path = common_1.bucket + path;
    const response = await axios.get(path, { responseType: "arraybuffer" });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: "buffer" });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    let headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    // headers = Object.keys(headers)
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: "", range: "A1:ZY500" });
    return data;
}
exports.readBBGBlot = readBBGBlot;
async function readIB(path) {
    try {
        path = common_1.bucket + path;
        const response = await axios.get(path, { responseType: "arraybuffer" });
        /* Parse the data */
        const workbook = xlsx.read(response.data, { type: "buffer" });
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
            if (row[headers[0]] === "Trades") {
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
                if (trade[headers[1]] !== "Data" && trade[headers[1]] != "SubTotal") {
                    tradesRowEndIndex = tradesIndex + 1;
                    break;
                }
            }
        }
        data = xlsx.utils.sheet_to_json(worksheet, { defval: "", range: `A${tradesRowIndex}:Q${tradesRowEndIndex}` });
        return data;
    }
    catch (error) {
        return [];
    }
}
exports.readIB = readIB;
async function readBBE(path) {
    path = common_1.bucket + path;
    const response = await axios.get(path, { responseType: "arraybuffer" });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: "buffer" });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: "", range: "A1:Z300" });
    return data;
}
exports.readBBE = readBBE;
async function readFxTrades(path) {
    path = common_1.bucket + path;
    const response = await axios.get(path, { responseType: "arraybuffer" });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: "buffer" });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: "", range: "A1:N100" });
    return data;
}
exports.readFxTrades = readFxTrades;
async function formatMufg(trades, start, end) {
    let startTimestamp = new Date(start).getTime();
    let endTimestamp = new Date(end).getTime();
    trades = trades.filter((trade, index) => new Date(trade["Trade Date"]).getTime() > startTimestamp && new Date(trade["Trade Date"]).getTime() < endTimestamp);
    let mufgTrades = [];
    for (let index = 0; index < trades.length; index++) {
        let trade = trades[index];
        let originalFace = trade["Trade Type"] == "ib" ? trade["Original Face"] : 1;
        let obj = {};
        obj["File_Type"] = "ExchSec";
        obj["Fund"] = "90104";
        obj["Transaction_Event"] = "N";
        obj["Transaction_Type"] = trade["B/S"];
        obj["Security_ID_ISIN"] = trade["Trade Type"] == "vcon" ? trade["ISIN"] : "";
        obj["Security_ID_CUSIP"] = trade["Trade Type"] == "vcon" ? trade["Cusip"] : "";
        obj["Security_ID_SEDOL"] = "";
        obj["Security_ID_Bloomberg"] = trade["BB Ticker"];
        obj["Security_ID_Reuters"] = "";
        obj["Security_ID_UGC"] = "";
        obj["Security_Description"] = trade["BB Ticker"];
        obj["Trade_ID_Client"] = trade["Triada Trade Id"];
        obj["Quantity"] = trade["Trade Type"] == "emsx" ? trade["Settlement Amount"] : trade["Trade Type"] == "ib" ? Math.abs(trade["Notional Amount"]) / originalFace : Math.abs(trade["Notional Amount"]);
        obj["Original_Face"] = trade["Trade Type"] == "ib" ? originalFace : "100";
        obj["Price"] = trade["Price"];
        obj["Accrued_Interest"] = trade["Accrued Interest"] || 0;
        obj["Net_Money_Settlement"] = Math.abs(parseFloat(trade["Settlement Amount"]));
        obj["Currency_Settlement"] = trade["Currency"];
        obj["Currency_Investment"] = "";
        obj["Trade_Date"] = trade["Trade Date"];
        obj["Settle_Date"] = trade["Settle Date"];
        obj["Expiration_Date"] = "";
        obj["Strike"] = "";
        obj["Put_Call"] = "";
        obj["Custodian_Account_Client"] = trade["Trade Type"] == "ib" ? "IB_PB" : "NOM_PB";
        obj["Custodian_Account_UGC"] = trade["Trade Type"] == "ib" ? "90104-INBR-INT" : "90104-NOMB-INTL";
        obj["Broker_Client"] = "";
        obj["Broker_UGC"] = "";
        obj["Fund_Structure"] = "";
        obj["Strategy_Client"] = "";
        obj["Strategy_UGC"] = "";
        obj["Comments"] = "";
        obj["Order Commission"] = Math.abs(trade["Comm/Fee"]) || 0;
        obj["Trader_Client"] = "";
        obj["Trader_UGC"] = "";
        obj["Manager_Client"] = "";
        obj["Manager_UGC"] = "";
        obj["Analyst_Client"] = "";
        obj["Analyst_UGC"] = "";
        obj["Industry_Client"] = "";
        obj["Industry_UGC"] = "";
        obj["Underlying_ISIN"] = "";
        obj["Underlying_CUSIP"] = "";
        obj["Underlying_Sedol"] = "";
        obj["Underlying_BBG"] = "";
        obj["Underlying_RIC"] = "";
        obj["Trade_Expense_1_Net"] = "";
        obj["Trade_Expense_1_Type"] = "";
        obj["Trade_Expense_2_Net"] = "";
        obj["Trade_Expense_2_Type"] = "";
        obj["Trade_Expense_3_Net"] = "";
        obj["Trade_Expense_3_Type"] = "";
        obj["Commission_NetTrade"] = "";
        obj["CFD_Flag"] = "0";
        obj["Security_Country"] = "";
        obj["Closing_Lot_ID"] = "";
        obj["Secondary_Client_Trade_ID"] = "";
        obj["Net_Money_Trade"] = "";
        obj["Is_Factor"] = "";
        obj["Underlying_UGC"] = "";
        obj["Underlying_Desc"] = "";
        obj["Underlying_Country"] = "";
        obj["Location"] = trade["Location"].toUpperCase();
        mufgTrades.push(obj);
    }
    return mufgTrades;
}
exports.formatMufg = formatMufg;
async function formatFxMufg(files, tradesCount) {
    let fxData = [];
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        let file = files[fileIndex];
        if (file["fieldname"] == "fx") {
            fxData = await readFxTrades(file["filename"]);
        }
    }
    let mufg = [];
    let counter = tradesCount;
    for (let index = 0; index < fxData.length; index++) {
        let object = {};
        let trade = fxData[index];
        object["File_Type"] = "Spot FX";
        object["Fund"] = "90104";
        object["Transaction_Event"] = "N";
        object["Trade_ID_Client"] = `Triada-NFX-${trade["Trade Date"]}-${counter}`;
        object["Buy Currency"] = trade["Buy Currency"];
        object["Buy Amount"] = trade["Buy Amount"];
        object["Sell Currency"] = trade["Sell Currency"];
        object["Sell Amount"] = trade["Sell Amount"];
        object["Trade_Date"] = trade["Trade Date"];
        object["Settlement_Date"] = trade["Settle Date"];
        object["Spot_Date"] = "";
        object["Custodian_Account_Client"] = "NOM_PB";
        object["Custodian_Account_UGC"] = "90104-NOMB-INTL";
        object["Counterparty_Client"] = "";
        object["Counterparty_UGC"] = "";
        object["Fund_Structure"] = "";
        object["Strategy_Client"] = "";
        object["Strategy_UGC"] = "";
        object["Comments"] = "";
        object["Trader_Client"] = "";
        object["Trader_UGC"] = "";
        object["Manager_Client"] = "";
        object["Manager_UGC"] = "";
        object["Analyst_Client"] = "";
        object["Analyst_UGC"] = "";
        mufg.push(object);
        counter++;
    }
    return mufg;
}
exports.formatFxMufg = formatFxMufg;
async function formatFxTradesToMufg(data) {
    let mufg = [];
    let counter = 1;
    for (let index = 0; index < data.length; index++) {
        let obj = {};
        let trade = data[index];
        obj = {
            File_Type: "Spot FX",
            Fund: "90104",
            Transaction_Event: "N",
            Trade_ID_Client: "",
            "Buy Currency": "",
            "Buy Amount": "",
            "Sell Currency": "",
            "Sell Amount": "",
            Trade_Date: "",
            Settlement_Date: "",
            Spot_Date: "",
            Custodian_Account_Client: "",
            Custodian_Account_UGC: "",
            Counterparty_Client: "",
            Counterparty_UGC: "",
            Fund_Structure: "",
            Strategy_Client: "",
            Strategy_UGC: "",
            Comments: "",
            Trader_Client: "",
            Trader_UGC: "",
            Manager_Client: "",
            Manager_UGC: "",
            Analyst_Client: "",
            Analyst_UGC: "",
            Conversion: "",
            Month: "",
            Date: "",
            "Trade Date Conversion": "",
            "Settlement Date Conversion": "",
        };
    }
    return mufg;
}
exports.formatFxTradesToMufg = formatFxTradesToMufg;
async function tradesTriada() {
    try {
        const database = auth_1.client.db("trades_v_2");
        const reportCollection1 = database.collection("vcons");
        const reportCollection2 = database.collection("ib");
        const reportCollection3 = database.collection("emsx");
        const document1 = await reportCollection1.find().toArray();
        const document2 = await reportCollection2.find().toArray();
        const document3 = await reportCollection3.find().toArray();
        let document = [...document1.sort((a, b) => new Date(a["Trade Date"]).getTime() - new Date(b["Trade Date"]).getTime()), ...document2.sort((a, b) => new Date(a["Trade Date"]).getTime() - new Date(b["Trade Date"]).getTime()), ...document3.sort((a, b) => new Date(a["Trade Date"]).getTime() - new Date(b["Trade Date"]).getTime())];
        return document;
    }
    catch (error) {
        return error;
    }
}
exports.tradesTriada = tradesTriada;

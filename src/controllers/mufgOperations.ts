import { getDateMufg, convertExcelDateToJSDate, convertBBGEmexDate } from "./common";
import { settlementDatePassed, uploadToGCloudBucket } from "./portfolioFunctions";
import { getTradeDateYearTrades } from "./common";
import { getSettlementDateYear } from "./portfolioFunctions";

const xlsx = require("xlsx")
const axios = require("axios")
const { Storage } = require('@google-cloud/storage');
const storage = new Storage({ keyFilename: process.env.KEYPATHFILE });
const { PassThrough } = require('stream');

export async function readBBGBlot(path: string) {
    path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + path
    const response = await axios.get(path, { responseType: 'arraybuffer' });

    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: 'buffer' });

    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];

    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});

    // Read data

    let headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    // headers = Object.keys(headers)

    const data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A1:ZY100' });
    return data

}

export async function readIB(path: string) {
    try {
        path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + path
        const response = await axios.get(path, { responseType: 'arraybuffer' });

        /* Parse the data */
        const workbook = xlsx.read(response.data, { type: 'buffer' });

        /* Get first worksheet */
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];


        let data = xlsx.utils.sheet_to_row_object_array(worksheet);
        let headers = Object.keys(data[0])
        let tradesRowIndex = -1;  // Will hold the index of the row where "Trades" is found
        let tradesRowEndIndex = -1
        for (let index = 0; index < data.length; index++) {
            let row = data[index];
            // Assuming the first column is named 'A'
            if (row[headers[0]] === 'Trades') {
                tradesRowIndex = index + 2
                break;
            }
        }
        if (tradesRowIndex == -1) {
            return []
        } else {
            for (let tradesIndex = tradesRowIndex; tradesIndex < data.length; tradesIndex++) {
                let trade = data[tradesIndex];
                if (trade[headers[1]] !== 'Data' && trade[headers[1]] != "SubTotal") {
                    tradesRowEndIndex = tradesIndex + 1
                    break;
                }

            }
        }
        data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: `A${tradesRowIndex}:Q${tradesRowEndIndex}` });
        return data
    } catch (error) {
        return []
    }

}

export async function readBBE(path: string) {
    path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + path
    const response = await axios.get(path, { responseType: 'arraybuffer' });

    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: 'buffer' });

    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];

    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});

    // Read data
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A1:Z30000' });
    return data

}

export async function readFxTrades(path: string) {
    path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + path
    const response = await axios.get(path, { responseType: 'arraybuffer' });

    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: 'buffer' });

    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];

    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});

    // Read data
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A2:BR10000' });
    return data

}

export async function formatBBGBlotToMufg(files: any) {

    let bbbData = [], ibData = [], bbeData = [];
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        let file = files[fileIndex];
        if (file["fieldname"] == "BBB") {
            bbbData = await readBBGBlot(file["filename"])
        } else if (file["fieldname"] == "IB") {
            ibData = await readIB(file["filename"])
        } else if (file["fieldname"] == "BBE") {
            bbeData = await readBBE(file["filename"])
        }

    }
    
    let mufg = []
    let counter = 1
    let bbbCurrency: any = {
        "$": "USD",
        "A$": "AUD",
        "€": "EURO",
        "£": "GBP",
        "SGD": "SGD"
    }
    for (let index = 0; index < bbbData.length; index++) {
        let obj: any = {}
        let trade = bbbData[index];
        if (trade["Status"] == "Accepted") {
            let settlementDate = getSettlementDateYear(convertExcelDateToJSDate(trade["Trade Date"]), convertExcelDateToJSDate(trade["Settle Date"]))
            let triadaId = `${parseAndFormat(convertExcelDateToJSDate(trade["Trade Date"]))}` + (counter < 10 ? "0" + counter : counter) 
            obj["File_Type"] = "ExchSec";
            obj["Fund"] = "90104";
            obj["Transaction_Event"] = "N";
            obj["Transaction_Type"] = trade["Buy/Sell"];
            obj["Security_ID_ISIN"] = trade["ISIN"];
            obj["Security_ID_CUSIP"] = trade["Cusip"];
            obj["Security_ID_SEDOL"] = "";
            obj["Security_ID_Bloomberg"] = trade["Issue"];
            obj["Security_ID_Reuters"] = "";
            obj["Security_ID_UGC"] = "";
            obj["Security_Description"] = trade["Issue"];
            obj["Trade_ID_Client"] =  triadaId
            obj["Quantity"] = parseFloat(trade["Quantity"].replace(/,/g, ''))
            obj["Original_Face"] = "100"
            obj["Price"] = trade["Price (Decimal)"]
            obj["Accrued_Interest"] = parseFloat(trade["Acc Int"]) ? parseFloat(trade["Acc Int"]) : 0
            obj["Net_Money_Settlement"] = parseFloat(trade["Net"].replace(/,/g, ''))
            obj["Net_Money_Settlement_calculated"] = (parseFloat(obj["Quantity"]) * parseFloat(trade["Price (Decimal)"]) / 100.00) + parseFloat(obj["Accrued_Interest"])
            obj["Net_Money_Settlement_difference"] = parseFloat(obj["Net_Money_Settlement"]) - parseFloat(obj["Net_Money_Settlement_calculated"])
            obj["Currency_Settlement"] = bbbCurrency[trade["Currency Symbol"]]
            obj["Currency_Investment"] = "";
            obj["Trade_Date"] = getTradeDateYearTrades(convertExcelDateToJSDate(trade["Trade Date"]))
            obj["Settle_Date"] = getTradeDateYearTrades(settlementDate)
            obj["Expiration_Date"] = "";
            obj["Strike"] = "";
            obj["Put_Call"] = "";
            obj["Custodian_Account_Client"] = "NOM_PB";
            obj["Custodian_Account_UGC"] = "90104-NOMB-INTL";
            obj["Broker_Client"] = "";
            obj["Broker_UGC"] = "";
            obj["Fund_Structure"] = "";
            obj["Strategy_Client"] = "";
            obj["Strategy_UGC"] = "";
            obj["Comments"] = "";
            obj["Order Commission"] = "0";
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
            mufg.push(obj)
            counter++
        }
    }

    for (let index2 = 0; index2 < ibData.length; index2++) {

        let trade = ibData[index2];
        if (trade["Header"] == "Data") {
            let obj: any = {}
            let triadaId = `${parseAndFormat(getTradeDateYearTrades(getDateMufg(convertExcelDateToJSDate(trade["Date/Time"]))))}` + (counter < 10 ? "0" + counter : counter) 
            let tradeDate = trade["Date/Time"]
            let originalFace: any = {
                "6BZ3": 62500, "ESZ3": 50, "ECZ3": 125000, "ZN": 1000, "6EX3": 250000, "ZN   DEC 23": 1000, "6EZ3": 125000
              }
            let bbTicker: any = {
                "6BZ3": "BPZ3 Curncy", "ESZ3": "ESZ3 Index", "ECZ3": "ECZ3 Curncy", "ZN": "TYZ3 Comdty", "6EX3": "BPZ3 Curncy", "ZN   DEC 23": "TYZ3 Comdty", "6EZ3": "BPZ3 Curncy"
            }
            obj["File_Type"] = "ExchSec";
            obj["Fund"] = "90104";
            obj["Transaction_Event"] = "N";
            obj["Transaction_Type"] = parseInt(trade["Quantity"]) < 0 ? "S" : "B";
            obj["Security_ID_ISIN"] = "";
            obj["Security_ID_CUSIP"] = "";
            obj["Security_ID_SEDOL"] = "";
            obj["Security_ID_Bloomberg"] = bbTicker[trade["Symbol"]]
            obj["Security_ID_Reuters"] = "";
            obj["Security_ID_UGC"] = "";
            obj["Security_Description"] = bbTicker[trade["Symbol"]]
            obj["Trade_ID_Client"] = triadaId
            obj["Quantity"] = Math.abs(parseFloat(trade["Quantity"]))
            obj["Original_Face"] = originalFace[trade["Symbol"]]
            obj["Price"] = trade["T. Price"]
            obj["Accrued_Interest"] = 0
            obj["Net_Money_Settlement"] = (parseFloat(obj["Quantity"]) * originalFace[trade["Symbol"]] * parseFloat(obj["Price"]))
            obj["Net_Money_Settlement_calculated"] = (parseFloat(obj["Quantity"]) * originalFace[trade["Symbol"]] * parseFloat(obj["Price"]))
            obj["Net_Money_Settlement_difference"] = parseFloat(obj["Net_Money_Settlement"]) - parseFloat(obj["Net_Money_Settlement_calculated"])
            obj["Currency_Settlement"] = trade["Currency"];
            obj["Currency_Investment"] = "";
            obj["Trade_Date"] = getTradeDateYearTrades(getDateMufg(convertExcelDateToJSDate(trade["Date/Time"])))
            obj["Settle_Date"] = getTradeDateYearTrades(getDateMufg(convertExcelDateToJSDate(trade["Date/Time"])))
            obj["Expiration_Date"] = "";
            obj["Strike"] = "";
            obj["Put_Call"] = "";
            obj["Custodian_Account_Client"] = "IB_PB";
            obj["Custodian_Account_UGC"] = "90104-INBR-INT";
            obj["Broker_Client"] = "";
            obj["Broker_UGC"] = "";
            obj["Fund_Structure"] = "";
            obj["Strategy_Client"] = "";
            obj["Strategy_UGC"] = "";
            obj["Comments"] = "";
            obj["Order Commission"] = parseFloat(trade["Comm/Fee"]) * -1
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
            mufg.push(obj)
            counter++
        }
    }

    for (let index3 = 0; index3 < bbeData.length; index3++) {
        let obj: any = {}
        let trade = bbeData[index3];
        let tradeDate = convertBBGEmexDate(trade["Create Time (As of)"])
        let triadaId = `${parseAndFormat(convertBBGEmexDate(convertExcelDateToJSDate(trade["Create Time (As of)"])))}` + (counter < 10 ? "0" + counter : counter) 
        let originalFace = 1
        obj["File_Type"] = "ExchSec";
        obj["Fund"] = "90104";
        obj["Transaction_Event"] = "N";
        obj["Transaction_Type"] = trade["Side"] == "Sell" ? "S" : "B"
        obj["Security_ID_ISIN"] = "";
        obj["Security_ID_CUSIP"] = "";
        obj["Security_ID_SEDOL"] = "";
        obj["Security_ID_Bloomberg"] = trade["Security"];
        obj["Security_ID_Reuters"] = trade["Security"];
        obj["Security_ID_UGC"] = "";
        obj["Security_Description"] = trade["Security"];
        obj["Trade_ID_Client"] = triadaId
        obj["Quantity"] = parseFloat(trade["FillQty"])
        obj["Original_Face"] = originalFace
        obj["Price"] = trade["LmtPr"]
        obj["Accrued_Interest"] = 0
        obj["Net_Money_Settlement"] = parseFloat(trade["FillQty"]) * trade["LmtPr"] * originalFace
        obj["Net_Money_Settlement_calculated"] = parseFloat(trade["FillQty"]) * trade["LmtPr"] * originalFace
        obj["Net_Money_Settlement_difference"] = parseFloat(obj["Net_Money_Settlement"]) - parseFloat(obj["Net_Money_Settlement_calculated"])
        obj["Currency_Settlement"] = "HKD"
        obj["Currency_Investment"] = "";
        obj["Trade_Date"] = convertBBGEmexDate(convertExcelDateToJSDate(trade["Create Time (As of)"]))
        obj["Settle_Date"] = convertBBGEmexDate(convertExcelDateToJSDate(trade["Create Time (As of)"]))
        obj["Expiration_Date"] = "";
        obj["Strike"] = "";
        obj["Put_Call"] = "";
        obj["Custodian_Account_Client"] = "NOM_PB"
        obj["Custodian_Account_UGC"] = "90104-NOMB-INTL";
        obj["Broker_Client"] = "";
        obj["Broker_UGC"] = "";
        obj["Fund_Structure"] = "";
        obj["Strategy_Client"] = "";
        obj["Strategy_UGC"] = "";
        obj["Comments"] = "";
        obj["Order Commission"] = "0"
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
        mufg.push(obj)
        counter++
    }

    return mufg
}

export async function formatFxTradesToMufg(data: any) {



    let mufg: any = []
    let counter = 1
    for (let index = 0; index < data.length; index++) {
        let obj: any = {}
        let trade = data[index];
        obj = {
            "File_Type": "Spot FX",
            "Fund": "90104",
            "Transaction_Event": "N",
            "Trade_ID_Client": "",
            "Buy Currency": "",
            "Buy Amount": "",
            "Sell Currency": "",
            "Sell Amount": "",
            "Trade_Date": "",
            "Settlement_Date": "",
            "Spot_Date": "",
            "Custodian_Account_Client": "",
            "Custodian_Account_UGC": "",
            "Counterparty_Client": "",
            "Counterparty_UGC": "",
            "Fund_Structure": "",
            "Strategy_Client": "",
            "Strategy_UGC": "",
            "Comments": "",
            "Trader_Client": "",
            "Trader_UGC": "",
            "Manager_Client": "",
            "Manager_UGC": "",
            "Analyst_Client": "",
            "Analyst_UGC": "",
            "Conversion": "",
            "Month": "",
            "Date": "",
            "Trade Date Conversion": "",
            "Settlement Date Conversion": ""
        };


    }



    return mufg
}

export async function createExcelAndReturnPath(data: any, pathName: string) {

    let binaryWS = xlsx.utils.json_to_sheet(data);

    // Create a new Workbook
    var wb = xlsx.utils.book_new()

    // Name your sheet
    xlsx.utils.book_append_sheet(wb, binaryWS, 'Binary values')
    // export your excel
    const stream = new PassThrough();
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    let fileName = `after-excel/${pathName}_${new Date().getTime()}_mufg_output.xlsx`
    uploadToGCloudBucket(buffer, process.env.BUCKET, fileName)
        .then()
        .catch(console.error);

    return fileName

}

function parseAndFormat(inputDate: string) {
    // Extract the last part of the input string
   

    
    // Get today's date
    let today = new Date(inputDate);

    // Format the date as yyyymmdd
    let year = today.getFullYear();
    let month: any = today.getMonth() + 1; // JavaScript months are 0-11
    let day: any = today.getDate();

    month = month < 10 ? '0' + month : month; // Ensure two-digit month
    day = day < 10 ? '0' + day : day; // Ensure two-digit day

    let formattedDate = '' + year + month + day;

    // Output formatted date + last character
    return formattedDate 
}
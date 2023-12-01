import { formatDate, getDate, getTime, convertExcelDateToJSDate, formatTradeDate, formatSettleDateVcon } from "./common";
import { getBBTicker } from "./portfolioOperations";
import { readIB } from "./mufgOperations";
import { getSecurityInPortfolioWithoutLocation } from "./graphApiConnect";

const xlsx = require("xlsx");
const axios = require("axios");
const { Storage } = require("@google-cloud/storage");
const storage = new Storage({ keyFilename: process.env.KEYPATHFILE });
const { PassThrough } = require("stream");
const { MongoClient, ServerApiVersion } = require("mongodb");
const mongoose = require("mongoose");

const uri = "mongodb+srv://alaa:" + process.env.MONGODBPASSWORD + "@atlascluster.zpfpywq.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

mongoose.connect(uri, {
  useNewUrlParser: true,
});

function calculateUSTreasuryPrice(input: string | number): number {
  const fractionMap: any = {
    "⅛": 0.125,
    "¼": 0.25,
    "⅓": 0.3333333333333333,
    "⅜": 0.375,
    "½": 0.5,
    "⅝": 0.625,
    "⅔": 0.6666666666666666,
    "¾": 0.75,
    "⅞": 0.875,
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
      } else {
        fraction = parseFloat(parts[1]);
      }
    }

    return base + fraction / 32;
  }

  return parseFloat(input);
}

export function formatExcelDate(date: any) {
  if (typeof date === "number") {
    // If date is a number, parse it as an Excel date code
    const parsedDate = xlsx.SSF.parse_date_code(date);
    return `${parsedDate.d < 10 ? "0" + parsedDate.d : parsedDate.d}/${parsedDate.m < 10 ? "0" + parsedDate.m : parsedDate.m}/${parsedDate.y}`;
  } else {
    // If date is a string, check if it needs to be updated to the yyyy format
    const parts = date.split("/");
    if (parts[2].length === 2) {
      parts[2] = "20" + parts[2];
    }
    return parts.join("/");
  }
}

export function getAverageCost(currentQuantity: number, previousQuantity: number, currentPrice: any, previousAverageCost: any) {
  if (!previousQuantity) {
    previousQuantity = 0;
  }
  if (!previousAverageCost) {
    previousAverageCost = 0;
  }
  if (currentQuantity + previousQuantity == 0) {
    let previousPrice = previousAverageCost;
    return (previousPrice + currentPrice) / 2.0;
  } else {
    let previousPrice = previousAverageCost;
    let averageCost = (currentQuantity * currentPrice + previousQuantity * previousPrice) / (currentQuantity + previousQuantity);
    return averageCost;
  }
}

export function settlementDatePassed(settlementDate: string, ticker: string) {
  let parts: any = settlementDate.split("/");
  let year = parseInt(parts[2], 10);
  year += year < 70 ? 2000 : 1900; // Adjust year
  let inputDate = new Date(year, parts[0] - 1, parts[1]);

  let today = new Date();

  // Set the time of both dates to be the same
  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return today >= inputDate;
}

export function formatTradesObj(data: object[]) {
  let object: any = {};
  object["isin"] = [];
  object["bb ticker"] = [];
  object["country"] = [];
  object["currency"] = [];
  object["average cost"] = [];
  object["accrued interest"] = [];
  object["strategy"] = [];
  object["date"] = [];
  for (let index = 0; index < data.length; index++) {
    const row: any = data[index];
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

export function parseBondIdentifier(identifier: any) {
  // Split the identifier into components
  try {
    if (identifier) {
      const components: any = identifier.split(" ");
      const fractionMap: any = {
        "⅛": 0.125,
        "¼": 0.25,
        "⅓": 0.3333333333333333,
        "⅜": 0.375,
        "½": 0.5,
        "⅝": 0.625,
        "⅔": 0.6666666666666666,
        "¾": 0.75,
        "⅞": 0.875,
      };
      try {
        let rate = parseFloat(components[1].replace("V", "").trim()) ? parseFloat(components[1].replace("V", "").trim()) : "";
        let dateComponents = components[2].split("/");
        let date: any = parseInt(dateComponents[1]) < 12 ? new Date(`${"20" + dateComponents[2]}-${dateComponents[1]}-${dateComponents[0]}`) : new Date(`${"20" + dateComponents[2]}-${dateComponents[0]}-${dateComponents[1]}`);
        // let date: any = new Date(components[2])

        if (date) {
          date = formatDate(date);
        }
        return [rate, date];
      } catch (error) {
        return error;
      }
    } else {
      return ["", "Invalid Date"];
    }
  } catch (error) {
    return ["", ""];
  }
}

export async function bloombergToTriada(path: string, inputTrader: string, inputStrategy: string) {
  const data = await readBloombergEBlot(path);
  if (data.error) {
    return data.error;
  } else {
    let arr = [];
    const date = getDate(null);
    const time = getTime();
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
        Date: date,
        Time: time,
        "B/S": bS,
        "Bond/CDS": bondCDS,
        Price: price || 0,
        "Notional Amount": notionalAmount,
        Trader: inputTrader,
        Counterparty: counterParty,
        "Settlement Date": settlementDate,
        "Settlement and CDS/Other Notes": settlmenet,
        Strategy: inputStrategy,
      };
      if (row["Block Status"] == "Accepted") {
        arr.push(eBlot);
      }
    }
    return arr;
  }
}

export function getSettlementDateYear(date1: string, date2: string) {
  // Parse the month and year from the first date

  const [month1, day1, year1] = date1.split("/").map(Number);

  // Parse the month from the second date
  let [month2, day2]: any = date2.split("/").map(Number);

  // If the month of the second date is less than the month of the first date,
  // it means we've crossed into a new year, so increment the year
  const year2 = month2 < month1 ? year1 + 1 : year1;

  // Add leading zero if month2 or day2 is less than 10
  month2 = month2 < 10 ? month2.toString().padStart(2, "0") : month2;
  day2 = day2 < 10 ? day2.toString().padStart(2, "0") : day2;

  // Return the second date with the year appended
  return `${month2}/${day2}/${year2}`;
}

export async function uploadToGCloudBucket(data: any, bucketName: any, fileName: any) {
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  const stream = file.createWriteStream({
    metadata: {
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    resumable: false,
  });

  stream.write(data);
  stream.end();

  return new Promise((resolve, reject) => stream.on("error", reject).on("finish", resolve));
}

async function readBloombergEBlot(path: string) {
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
  const headersFormat = ["Block Status", "Alloc Status", "ISIN", "Cusip", "Side", "Qty (M)", "Price (Dec)", "Customer", "Security", "Seq#", "BrkrName", "App", "Rcvd Time", "Workflow", "ReferenceID", "AsOfDate", "Trade Dt", "Acc Int", "Net", "Sender", "Dest", "SetDt", "Ticker"];
  const arraysAreEqual = headersFormat.length === headers[2].length && headersFormat.every((value, index) => value === headers[2][index]);
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload bloomberg e-blot xlsx/csv file",
    };
  } else {
    const data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A3:W10000",
    });
    return data;
  }
}

function mergeSort(array: any[]): any {
  if (array.length <= 1) {
    return array;
  }

  const middle = Math.floor(array.length / 2);
  const left = array.slice(0, middle);
  const right = array.slice(middle);

  return merge(mergeSort(left), mergeSort(right));
}

function merge(left: any, right: any) {
  let resultArray = [],
    leftIndex = 0,
    rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    const dateLeft = new Date(left[leftIndex]["Trade Date"]);
    const dateRight = new Date(right[rightIndex]["Trade Date"]);

    if (dateLeft < dateRight) {
      resultArray.push(left[leftIndex]);
      leftIndex++;
    } else {
      resultArray.push(right[rightIndex]);
      rightIndex++;
    }
  }

  return resultArray.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}

export async function readVconEBlot(path: string) {
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
    return {
      error: "Incompatible format, please upload vcon e-blot xlsx/csv file",
    };
  } else {
    let data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A1:CZ300",
    });

    let isinRequest = [];
    for (let index = 0; index < data.length; index++) {
      let trade = data[index];
      let isinObjReq = { idType: "ID_ISIN", idValue: trade["ISIN"] };
      isinRequest.push(isinObjReq);
    }
    let bbTickers = await getBBTicker(isinRequest);

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      data[rowIndex]["BB Ticker"] = bbTickers[data[rowIndex]["ISIN"]];
      data[rowIndex]["Price"] = data[rowIndex]["Price (Decimal)"];
    }
    // other trades type are sorted by default
    data = mergeSort(data);

    return data;
  }
}

export function formatIbTradesToVcon(data: any) {
  let object = [];
  try {
    for (let index = 0; index < data.length; index++) {
      let updatedTrade: any = {};
      let trade = data[index];
      let originalFace: any = Math.abs(trade["Notional Value"] / trade["T Price"] / Math.abs(trade["Quantity"]));
      let bbTicker: any = {
        "6BZ3 IB": "BPZ3 Curncy",
        "ESZ3 IB": "ESZ3 Index",
        "ECZ3 IB": "ECZ3 Curncy",
        
        "6EX3 IB": "ECX3 Curncy",
        "ZN   DEC 23 IB": "TYZ3 Comdty",
        "6EZ3 IB": "ECZ3 Curncy",
        "ZN   MAR 24 IB": "TYH4 Comdty",
      };
      updatedTrade["Buy/Sell"] = trade["Quantity"] < 0 ? "S" : "B";
      updatedTrade["ISIN"] = trade["Symbol"];
      // soon table api
      updatedTrade["BB Ticker"] = bbTicker[trade["Symbol"]] || null;
      updatedTrade["Issue"] = trade["Symbol"];
      updatedTrade["Quantity"] = (Math.abs(trade["Quantity"]) * originalFace).toString();
      //this to pass the bond divider
      updatedTrade["Price"] = trade["C Price"] * 100.0;
      updatedTrade["Currency"] = trade["Currency"];
      updatedTrade["Net"] = (Math.abs(parseFloat(trade["Quantity"])) * originalFace * parseFloat(trade["C Price"])).toString();
      updatedTrade["Trade Date"] = convertExcelDateToJSDate(trade["Trade Date"]);
      updatedTrade["Settle Date"] = convertExcelDateToJSDate(trade["Settle Date"]);
      updatedTrade["Triada Trade Id"] = trade["Triada Trade Id"];
      updatedTrade["Location"] = trade["Location"].trim().toUpperCase();
      updatedTrade["Status"] = "Accepted";
      updatedTrade["Original Face"] = originalFace;
      object.push(updatedTrade);
    }
  } catch (error) {
    return { error: error };
  }
  return object;
}

export function formatEmsxTradesToVcon(data: any) {
  let object = [];
  try {
    for (let index = 0; index < data.length; index++) {
      let updatedTrade: any = {};
      let trade = data[index];
      updatedTrade["Buy/Sell"] = trade["Buy/Sell"] == "Sell" ? "S" : "B";
      updatedTrade["ISIN"] = trade["Security"];
      updatedTrade["BB Ticker"] = trade["Security"];
      updatedTrade["Issue"] = trade["Security"];
      updatedTrade["Quantity"] = Math.abs(trade["Quantity"]).toString();
      //this to pass the bond divider
      updatedTrade["Price"] = trade["Price"] * 100.0;
      updatedTrade["Currency"] = "HKD";
      updatedTrade["Net"] = (Math.abs(parseFloat(trade["Quantity"])) * parseFloat(trade["Price"])).toString();
      updatedTrade["Trade Date"] = convertExcelDateToJSDate(trade["Trade Date"]);
      updatedTrade["Settle Date"] = convertExcelDateToJSDate(trade["Settle Date"]);
      updatedTrade["Triada Trade Id"] = trade["Triada Trade Id"];
      updatedTrade["Location"] = trade["Location"].trim().toUpperCase();
      updatedTrade["Status"] = "Accepted";
      updatedTrade["Principal"] = Math.abs(trade["Quantity"]).toString();
      object.push(updatedTrade);
    }
  } catch (error) {
    return { error: error };
  }
  return object;
}

export async function readIBEblot(path: string) {
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
  const headersFormat = ["Currency", "Symbol", "Quantity", "T Price", "C Price", "Notional Value", "Comm/Fee", "Basis", "Realized P/L", "MTM P/L", "Code", "Trade Date", "Settle Date", "Triada Trade Id", "Location"];
  const arraysAreEqual = headersFormat.every((value, index) => (value === headers[0][index] ? true : false));
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload ib e-blot xlsx/csv file",
    };
  } else {
    let data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A1:R300",
    });

    return data;
  }
}

export async function readIBRawExcel(path: string) {
  try {
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
    } else {
      for (let tradesIndex = tradesRowIndex; tradesIndex < data.length; tradesIndex++) {
        let trade = data[tradesIndex];
        if (trade[headers[1]] !== "Data" && trade[headers[1]] != "SubTotal") {
          tradesRowEndIndex = tradesIndex + 1;
          break;
        }
      }
    }
    data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: `A${tradesRowIndex}:Q${tradesRowEndIndex}`,
    });
    return data;
  } catch (error) {
    return [];
  }
}

export async function readEmsxEBlot(path: string) {
  try {
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
    const headersFormat = ["Status", "Buy/Sell", "Security", "Quantity", "Price", "Trade Date", "Settle Date", "Triada Trade Id", "Location"];

    const arraysAreEqual = headersFormat.every((value, index) => (value === headers[0][index] ? true : false));
    if (!arraysAreEqual) {
      return {
        error: "Incompatible format, please upload emsx e-blot xlsx/csv file",
      };
    } else {
      let data = xlsx.utils.sheet_to_json(worksheet, {
        defval: "",
        range: "A1:I300",
      });

      return data;
    }
  } catch (error) {
    return { error: error };
  }
}

export async function readMUFGEBlot(path: string) {
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

  const arraysAreEqual = true;
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload vcon e-blot xlsx/csv file",
    };
  } else {
    let data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A1:V300",
    });

    let isinRequest = [];
    for (let index = 0; index < data.length; index++) {
      let positionMufg = data[index];
      let isinObjReq = {
        idType: "ID_ISIN",
        idValue: positionMufg["Investment"],
      };
      isinRequest.push(isinObjReq);
    }
    let bbTickers = await getBBTicker(isinRequest);
    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      data[rowIndex]["BB Ticker"] = bbTickers[data[rowIndex]["Investment"]];
    }
    let portfolio = [];

    for (let index = 0; index < data.length; index++) {
      let object: any = {};
      let position = data[index];
      object["BB Ticker"] = position["BB Ticker"] ? position["BB Ticker"].replace("Corp", "").replace("Govt", "").trim() : position["BB Ticker"];
      object["Quantity"] = position["Investment"].includes("ib") ? 100 : position["Quantity MUFG"];
      object["ISIN"] = position["Investment"];
      object["Issue"] = position[" Issue "] ? position[" Issue "].trim() : "";
      object["Average Cost"] = Math.round((parseFloat(position["LocalCost"]) / parseFloat(position["Quantity MUFG"])) * 10000000000) / 10000000000;
      object["Buy/Sell"] = "B";
      object["Status"] = "Accepted";
      object["Trade Date"] = "09/29/23";
      object["Settle Date"] = "09/29";
      object["Net"] = position["Quantity MUFG"];
      object["Mid"] = position["Investment"].includes("IB") ? parseFloat(position["Price"]) : parseFloat(position["Price"]) / 100.0;
      object["Location"] = position["Location"].toUpperCase();
      object["Currency"] = position["CCY"];
      portfolio.push(object);
    }
    return portfolio;
  }
}

function formartImagineDate(input: any) {
  input = input.toString();
  try {
    if (parseInt(input)) {
      const year = input.slice(0, 4);
      const month = input.slice(4, 6);
      const day = input.slice(6, 8);
      return new Date(year, month - 1, day);
    }
  } catch (error) {
    return "";
  }
}

export async function readEditInput(path: string) {
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

  const arraysAreEqual = true;
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload edit e-blot xlsx/csv file",
    };
  } else {
    let data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A1:AN300",
    });

    let portfolio = [];
    
    for (let index = 0; index < data.length; index++) {
      let object: any = {};
      let position = data[index];
      object["ISIN"] = position["Isin"];
      object["Type"] = position["Type"];
      object["Group"] = position["Group"];
      object["holdPortfXrate"] = position["holdPortfXrate"];
      object["Sector"] = position["Text22"];
      object["Rating Class"] = position["Text23"];
      object["holdPortfXrate"] = position["holdPortfXrate"];
      object["Location"] = position["Location"].toUpperCase();
      object["BB Ticker"] = position["BB Ticker"];
      object["Country"] = position["Text1"];
      object["Issuer"] = position["Issuer"];
      object["Issue"] = position["Long Security Name"]
      object["Call Date"] = formartImagineDate(position["CallDate"]) || "";
      object["Maturity"] = formartImagineDate(position["Maturity"]) || "";

      portfolio.push(object);
    }
    return portfolio;
  }
}

export async function readPortfolioFromImagine(path: string) {
  const response = await axios.get(path, { responseType: "arraybuffer" });

  /* Parse the data */
  const workbook = xlsx.read(response.data, { type: "buffer" });

  /* Get first worksheet */
  const worksheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[worksheetName];

  /* Convert worksheet to JSON */
  // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});

  // Read data
  const arraysAreEqual = true; //headersFormat.length === headers[0].length && headersFormat.every((value, index) => value === headers[0][index]);
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload vcon e-blot xlsx/csv file",
    };
  } else {
    try {
      let data = xlsx.utils.sheet_to_json(worksheet, {
        defval: "",
        range: "A1:AM300",
      });

      let portfolio = [];
      for (let index = 0; index < data.length; index++) {
        let object: any = {};
        let position = data[index];
        object["BB Ticker"] = position["BB Ticker"].replace("Corp", "").replace("Govt", "").trim();
        object["Quantity"] = position["Notional Total"];
        object["ISIN"] = position["Isin"];
        object["Price"] = parseFloat(position["Average Cost"]) || 0;
        object["Buy/Sell"] = "B";
        object["Status"] = "Accepted";
        object["Trade Date"] = "09/29/23";
        object["Settle Date"] = "09/29";
        object["Net"] = position["Notional Total"];
        object["Mid"] = position["Mid"];
        object["Location"] = position["Location"].toUpperCase();
        object["Currency"] = position["Curr"];
        portfolio.push(object);

        return portfolio;
      }
    } catch (error) {
      return { error: error };
    }
  }
}

export async function readPortfolioFromLivePorfolio(path: string) {
  const response = await axios.get(path, { responseType: "arraybuffer" });

  /* Parse the data */
  const workbook = xlsx.read(response.data, { type: "buffer" });

  /* Get first worksheet */
  // const worksheetName = workbook.SheetNames[3];
  const worksheet = workbook.Sheets["Summary"];

  /* Convert worksheet to JSON */
  // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});

  // Read data
  const arraysAreEqual = true; //headersFormat.length === headers[0].length && headersFormat.every((value, index) => value === headers[0][index]);
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload vcon e-blot xlsx/csv file",
    };
  } else {
    try {
      let data = xlsx.utils.sheet_to_json(worksheet, {
        defval: "",
        range: "A15:BO300",
      });

      let portfolio = [];
      for (let index = 0; index < data.length; index++) {
        let object: any = {};
        let position = data[index];
        object["BB Ticker"] = position["BBG Ticker"].replace("Corp", "").trim();
        object["Quantity"] = position["Notional Total"];
        object["Average Cost"] = parseFloat(position["Avg Cost"]) / 100.0;
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

        return portfolio;
      }
    } catch (error) {
      return { error: error };
    }
  }
}

export async function readBloombergTriadaEBlot(path: string) {
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
  const headersFormat = ["Block Status", "Alloc Status", "ISIN", "Cusip", "Side", "Qty (M)", "Price (Dec)", "Customer", "Security", "Seq#", "BrkrName", "App", "Rcvd Time", "Workflow", "ReferenceID", "AsOfDate", "Trade Dt", "Acc Int", "Net", "Sender", "Dest", "SetDt", "Ticker", "Country", "Curreny In USD Ratio", "Strategy", "Interest Rate"];
  const arraysAreEqual = headersFormat.length === headers[2].length && headersFormat.every((value, index) => value === headers[2][index]);
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload bloomberg-triada e-blot xlsx/csv file",
    };
  } else {
    const data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A3:AA300",
    });
    return data;
  }
}

export async function readPricingSheet(path: string) {
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
  const headersFormat = ["#", "Trade Idea Code", "Long Security Name", "BB Ticker", "Column1", "Bid", "Ask", "Mid", "Broker", "Override Bid", "Override Ask", "Today's Bid", "Today's Ask", "Today's Mid"];

  const arraysAreEqual = true; //headersFormat.every((value, index) => value === headers[2][index]); //headersFormat.length === headers[2].length && headersFormat.every((value, index) => value === headers[2][index]);
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload pricing sheet xlsx/csv file",
    };
  } else {
    const data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A3:AN300",
    });
    return data;
  }
}

export function calculateDailyProfitLoss(documents: object, previousDayPortfolio: any) {
  let position: any = documents;
  let couponRate = position["Coupon Rate"];
  position["Daily P&L Interest"] = ((couponRate / 100) * position["Quantity"]) / 360;
  for (let y = 0; y < previousDayPortfolio.length; y++) {
    let previousDayPortfolioObj = previousDayPortfolio[y];
    if (previousDayPortfolioObj["Issue"] == position["BB Ticker"]) {
      position["Previous Mark"] = previousDayPortfolioObj["Mid"];
      position["Daily P&L Urlzd"] = ((position["Mid"] - previousDayPortfolioObj["Mid"]) * position["Quantity"]) / 100;
      documents = position;
    }
  }
  return documents;
}

export function calculateMonthlyProfitLoss(documents: object[], previousMonthPortfolio: any) {
  for (let index = 0; index < documents.length; index++) {
    const currentPortfolioObj: any = documents[index];
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

export async function uploadTriadaAndReturnFilePath(arr: any) {
  let binaryWS = xlsx.utils.json_to_sheet(arr);

  // Create a new Workbook
  var wb = xlsx.utils.book_new();

  // Name your sheet
  xlsx.utils.book_append_sheet(wb, binaryWS, "Binary values");
  // export your excel
  const stream = new PassThrough();
  const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
  let fileName = `after-excel/${Date.now()}_output.xlsx`;
  uploadToGCloudBucket(buffer, process.env.BUCKET, fileName).then().catch(console.error);

  return fileName;
}

export function getAllDatesSinceLastMonthLastDay(date: string | null): string[] {
  const today = date == null ? new Date() : new Date(date);
  const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const dates = [];

  for (let d = lastDayOfLastMonth; d <= today; d.setDate(d.getDate() + 1)) {
    let month = "" + (d.getMonth() + 1);
    let day = "" + d.getDate();
    let year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    dates.push([year, month, day].join("-"));
  }

  return dates;
}

export function sortVconTrades(object: any) {
  let issues = Object.keys(object);
  let trades = [];
  for (let index = 0; index < issues.length; index++) {
    let issue = object[issues[index]];
    trades.push(issue);
  }
  return trades;
}

export function formatUpdatedPositions(positions: any, portfolio: any) {
  try {
    let positionsIndexThatExists = [];
    let positionsThatDoNotExists = [];
    for (let indexPositions = 0; indexPositions < positions.length; indexPositions++) {
      const position = positions[indexPositions];
      for (let indexPortfolio = 0; indexPortfolio < portfolio.length; indexPortfolio++) {
        const portfolioPosition = portfolio[indexPortfolio];
        if ((position["ISIN"] == portfolioPosition["ISIN"] || position["BB Ticker"] == portfolioPosition["BB Ticker"] || position["Issue"] == portfolioPosition["Issue"]) && position["Location"] == portfolioPosition["Location"]) {
          portfolio[indexPortfolio] = position;
          positionsIndexThatExists.push(indexPositions);
        }
      }
    }
    
    for (let indexPositionsExists = 0; indexPositionsExists < positions.length; indexPositionsExists++) {
      if (!positionsIndexThatExists.includes(indexPositionsExists)) {
        positionsThatDoNotExists.push(positions[indexPositionsExists]);
      }
    }
    

    return [...portfolio, ...positionsThatDoNotExists];
  } catch (error) {
    return error;
  }
}

export function formatDateRlzdDaily(date: any) {
  date = new Date(date);
  let day = date.getDate().toString().padStart(2, "0"); // Pad with a zero if needed
  let month = (date.getMonth() + 1).toString().padStart(2, "0"); // Pad with a zero if needed, and note that months are 0-indexed in JS
  let year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

export function getDateTimeInMongoDBCollectionFormat(date: any) {
  let today: any = new Date(date);

  let day = today.getDate();
  let month = today.getMonth() + 1;
  let year = today.getFullYear();
  let hours: any = today.getHours();
  let minutes: any = today.getMinutes();
  if (day < 10) {
    day = "0" + day;
  }
  if (month < 10) {
    month = "0" + month;
  }

  // Pad single digit minutes or hours with a leading zero
  if (hours < 10) hours = "0" + hours;
  if (minutes < 10) minutes = "0" + minutes;

  let formattedDateTime = year + "-" + month + "-" + day + " " + hours + ":" + minutes;
  return formattedDateTime;
}

export function mapDatetimeToSameDay(datetimeList: any, daytimeInput: any) {
  // Convert daytimeInput to a string in the "yyyy-mm-dd" format
  let dateStr = new Date(daytimeInput).toISOString().slice(0, 10);

  // Filter datetimeList to keep only the strings with the same date
  let sameDateStrings = datetimeList.filter((s: any) => s.includes(dateStr));
  // If there are no strings with the same date, return null
  if (sameDateStrings.length === 0) {
    return null;
  }
 
  // Sort the remaining strings in descending order and return the first one
  sameDateStrings.sort((a: any, b: any) => {
    let dateA: any = new Date(a.split("-").slice(1).join("-"));
    let dateB: any = new Date(b.split("-").slice(1).join("-"));
    return dateA - dateB;
  });
  return sameDateStrings[0];
}

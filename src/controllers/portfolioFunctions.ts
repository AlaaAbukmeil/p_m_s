
import { formatDate, getDate, getTime } from "./common";
import { getBBTicker } from "./portfolioOperations";


const xlsx = require("xlsx")
const axios = require("axios")
const { Storage } = require('@google-cloud/storage');
const storage = new Storage({ keyFilename: process.env.KEYPATHFILE });
const { PassThrough } = require('stream');
const {
  MongoClient,
  ServerApiVersion
} = require('mongodb');
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
})

function calculateUSTreasuryPrice(input: string | number): number {
  const fractionMap: any = {
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
      } else {
        fraction = parseFloat(parts[1]);
      }
    }

    return base + (fraction / 32);
  }

  return parseFloat(input);
}

export function formatExcelDate(date: any) {
  if (typeof date === 'number') {
    // If date is a number, parse it as an Excel date code
    const parsedDate = xlsx.SSF.parse_date_code(date);
    return `${parsedDate.d < 10 ? '0' + parsedDate.d : parsedDate.d}/${parsedDate.m < 10 ? '0' + parsedDate.m : parsedDate.m}/${parsedDate.y}`;
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
    previousQuantity = 0
  }
  if (!previousAverageCost) {
    previousAverageCost = 0
  }
  // console.log(currentQuantity, previousQuantity, currentPrice, previousAverageCost)
  if ((currentQuantity + previousQuantity) == 0) {
    return 0
  } else {
    let previousPrice = previousAverageCost
    let averageCost = ((currentQuantity * currentPrice) + (previousQuantity * previousPrice)) / (currentQuantity + previousQuantity)
    return averageCost
  }

}

export function settlementDatePassed(settlementDate: string, ticker: string) {
  let parts: any = settlementDate.split('/');
  let year = parseInt(parts[2], 10);
  year += year < 70 ? 2000 : 1900;  // Adjust year
  let inputDate = new Date(year, parts[0] - 1, parts[1]);

  let today = new Date()

  // Set the time of both dates to be the same
  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  // console.log(new Date(inputDate), new Date(today), ticker)
  return today >= inputDate
}

export function formatTradesObj(data: object[]) {
  let object: any = {}
  object["isin"] = []
  object["bb ticker"] = []
  object["country"] = []
  object["currency"] = []
  object["average cost"] = []
  object["accrued interest"] = []
  object["strategy"] = []
  object["date"] = []
  for (let index = 0; index < data.length; index++) {
    const row: any = data[index];
    object["isin"].push(row["isin"])
    object["bb ticker"].push(row["bb ticker"])
    object["country"].push(row["country"])
    object["currency"].push(row["currency"])
    object["average cost"].push(row["average cost"])
    object["accrued interest"].push(row["accrued interest"])
    object["strategy"].push(row["strategy"])
    object["date"].push(row["date"])
  }
  return object
}

export function parseBondIdentifier(identifier: any) {
  // Split the identifier into components
  if (identifier) {
    const components: any = identifier.split(' ');
    const fractionMap: any = {
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
      let rate = (parseFloat(components[1].replace("V", "").trim())) ? parseFloat(components[1].replace("V", "").trim()) : "Not"
      let dateComponents = components[2].split('/')
      let date: any = (parseInt(dateComponents[1]) < 12 ? new Date(`${"20" + dateComponents[2]}-${dateComponents[1]}-${dateComponents[0]}`) : new Date(`${"20" + dateComponents[2]}-${dateComponents[0]}-${dateComponents[1]}`));
      // let date: any = new Date(components[2])
      if (date) {
        date = formatDate(date)
      }
      return [rate, date];
    } catch (error) {
      return error
    }
  } else {
    return ["Not Applicable", "Invalid Date"]
  }

}

export async function bloombergToTriada(path: string, inputTrader: string, inputStrategy: string) {


  const data = await readBloombergEBlot(path)
  if (data.error) {
    return data.error
  } else {
    let arr = []
    const date = getDate()
    const time = getTime()
    for (let index = 0; index < data.length; index++) {
      let row = data[index];
      let bS = row["Side"]
      let bondCDS = row["Security"]
      let price = row["Price (Dec)"]
      let notionalAmount = row["Qty (M)"]
      let counterParty = row["BrkrName"]
      let settlementDate = formatExcelDate(row["SetDt"])
      let settlmenet = row["Net"]
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
      }
      if (row["Block Status"] == "Accepted") {
        arr.push(eBlot)
      }
    }
    return arr
  }
}

export function getSettlementDateYear(date1: string, date2: string) {
  // Parse the month and year from the first date
  // console.log(date1, date2)
  const [month1, day1, year1] = date1.split('/').map(Number);

  // Parse the month from the second date
  const [month2, day2] = date2.split('/').map(Number);

  // If the month of the second date is less than the month of the first date,
  // it means we've crossed into a new year, so increment the year
  const year2 = month2 < month1 ? year1 + 1 : year1;

  // Return the second date with the year appended
  return `${month2}/${day2}/${year2}`;
}

export async function uploadToGCloudBucket(data: any, bucketName: any, fileName: any) {
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

  return new Promise((resolve, reject) =>
    stream.on('error', reject).on('finish', resolve)
  );
}

async function readBloombergEBlot(path: string) {

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
  ]
  const arraysAreEqual = headersFormat.length === headers[2].length && headersFormat.every((value, index) => value === headers[2][index]);
  if (!arraysAreEqual) {
    return { error: "Incompatible format, please upload bloomberg e-blot xlsx/csv file" }
  } else {
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A3:W10000' });
    return data
  }
}

function mergeSort(array: any[]): any {
  if (array.length <= 1) {
    return array;
  }

  const middle = Math.floor(array.length / 2);
  const left = array.slice(0, middle);
  const right = array.slice(middle);

  return merge(
    mergeSort(left),
    mergeSort(right)
  );
}

function merge(left: any, right: any) {
  let resultArray = [], leftIndex = 0, rightIndex = 0;

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

  return resultArray
    .concat(left.slice(leftIndex))
    .concat(right.slice(rightIndex));
}

export async function readVconEBlot(path: string) {
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
  ]
  const arraysAreEqual = headersFormat.every((value, index) => value === headers[0][index]);
  if (!arraysAreEqual) {
    return { error: "Incompatible format, please upload vcon e-blot xlsx/csv file" }
  }
  else {
    let data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A1:BA10000' });
    if (data.length > 2500) {
      return { error: "Max Trades Limit is 250 per minute" }
    } else {
      let isinRequest = []
      for (let index = 0; index < data.length; index++) {
        let trade = data[index];
        let isinObjReq = { "idType": "ID_ISIN", "idValue": trade["ISIN"] }
        isinRequest.push(isinObjReq)
      }
      let bbTickers = await getBBTicker(isinRequest)
      // console.log(bbTickers)
      for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
        data[rowIndex]["BB Ticker"] = bbTickers[data[rowIndex]["ISIN"]]
        data[rowIndex]["Price"] = calculateUSTreasuryPrice(data[rowIndex]["Price"])
      }
      data = mergeSort(data)
      // console.log(data)
      return data
    }
  }
}

export async function readPortfolioFromImagine(path: string) {
  const response = await axios.get(path, { responseType: 'arraybuffer' });

  /* Parse the data */
  const workbook = xlsx.read(response.data, { type: 'buffer' });

  /* Get first worksheet */
  const worksheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[worksheetName];

  /* Convert worksheet to JSON */
  // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});

  // Read data
  const arraysAreEqual = true//headersFormat.length === headers[0].length && headersFormat.every((value, index) => value === headers[0][index]);
  if (!arraysAreEqual) {
    return { error: "Incompatible format, please upload vcon e-blot xlsx/csv file" }
  }
  else {
    try {
      let data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A4:AM40000' });
      if (data.length > 2500) {
        return { error: "Max Trades Limit is 250 per minute" }
      } else {
        let portfolio = []
        for (let index = 0; index < data.length; index++) {
          let object: any = {}
          let position = data[index];
          // console.log(position)
          object["BB Ticker"] = position["BB Ticker"].replace("Corp", "").trim()
          object["Quantity"] = position["Notional Total"]
          object["Price"] = (parseFloat(position["Cost"]) / parseFloat(position["Notional Total"])) * 100
          object["Buy/Sell"] = "B"
          object["Status"] = "Accepted"
          object["Trade Date"] = "08/31/23"
          object["Settle Date"] = "08/31"
          object["Net"] = position["Notional Total"]
          object["Mid"] = position["Mid"]
          object["Application"] = position["Curr"]
          portfolio.push(object)

        }
        return portfolio


        // console.log(data)
      }
    } catch (error) {
      return { error: error }
    }
  }
}

export async function readBloombergTriadaEBlot(path: string) {

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

  ]
  const arraysAreEqual = headersFormat.length === headers[2].length && headersFormat.every((value, index) => value === headers[2][index]);
  if (!arraysAreEqual) {
    return { error: "Incompatible format, please upload bloomberg-triada e-blot xlsx/csv file" }
  } else {
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A3:AA10000' });
    return data
  }
}

export async function readPricingSheet(path: string) {

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
  // console.log(headers[2])
  // console.log(headers)
  const headersFormat =
    [
      '#', 'Trade Idea Code',
      'Long Security Name', 'BB Ticker',
      'Column1', 'Bid',
      'Ask', 'Mid',
      'Broker', 'Override Bid',
      'Override Ask', "Today's Bid",
      "Today's Ask", "Today's Mid",
      '2nd Broker', "Today's Bid2",
      "Today's Ask2", 'T-Spread',
      'Broker2', 'Final Bid',
      'Final Ask', 'T-Spread3',
      'T-Spread4', 'T-Spread5',
      'T-Spread6', 'ISIN',
      'End of Month', 'DV01',
      'Mid Yield Maturity', 'Mid  Yield Worst',
      'Mid  Yield call', 'Accural Interst',
      'Spread to benchmark', 'Country',
      'Country2'
    ]
  const arraysAreEqual = headersFormat.length === headers[2].length && headersFormat.every((value, index) => value === headers[2][index]);
  if (!arraysAreEqual) {
    return { error: "Incompatible format, please upload pricing sheet xlsx/csv file" }
  } else {
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A3:AI30000' });
    return data
  }
}

export function calculateDailyProfitLoss(documents: object, previousDayPortfolio: any) {

  let position: any = documents
  let couponRate = position["Coupon Rate"]
  position["Daily P&L Interest"] = ((couponRate / 100) * position["Quantity"]) / 360
  for (let y = 0; y < previousDayPortfolio.length; y++) {
    let previousDayPortfolioObj = previousDayPortfolio[y];
    if (previousDayPortfolioObj["Issue"] == position["BB Ticker"]) {
      position["Previous Mark"] = previousDayPortfolioObj["Mid"]
      position["Daily P&L Urlzd"] = (((position["Mid"] - previousDayPortfolioObj["Mid"])) * position["Quantity"]) / 100
      documents = position
    }
  }
  return documents
}

export function calculateMonthlyProfitLoss(documents: object[], previousMonthPortfolio: any) {
  for (let index = 0; index < documents.length; index++) {
    const currentPortfolioObj: any = documents[index];
    for (let y = 0; y < previousMonthPortfolio.length; y++) {
      const previousMonthPortfolioObj = previousMonthPortfolio[y];
      if (previousMonthPortfolioObj["bb ticker"] == currentPortfolioObj["bb ticker"]) {
        currentPortfolioObj["mtd mark"] = previousMonthPortfolioObj["mid"]
        currentPortfolioObj["ptf mtd unrlzd"] = (currentPortfolioObj["mid"] - previousMonthPortfolioObj["mid"]) * currentPortfolioObj["notional amount"]
        // currentPortfolioObj["monthly P&L interest"] = ((interestRate / 100) *  currentPortfolioObj["notional amount"]) / 12
        documents[index] = currentPortfolioObj
      }
    }

  }
  return documents
}

export async function uploadTriadaAndReturnFilePath(arr: any) {
  // console.log(arr)
  let binaryWS = xlsx.utils.json_to_sheet(arr);

  // Create a new Workbook
  var wb = xlsx.utils.book_new()

  // Name your sheet
  xlsx.utils.book_append_sheet(wb, binaryWS, 'Binary values')
  // export your excel
  const stream = new PassThrough();
  const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  let fileName = `after-excel/${Date.now()}_output.xlsx`
  uploadToGCloudBucket(buffer, process.env.BUCKET, fileName)
    .then()
    .catch(console.error);

  return fileName

}

export function getAllDatesSinceLastMonthLastDay(date: string | null): string[] {

  const today = date == null ? new Date() : new Date(date)
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

export function sortVconTrades(object: any) {
  let issues = Object.keys(object)
  let trades = []
  for (let index = 0; index < issues.length; index++) {
    let issue = object[issues[index]]
    trades.push(issue)
  }
  return trades
}

export function formatUpdatedPositions(positions: any, portfolio: any) {
  try {
    let updatedPortfolio = Object.values(positions)
    let updatedPositions = Object.keys(positions)
    for (let issueIndex = 0; issueIndex < portfolio.length; issueIndex++) {
      let issue = portfolio[issueIndex]
      delete issue["_id"];
      if (!updatedPositions.includes(issue["ISIN"] || issue["Issue"])) {
        updatedPortfolio.push(issue)
      }
    }
    return updatedPortfolio
  } catch (error) {
    return error
  }
}
require("dotenv").config()

import { getDate, getTime } from "../controllers/common";


const axios = require("axios")
const xlsx = require("xlsx")
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


function formatExcelDate(date: any) {
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

export async function readBloombergSheet(path: string, inputTrader: string, inputStrategy: string) {

  const response = await axios.get(path, { responseType: 'arraybuffer' });

  /* Parse the data */
  const workbook = xlsx.read(response.data, { type: 'buffer' });

  /* Get first worksheet */
  const worksheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[worksheetName];

  /* Convert worksheet to JSON */
  // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});

  // Read data
  const date = getDate()
  const time = getTime()
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
    let arr = []
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
        "Strategy": inputTrader
      }
      if (row["Block Status"] == "Accepted") {
        arr.push(eBlot)
      }
    }
    return arr
  }
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

export async function generateImagineEBlot(arr: any) {

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

export async function insertEBlotTransactions(transactions: any) {
  const database = client.db("master");
  const reportCollection = database.collection("transactions");
  try {
    const action = await reportCollection.insertMany(transactions);
  } catch (error) {
    return error
  }
}

export async function getReport() {
  const database = client.db("master");
  const reportCollection = database.collection("transactions");
  const documents = await reportCollection.find().toArray();
  return documents
}

export async function readTriadaEBlot(path: string) {

  const response = await axios.get(path, { responseType: 'arraybuffer' });

  /* Parse the data */
  const workbook = xlsx.read(response.data, { type: 'buffer' });

  /* Get first worksheet */
  const worksheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[worksheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A1:K10000' });
  const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  const headersFormat = [
    'Date',
    'Time',
    'B/S',
    'Bond/CDS',
    'Price',
    'Notional Amount',
    'Trader',
    'Counterparty',
    'Settlement Date',
    'Settlement and CDS/Other Notes',
    'Strategy'
  ]
  const arraysAreEqual = headersFormat.length === headers[0].length && headersFormat.every((value, index) => value === headers[0][index]);
  if (!arraysAreEqual) {
    return { error: "Incompatible format, please upload Triada (Imagine) e-blot xlsx/csv file" }
  } else {
    await insertEBlotTransactions(data)
  }

}
import { convertExcelDateToJSDate, getTradeDateYearTrades } from "../common";

const xlsx = require("xlsx");
const axios = require("axios");
const { Storage } = require("@google-cloud/storage");
const storage = new Storage({ keyFilename: process.env.KEYPATHFILE });
const { PassThrough } = require("stream");

export async function readCentralizedEBlot(path: string) {
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
  const headersFormat = ["B/S", "BB Ticker", "Location", "Trade Date", "Trade Time", "Settle Date", "Price", "Notional Amount", "Settlement Amount", "Principal", "Counter Party", "Triada Trade Id", "Seq No", "ISIN", "Cuisp", "Currency", "Yield", "Accrued Interest", "Original Face", "Comm/Fee", "Trade Type", "Trade App Status"];
  const arraysAreEqual = headersFormat.every((value, index) => (value === headers[0][index] ? true : console.log(value, headers[0][index], "excel value are wrong")));
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload centralized e-blot xlsx/csv file",
    };
  } else {
    let data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A1:V300",
    });

    let filtered = data.filter((trade: any, index: any) => trade["Trade App Status"] == "new");
    filtered.sort((a: any, b: any) => new Date(a["Trade Date"]).getTime() - new Date(b["Trade Date"]).getTime());

    let missingLocation = data.filter((trade: any, index: any) => trade["Location"] == "" || (trade["ISIN"] == "" && trade["Trade Type"] == "vcon") || !trade["Location"] || trade["Location"].trim().split(" ").length > 1);
    if (missingLocation.length) {
      let issueMissing = "";
      for (let indexMissingIssue = 0; indexMissingIssue < missingLocation.length; indexMissingIssue++) {
        let issueName = missingLocation[indexMissingIssue]["BB Ticker"];
        issueMissing += issueName + " //";
      }
      return { error: `BB Ticker ${issueMissing} has missing or more than one location/ISIN` };
    }
    let vconTrades = filtered.filter((trade: any, index: any) => trade["Trade Type"] == "vcon");
    let ibTrades = filtered.filter((trade: any, index: any) => trade["Trade Type"] == "ib");
    let emsxTrades = filtered.filter((trade: any, index: any) => trade["Trade Type"] == "emsx");

    for (let rowIndex = 0; rowIndex < vconTrades.length; rowIndex++) {
      vconTrades[rowIndex]["Triada Trade Id"] = vconTrades[rowIndex]["Triada Trade Id"];

      if (!vconTrades[rowIndex]["Trade Date"].includes("/")) {
        vconTrades[rowIndex]["Trade Date"] = getTradeDateYearTrades(convertExcelDateToJSDate(vconTrades[rowIndex]["Trade Date"]));
      }
      if (!vconTrades[rowIndex]["Settle Date"].includes("/")) {
        vconTrades[rowIndex]["Settle Date"] = getTradeDateYearTrades(convertExcelDateToJSDate(vconTrades[rowIndex]["Settle Date"]));
      }
      vconTrades[rowIndex]["timestamp"] = new Date(vconTrades[rowIndex]["Trade Date"]).getTime();
      vconTrades[rowIndex]["Trade App Status"] = "uploaded_to_app";
    }

    for (let ibTradesIndex = 0; ibTradesIndex < ibTrades.length; ibTradesIndex++) {
      ibTrades[ibTradesIndex]["ISIN"] = ibTrades[ibTradesIndex]["BB Ticker"];
      if (!ibTrades[ibTradesIndex]["Trade Date"].includes("/")) {
        ibTrades[ibTradesIndex]["Trade Date"] = getTradeDateYearTrades(convertExcelDateToJSDate(ibTrades[ibTradesIndex]["Trade Date"]));
      }
      if (!ibTrades[ibTradesIndex]["Settle Date"].includes("/")) {
        ibTrades[ibTradesIndex]["Settle Date"] = getTradeDateYearTrades(convertExcelDateToJSDate(ibTrades[ibTradesIndex]["Settle Date"]));
      }
      ibTrades[ibTradesIndex]["timestamp"] = new Date(ibTrades[ibTradesIndex]["Trade Date"]).getTime();
      ibTrades[ibTradesIndex]["Trade App Status"] = "uploaded_to_app";
    }

    for (let emsxTradesIndex = 0; emsxTradesIndex < emsxTrades.length; emsxTradesIndex++) {
      emsxTrades[emsxTradesIndex]["Notional Amount"] = emsxTrades[emsxTradesIndex]["Settlement Amount"];
      emsxTrades[emsxTradesIndex]["ISIN"] = emsxTrades[emsxTradesIndex]["BB Ticker"];
      if (!emsxTrades[emsxTradesIndex]["Trade Date"].includes("/")) {
        emsxTrades[emsxTradesIndex]["Trade Date"] = getTradeDateYearTrades(convertExcelDateToJSDate(emsxTrades[emsxTradesIndex]["Trade Date"]));
      }
      if (!emsxTrades[emsxTradesIndex]["Settle Date"].includes("/")) {
        emsxTrades[emsxTradesIndex]["Settle Date"] = getTradeDateYearTrades(convertExcelDateToJSDate(emsxTrades[emsxTradesIndex]["Settle Date"]));
      }
      emsxTrades[emsxTradesIndex]["timestamp"] = new Date(emsxTrades[emsxTradesIndex]["Trade Date"]).getTime();
      emsxTrades[emsxTradesIndex]["Trade App Status"] = "uploaded_to_app";
    }

    return [vconTrades, ibTrades, emsxTrades, [...vconTrades, ...ibTrades, ...emsxTrades]];
  }
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
  const headersFormat = ["Currency", "Symbol", "Notional Amount", "T Price", "C Price", "Notional Value", "Comm/Fee", "Basis", "Realized P/L", "MTM P/L", "Code", "Trade Date", "Trade Date Time", "Settle Date", "Triada Trade Id", "Location"];
  const arraysAreEqual = headersFormat.every((value, index) => (value === headers[0][index] ? true : false));
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload ib formatted excel xlsx/csv file",
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
    const headersFormat = ["Status", "Buy/Sell", "Security", "Notional Amount", "Net", "Price", "Trade Date", "Settle Date", "Triada Trade Id", "Location", "Trade App Status"];

    const arraysAreEqual = headersFormat.every((value, index) => (value === headers[0][index] ? true : false));
    if (!arraysAreEqual) {
      return {
        error: "Incompatible format, please upload emsx e-blot xlsx/csv file",
      };
    } else {
      let data = xlsx.utils.sheet_to_json(worksheet, {
        defval: "",
        range: "A1:K300",
      });

      return data;
    }
  } catch (error) {
    return { error: error };
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
      range: "A1:BZ300",
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
  let wrongHeaders = null;
  const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  const headersFormat = [
    "BB Ticker",
    "Bloomberg ID",
    "Broker",
    "Override Bid",
    "Override Ask",
    "Notes",
    "Today's Bid (Broker)",
    "Today's Ask (Broker)",
    "Today's Bid (BB)",
    "Today's Ask (BB)",
    "Today's Mid",
    "ISIN",
    "CUSIP",
    "DV01",
    "Mid Yield Maturity",
    "Mid Yield Worst",
    "Mid Yield call",
    "Spread to benchmark",
    "Country",
    "Sector",
    "Maturity",
    "Call Date",
    "S&P Bond Rating",
    "S&P Outlook",
    "Moody's Bond Rating",
    "Moody's Outlook",
    "Fitch Bond Rating",
    "Fitch Outlook",
    "BBG Composite Rating",
    "Issuer Name",
    "OAS Spread",
    "Z Spread",
  ];
  const arraysAreEqual = headersFormat.every((value, index) => (value === headers[0][index] ? true : (wrongHeaders = `app expected ${headers[0][index]} and got ${value}`))); //headersFormat.length === headers[2].length && headersFormat.every((value, index) => value === headers[2][index]);
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload pricing sheet xlsx/csv file",
    };
  } else if (wrongHeaders) {
    return {
      error: wrongHeaders,
    };
  } else {
    const data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A1:AF300",
    });
    let keys = Object.keys(data[0]);
    let reformedData: any = [];
    for (let index = 0; index < data.length; index++) {
      let prices = data[index];
      let object: any = {};
      for (let keyIndex = 0; keyIndex < keys.length; keyIndex++) {
        let key = keys[keyIndex].trim();
        object[key] = data[index][keys[keyIndex]];
      }
      reformedData.push(object);
    }
    return reformedData;
  }
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

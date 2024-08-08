import { NomuraCashReconcileFileUpload, NomuraReconcileCashOutput } from "../../models/reconcile";
import { CentralizedTrade } from "../../models/trades";
import { insertPositionsInfo } from "../analytics/data";
import { convertExcelDateToJSDate, generateRandomString, generateSignedUrl, getTradeDateYearTrades, storage } from "../common";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { insertEditLogs } from "./logs";
require("dotenv").config();

const xlsx = require("xlsx");
const axios = require("axios");

export async function readCentralizedEBlot(path: string): Promise<
  | {
      vconTrades: CentralizedTrade[];
      ibTrades: CentralizedTrade[];
      emsxTrades: CentralizedTrade[];
      gsTrades: CentralizedTrade[];
      allTrades: CentralizedTrade[];
    }
  | { error: string }
> {
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

      let missingLocation = data.filter((trade: any, index: any) => trade["Location"] == "" || (trade["ISIN"] == "" && trade["Trade Type"].includes("vcon")) || !trade["Location"] || trade["Location"].trim().split(" ").length > 1);
      if (missingLocation.length) {
        let issueMissing = "";
        for (let indexMissingIssue = 0; indexMissingIssue < missingLocation.length; indexMissingIssue++) {
          let issueName = missingLocation[indexMissingIssue]["BB Ticker"];
          issueMissing += issueName + " //";
        }
        return { error: `BB Ticker ${issueMissing} has missing or more than one location/ISIN` };
      }
      let vconTrades = filtered.filter((trade: any, index: any) => trade["Trade Type"].includes("vcon"));
      let ibTrades = filtered.filter((trade: any, index: any) => trade["Trade Type"] == "ib");
      let emsxTrades = filtered.filter((trade: any, index: any) => trade["Trade Type"] == "emsx");
      let gsTrades = filtered.filter((trade: any, index: any) => trade["Trade Type"] == "gs");

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
        ibTrades[ibTradesIndex]["Notional Amount"] = Math.round(parseFloat(ibTrades[ibTradesIndex]["Notional Amount"]));

        ibTrades[ibTradesIndex]["timestamp"] = new Date().getTime();
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
        emsxTrades[emsxTradesIndex]["timestamp"] = new Date().getTime();
        emsxTrades[emsxTradesIndex]["Trade App Status"] = "uploaded_to_app";
      }

      for (let gsTradesIndex = 0; gsTradesIndex < gsTrades.length; gsTradesIndex++) {
        gsTrades[gsTradesIndex]["ISIN"] = gsTrades[gsTradesIndex]["BB Ticker"];

        if (!gsTrades[gsTradesIndex]["Trade Date"].includes("/")) {
          gsTrades[gsTradesIndex]["Trade Date"] = getTradeDateYearTrades(convertExcelDateToJSDate(gsTrades[gsTradesIndex]["Trade Date"]));
        }
        if (!gsTrades[gsTradesIndex]["Settle Date"].includes("/")) {
          gsTrades[gsTradesIndex]["Settle Date"] = getTradeDateYearTrades(convertExcelDateToJSDate(gsTrades[gsTradesIndex]["Settle Date"]));
        }
        gsTrades[gsTradesIndex]["timestamp"] = new Date().getTime();
        gsTrades[gsTradesIndex]["Trade App Status"] = "uploaded_to_app";
      }

      let allTrades = [...vconTrades, ...ibTrades, ...emsxTrades, ...gsTrades];
      let newPositions = [];
      for (let index = 0; index < allTrades.length; index++) {
        let newTrade = allTrades[index];
        let object = {
          "BB Ticker": newTrade["BB Ticker"],
          Currency: newTrade["Currency"],
          ISIN: newTrade["ISIN"],
          CUSIP: newTrade["Cusip"],
        };
        newPositions.push(object);
      }
      try {
        await insertPositionsInfo(newPositions);
      } catch (error) {
        console.log(error);
      }
      return {
        vconTrades: vconTrades,
        ibTrades: ibTrades,
        emsxTrades: emsxTrades,
        gsTrades: gsTrades,
        allTrades: [...vconTrades, ...ibTrades, ...emsxTrades, ...gsTrades],
      };
    }
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "readCentralizedEBlot", "src/controllers/operations/readExcel.ts");
    return { error: errorMessage };
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
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "readIBRawExcel", "controllers/operations/readExcel.ts");

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
export async function readEmsxRawExcel(path: string) {
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
    const headersFormat = ["News", "Create Time (As of)", "Status", "Security", "Side", "Qty", "LmtPr", "TIF", "FillQty", "AvgPr", "% Filled", "Working Qty", "Idle", "Data Export Restricted", "Data Export Restricted", "VWAP", "Data Export Restricted", "Last", "Bid", "Ask", "Volume", "%20d ADV"];
    const arraysAreEqual = headersFormat.every((value, index) => (value === headers[0][index + 2] ? true : console.log(value, headers[0][index + 2]), "excel values do not match"));
    if (!arraysAreEqual) {
      return {
        error: "Incompatible format, please upload emsx e-blot xlsx/csv file",
      };
    } else {
      let data = xlsx.utils.sheet_to_json(worksheet, {
        defval: "",
        range: "D1:X300",
      });

      return data;
    }
  } catch (error) {
    return { error: error };
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
    "Broker 2",

    "Broker 3",

    "Override Bid",
    "Override Ask",
    "Override Mid",

    "Today's Bid",
    "Today's Ask",
    "Today's Mid",
    "ISIN",
    "CUSIP",
    "DV01",
    "Mid Yield Maturity",
    "Mid Yield Worst",
    "Mid Yield call",
    "Spread to benchmark",
    "Issuer's Country",

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
    "Instrument's Country Code",
    "Instrument's Country Full Name",
    "OAS Spread +1",
    "Mid Price +1 Spread",
    "CR01",
  ];
  const arraysAreEqual = headersFormat.every((value, index) => (value === headers[0][index] ? true : (wrongHeaders = `app expected ${value} and got ${headers[0][index]}`))); //headersFormat.length === headers[2].length && headersFormat.every((value, index) => value === headers[2][index]);
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
      range: "A1:AV500",
    });
    let keys = Object.keys(data[0]);
    let reformedData: any = [];
    for (let index = 0; index < data.length; index++) {
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
export async function readNomuraCashReport(path: string): Promise<{ error: string; records: [] } | { error: null; records: NomuraCashReconcileFileUpload[] }> {
  try {
    const response = await axios.get(path, { responseType: "arraybuffer" });

    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: "buffer" });

    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];

    /* Read headers from the second row */
    const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 })[1];
    const headersFormat = [
      "Account ID",
      "Account Name",
      "Balance Type",
      "Client Trade Ref",
      "Client ShapeTrade Ref",
      "Trade Status",
      "Trade Date",
      "Settlement Date",
      "Entry Date",
      "Post Date",
      "Transaction Type",
      "Cusip",
      "Quick Code",
      "Sedol",
      "Isin",
      "Symbol",
      "Security Name",
      "Security Issue CCY",
      "Broker Code",
      "Quantity",
      "Price",
      "Commission Type",
      "Commission",
      "Broker Fee",
      "Tax",
      "Interest",
      "Proceeds",
      "Proceeds CCY",
      "Option Contract Type",
      "Activity Description",
      "Client Broker Trade ID",
      "RR",
      "SMS",
      "Tax Type",
      "Execution Type",
      "Nomura Trade Ref",
      "Trade Ref",
      "Journal Code",
      "Business Date",
      "Run Date",
      "Run Time",
      "OTC Derivative Type",
      "Ticker",
      "Ric Code",
      "Regulatory Fee",
      "Regulatory Fee Name",
      "Preferred ID",
      "Broker Long Name",
      "Principle Amount",
      "Ticket Charge",
      "Account Type",
      "CCY Base",
      "Fx Rate",
      "Activity Type",
      "Base Proceeds",
      "Version",
      "All In Price",
      "Base Commission",
      "Base Broker Fee",
      "Base Tax Levy",
      "Base Interest",
      "Base Reg Fee",
      "Base SMS",
      "Base Principle Amount",
      "Base Ticket Chg",
      "Market",
      "SEC Fee",
      "ORF Fee",
      "Expiration Date",
      "Result Of Option",
    ];

    let wrongHeaders = null;
    const arraysAreEqual = headersFormat.every((value, index) => (value === headers[index] ? true : (wrongHeaders = `app expected ${value} and got ${headers[index]}`)));

    if (!arraysAreEqual) {
      return {
        error: "Incompatible format, please upload nomura cash report xlsx/csv file",
        records: [],
      };
    } else if (wrongHeaders) {
      return {
        error: wrongHeaders,
        records: [],
      };
    } else {
      /* Convert worksheet to JSON using the second row as headers */
      const data = xlsx.utils.sheet_to_json(worksheet, {
        defval: "",
        range: 1, // Start reading from the second row
        header: headers, // Use the second row as headers
      });

      return { records: data as NomuraCashReconcileFileUpload[], error: null };
    }
  } catch (error: any) {
    console.log({ error });
    return {
      error: error.message,
      records: [],
    };
  }
}
export async function readUsersSheet(path: string) {
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
  const headersFormat = ["Name", "Email", "Share Class"];
  const arraysAreEqual = headersFormat.every((value, index) => (value === headers[0][index] ? true : (wrongHeaders = `app expected ${value} and got ${headers[0][index]}`))); //headersFormat.length === headers[2].length && headersFormat.every((value, index) => value === headers[2][index]);
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload users sheet xlsx/csv file",
    };
  } else if (wrongHeaders) {
    return {
      error: wrongHeaders,
    };
  } else {
    const data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A1:C100",
    });
    let keys = Object.keys(data[0]);
    let reformedData: any = [];
    for (let index = 0; index < data.length; index++) {
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
export async function uploadArrayAndReturnFilePath(data: any, pathName: string, folderName: string, type = "xlsx") {
  // Create a new Workbook
  var wb = xlsx.utils.book_new();

  let binaryWS = xlsx.utils.json_to_sheet(data);
  // Name your sheet
  xlsx.utils.book_append_sheet(wb, binaryWS, "Binary values");
  // export your excel
  const buffer = xlsx.write(wb, { type: "buffer", bookType: type });
  let randomString = generateRandomString(6);
  let fileName = `${folderName}/${pathName.replace(/[!@#$%^&*(),.?":{}|<>\/\[\]\\;'\-=+`~]/g, "_")}_${randomString}.${type}`;

  uploadToGCloudBucket(buffer, process.env.BUCKET, fileName).then().catch(console.error);

  return "/" + fileName;
}
export async function uploadArrayAndReturnFilePathTwoDifferentWorkbooks({ fxInterest, redeemped, couponPayments, tradesCheck, pathName, folderName, type = "xlsx" }: { fxInterest: NomuraReconcileCashOutput[]; redeemped: NomuraReconcileCashOutput[]; couponPayments: NomuraReconcileCashOutput[]; tradesCheck: NomuraReconcileCashOutput[]; pathName: string; folderName: string; type: "xlsx" }) {
  // Create a new Workbook
  try {
    var wb = xlsx.utils.book_new();
    console.log(typeof fxInterest, typeof redeemped, typeof couponPayments, typeof tradesCheck);
    // Create sheets from data1 and data2
    let sheet1 = xlsx.utils.json_to_sheet([...fxInterest]);
    let sheet2 = xlsx.utils.json_to_sheet([...redeemped]);
    let sheet3 = xlsx.utils.json_to_sheet([...couponPayments]);
    let sheet5 = xlsx.utils.json_to_sheet([...tradesCheck]);

    // Name your sheets and append them to the workbook
    xlsx.utils.book_append_sheet(wb, sheet3, "Coupon Payments");
    xlsx.utils.book_append_sheet(wb, sheet5, "Trades Nomura Comparison Vcon");
    xlsx.utils.book_append_sheet(wb, sheet2, "Redeemption");
    xlsx.utils.book_append_sheet(wb, sheet1, "FX Interest");

    // Export your excel
    const buffer = xlsx.write(wb, { type: "buffer", bookType: type });
    let randomString = generateRandomString(6);
    let fileName = `${folderName}/${pathName.replace(/[!@#$%^&*(),.?":{}|<>\/\[\]\\;'\-=+`~]/g, "_")}_${randomString}.${type}`;

    try {
      await uploadToGCloudBucket(buffer, process.env.BUCKET, fileName);
    } catch (error) {
      console.error(error);
      throw new Error("Failed to upload the file to GCloud bucket");
    }

    return "/" + fileName;
  } catch (error: any) {
    console.log({ errorExcel: error });
  }
}
export async function uploadToGCloudBucketPDF(data: any, fileName: any) {
  const bucket = storage.bucket(process.env.BUCKET_PUBLIC);
  const file = bucket.file(fileName);

  const stream = file.createWriteStream({
    metadata: {
      contentType: "application/pdf",
    },
    resumable: false,
  });

  stream.write(data);
  stream.end();

  return "/" + fileName;
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

  let data = xlsx.utils.sheet_to_json(worksheet, {
    defval: "",
    range: "A1:BZ300",
  });

  return data;
}

export async function readMUFGPrices(path: string) {
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

export async function readMUFGReconcileFile(path: string) {
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
      error: "Incompatible format, please upload MUFG xlsx/csv file",
    };
  } else {
    const data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A1:P300",
    });

    return data;
  }
}

export async function readNomuraReconcileFile(path: string) {
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
    // "Quantity Subject to Right of Use/Stock Loan",
    // "FX Rate",
    // "Last Activity Date",
    // "Business Date",
    // "Run Date",
    // "Run Time",
    // "OTC DerivativeType",
    // "Ticker",
    // "Ric Code",
    // "Preferred ID",
    // "Pricing Factor",
    // "Price Type",
    // "Product Type",
    // "Expiration Date",
    // "Option Contract Type",
    // "Td Accrued Interest",
    // "Sd Accrued Interest",
    // "Clean Price",
    // "Asset Class",
    // "Stock Loan Financed Positions Base Ccy",
    // "Stock Loan Financed Positions (USD)",
  ];

  const arraysAreEqual = headersFormat.every((value, index) => (value === headers[1][index] ? true : console.log("app expects: " + value + " and got: " + headers[1][index])));
  if (!arraysAreEqual) {
    return {
      error: "Incompatible format, please upload Reconcile xlsx/csv file",
    };
  } else {
    const data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A2:AP300",
    });

    return data;
  }
}

export async function readFxTrades(path: string) {
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

export async function readFactSheet(path: string) {
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
      range: "A1:E110",
    });

    return data;
  }
}

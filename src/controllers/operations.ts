const axios = require("axios");
const { MongoClient, ServerApiVersion } = require("mongodb");
const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;


import { formatDateReadable, uri } from "./common";
import { getEarliestCollectionName, getSecurityInPortfolio } from "./reports";
import { formatUpdatedPositions, getDateTimeInMongoDBCollectionFormat } from "./portfolioFunctions";
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
const xlsx = require("xlsx");

export async function getCollectionDays() {
  try {
    const database = client.db("portfolios");
    let collections = await database.listCollections().toArray();
    let dates: any = [];
    for (let index = 0; index < collections.length; index++) {
      let collectionTime = collections[index].name.split("portfolio")[1];
      let date = formatDateReadable(collectionTime);
      if (!dates.includes(date)) {
        dates.push(date);
      }
    }
    dates.sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime());

    return dates;
  } catch (error: any) {
    return error.toString();
  }
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

export async function updatePreviousPricesPortfolioMUFG(data: any, collectionDate: string, path: string) {
  try {
    path = "https://storage.cloud.google.com/capital-trade-396911.appspot.com" + path.split(".com/")[2]
    if (data.error) {
      return data;
    } else {
      let updatedPricePortfolio = [];
      let action: any = await getPortfolioOnSpecificDate(collectionDate);
      let portfolio = action[0];
      collectionDate = action[1];
      console.log(collectionDate, "collection day used");

      for (let index = 0; index < data.length; index++) {
        let row = data[index];

        let object: any = getSecurityInPortfolioWithoutLocation(portfolio, row["ISIN"]);
        if (object == 404) {
          continue;
        }

        let faceValue = object["ISIN"].includes("CDX") || object["ISIN"].includes("ITRX") ? 100 / (-object["Quantity"] / object["Original Face"]) : object["ISIN"].includes("1393") || object["ISIN"].includes("IB") ? 100 : 1;
        object["Mid"] = (parseFloat(row["Mid"]) / 100.0) * faceValue;

        updatedPricePortfolio.push(object);
      }

      try {
        let updatedPortfolio: any = formatUpdatedPositions(updatedPricePortfolio, portfolio);
        let insertion = await insertPreviousPricesUpdatesInPortfolio(updatedPortfolio, collectionDate);
        console.log(updatedPricePortfolio.length, "number of positions prices updated");
        console.log(updatedPortfolio[0], "positions that did not update" )
        let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
        await insertEditLogs(["prices update"], "Update Prices", dateTime , "MUFG Previous Pricing Sheet on" + collectionDate, "Link: " + path)
        return insertion;
      } catch (error) {
        console.log(error);
        return { error: "Template does not match" };
      }
    }
  } catch (error) {
    return { error: "error" };
  }
}

export async function insertPreviousPricesUpdatesInPortfolio(updatedPortfolio: any, collectionDate: string) {
  const database = client.db("portfolios");
  let portfolio = updatedPortfolio;
  // Create an array of updateOne operations

  // Execute the operations in bulk
  let day = getDateTimeInMongoDBCollectionFormat(collectionDate);
  console.log(day, "updated collection");
  try {
    //so the latest updated version portfolio profits will not be copied into a new instance
    const updatedOperations = portfolio.map((position: any) => {
      // Start with the known filters
      const filters: any = [];
      // Only add the "Issue" filter if it's present in the trade object
      if (position["ISIN"]) {
        filters.push({
          ISIN: position["ISIN"],
          Location: position["Location"],
          _id: new ObjectId(position["_id"]),
        });
      } else if (position["Issue"]) {
        filters.push({
          Issue: position["Issue"],
          Location: position["Location"],
          _id: new ObjectId(position["_id"]),
        });
      } else if (position["BB Ticker"]) {
        filters.push({
          "BB Ticker": position["BB Ticker"],
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
  } catch (error) {
    return error;
  }
}

export async function getPortfolioOnSpecificDate(collectionDate: string) {
  try {
    const database = client.db("portfolios");
    let date = getDateTimeInMongoDBCollectionFormat(new Date(collectionDate)).split(" ")[0] + " 23:59";
    let earliestCollectionName = await getEarliestCollectionName(date);
    const reportCollection = database.collection(`portfolio-${earliestCollectionName[0]}`);
    let documents = await reportCollection.find().toArray();

    return [documents, earliestCollectionName[0]];
  } catch (error) {
    return error;
  }
}

export function getSecurityInPortfolioWithoutLocation(portfolio: any, identifier: string) {
  let document = 404;
  if (identifier == "" || !identifier) {
    return document;
  }
  for (let index = 0; index < portfolio.length; index++) {
    let issue = portfolio[index];
    if (identifier.includes(issue["ISIN"]) || identifier.includes(issue["Issue"])) {
      if (issue["ISIN"] != "") {
        document = issue;
      }
    } else if (identifier.includes(issue["BB Ticker"])) {
      if (issue["BB Ticker"] != "") {
        document = issue;
      }
    } else if (identifier == new ObjectId(issue["_id"])) {
      document = issue;
    }
  }
  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return document;
}

export async function updatePreviousPricesPortfolioBloomberg(data: any, collectionDate: string, path: string) {
  try {
    path = "https://storage.cloud.google.com/capital-trade-396911.appspot.com" + path.split(".appspot.com")[1];
   
    if (data.error) {
      return data;
    } else {
      let updatedPricePortfolio = [];
      let action: any = await getPortfolioOnSpecificDate(collectionDate);
      let portfolio = action[0];
      collectionDate = action[1];
      let currencyInUSD: any = {};
      currencyInUSD["USD"] = 1;
      for (let index = 0; index < data.length; index++) {
        let row = data[index];
        if (!row["Long Security Name"].includes("Spot") && !row["Long Security Name"].includes("ignore")) {
          let object: any = getSecurityInPortfolio(portfolio, row["ISIN"], row["Trade Idea Code"]);
          
          if (object == 404) {
            object = getSecurityInPortfolio(portfolio, row["BB Ticker"], row["Trade Idea Code"]);
          }
          if (object == 404) {
            object = getSecurityInPortfolio(portfolio, row["Long Security Name"], row["Trade Idea Code"]);
          }
          if (object == 404) {
            continue;
          }

          let faceValue = object["ISIN"].includes("CDX") || object["ISIN"].includes("ITRX") || object["ISIN"].includes("1393") || object["ISIN"].includes("IB") ? 100 : 1;
          object["Mid"] = (parseFloat(row["Today's Mid"]) / 100.0) * faceValue;
          object["Ask"] = parseFloat(row["Override Ask"]) > 0 ? (parseFloat(row["Override Ask"]) / 100.0) * faceValue : (parseFloat(row["Today's Ask"]) / 100.0) * faceValue;
          object["Bid"] = parseFloat(row["Override Bid"]) > 0 ? (parseFloat(row["Override Bid"]) / 100.0) * faceValue : (parseFloat(row["Today's Bid"]) / 100.0) * faceValue;
          object["YTM"] = row["Mid Yield Maturity"];
          object["DV01"] = row["DV01"];
         
          
          if (currencyInUSD[object["Currency"]]) {
            object["holdPortfXrate"] = currencyInUSD[object["Currency"]];
          }
          object["Last Price Update"] = new Date();

          if (!object["Country"] && row["Country"] && !row["Country"].includes("#N/A")) {
            object["Country"] = row["Country"];
          }
          if (!object["Sector"] && row["Country2"]) {
            object["Sector"] = row["Country2"];
          }
         
          updatedPricePortfolio.push(object);
        } else if (row["Long Security Name"].includes("Spot") && !row["Long Security Name"].includes("ignore")) {
          let firstCurrency = row["Long Security Name"].split(" ")[0];
          let secondCurrency = row["Long Security Name"].split(" ")[1];
          let rate = row["Today's Mid"];
          if (firstCurrency !== "USD") {
            currencyInUSD[firstCurrency] = rate;
          } else {
            rate = 1 / rate;
            currencyInUSD[secondCurrency] = rate;
          }
        }
      }
      console.log(currencyInUSD, "currency prices");
      try {
        console.log(updatedPricePortfolio.length, "number of positions prices updated");
        let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
        await insertEditLogs(["prices update"], "Update Prices", dateTime , "Bloomberg Previous Pricing Sheet on " + collectionDate, "Link: " + path)
        let updatedPortfolio: any = formatUpdatedPositions(updatedPricePortfolio, portfolio);
        let insertion = await insertPreviousPricesUpdatesInPortfolio(updatedPortfolio[0], collectionDate);

        return "insertion";
      } catch (error) {
        console.log(error);
        return { error: "Template does not match" };
      }
    }
  } catch (error) {
    return { error: "error" };
  }
}

export async function insertEditLogs(changes: string[], type: string, dateTime: string, editNote: string, identifier: string) {
  let object = {
    changes: changes,
    type: type,
    dateTime: dateTime,
    editNote: editNote,
    identifier: identifier,
  };

  const database = client.db("edit_logs");
  const reportCollection = database.collection(`${type}`);
  try {
    const result = await reportCollection.insertOne(object);
    console.log(`Successfully inserted item with _id: ${result.insertedId}`);
  } catch (err) {
    console.error(`Failed to insert item: ${err}`);
  }
}

export async function getEditLogs(logsType: any) {
  try {
    const database = client.db("edit_logs");
    const reportCollection = database.collection(`${logsType}`);
    let documents = await reportCollection.find().sort({ dateTime: -1 }).toArray();
    return documents;
  } catch (error) {
    return error;
  }
}


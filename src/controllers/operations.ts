const axios = require("axios");
const { MongoClient, ServerApiVersion } = require("mongodb");
const mongoose = require("mongoose");
const ObjectId = require("mongodb").ObjectId;

import { formatDateReadable, uri } from "./common";
import { getEarliestCollectionName, getSecurityInPortfolio, getPortfolio, insertTradesInPortfolio } from "./reports";
import { formatUpdatedPositions, getDateTimeInMongoDBCollectionFormat, readEditInput } from "./portfolioFunctions";
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

        let object: any = getSecurityInPortfolioWithoutLocation(portfolio, row["Investment"].trim());

        if (object == 404) {
          continue;
        }

        for (let index = 0; index < object.length; index++) {
          let position = object[index];
          let faceValue = position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? 100 : 1;
          position["Mid"] = (parseFloat(row["Price"]) / 100.0) * faceValue;

          updatedPricePortfolio.push(position);
        }
      }

      try {
        let updatedPortfolio: any = formatUpdatedPositions(updatedPricePortfolio, portfolio);
        let insertion = await insertPreviousPricesUpdatesInPortfolio(updatedPortfolio[0], collectionDate);
        console.log(updatedPricePortfolio.length, "number of positions prices updated");
        console.log(updatedPortfolio[1], "positions that did not update");
        // console.log(updatedPortfolio[2], "positions that did update");
        console.log(insertion);
        let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
        await insertEditLogs(["prices update"], "Update Previous Prices based on MUFG", dateTime, "MUFG Previous Pricing Sheet on" + collectionDate, "Link: " + path);

        if (!updatedPortfolio[1].length) {
          return updatedPortfolio[1];
        } else {
          return { error: `positions that did not update ${updatedPortfolio[1]}` };
        }
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

export async function getPortfolioOnSpecificDate(collectionDate: string): Promise<[any, string] | string> {
  try {
    const database = client.db("portfolios");
    let date = getDateTimeInMongoDBCollectionFormat(new Date(collectionDate)).split(" ")[0] + " 23:59";
    let earliestCollectionName = await getEarliestCollectionName(date);
    const reportCollection = database.collection(`portfolio-${earliestCollectionName[0]}`);
    let documents = await reportCollection.find().toArray();

    return [documents, earliestCollectionName[0]];
  } catch (error: any) {
    return error.toString();
  }
}

export function getSecurityInPortfolioWithoutLocation(portfolio: any, identifier: string) {
  let document: any = [];
  if (identifier == "" || !identifier) {
    return document;
  }
  for (let index = 0; index < portfolio.length; index++) {
    let issue = portfolio[index];
    if (identifier.includes(issue["ISIN"]) || identifier.includes(issue["Issue"])) {
      if (issue["ISIN"] != "") {
        document.push(issue);
      }
    } else if (identifier.includes(issue["BB Ticker"])) {
      if (issue["BB Ticker"] != "") {
        document.push(issue);
      }
    }
  }
  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return document.length ? document : 404;
}

export async function updatePreviousPricesPortfolioBloomberg(data: any, collectionDate: string, path: string) {
  try {
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
            object["FX Rate"] = currencyInUSD[object["Currency"]];
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
        await insertEditLogs(["prices update"], "Update Previous Prices based on bloomberg", dateTime, "Bloomberg Previous Pricing Sheet on " + collectionDate, "Link: " + path);
        let updatedPortfolio: any = formatUpdatedPositions(updatedPricePortfolio, portfolio);
        let insertion = await insertPreviousPricesUpdatesInPortfolio(updatedPortfolio[0], collectionDate);
        if (!updatedPortfolio[1].length) {
          return updatedPortfolio[1];
        } else {
          return { error: `positions that did not update ${updatedPortfolio[1]}` };
        }
      } catch (error) {
        console.log(error);
        return { error: "Template does not match" };
      }
    }
  } catch (error) {
    console.log(error);
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
    timestamp: new Date().getTime(),
  };

  const database = client.db("edit_logs");
  const reportCollection = database.collection(`${type}`);
  try {
    const result = await reportCollection.insertOne(object);
    console.log(`Successfully inserted item with _id: ${result.insertedId}`);
    return result;
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

export async function readMUFGEndOfMonthFile(path: string) {
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
  } else {
    const data = xlsx.utils.sheet_to_json(worksheet, {
      defval: "",
      range: "A1:P300",
    });

    return data;
  }
}

export async function checkMUFGEndOfMonthWithPortfolio(MUFGData: any, portfolio: any) {
  try {
    //    "Location", "Issue", "Identifier", "Quantity (app)", "Quantity (mufg)", "difference quantity", "Average Cost (app)", "Average Cost(app)", "difference average cost", "price (app)", "price (mufg)", "difference price"
    let formattedData: any = [];
    if (MUFGData.error) {
      return MUFGData;
    }
    for (let index = 0; index < portfolio.length; index++) {
      let positionInPortfolio = portfolio[index];
      let positionInMufg = MUFGData.filter((row: any, index: any) => row["Investment"].includes(positionInPortfolio["ISIN"]));
      positionInMufg = positionInMufg ? positionInMufg[0] : null;

      let portfolioPositionQuantity = positionInPortfolio["ISIN"].includes("IB") ? positionInPortfolio["Quantity"] / positionInPortfolio["Original Face"] : positionInPortfolio["Quantity"];
      let mufgPositionQuantity = positionInMufg ? parseFloat(positionInMufg["Quantity"]) : 0;
      let portfolioAverageCost = parseFloat(positionInPortfolio["Average Cost"]);
      let mufgAverageCost = positionInMufg ? parseFloat(positionInMufg["LocalCost"]) / mufgPositionQuantity : 0;
      let portfolioPrice = positionInPortfolio["ISIN"].includes("CXP") || positionInPortfolio["ISIN"].includes("CDX") || positionInPortfolio["ISIN"].includes("ITRX") || positionInPortfolio["ISIN"].includes("1393") || positionInPortfolio["ISIN"].includes("IB") ? Math.round(positionInPortfolio["Mid"] * 1000000) / 1000000 : Math.round(positionInPortfolio["Mid"] * 1000000) / 10000;
      portfolioPrice = portfolioPrice ? portfolioPrice : 0;
      let mufgPrice = positionInMufg ? parseFloat(positionInMufg["Price"]) : 0;

      let formattedRow = {
        Location: positionInPortfolio["Location"],
        Issue: positionInPortfolio["Issue"],
        ISIN: positionInPortfolio["ISIN"],

        "Quantity (app)": portfolioPositionQuantity,
        "Quantity (mufg)": mufgPositionQuantity,
        "Difference Quantity": portfolioPositionQuantity - mufgPositionQuantity,

        "Average Cost (app)": portfolioAverageCost,
        "Average Cost (mufg)": mufgAverageCost,
        "Difference Average Cost": portfolioAverageCost - mufgAverageCost,

        "Price (app)": portfolioPrice,
        "Price (mufg)": mufgPrice,
        "Difference Price": portfolioPrice - mufgPrice,
      };
      formattedData.push(formattedRow);
    }
    return formattedData;
  } catch (error) {
    console.log(error);
    return { error: "unexpected error" };
  }
}

export async function editPositionPortfolio(path: string) {
  let data: any = await readEditInput(path);
  if (data.error) {
    return { error: data.error };
  } else {
    try {
      let positions: any = [];
      let portfolio = await getPortfolio();
      let titles = ["Type", "Group", "Country", "Asset Class", "Sector", "FX Rate"];
      for (let index = 0; index < data.length; index++) {
        let row = data[index];
        let identifier = row["_id"];
        let securityInPortfolio: any = getSecurityInPortfolioById(portfolio, identifier);
        for (let titleIndex = 0; titleIndex < titles.length; titleIndex++) {
          let title = titles[titleIndex];
          securityInPortfolio[title] = row[title];
        }

        positions.push(securityInPortfolio);
      }
      try {
        let updatedPortfolio: any = formatUpdatedPositions(positions, portfolio);
        let insertion = await insertTradesInPortfolio(updatedPortfolio[0]);

        return insertion;
      } catch (error) {
        return { error: error };
      }
    } catch (error) {
      return { error: error };
    }
  }
}

export function getSecurityInPortfolioById(portfolio: any, id: string) {
  let document = 404;
  if (id == "" || !id) {
    return document;
  }
  for (let index = 0; index < portfolio.length; index++) {
    let issue = portfolio[index];
    if (id == issue["_id"].toString()) {
      document = issue;
    }
  }
  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return document;
}

export async function getFundDetails(date: string) {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    let documents = await reportCollection.find({ month: date }).toArray();
    return documents;
  } catch (error) {
    return error;
  }
}

export async function getAllFundDetails(date: string) {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    let documents = await reportCollection.find().toArray();
    return documents;
  } catch (error) {
    return { error: error };
  }
}

export async function editFund(data: any): Promise<any> {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    const id = new ObjectId(data["_id"])
    const updates = {} as any;
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
    console.log(id)
    // Update the document with the built updates object
    const updateResult = await reportCollection.updateOne({ _id: id }, { $set: updates });

    if (updateResult.matchedCount === 0) {
      return { error: "Document does not exist" };
    } else if (updateResult.modifiedCount === 0) {
      return { error: "Document not updated. It may already have the same values" };
    }

    return updateResult;
  } catch (error: any) {
    return { error: error.message }; // Return the error message
  }
}

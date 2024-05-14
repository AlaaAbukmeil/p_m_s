const ObjectId = require("mongodb").ObjectId;

import { formatDateUS, getDate, uri } from "../common";
import { findTradeRecord, formatUpdatedPositions, getAverageCost, getEarliestCollectionName, parseBondIdentifier } from "../reports/tools";
import { getDateTimeInMongoDBCollectionFormat, monthlyRlzdDate } from "../reports/common";
import { readEditInput } from "./readExcel";
import { getPortfolio, insertTradesInPortfolio, insertTradesInPortfolioAtASpecificDate, returnPositionProgress, updateExisitingPosition } from "./positions";
import { client } from "../auth";
import { FundDetails } from "../../models/portfolio";
import { Position } from "../../models/position";
import { CentralizedTrade } from "../../models/trades";
import { modifyTradesDueToRecalculate } from "./trades";

export async function getCollectionDays(): Promise<string[]> {
  try {
    const database = client.db("portfolios");
    let collections = await database.listCollections().toArray();
    let dates: any = [];
    for (let index = 0; index < collections.length; index++) {
      let collectionTime = collections[index].name.split("portfolio")[1];
      let date = formatDateUS(collectionTime);
      if (!dates.includes(date)) {
        dates.push(date);
      }
    }
    dates.sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime());

    return dates;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getCollectionDays", "controllers/operations/operations.ts");

    return [];
  }
}

export async function getPortfolioOnSpecificDate(collectionDate: string): Promise<{ portfolio: Position[] | null; date: string | null }> {
  try {
    const database = client.db("portfolios");
    let date = getDateTimeInMongoDBCollectionFormat(new Date(collectionDate)).split(" ")[0] + " 23:59";
    let earliestCollectionName = await getEarliestCollectionName(date);
    const reportCollection = database.collection(`portfolio-${earliestCollectionName.predecessorDate}`);
    let documents = await reportCollection.find().toArray();
    for (let index = 0; index < documents.length; index++) {
      documents[index]["BB Ticker"] = documents[index]["BB Ticker"] ? documents[index]["BB Ticker"] : documents[index]["Issue"];
      documents[index]["Notional Amount"] = documents[index]["Notional Amount"] || parseFloat(documents[index]["Notional Amount"]) == 0 ? documents[index]["Notional Amount"] : documents[index]["Quantity"];
    }

    return { portfolio: documents, date: earliestCollectionName.predecessorDate };
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getPortfolioOnSpecificDate", "controllers/operations/operations.ts");
    return { portfolio: null, date: null };
  }
}

export function getSecurityInPortfolioWithoutLocation(portfolio: any, identifier: string): Position | 404 {
  let document: any = [];
  if (identifier == "" || !identifier) {
    return document;
  }
  for (let index = 0; index < portfolio.length; index++) {
    let issue = portfolio[index];
    if (identifier.includes(issue["ISIN"])) {
      if (issue["ISIN"] != "") {
        document.push(issue);
      }
    } else if (identifier.includes(issue["BB Ticker"])) {
      if (issue["BB Ticker"] != "") {
        document.push(issue);
      }
    } else if (identifier.includes(issue["Bloomberg ID"])) {
      if (issue["Bloomber ID"] != "") {
        document.push(issue);
      }
    }
  }
  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return document.length ? document : 404;
}

export async function insertEditLogs(changes: any[], type: string, dateTime: string, editNote: string, identifier: string) {
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
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getEditLogs", "controllers/operations/operations.ts");

    return [];
  }
}

export async function editPositionBulkPortfolio(path: string) {
  let data: any = await readEditInput(path);

  if (data.error) {
    return { error: data.error };
  } else {
    try {
      let positions: any = [];
      let portfolio = await getPortfolio();
      let titles = ["Type", "Strategy", "Country", "Asset Class", "Sector"];
      for (let index = 0; index < data.length; index++) {
        let row = data[index];
        let identifier = row["_id"];
        let securityInPortfolio: any = getSecurityInPortfolioById(portfolio, identifier);

        if (securityInPortfolio != 404) {
          for (let titleIndex = 0; titleIndex < titles.length; titleIndex++) {
            let title = titles[titleIndex];
            securityInPortfolio[title] = row[title];
          }
          positions.push(securityInPortfolio);
        }
      }
      try {
        let updatedPortfolio = formatUpdatedPositions(positions, portfolio, "Last edit operation");
        let insertion = await insertTradesInPortfolio(updatedPortfolio.updatedPortfolio);
        let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
        await insertEditLogs(["bulk edit"], "Bulk Edit", dateTime, "Bulk Edit E-blot", "Link: " + path);

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
    if (id.toString() == issue["_id"].toString()) {
      document = issue;
    }
  }
  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return document;
}

export async function getFundDetails(date: string): Promise<FundDetails | {}> {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    let test = await getEarliestCollectionNameFund(date);
    // console.log(test, date);
    let documents = await reportCollection.find({ month: test }).toArray();
    return documents;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getFundDetails", "controllers/operations/operations.ts");

    return {};
  }
}

function compareMonths(a: any, b: any) {
  // Reformat the month string to 'MM/01/YYYY' for comparison
  let reformattedMonthA = a.month.substring(5) + "/01/" + a.month.substring(0, 4);
  let reformattedMonthB = b.month.substring(5) + "/01/" + b.month.substring(0, 4);
  // Convert the reformatted strings to date objects
  let dateA = new Date(reformattedMonthA).getTime();
  let dateB = new Date(reformattedMonthB).getTime();

  // Compare the date objects
  return dateB - dateA;
}

// Sort the array without modifying the original objects

export async function getEarliestCollectionNameFund(originalDate: string) {
  const database = client.db("fund");
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

  let predecessorDates: any = dates.filter((date) => date < inputDate);

  let predecessorDate: any = new Date(Math.max.apply(null, predecessorDates));
  //hong kong time difference with utc
  if (predecessorDate) {
    predecessorDate = getMonthInFundDetailsFormat(new Date(predecessorDate));
  }
  return predecessorDate;
}

function getMonthInFundDetailsFormat(date: any) {
  let fundDetailsMonth = "";
  date = new Date(date);
  let month = date.getMonth() + 1;
  if (month < 10) {
    month = "0" + month;
  }
  let year = date.getFullYear();
  return `${year}/${month}`;
}

export async function getAllFundDetails(date: string): Promise<FundDetails[]> {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    let documents = await reportCollection.find().toArray();
    return documents.sort(compareMonths);
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getAllFundDetails", "controllers/operations/operations.ts");

    return [];
  }
}

export async function editFund(data: any): Promise<any> {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    const id = new ObjectId(data["_id"]);
    const updates = {} as any;
    const tableTitles = ["month", "nav", "holdBackRatio", "a2 price", "borrowing amount", "expenses"];

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
    } else if (updateResult.modifiedCount === 0) {
      return { error: "Document not updated. It may already have the same values" };
    }

    return updateResult;
  } catch (error: any) {
    return { error: error.message }; // Return the error message
  }
}
export async function deleteFund(data: any): Promise<any> {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    const id = new ObjectId(data["_id"]);

    // Update the document with the built updates object
    const updateResult = await reportCollection.deleteOne({ _id: id });

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

export async function addFund(data: any): Promise<any> {
  try {
    const database = client.db("fund");
    const reportCollection = database.collection("details");
    const newFundData = {} as any;
    const tableTitles = ["month", "nav", "holdBackRatio", "a2 price", "borrowing amount", "expenses"];

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
  } catch (error: any) {
    return { error: error.message }; // Return the error message
  }
}

export async function reformatCentralizedData(data: any) {
  let filtered = data.filter((trade: any, index: any) => trade["Trade App Status"] != "new");
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

export async function deletePosition(data: any, dateInput: any): Promise<any> {
  try {
    const database = client.db("portfolios");
    let date = getDateTimeInMongoDBCollectionFormat(new Date(dateInput)).split(" ")[0] + " 23:59";
    let earliestPortfolioName = await getEarliestCollectionName(date);

    const reportCollection = database.collection(`portfolio-${earliestPortfolioName.predecessorDate}`);

    const id = new ObjectId(data["_id"]);

    // Update the document with the built updates object
    const updateResult = await reportCollection.deleteOne({ _id: id });
    console.log(updateResult, id);
    if (updateResult.deletedCount === 0) {
      return { error: "Document does not exist" };
    } else if (updateResult.deletedCount === 0) {
      return { error: "Document not updated. It may already have the same values" };
    }
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    await insertEditLogs([], "Delete Position", dateTime, "Delete Position", data["BB Ticker"] + " " + data["Location"]);

    return updateResult;
  } catch (error: any) {
    return { error: error.message }; // Return the error message
  }
}

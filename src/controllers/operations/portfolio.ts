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
    const tableTitles = ["month", "nav", "holdBackRatio"];

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

export async function readCalculatePosition(data: CentralizedTrade[], date: string, isin: any, location: any, tradeType: string) {
  try {
    let positions: any = [];
    const database = client.db("portfolios");
    let earliestPortfolioName = await getEarliestCollectionName(date);

    console.log(earliestPortfolioName.predecessorDate, "get edit portfolio");
    const reportCollection = database.collection(`portfolio-${earliestPortfolioName.predecessorDate}`);

    let portfolio = await reportCollection
      .aggregate([
        {
          $sort: {
            "BB Ticker": 1, // replace 'BB Ticker' with the name of the field you want to sort alphabetically
          },
        },
      ])
      .toArray();

    let triadaIds: any = [];

    for (let index = 0; index < data.length; index++) {
      let row = data[index];
      row["BB Ticker"] = row["BB Ticker"];
      let originalFace = parseFloat(row["Original Face"]);
      let identifier = row["ISIN"] !== "" ? row["ISIN"].trim() : row["BB Ticker"].trim();
      let object: any = {};
      let location = row["Location"].trim();

      let couponDaysYear = row["BB Ticker"].split(" ")[0] == "T" || row["BB Ticker"].includes("U.S") ? 365.0 : 360.0;
      let previousQuantity = 0;
      let tradeType = row["B/S"];
      let operation = tradeType == "B" ? 1 : -1;
      let divider = row["Trade Type"] == "vcon" ? 100 : 1;

      let currentPrice: any = parseFloat(row["Price"]) / divider;
      let currentQuantity: any = parseFloat(row["Notional Amount"].toString().replace(/,/g, "")) * operation;
      let currentNet = parseFloat(row["Settlement Amount"].toString().replace(/,/g, "")) * operation;

      let currentPrincipal: any = parseFloat(row["Principal"].toString().replace(/,/g, ""));

      let currency = row["Currency"];
      let bondCouponMaturity: any = parseBondIdentifier(row["BB Ticker"]);

      let tradeExistsAlready = triadaIds.includes(row["Triada Trade Id"]);

      let updatingPosition = returnPositionProgress(positions, identifier, location);
      let tradeDate: any = new Date(row["Trade Date"]);
      let thisMonth = monthlyRlzdDate(tradeDate);
      let thisDay = getDate(tradeDate);

      let rlzdOperation = -1;
      if (updatingPosition) {
        let accumlatedQuantityState = updatingPosition["Notional Amount"] > 0 ? 1 : -1;

        if (operation == -1 * accumlatedQuantityState && updatingPosition["Notional Amount"] != 0) {
          rlzdOperation = 1;
        }
      } else {
        let accumlatedQuantityState = previousQuantity > 0 ? 1 : -1;
        if (operation == -1 * accumlatedQuantityState && previousQuantity) {
          rlzdOperation = 1;
        }
      }

      if (!tradeExistsAlready && identifier !== "") {
        triadaIds.push(row["Triada Trade Id"]);
        if (!updatingPosition) {
          let shortLongType = currentQuantity >= 0 ? 1 : -1;

          let settlementDate = row["Settle Date"];

          object["Location"] = row["Location"].trim();
          object["Last Modified Date"] = new Date();

          object["Entry Yield"] = row["Yield"] || 0;

          object["BB Ticker"] = row["BB Ticker"];

          object["ISIN"] = row["ISIN"].trim();
          object["CUSIP"] = row["Cuisp"].trim() || "";
          object["Notional Amount"] = currentQuantity;

          object["Net"] = currentNet;
          object["Currency"] = currency;
          object["Average Cost"] = currentPrice;

          object["Coupon Rate"] = bondCouponMaturity.rate || 0;
          object["Maturity"] = bondCouponMaturity.date || 0;
          object["Interest"] = {};
          object["Interest"][settlementDate] = object["Interest"][settlementDate] ? object["Interest"][settlementDate] + currentQuantity : currentQuantity;

          object["MTD Rlzd"] = {};

          object["MTD Rlzd"][thisMonth] = [];

          let MTDRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };
          if (rlzdOperation == 1) {
            object["MTD Rlzd"][thisMonth].push(MTDRlzdForThisTrade);
          }

          object["Day Rlzd"] = {};

          object["Day Rlzd"][thisDay] = [];

          let dayRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };
          if (rlzdOperation == 1) {
            object["Day Rlzd"][thisDay].push(dayRlzdForThisTrade);
          }

          object["Cost MTD"] = {};

          object["Cost MTD"][thisMonth] = operation == 1 ? parseFloat(currentPrincipal) : 0;
          object["Original Face"] = originalFace;

          if (!object["Entry Price"]) {
            object["Entry Price"] = {};
          }
          if (rlzdOperation == -1) {
            object["Entry Price"][thisMonth] = currentPrice;
          }
          object["Last Individual Upload Trade"] = new Date();
          let tradeRecord = null;
          if (!tradeRecord) {
            tradeRecord = findTradeRecord(data, row["Triada Trade Id"]);
            if (tradeRecord != null && tradeRecord != undefined) {
              data[tradeRecord]["Updated Notional"] = object["Notional Amount"];
            }
          }

          positions.push(object);
        } else if (returnPositionProgress(positions, identifier, location)) {
          let shortLongType = updatingPosition["Notional Amount"] >= 0 ? 1 : -1;

          let settlementDate = row["Settle Date"];
          object["Location"] = row["Location"].trim();
          object["Last Modified Date"] = new Date();
          object["BB Ticker"] = row["BB Ticker"];

          object["ISIN"] = row["ISIN"];
          object["Currency"] = currency;
          object["Notional Amount"] = currentQuantity + updatingPosition["Notional Amount"];

          object["Net"] = currentNet + updatingPosition["Net"];
          object["Average Cost"] = rlzdOperation == -1 ? getAverageCost(currentQuantity, updatingPosition["Notional Amount"], currentPrice, parseFloat(updatingPosition["Average Cost"])) : updatingPosition["Average Cost"];
          // this is reversed because the quantity is negated

          object["Cost MTD"] = updatingPosition["Cost MTD"];
          object["Cost MTD"][thisMonth] += operation == 1 ? currentPrincipal : 0;

          object["Coupon Rate"] = bondCouponMaturity.rate || 0;
          object["Maturity"] = bondCouponMaturity.date || 0;
          object["Interest"] = updatingPosition["Interest"];
          object["Interest"][settlementDate] = object["Interest"][settlementDate] ? object["Interest"][settlementDate] + currentQuantity : currentQuantity;
          object["Original Face"] = originalFace;

          object["Coupon Duration"] = object["Coupon Rate"] ? couponDaysYear : "";
          if (rlzdOperation == -1) {
            object["Entry Price"][thisMonth] = currentPrice;
          }

          object["MTD Rlzd"] = updatingPosition["MTD Rlzd"];

          let MTDRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };
          if (rlzdOperation == 1) {
            object["MTD Rlzd"][thisMonth] = object["MTD Rlzd"][thisMonth] ? object["MTD Rlzd"][thisMonth] : [];
            object["MTD Rlzd"][thisMonth].push(MTDRlzdForThisTrade);
          }
          object["Day Rlzd"] = updatingPosition["Day Rlzd"];

          let dayRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };

          if (rlzdOperation == 1) {
            object["Day Rlzd"][thisDay] = object["Day Rlzd"][thisDay] ? object["Day Rlzd"][thisDay] : [];
            object["Day Rlzd"][thisDay].push(dayRlzdForThisTrade);
          }
          object["Last Individual Upload Trade"] = new Date();
          let tradeRecord = null;
          if (!tradeRecord) {
            tradeRecord = findTradeRecord(data, row["Triada Trade Id"]);
            if (tradeRecord != null && tradeRecord != undefined) {
              data[tradeRecord]["Updated Notional"] = object["Notional Amount"];
            }
          }
          positions = updateExisitingPosition(positions, identifier, location, object);
        }
      }
    }

    try {
      // console.log(positions);
      for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        if (position["ISIN"].trim() == isin.trim() && position["Location"] == location.trim()) {
          portfolio[index] = positions[0];
          portfolio[index]["Quantity"] = portfolio[index]["Notional Amount"];
          // console.log(portfolio[index], "updateed", `portfolio-${earliestPortfolioName.predecessorDate}`);
        }
      }

      let action = await insertTradesInPortfolioAtASpecificDate(portfolio, `portfolio-${earliestPortfolioName.predecessorDate}`);
      console.log(data, tradeType);
      let modifyTradesAction = await modifyTradesDueToRecalculate(data, tradeType);
      console.log(modifyTradesAction, "modified trades");
      let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      await insertEditLogs([], "Recalculate Position", dateTime, "", data[0]["BB Ticker"] + " " + data[0]["Location"]);
      // console.log(positions)
      return action;
    } catch (error) {
      return { error: error };
    }
  } catch (error) {
    return { error: error };
  }
}

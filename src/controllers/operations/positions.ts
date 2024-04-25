import { client } from "../auth";
import { formatDateUS, formatDateWorld, getDate, getTradeDateYearTrades } from "../common";
import { getSecurityInPortfolioWithoutLocation, insertEditLogs } from "./portfolio";
import { findTrade, insertTrade } from "../reports/trades";
import { getDateTimeInMongoDBCollectionFormat, monthlyRlzdDate } from "../reports/common";
import { readCentralizedEBlot, readPricingSheet } from "./readExcel";
import { findTradeRecord, formatUpdatedPositions, getAverageCost, getEarliestCollectionName, parseBondIdentifier } from "../reports/tools";
import { PinnedPosition, Position } from "../../models/position";
import { CentralizedTrade } from "../../models/trades";
const ObjectId = require("mongodb").ObjectId;

export async function getPortfolio(): Promise<Position[]> {
  try {
    let day = getDateTimeInMongoDBCollectionFormat(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000));
    const database = client.db("portfolios");
    let latestCollectionTodayDate = day.split(" ")[0] + " 23:59";
    let earliestCollectionName = await getEarliestCollectionName(latestCollectionTodayDate);
    console.log(earliestCollectionName.predecessorDate, "get portfolio date");
    const reportCollection = database.collection(`portfolio-${earliestCollectionName.predecessorDate}`);
    let documents = await reportCollection.find().toArray();
    for (let index = 0; index < documents.length; index++) {
      documents[index]["Notional Amount"] = documents[index]["Notional Amount"] || parseFloat(documents[index]["Notional Amount"]) == 0 ? documents[index]["Notional Amount"] : documents[index]["Quantity"];
    }

    return documents;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getPortfolio", "controllers/operations/positions.ts");
    return [];
  }
}

export async function getHistoricalPortfolio(date: string) {
  const database = client.db("portfolios");
  const reportCollection = database.collection(`portfolio-${date}`);
  let documents = await reportCollection.find().toArray();
  for (let index = 0; index < documents.length; index++) {
    documents[index]["Notional Amount"] = documents[index]["Notional Amount"] || parseFloat(documents[index]["Notional Amount"]) == 0 ? documents[index]["Notional Amount"] : documents[index]["Quantity"];
  }
  return documents;
}

export function getSecurityInPortfolio(portfolio: any, identifier: string, location: string) {
  let document = 404;
  if (identifier == "" || !identifier) {
    return document;
  }
  for (let index = 0; index < portfolio.length; index++) {
    let issue = portfolio[index];
    if ((identifier.includes(issue["ISIN"]) || identifier.includes(issue["BB Ticker"])) && issue["Location"].trim() == location.trim()) {
      if (issue["ISIN"] != "") {
        document = issue;
      }
    } else if (identifier.includes(issue["BB Ticker"]) && issue["Location"].trim() == location.trim()) {
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

export function returnPositionProgress(positions: any, identifier: any, location: any) {
  let updateingPosition;
  for (let index = 0; index < positions.length; index++) {
    let position = positions[index];
    if ((position["ISIN"] == identifier || position["BB Ticker"] == identifier) && position["Location"] == location) {
      updateingPosition = position;
    }
  }
  return updateingPosition;
}

export function updateExisitingPosition(positions: any, identifier: any, location: any, updatedPosition: any) {
  for (let index = 0; index < positions.length; index++) {
    let position = positions[index];
    if ((position["ISIN"] == identifier || position["BB Ticker"] == identifier) && position["Location"] == location) {
      positions[index] = updatedPosition;
    }
  }
  return positions;
}

export async function updatePositionPortfolio(
  trades: {
    vconTrades: CentralizedTrade[];
    ibTrades: CentralizedTrade[];
    emsxTrades: CentralizedTrade[];
    gsTrades: CentralizedTrade[];
    allTrades: CentralizedTrade[];
  },
  path: string
) {
  try {
    let data = trades.allTrades;

    let positions: any = [];
    let portfolio = await getPortfolio();
    let triadaIds: any = [];

    for (let index = 0; index < data.length; index++) {
      let row = data[index];
      let originalFace = parseFloat(row["Original Face"]);
      let identifier = row["ISIN"].trim();
      let object: any = {};
      let location = row["Location"].trim();
      let securityInPortfolio: any = getSecurityInPortfolio(portfolio, identifier, location);
      let type = row["Trade Type"] == "vcon" ? "vcons" : row["Trade Type"].trim();

      if (securityInPortfolio !== 404) {
        object = securityInPortfolio;
        securityInPortfolio["Notional Amount"] = securityInPortfolio["Notional Amount"] ? securityInPortfolio["Notional Amount"] : securityInPortfolio["Quantity"];
      }
      let couponDaysYear = securityInPortfolio !== 404 ? securityInPortfolio["Coupon Duration"] : row["BB Ticker"].split(" ")[0] == "T" || row["BB Ticker"].includes("U.S") ? 365.0 : 360.0;
      let previousQuantity = securityInPortfolio["Notional Amount"];
      let previousAverageCost = securityInPortfolio["Average Cost"] ? securityInPortfolio["Average Cost"] : 0;
      let tradeType = row["B/S"];
      let operation = tradeType == "B" ? 1 : -1;
      let currentPrice: any = parseFloat(row["Price"]) / (type == "vcons" ? 100 : 1);
      let currentQuantity: any = parseFloat(row["Notional Amount"].toString().replace(/,/g, "")) * operation;
      let currentNet = parseFloat(row["Settlement Amount"].toString().replace(/,/g, "")) * operation;

      let currentPrincipal: any = parseFloat(row["Principal"].toString().replace(/,/g, ""));

      let currency = row["Currency"];
      let bondCouponMaturity: any = parseBondIdentifier(row["BB Ticker"]);
      let tradeDB = await findTrade(type, row["Triada Trade Id"], row["Seq No"]);

      let tradeExistsAlready = tradeDB || triadaIds.includes(row["Triada Trade Id"]);

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

      if (tradeExistsAlready) {
        console.log(row["BB Ticker"], row["Trade Date"], row["Triada Trade Id"], " already exists", tradeDB, triadaIds.includes(row["Triada Trade Id"]));
        if (trades.vconTrades) {
          trades.vconTrades = trades.vconTrades.filter((trade: any, index: any) => trade["Triada Trade Id"] != row["Triada Trade Id"]);
        }
        if (trades.ibTrades) {
          trades.ibTrades = trades.ibTrades.filter((trade: any, index: any) => trade["Triada Trade Id"] != row["Triada Trade Id"]);
        }
        if (trades.emsxTrades) {
          trades.emsxTrades = trades.emsxTrades.filter((trade: any, index: any) => trade["Triada Trade Id"] != row["Triada Trade Id"]);
        }
        return { error: "Trade: " + row["BB Ticker"] + " on date: " + row["Trade Date"] + " with id: " + row["Triada Trade Id"] + " already exists" };
      }
      if (!tradeExistsAlready && identifier !== "") {
        triadaIds.push(row["Triada Trade Id"]);
        if (!updatingPosition) {
          let shortLongType = securityInPortfolio !== 404 ? (securityInPortfolio["Notional Amount"] >= 0 ? 1 : -1) : currentQuantity >= 0 ? 1 : -1;

          let settlementDate = row["Settle Date"];

          object["Location"] = row["Location"].trim();
          object["Last Modified Date"] = new Date();
          if (rlzdOperation == -1) {
            object["Entry Yield"] = row["Yield"] || 0;
          }
          object["BB Ticker"] = row["BB Ticker"];

          object["ISIN"] = row["ISIN"].trim();
          object["CUSIP"] = row["Cuisp"].trim() || "";
          object["Notional Amount"] = securityInPortfolio !== 404 ? securityInPortfolio["Notional Amount"] + currentQuantity : currentQuantity;
          let tradeRecord = null;
          let updated = false;
          if (!tradeRecord) {
            tradeRecord = findTradeRecord(trades.vconTrades, row["Triada Trade Id"]);
            if (tradeRecord != null && tradeRecord != undefined) {
              trades.vconTrades[tradeRecord]["Updated Notional"] = object["Notional Amount"];
              updated = true;
            }
          }

          // Attempt to find the trade record in trades.ibTrades, if not found previously
          if (!updated || (tradeRecord != null && tradeRecord != undefined)) {
            tradeRecord = findTradeRecord(trades.ibTrades, row["Triada Trade Id"]);
            if (tradeRecord != null && tradeRecord != undefined) {
              trades.ibTrades[tradeRecord]["Updated Notional"] = object["Notional Amount"];
              updated = true;
            }
          }

          // Attempt to find the trade record in trades.emsxTrades, if not found previously
          if (!updated || (tradeRecord != null && tradeRecord != undefined)) {
            tradeRecord = findTradeRecord(trades.emsxTrades, row["Triada Trade Id"]);
            if (tradeRecord != null && tradeRecord != undefined) {
              trades.emsxTrades[tradeRecord]["Updated Notional"] = object["Notional Amount"];
              updated = true;
            }
          }
          if (!tradeRecord) {
            tradeRecord = findTradeRecord(trades.gsTrades, row["Triada Trade Id"]);
            if (tradeRecord != null && tradeRecord != undefined) {
              trades.gsTrades[tradeRecord]["Updated Notional"] = object["Notional Amount"];
            }
          }

          object["Net"] = securityInPortfolio !== 404 ? securityInPortfolio["Net"] + currentNet : currentNet;
          object["Currency"] = currency;
          object["Average Cost"] = rlzdOperation == -1 ? (securityInPortfolio !== 404 ? getAverageCost(currentQuantity, previousQuantity, currentPrice, previousAverageCost) : currentPrice) : securityInPortfolio["Average Cost"];

          object["Coupon Rate"] = bondCouponMaturity.rate || 0;
          object["Maturity"] = bondCouponMaturity.date || 0;
          object["Interest"] = securityInPortfolio !== 404 ? (securityInPortfolio["Interest"] ? securityInPortfolio["Interest"] : {}) : {};
          object["Interest"][settlementDate] = object["Interest"][settlementDate] ? object["Interest"][settlementDate] + currentQuantity : currentQuantity;

          object["MTD Rlzd"] = securityInPortfolio !== 404 ? (securityInPortfolio["MTD Rlzd"] ? securityInPortfolio["MTD Rlzd"] : {}) : {};

          object["MTD Rlzd"][thisMonth] = securityInPortfolio !== 404 ? (securityInPortfolio["MTD Rlzd"] ? (securityInPortfolio["MTD Rlzd"][thisMonth] ? securityInPortfolio["MTD Rlzd"][thisMonth] : []) : []) : [];

          let MTDRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };
          if (rlzdOperation == 1) {
            object["MTD Rlzd"][thisMonth].push(MTDRlzdForThisTrade);
          }

          object["Day Rlzd"] = securityInPortfolio !== 404 ? (securityInPortfolio["Day Rlzd"] ? securityInPortfolio["Day Rlzd"] : {}) : {};

          object["Day Rlzd"][thisDay] = securityInPortfolio !== 404 ? (securityInPortfolio["Day Rlzd"] ? (securityInPortfolio["Day Rlzd"][thisDay] ? securityInPortfolio["Day Rlzd"][thisDay] : []) : []) : [];

          let dayRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };
          if (rlzdOperation == 1) {
            object["Day Rlzd"][thisDay].push(dayRlzdForThisTrade);
          }

          if (securityInPortfolio !== 404) {
            securityInPortfolio["Cost MTD"] = {};
          }
          object["Cost MTD"] = securityInPortfolio !== 404 ? securityInPortfolio["Cost MTD"] : {};
          let curentMonthCost = securityInPortfolio !== 404 ? (parseFloat(securityInPortfolio["Cost MTD"][thisMonth]) ? parseFloat(securityInPortfolio["Cost MTD"][thisMonth]) : 0) : 0;
          object["Cost MTD"][thisMonth] = operation == 1 ? (securityInPortfolio !== 404 ? curentMonthCost + parseFloat(currentPrincipal) : parseFloat(currentPrincipal)) : 0;
          object["Original Face"] = originalFace;

          if (!object["Entry Price"]) {
            object["Entry Price"] = {};
          }
          if (!object["Entry Price"][thisMonth]) {
            object["Entry Price"][thisMonth] = currentPrice;
          }
          object["Last Individual Upload Trade"] = new Date();

          positions.push(object);
        } else if (returnPositionProgress(positions, identifier, location)) {
          let shortLongType = securityInPortfolio !== 404 ? (securityInPortfolio["Notional Amount"] + updatingPosition["Notional Amount"] >= 0 ? 1 : -1) : updatingPosition["Notional Amount"] >= 0 ? 1 : -1;

          let settlementDate = row["Settle Date"];
          object["Location"] = row["Location"].trim();
          object["Last Modified Date"] = new Date();
          object["BB Ticker"] = row["BB Ticker"];

          object["ISIN"] = row["ISIN"];
          object["Currency"] = currency;
          object["Notional Amount"] = currentQuantity + updatingPosition["Notional Amount"];

          let tradeRecord = null;
          if (!tradeRecord) {
            tradeRecord = findTradeRecord(trades.vconTrades, row["Triada Trade Id"]);
            if (tradeRecord != null && tradeRecord != undefined) {
              trades.vconTrades[tradeRecord]["Updated Notional"] = object["Notional Amount"];
            }
          }
          if (!tradeRecord) {
            tradeRecord = findTradeRecord(trades.ibTrades, row["Triada Trade Id"]);
            if (tradeRecord != null && tradeRecord != undefined) {
              trades.ibTrades[tradeRecord]["Updated Notional"] = object["Notional Amount"];
            }
          }
          if (!tradeRecord) {
            tradeRecord = findTradeRecord(trades.emsxTrades, row["Triada Trade Id"]);
            if (tradeRecord != null && tradeRecord != undefined) {
              trades.emsxTrades[tradeRecord]["Updated Notional"] = object["Notional Amount"];
            }
          }
          if (!tradeRecord) {
            tradeRecord = findTradeRecord(trades.gsTrades, row["Triada Trade Id"]);
            if (tradeRecord != null && tradeRecord != undefined) {
              trades.gsTrades[tradeRecord]["Updated Notional"] = object["Notional Amount"];
            }
          }

          if (rlzdOperation == -1) {
            object["Entry Yield"] = row["Yield"] || 0;
          }
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
          object["Entry Price"] = updatingPosition["Entry Price"];

          object["MTD Rlzd"] = updatingPosition["MTD Rlzd"];

          let MTDRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };
          if (rlzdOperation == 1) {
            object["MTD Rlzd"][thisMonth] = object["MTD Rlzd"][thisMonth] ? object["MTD Rlzd"][thisMonth] : [];
            object["MTD Rlzd"][thisMonth].push(MTDRlzdForThisTrade);
          }
          if (rlzdOperation == -1) {
            object["Entry Price"][thisMonth] = currentPrice;
          }
          object["Day Rlzd"] = updatingPosition["Day Rlzd"];

          let dayRlzdForThisTrade = { price: currentPrice, quantity: Math.abs(currentQuantity) * shortLongType };

          if (rlzdOperation == 1) {
            object["Day Rlzd"][thisDay] = object["Day Rlzd"][thisDay] ? object["Day Rlzd"][thisDay] : [];
            object["Day Rlzd"][thisDay].push(dayRlzdForThisTrade);
          }
          object["Last Individual Upload Trade"] = new Date();
          positions = updateExisitingPosition(positions, identifier, location, object);
        }
      }
    }

    try {
      let updatedPortfolio = formatUpdatedPositions(positions, portfolio, "Last Upload Trade");
      let insertion = await insertTradesInPortfolio(updatedPortfolio.updatedPortfolio);
      let action1 = await insertTrade(trades.vconTrades, "vcons");
      let action2 = await insertTrade(trades.ibTrades, "ib");
      let action3 = await insertTrade(trades.emsxTrades, "emsx");

      let action4 = await insertTrade(trades.gsTrades, "gs");

      let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      await insertEditLogs([positions], "Upload Trades", dateTime, "Num of updated/created positions: " + Object.keys(positions).length, "Link: " + path);

      return insertion;
    } catch (error) {
      console.log(error);
      let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      await insertEditLogs([errorMessage], "Errors", dateTime, "insertTradesInPortfolio", "controllers/operations/positions.ts");

      return { error: error };
    }
  } catch (error) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "insertTradesInPortfolio", "controllers/operations/positions.ts");

    return { error: error };
  }
}

export async function insertTradesInPortfolio(trades: any) {
  const database = client.db("portfolios");

  // Create an array of updateOne operations
  let day = getDateTimeInMongoDBCollectionFormat(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000));

  let operations = trades
    .filter((trade: any) => trade["Location"])
    .map((trade: any) => {
      // Start with the known filters
      let filters: any = [];

      // If "ISIN", "BB Ticker", or "BB Ticker" exists, check for both the field and "Location"
      if (trade["ISIN"]) {
        filters.push({
          ISIN: trade["ISIN"],
          Location: trade["Location"],
          _id: new ObjectId(trade["_id"]),
        });
      } else if (trade["BB Ticker"]) {
        filters.push({
          "BB Ticker": trade["BB Ticker"],
          Location: trade["Location"],
          _id: new ObjectId(trade["_id"]),
        });
      }
      if (filters.length > 0) {
        return {
          updateOne: {
            filter: { $or: filters },
            update: { $set: trade },
            upsert: true,
          },
        };
      }
    });

  // Execute the operations in bulk
  try {
    const date = day;
    console.log(operations, "operations inserted date");
    const historicalReportCollection = database.collection(`portfolio-${date}`);
    let action = await historicalReportCollection.bulkWrite(operations);

    return action;
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "insertTradesInPortfolio", "controllers/operations/positions.ts");

    return [];
  }
}

export async function updatePricesPortfolio(path: string) {
  try {
    let data: any = await readPricingSheet(path);

    if (data.error) {
      return data;
    } else {
      let updatedPricePortfolio = [];
      let maturity: any = {};
      let callDate: any = {};
      let maturityType = "day/month";
      let portfolio = await getPortfolio();

      let currencyInUSD: any = {};
      let currencyStart = true;
      currencyInUSD["USD"] = 1;
      let divider = 1;
      for (let index = 0; index < data.length; index++) {
        let row = data[index];
        if (row["BB Ticker"] == "Bonds") {
          currencyStart = false;
          divider = 100;
        } else if (row["BB Ticker"] == "CDS") {
          divider = 1;
        } else if (row["BB Ticker"] == "Futures") {
          divider = 1;
        } else if (row["BB Ticker"] == "Equity") {
          console.log(row);
          divider = 1;
        }

        if (!currencyStart) {
          let positions: any = getSecurityInPortfolioWithoutLocation(portfolio, row["Bloomberg ID"]);

          if (positions == 404) {
            positions = getSecurityInPortfolioWithoutLocation(portfolio, row["ISIN"]);
          }
          if (positions == 404) {
            positions = getSecurityInPortfolioWithoutLocation(portfolio, row["BB Ticker"]);
          }

          if (positions == 404) {
            continue;
          }

          for (let index = 0; index < positions.length; index++) {
            let object = positions[index];

            object["Mid"] = parseFloat(row["Today's Mid"]) / divider;
            object["Ask"] = parseFloat(row["Override Ask"]) > 0 ? parseFloat(row["Override Ask"]) / divider : parseFloat(row["Today's Ask (Broker)"]) > 0 ? parseFloat(row["Today's Ask (Broker)"]) / divider : parseFloat(row["Today's Ask"]) / divider;
            object["Bid"] = parseFloat(row["Override Bid"]) > 0 ? parseFloat(row["Override Bid"]) / divider : parseFloat(row["Today's Bid (Broker)"]) > 0 ? parseFloat(row["Today's Bid (Broker)"]) / divider : parseFloat(row["Today's Bid"]) / divider;
            object["YTM"] = row["Mid Yield call"].toString().includes("N/A") ? 0 : row["Mid Yield call"];
            object["Broker"] = row["Broker"].toString().includes("N/A") ? "" : row["Broker"];

            object["DV01"] = row["DV01"].toString().includes("N/A") ? 0 : row["DV01"];
            object["YTW"] = row["Mid Yield Worst"].toString().includes("N/A") ? 0 : row["Mid Yield Worst"];
            object["OAS"] = row["OAS Spread"].toString().includes("N/A") ? 0 : row["OAS Spread"];
            object["Z Spread"] = row["Z Spread"].toString().includes("N/A") ? 0 : row["Z Spread"];
            object["S&P Bond Rating"] = row["S&P Bond Rating"].toString().includes("N/A") ? "" : row["S&P Bond Rating"];
            object["S&P Outlook"] = row["S&P Outlook"].toString().includes("N/A") ? "" : row["S&P Outlook"];
            object["Moody's Bond Rating"] = row["Moody's Bond Rating"].toString().includes("N/A") ? "" : row["Moody's Bond Rating"];
            object["Moody's Outlook"] = row["Moody's Outlook"].toString().includes("N/A") ? "" : row["Moody's Outlook"];
            object["Fitch Bond Rating"] = row["Fitch Bond Rating"].toString().includes("N/A") ? "" : row["Fitch Bond Rating"];
            object["Fitch Outlook"] = row["Fitch Outlook"].toString().includes("N/A") ? "" : row["Fitch Outlook"];
            object["BBG Composite Rating"] = row["BBG Composite Rating"].toString().includes("N/A") ? "" : row["BBG Composite Rating"];
            object["BB Ticker"] = row["BB Ticker"].toString().includes("N/A") ? "" : row["BB Ticker"];
            object["Issuer"] = row["Issuer Name"].toString().includes("N/A") ? "" : row["Issuer Name"];
            object["Bloomberg ID"] = row["Bloomberg ID"];
            object["CUSIP"] = row["CUSIP"].toString().includes("N/A") ? "" : row["CUSIP"];

            if (!row["Call Date"].includes("N/A") && !row["Call Date"].includes("#")) {
              callDate[row["ISIN"]] = row["Call Date"];
              if (parseFloat(row["Call Date"].split("/")[1]) > 12) {
                maturityType = "month/day";
              }
            }
            if (!row["Maturity"].includes("N/A") && !row["Maturity"].includes("#")) {
              maturity[row["ISIN"]] = row["Maturity"];
              if (parseFloat(row["Maturity"].split("/")[1]) > 12) {
                maturityType = "month/day";
              }
            }
            if (currencyInUSD[object["Currency"]]) {
              object["FX Rate"] = currencyInUSD[object["Currency"]];
            } else {
              object["FX Rate"] = 1;
            }

            if (row["Country"] && !row["Country"].includes("N/A")) {
              object["Country"] = row["Country"];
            }
            if (row["Sector"] && !row["Sector"].includes("N/A")) {
              object["Sector"] = row["Sector"];
            }

            updatedPricePortfolio.push(object);
          }
        } else if (row["BB Ticker"].includes("Curncy") && currencyStart) {
          let rate = row["Today's Mid"];
          let currency = row["BB Ticker"].split(" ")[0];
          if (currency == "USD") {
            rate = 1 / rate;
            currency = row["BB Ticker"].split(" ")[1];
          }
          currencyInUSD[currency] = rate;
        }
      }
      for (let index = 0; index < updatedPricePortfolio.length; index++) {
        let position: Position = updatedPricePortfolio[index];
        let positionMaturity = maturity[position["ISIN"]];
        let positionCallDate = callDate[position["ISIN"]];
        if (maturityType == "month/day" && positionMaturity) {
          updatedPricePortfolio[index]["Maturity"] = formatDateWorld(positionMaturity);
        } else {
          updatedPricePortfolio[index]["Maturity"] = positionMaturity;
        }
        if (maturityType == "month/day" && positionCallDate) {
          updatedPricePortfolio[index]["Call Date"] = formatDateWorld(positionCallDate);
        } else {
          updatedPricePortfolio[index]["Call Date"] = positionCallDate;
        }
      }
      try {
        let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
        let updatedPortfolio = formatUpdatedPositions(updatedPricePortfolio, portfolio, "Last Price Update");
        let insertion = await insertPricesUpdatesInPortfolio(updatedPortfolio.updatedPortfolio);
        await insertEditLogs([updatedPortfolio.positionsThatDoNotExistsNames], "Update Prices", dateTime, "Num of Positions that did not update: " + Object.keys(updatedPortfolio.positionsThatDoNotExistsNames).length, "Link: " + path);

        return { error: updatedPortfolio.positionsThatDoNotExistsNames };
      } catch (error) {
        console.log(error);
        return { error: "Template does not match" };
      }
    }
  } catch (error: any) {
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    return { error: errorMessage };
  }
}

export async function insertPricesUpdatesInPortfolio(updatedPortfolio: any) {
  const database = client.db("portfolios");
  let portfolio = updatedPortfolio;
  let day = getDateTimeInMongoDBCollectionFormat(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000));
  // Create an array of updateOne operations

  // Execute the operations in bulk
  try {
    //so the latest updated version portfolio profits will not be copied into a new instance
    const updatedOperations = portfolio.map((position: any) => {
      // Start with the known filters
      const filters: any = [];
      // Only add the "BB Ticker" filter if it's present in the trade object

      if (position["ISIN"]) {
        filters.push({
          ISIN: position["ISIN"],
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
          upsert: true,
        },
      };
    });
    console.log(day, "inserted date");
    let updatedCollection = database.collection(`portfolio-${day}`);
    let updatedResult = await updatedCollection.bulkWrite(updatedOperations);

    return updatedResult;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "insertPricesUpdatesInPortfolio", "controllers/operations/positions.ts");
    return "update prices error";
  }
}

export async function editPosition(editedPosition: any, date: string) {
  try {
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
    delete editedPosition["Quantity"];
    delete editedPosition["date"];

    let positionInPortfolio: any = {};

    let editedPositionTitles = Object.keys(editedPosition);

    let id = editedPosition["_id"];
    let unEditableParams = [
      "Value",
      "Duration",
      "Base LTV",
      "LTV",
      "MTD Mark",
      "YTD Mark",
      "Previous Mark",
      "Day P&L (BC)",
      "MTD Rlzd (BC)",
      "MTD URlzd (BC)",
      "MTD Int.Income (BC)",
      "MTD P&L (BC)",
      "Cost (LC)",
      "Day Accrual",
      "_id",
      "YTD Mark Ref.D",
      "Day Price Move",
      "Value (BC)",
      "Value (LC)",
      "MTD Int. (BC)",
      "Day URlzd (BC)",
      "Day Rlzd (BC)",
      "Day Int. (LC)",
      "Day Accrual (LC)",
      "Cost MTD (LC)",
      "Quantity",
      "Day Int. (BC)",
      // "S&P Outlook",
      // "Moody's Bond Rating",
      // "Moody's Outlook",
      // "Fitch Bond Rating",
      // "Fitch Outlook",
      // "BBG Composite Rating",
      "Borrow Capacity",
      "LTV",
      "Day P&L FX",
      "MTD P&L FX",
      "S&P Bond Rating",
      "MTD FX",
      "Day URlzd",

      "Day P&L (LC)",
      "MTD Rlzd (LC)",
      "MTD URlzd (LC)",
      "MTD Int.Income (LC)",
      "MTD P&L (LC)",
      "Previous FX",
      "Day Rlzd",
      "Spread Change",
      "OAS W Change",
      "Last Day Since Realizd",
      "Day Rlzd (LC)",
      "Day URlzd (LC)",
      "MTD Int. (LC)",
      "Currency)	Day Int. (LC)",
      "YTD P&L (LC)",
      "YTD Rlzd (LC)",
      "YTD URlzd (LC)",
      "YTD Int. (LC)",

      "YTD P&L (BC)",
      "YTD Rlzd (BC)",
      "YTD URlzd (BC)",
      "YTD Int. (BC)",
      "YTD FX",
      "Total Gain/ Loss (USD)",

      "Accrued Int. Since Inception (BC)",
      "Notes",
      "MTD Price Move",
      "Event Type",
      "Edit Note",
    ];
    // these keys are made up by the function frontend table, it reverts keys to original keys

    let positionIndex = null;

    for (let index = 0; index < portfolio.length; index++) {
      let position = portfolio[index];
      if (position["_id"].toString() == id) {
        positionInPortfolio = position;
        positionIndex = index;
      }
    }
    if (!positionIndex && positionIndex != 0) {
      return { error: "Fatal Error" };
    }
    let changes = [];

    for (let indexTitle = 0; indexTitle < editedPositionTitles.length; indexTitle++) {
      let title = editedPositionTitles[indexTitle];
      let todayDate = formatDateUS(new Date().toString());
      let monthDate = monthlyRlzdDate(new Date().toString());
      if (!unEditableParams.includes(title) && editedPosition[title] != "") {
        if (title == "Notional Amount") {
          if (editedPosition["Event Type"] == "Sink Factor") {
            let sinkFactorDate = formatDateUS(new Date(editedPosition["Sink Factor Date (if any)"]));

            positionInPortfolio["Interest"] = positionInPortfolio["Interest"] ? positionInPortfolio["Interest"] : {};
            positionInPortfolio["Interest"][sinkFactorDate] = parseFloat(editedPosition[title]) - parseFloat(positionInPortfolio["Notional Amount"]);

            changes.push(`Notional Amount Sunk from ${positionInPortfolio["Notional Amount"]} to ${editedPosition[title]} on ${sinkFactorDate}`);
            positionInPortfolio["Net"] = parseFloat(editedPosition[title]);
          } else {
            positionInPortfolio["Interest"] = positionInPortfolio["Interest"] ? positionInPortfolio["Interest"] : {};
            positionInPortfolio["Interest"][todayDate] = parseFloat(editedPosition[title]) - parseFloat(positionInPortfolio["Notional Amount"]);
            changes.push(`Notional Amount changed from ${positionInPortfolio["Notional Amount"]} to ${editedPosition[title]}`);
            positionInPortfolio["Notional Amount"] = parseFloat(editedPosition[title]);
            positionInPortfolio["Net"] = parseFloat(editedPosition[title]);
          }
        } else if ((title == "Mid" || title == "Ask" || title == "Bid" || title == "Average Cost" || title == "Entry Price") && editedPosition[title] != "") {
          if (!positionInPortfolio["Type"]) {
            positionInPortfolio["Type"] = positionInPortfolio["BB Ticker"].split(" ")[0] == "T" || positionInPortfolio["Issuer"] == "US TREASURY N/B" ? "UST" : "BND";
          }

          if (positionInPortfolio["Type"] == "BND" || positionInPortfolio["Type"] == "UST") {
            positionInPortfolio[title] = parseFloat(editedPosition[title]) / 100;
          } else {
            positionInPortfolio[title] = parseFloat(editedPosition[title]);
          }
        } else {
          changes.push(`${title} changed from ${positionInPortfolio[title] || "''"} to ${editedPosition[title]}`);

          positionInPortfolio[title] = editedPosition[title];
        }
      }
    }
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    portfolio[positionIndex] = positionInPortfolio;
    // console.log(positionInPortfolio, `portfolio-${earliestPortfolioName.predecessorDate}`, "portfolio edited name");
    await insertEditLogs(changes, editedPosition["Event Type"], dateTime, editedPosition["Edit Note"], positionInPortfolio["BB Ticker"] + " " + positionInPortfolio["Location"]);

    let action = await insertTradesInPortfolioAtASpecificDateBasedOnID(portfolio, `portfolio-${earliestPortfolioName.predecessorDate}`);
    if (action) {
      return { status: 200 };
    } else {
      return { error: "fatal error" };
    }
  } catch (error: any) {
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    return { error: errorMessage };
  }
}

export async function pinPosition(position: PinnedPosition) {
  try {
    const database = client.db("positions");

    const reportCollection = database.collection("pinned");
    position["Pin Timestamp"] = new Date().getTime();
    const query = { ISIN: position.ISIN, Location: position.Location };

    // Find the document
    const existingPosition = await reportCollection.findOne(query);
    if (existingPosition) {
      // If found, update the Pin property
      const updateResult = await reportCollection.updateOne(query, { $set: { Pin: position.Pin } });

      if (updateResult.matchedCount === 1) {
        return { status: 200, message: "Position updated successfully." };
      } else {
        throw new Error("Position update failed.");
      }
    } else {
      // If not found, insert a new document
      const insertResult = await reportCollection.insertOne(position);

      if (insertResult.insertedId) {
        return { status: 200, message: "Position inserted successfully." };
      } else {
        return { error: "fatal error" };
      }
    }
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "pinPosition", "controllers/operations/positions.ts");

    return { error: errorMessage };
  }
}

export async function getPinnedPositions() {
  try {
    const database = client.db("positions");

    const reportCollection = database.collection("pinned");
    const query = { Pin: "pinned" };

    const pinnedPositions = await reportCollection.find(query).toArray();

    if (pinnedPositions.length) {
      return pinnedPositions;
    } else {
      return [];
    }
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getPinnedPositions", "controllers/operations/positions.ts");

    return [];
  }
}

export async function insertTradesInPortfolioAtASpecificDateBasedOnID(trades: any, date: string) {
  const database = client.db("portfolios");

  let operations = trades
    .filter((trade: any) => trade["Location"])
    .map((trade: any) => {
      // Start with the known filters
      let filters: any = [];

      // If "ISIN", "BB Ticker", or "Issue" exists, check for both the field and "Location"
      if (trade["ISIN"]) {
        filters.push({
          _id: new ObjectId(trade["_id"].toString()),
        });
      }

      return {
        updateOne: {
          filter: { $or: filters },
          update: { $set: trade },
          upsert: true,
        },
      };
    });

  // Execute the operations in bulk
  try {
    const historicalReportCollection = database.collection(date);
    let action = await historicalReportCollection.bulkWrite(operations);
    console.log(action);
    return action;
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "insertTradesInPortfolioAtASpecificDateBasedOnID", "controllers/operations/positions.ts");

    return [];
  }
}

export async function insertTradesInPortfolioAtASpecificDate(trades: any, date: string) {
  const database = client.db("portfolios");

  let operations = trades
    .filter((trade: any) => trade["Location"])
    .map((trade: any) => {
      // Start with the known filters
      let filters: any = [];

      // If "ISIN", "BB Ticker", or "Issue" exists, check for both the field and "Location"
      if (trade["ISIN"]) {
        filters.push({
          ISIN: trade["ISIN"],
          Location: trade["Location"],
        });
      } else if (trade["BB Ticker"]) {
        filters.push({
          "BB Ticker": trade["BB Ticker"],
          Location: trade["Location"],
        });
      }

      return {
        updateOne: {
          filter: { $or: filters },
          update: { $set: trade },
          upsert: true,
        },
      };
    });

  // Execute the operations in bulk
  try {
    const historicalReportCollection = database.collection(date);
    let action = await historicalReportCollection.bulkWrite(operations);

    return action;
  } catch (error: any) {
    console.log(error);
    //BULK error is expected

    return [];
  }
}

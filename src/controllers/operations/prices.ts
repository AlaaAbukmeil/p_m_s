import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { formatUpdatedPositions, getCollectionName } from "../reports/tools";
import { client } from "../userManagement/auth";
import { Position } from "../../models/position";
import { formatDateWorld } from "../common";
import { readPricingSheet } from "./readExcel";
import { getPortfolio } from "./positions";
import { getSecurityInPortfolioWithoutLocation } from "./tools";
import { getPortfolioOnSpecificDate } from "../reports/portfolios";
import { insertEditLogs } from "./logs";
const ObjectId = require("mongodb").ObjectId;
export async function updatePreviousPricesPortfolioMUFG(data: any, collectionDate: string, link: string) {
  try {
    if (data.error) {
      return data;
    } else {
      let updatedPricePortfolio = [];
      let action = await getPortfolioOnSpecificDate(collectionDate);
      if (action.date) {
        let portfolio = action.portfolio;
        collectionDate = action.date;
        console.log(collectionDate, "collection day used");

        for (let index = 0; index < data.length; index++) {
          let row = data[index];

          let object: any = getSecurityInPortfolioWithoutLocation(portfolio, row["Investment"].trim());

          if (object == 404) {
            continue;
          }

          for (let index = 0; index < object.length; index++) {
            let position = object[index];
            let divider;
            try {
              divider = position["ISIN"].includes("IB") || position["Type"].includes("CDS") || position["Type"].includes("EQT") ? 1 : 100;
            } catch (error) {
              divider = 100;
            }
            position["Mid"] = parseFloat(row["Price"]) / divider;
            position["FX Rate"] = row["FXRate"];
            position["Last Price Update"] = new Date();

            updatedPricePortfolio.push(position);
          }
        }

        try {
          let updatedPortfolio = formatUpdatedPositions(updatedPricePortfolio, portfolio, "Last Price Update");

          let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
          await insertEditLogs([updatedPortfolio.positionsThatDoNotExistsNames], "Update Previous Prices based on MUFG", dateTime, "Num of Positions that did not update: " + Object.keys(updatedPortfolio.positionsThatDoNotExists).length, "Link: " + link);
          let insertion = await insertPreviousPricesUpdatesInPortfolio(updatedPortfolio.updatedPortfolio, collectionDate);
          console.log(updatedPricePortfolio.length, "number of positions prices updated");

          return { error: updatedPortfolio.positionsThatDoNotExistsNames };
        } catch (error: any) {
          console.log(error);
          return { error: error.toString() };
        }
      }
    }
  } catch (error) {
    console.log(error);

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
        },
      };
    });

    let updatedCollection = database.collection(`portfolio-${day}`);
    let updatedResult = await updatedCollection.bulkWrite(updatedOperations);

    return updatedResult;
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "insertPreviousPricesUpdatesInPortfolio", "controllers/operations/prices.ts");

    return;
  }
}

export async function updatePreviousPricesPortfolioBloomberg(data: any, collectionDate: string, link: string) {
  try {
    if (data.error) {
      return data;
    } else {
      let updatedPricePortfolio = [];
      let action = await getPortfolioOnSpecificDate(collectionDate);
      if (action.date) {
        let portfolio = action.portfolio;

        collectionDate = action.date;
        let currencyInUSD: any = {};
        let maturity: any = {};
        let callDate: any = {};
        let maturityType = "day/month";
        currencyInUSD["USD"] = 1;
        let divider = 1;
        let currencyStart = true;
        currencyInUSD["USD"] = 1;

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

              if (isNaN(row["Today's Mid"]) || row["Today's Mid"].toString().includes("N/A")) {
                return { error: `${object["BB Ticker"]}' price has error, please review prices` };
              }
              if (isNaN(row["Today's Ask"]) || row["Today's Ask"].toString().includes("N/A")) {
                return { error: `${object["BB Ticker"]}' price has error, please review prices` };
              }
              if (isNaN(row["Today's Bid"]) || row["Today's Bid"].toString().includes("N/A")) {
                return { error: `${object["BB Ticker"]}' price has error, please review prices` };
              }
              object["Mid"] = parseFloat(row["Today's Mid"]) / divider;
              object["Ask"] = parseFloat(row["Today's Ask"]) / divider;
              object["Bid"] = parseFloat(row["Today's Bid"]) / divider;
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
              object["CR01"] = row["CR01"].toString().includes("N/A") ? "" : row["CR01"];

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

              if (row["Instrument's Country Full Name"] && !row["Instrument's Country Full Name"].includes("N/A")) {
                object["Country"] = row["Instrument's Country Full Name"];
              }
              if (row["Issuer's Country"] && !row["Issuer's Country"].includes("N/A")) {
                object["Issuer's Country"] = row["Issuer's Country"];
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
        let currencies = Object.keys(currencyInUSD);
        for (let index = 0; index < currencies.length; index++) {
          let currency = currencies[index];
          let positions: any = getSecurityInPortfolioWithoutLocation(portfolio, currency);
          for (let indexPosition = 0; indexPosition < positions.length; indexPosition++) {
            let position = positions[indexPosition];
            position["Mid"] = currencyInUSD[currency];
            updatedPricePortfolio.push(position);
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
        console.log(currencyInUSD, "currency prices");
        try {
          let updatedPortfolio = formatUpdatedPositions(updatedPricePortfolio, portfolio, "Last Price Update");
          let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
          await insertEditLogs([updatedPortfolio.positionsThatDoNotExistsNames], "Update Previous Prices based on bloomberg", dateTime, "Num of Positions that did not update: " + Object.keys(updatedPortfolio.positionsThatDoNotExists).length, "Link: " + link);
          let insertion = await insertPreviousPricesUpdatesInPortfolio(updatedPortfolio.updatedPortfolio, collectionDate);
          console.log(updatedPricePortfolio.length, "number of positions prices updated");

          if (Object.keys(updatedPortfolio.positionsThatDoNotExistsNames).length) {
            return { error: updatedPortfolio.positionsThatDoNotExistsNames };
          } else {
            return { error: null };
          }
        } catch (error) {
          console.log(error);
          return { error: "Template does not match" };
        }
      }
    }
  } catch (error) {
    console.log(error);
    return { error: "error" };
  }
}

export async function updatePricesPortfolio(path: string, link: string) {
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
            if (isNaN(row["Today's Mid"]) || row["Today's Mid"].toString().includes("N/A")) {
              return { error: `${object["BB Ticker"]}' price has error, please review prices` };
            }
            if (isNaN(row["Today's Ask"]) || row["Today's Ask"].toString().includes("N/A")) {
              return { error: `${object["BB Ticker"]}' price has error, please review prices` };
            }
            if (isNaN(row["Today's Bid"]) || row["Today's Bid"].toString().includes("N/A")) {
              return { error: `${object["BB Ticker"]}' price has error, please review prices` };
            }
            object["Mid"] = parseFloat(row["Today's Mid"]) / divider;
            object["Ask"] = parseFloat(row["Today's Ask"]) / divider;
            object["Bid"] = parseFloat(row["Today's Bid"]) / divider;
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
            object["CR01"] = row["CR01"].toString().includes("N/A") ? "" : row["CR01"];

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

            if (row["Instrument's Country Full Name"] && !row["Instrument's Country Full Name"].includes("N/A")) {
              object["Country"] = row["Instrument's Country Full Name"];
            }
            if (row["Issuer's Country"] && !row["Issuer's Country"].includes("N/A")) {
              object["Issuer's Country"] = row["Issuer's Country"];
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

      let currencies = Object.keys(currencyInUSD);
      for (let index = 0; index < currencies.length; index++) {
        let currency = currencies[index];
        let positions: any = getSecurityInPortfolioWithoutLocation(portfolio, currency);
        for (let indexPosition = 0; indexPosition < positions.length; indexPosition++) {
          let position = positions[indexPosition];
          position["Mid"] = currencyInUSD[currency];
          updatedPricePortfolio.push(position);
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
        await insertEditLogs([updatedPortfolio.positionsThatDoNotExistsNames], "Update Prices", dateTime, "Num of Positions that did not update: " + Object.keys(updatedPortfolio.positionsThatDoNotExistsNames).length, "Link: " + link);

        if (Object.keys(updatedPortfolio.positionsThatDoNotExistsNames).length) {
          return { error: updatedPortfolio.positionsThatDoNotExistsNames };
        } else {
          return { error: null };
        }
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

export async function checkLivePositions() {
  try {
    let portfolio = await getPortfolio();
    let positions: any = [];

    for (let index = 0; index < portfolio.length; index++) {
      let position = portfolio[index];
      let notional = parseFloat(position["Notional Amount"]);
      let bloombergId = position["Bloomberg ID"];
      let ticker = position["BB Ticker"];

      if (notional != 0 && bloombergId) {
        let object = { bloombergId: bloombergId, notional: notional, bbTicker: ticker };
        if (bloombergId.toString().includes("Govt")) {
          object.notional += -10000000;
        }
        positions.push(object);
      }
    }

    try {
      return positions;
    } catch (error) {
      console.log(error);
      return { error: "Template does not match" };
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
  let day = getDateTimeInMongoDBCollectionFormat(new Date(new Date().getTime()));

  let checkCollectionDay = await getCollectionName(day);
  if (checkCollectionDay) {
    day = checkCollectionDay;
  }
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

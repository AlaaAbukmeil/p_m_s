import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { formatUpdatedPositions, getCollectionName } from "../reports/tools";
import { formatDateWorld } from "../common";
import { readPricingSheet } from "./readExcel";
import { getPortfolio, insertPositionsInPortfolio } from "./positions";
import { getSQLIndexFormat, getSecurityInPortfolioWithoutLocation } from "./tools";
import { getPortfolioOnSpecificDate } from "../reports/portfolios";
import { insertEditLogs } from "./logs";
import { isInteger, isNotInteger } from "../analytics/tools";
import { PositionBeforeFormatting, PositionInDB } from "../../models/portfolio";
const ObjectId = require("mongodb").ObjectId;
export async function updatePreviousPricesPortfolioMUFG(data: any, collectionDate: string, link: string, portfolioId: string) {
  try {
    if (data.error) {
      return data;
    } else {
      let updatedPricePortfolio = [];
      let action = await getPortfolioOnSpecificDate(collectionDate, null, "portfolio_main");
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
            if (position["Type"] == "FX") {
              continue;
            }
            let divider;
            try {
              divider = position["ISIN"].includes("IB") || position["Type"].includes("CDS") || position["Type"].includes("EQT") ? 1 : 100;
            } catch (error) {
              divider = 100;
            }
            position["Mid"] = parseFloat(row["Price"]) / divider;
            position["FX Rate"] = row["FXRate"];
            position["Last Price Update"] = new Date().getTime();

            updatedPricePortfolio.push(position);
          }
        }

        try {
          let updatedPortfolio = formatUpdatedPositions(updatedPricePortfolio, portfolio, "Last Price Update");

          let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
          await insertEditLogs([updatedPortfolio.positionsThatDoNotExistsNames], "update_previous_prices_mufg", dateTime, "Num of Positions that did not update: " + Object.keys(updatedPortfolio.positionsThatDoNotExists).length, "Link: " + link);
          console.log(updatedPricePortfolio.length, "number of positions prices updated");
          let snapShotName = getSQLIndexFormat(`portfolio-${getDateTimeInMongoDBCollectionFormat(collectionDate)}`, portfolioId);
          let action = await insertPositionsInPortfolio(updatedPortfolio.updatedPortfolio, portfolioId, snapShotName);

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

export async function updatePricesPortfolio(path: string, link: string, portfolioId: string, collectionDate: null | string = null) {
  try {
    let data: any = await readPricingSheet(path);

    if (data.error) {
      return data;
    } else {
      let updatedPricePortfolio: PositionInDB[] = [];
      let maturity: any = {};

      let previousSettleDate: any = {};
      let nextSettleDate: any = {};

      let callDate: any = {};
      let maturityType = "day/month";
      let portfolio;
      if (collectionDate) {
        let action = await getPortfolioOnSpecificDate(collectionDate, null, portfolioId);
        portfolio = action.portfolio;
        collectionDate = action.date;
      } else {
        portfolio = await getPortfolio(portfolioId);
      }

      let currencyInUSD: any = {};
      let errors: { [key: string]: { notional: number; location: string; message: string } } = {};
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
          let positions: PositionInDB[] | 404 = getSecurityInPortfolioWithoutLocation(portfolio, row["ISIN"]);

          if (positions == 404) {
            positions = getSecurityInPortfolioWithoutLocation(portfolio, row["Bloomberg ID"]);
          }

          if (positions == 404) {
            continue;
          }

          for (let index = 0; index < positions.length; index++) {
            let object = positions[index];
            if (isNaN(row["Today's Mid"]) || row["Today's Mid"].toString().includes("N/A") || !parseFloat(row["Today's Mid"])) {
              return { error: `${object["BB Ticker"]}' mid price has error, please review prices. value = ${row["Today's Mid"]}` };
            }
            if (isNaN(row["Today's Ask"]) || row["Today's Ask"].toString().includes("N/A") || (!parseFloat(row["Today's Ask"]) && divider == 100)) {
              return { error: `${object["BB Ticker"]}' ask price has error, please review prices. value = ${row["Today's Ask"]}` };
            }
            if (isNaN(row["Today's Bid"]) || row["Today's Bid"].toString().includes("N/A") || (!parseFloat(row["Today's Bid"]) && divider == 100)) {
              return { error: `${object["BB Ticker"]}' bid price has error, please review prices. value = ${row["Today's Bid"]}` };
            }
            if (divider == 1) {
              object["Bid"] = row["Today's Bid"];
              object["Ask"] = row["Today's Ask"];
            } else if (divider == 100) {
              determineBestPrice({ brokerBidOnePrice: row["Today's Bid"], brokerBidTwoPrice: row["Broker 2 Bid"], brokerBidThreePrice: row["Broker 2 Bid"], bgnBidPrice: row["Today's Bid"], ticker: row["BB Ticker"], brokerAskOnePrice: row["Today's Ask"], brokerAskTwoPrice: row["Broker 2 Ask"], brokerAskThreePrice: row["Broker 2 Ask"], bgnAskPrice: row["Today's Ask"], errors, object });
            }
            object["Mid"] = divider == 1 ? parseFloat(row["Today's Mid"]) : (object["Bid"] + object["Ask"]) / 2;
            console.log({ mid: object["Mid"], ask: object["Ask"], bid: object["Bid"], ticker: object["BB Ticker"], location: object["Location"] });

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

            object["Coupon Frequency"] = row["Coupon Frequency"].toString().includes("N/A") ? "" : row["Coupon Frequency"];
            if (isInteger(row["Bloomberg Mid BGN"])) {
              object["Bloomberg Mid BGN"] = row["Bloomberg Mid BGN"];
            }

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
            if (!row["Previous Settle Date"].includes("N/A") && !row["Previous Settle Date"].includes("#") && row["Previous Settle Date"]) {
              previousSettleDate[row["ISIN"]] = row["Previous Settle Date"];
            }
            if (!row["Next Settle Date"].includes("N/A") && !row["Next Settle Date"].includes("#") && row["Next Settle Date"]) {
              nextSettleDate[row["ISIN"]] = row["Next Settle Date"];
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
        let positions: any = getSecurityInPortfolioWithoutLocation(portfolio, currency, true);
        for (let indexPosition = 0; indexPosition < positions.length; indexPosition++) {
          let position = positions[indexPosition];
          position["Mid"] = currencyInUSD[currency];
          updatedPricePortfolio.push(position);
        }
      }

      for (let index = 0; index < updatedPricePortfolio.length; index++) {
        let position: PositionInDB = updatedPricePortfolio[index];
        let positionMaturity = maturity[position["ISIN"]];
        let positionCallDate = callDate[position["ISIN"]];
        let positionPreviousSettleDate = previousSettleDate[position["ISIN"]];
        let positionNextSettleDate = nextSettleDate[position["ISIN"]];

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
        if (maturityType == "month/day" && positionPreviousSettleDate) {
          updatedPricePortfolio[index]["Previous Settle Date"] = formatDateWorld(positionPreviousSettleDate);
        } else {
          updatedPricePortfolio[index]["Previous Settle Date"] = positionPreviousSettleDate;
        }
        if (maturityType == "month/day" && positionNextSettleDate) {
          updatedPricePortfolio[index]["Next Settle Date"] = formatDateWorld(positionNextSettleDate);
        } else {
          updatedPricePortfolio[index]["Next Settle Date"] = positionNextSettleDate;
        }
      }
      try {
        let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
        let updatedPortfolio = formatUpdatedPositions(updatedPricePortfolio, portfolio, "Last Price Update");

        if (collectionDate) {
          let snapShotName = getSQLIndexFormat(`portfolio-${getDateTimeInMongoDBCollectionFormat(collectionDate)}`, portfolioId);
          let action = await insertPositionsInPortfolio(updatedPortfolio.updatedPortfolio, portfolioId, snapShotName);
          await insertEditLogs([updatedPortfolio.positionsThatDoNotExistsNames, errors], "update_previous_prices_bbg", dateTime, "Num of Positions that did not update: " + Object.keys(updatedPortfolio.positionsThatDoNotExists).length, "Link: " + link);
        } else {
          let insertion = await insertPositionsInPortfolio(updatedPortfolio.updatedPortfolio, portfolioId);
          await insertEditLogs([updatedPortfolio.positionsThatDoNotExistsNames, errors], "update_prices", dateTime, "Num of Positions that did not update: " + Object.keys(updatedPortfolio.positionsThatDoNotExistsNames).length, "Link: " + link);
        }
        if (Object.keys(updatedPortfolio.positionsThatDoNotExistsNames).length || Object.keys(errors).length) {
          return { error: { ...updatedPortfolio.positionsThatDoNotExistsNames, ...errors } };
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
    let portfolio = await getPortfolio("portfolio_main");
    let positions: any = [];

    for (let index = 0; index < portfolio.length; index++) {
      let position = portfolio[index];
      let notional = position["Notional Amount"];
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

function determineBestPrice({
  brokerBidOnePrice,
  brokerBidTwoPrice,
  brokerBidThreePrice,
  bgnBidPrice,
  brokerAskOnePrice,
  brokerAskTwoPrice,
  brokerAskThreePrice,
  bgnAskPrice,
  ticker,
  object,

  errors,
}: {
  brokerBidOnePrice: string;
  brokerBidTwoPrice: string;
  brokerBidThreePrice: string;
  brokerAskOnePrice: string;
  brokerAskTwoPrice: string;
  brokerAskThreePrice: string;
  bgnBidPrice: number;
  bgnAskPrice: number;
  ticker: string;
  object: any;
  errors: { [key: string]: { notional: number; location: string; message: string } };
}) {
  if (isInteger(brokerBidOnePrice) && isInteger(brokerAskOnePrice) && brokerBidOnePrice && brokerAskOnePrice) {
    if (parseFloat(brokerBidOnePrice) != bgnBidPrice && parseFloat(brokerAskOnePrice) != bgnAskPrice) {
      object["Bid"] = parseFloat(brokerBidOnePrice) / 100;
      object["Ask"] = parseFloat(brokerAskOnePrice) / 100;
      return;
    }
  }
  if (isInteger(brokerBidTwoPrice) && isInteger(brokerAskTwoPrice) && brokerBidTwoPrice && brokerAskTwoPrice) {
    if (parseFloat(brokerBidTwoPrice) != bgnBidPrice && parseFloat(brokerAskTwoPrice) != bgnAskPrice) {
      object["Bid"] = parseFloat(brokerBidTwoPrice) / 100;
      object["Ask"] = parseFloat(brokerAskTwoPrice) / 100;
      return;
    }
  }
  if (isInteger(brokerBidThreePrice) && isInteger(brokerAskThreePrice) && brokerBidThreePrice && brokerAskThreePrice) {
    if (parseFloat(brokerBidThreePrice) != bgnBidPrice && parseFloat(brokerAskThreePrice) != bgnAskPrice) {
      object["Bid"] = parseFloat(brokerBidThreePrice) / 100;
      object["Ask"] = parseFloat(brokerAskThreePrice) / 100;
      return;
    }
  }
  object["Bid"] = bgnBidPrice / 100;
  object["Ask"] = bgnAskPrice / 100;
  errors[ticker + " Bid/Ask "] = { notional: 0, location: "", message: `${ticker}'s price is the same as BGN` };
  return;
}

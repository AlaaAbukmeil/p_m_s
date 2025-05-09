import { getAllDatesSinceLastMonthLastDay, getAllDatesSinceLastYearLastDay, getDateTimeInMongoDBCollectionFormat, getDaysBetween, getEarliestDateKeyAndValue, getLastDayOfMonth, monthlyRlzdDate, nextMonthlyRlzdDate } from "./common";
import { getFundDetails } from "../operations/fund";

import { formatDateUS, getTradeDateYearTrades } from "../common";
import { getAllCollectionNames, getEarliestCollectionName, getLatestDateYYYYMM, parseBondIdentifier, remainingDaysInYear, sortDateKeys } from "./tools";
import { getHistoricalPortfolio, getPinnedPositions } from "../operations/positions";
import { FinalPositionBackOffice, FundExposureOnlyMTD, FundMTD, PositionBeforeFormatting, PositionInDB, RlzdTrades } from "../../models/portfolio";
import { formatFrontOfficeTable } from "../analytics/tables/frontOffice";
import { formatBackOfficeTable, formatFactSheetStatsTable } from "../analytics/tables/backOffice";
import { getRlzdTrades, getRlzdTradesWithTrades, getTradesMTD } from "./trades";
import { insertEditLogs } from "../operations/logs";
import { CentralizedTrade } from "../../models/trades";
import { PositionAfterFormating } from "../../models/position";
import { isNotFirstMondayOfMonth } from "../analytics/tools";

export async function getPortfolioWithAnalytics(
  date: string,
  sort: string,
  sign: number,
  conditions: any = null,
  view: "front office" | "back office" | "exposure" | "fact sheet",
  sortBy: "pl" | "price move" | null,
  portfolioId: string
): Promise<{ portfolio: FinalPositionBackOffice[]; fundDetails: FundMTD; analysis: any; uploadTradesDate: any; updatePriceDate: number; collectionName: string; error: null } | { fundDetails: FundExposureOnlyMTD; analysis: any; error: null; mtdExpensesAmount: number } | { error: string }> {
  let timestamp = new Date().getTime();
  let allCollectionNames = await getAllCollectionNames(portfolioId);
  let timestamp_5 = new Date().getTime();
  console.log("To get all collections: ", (timestamp_5 - timestamp) / 1000 + " seconds");

  let earliestPortfolioName = getEarliestCollectionName(date, allCollectionNames);
  console.log({ earliestPortfolioName });
  let timestamp_6 = new Date().getTime();
  console.log("To sort collections: ", (timestamp_6 - timestamp_5) / 1000 + " seconds");

  let yesterdayPortfolioName = getDateTimeInMongoDBCollectionFormat(new Date(new Date(earliestPortfolioName.predecessorDate).getTime() - 1 * 24 * 60 * 60 * 1000)).split(" ")[0] + " 23:59";
  let lastDayBeforeToday = getEarliestCollectionName(yesterdayPortfolioName, allCollectionNames);
  let lastDayOfThisMonth = getLastDayOfMonth(date);
  let yesterdayYesterdayPortfolioName = getDateTimeInMongoDBCollectionFormat(new Date(new Date(lastDayBeforeToday.predecessorDate).getTime() - 1 * 24 * 60 * 60 * 1000)).split(" ")[0] + " 23:59";
  let lastDayBeforeYesterday = getEarliestCollectionName(yesterdayYesterdayPortfolioName, allCollectionNames);

  let lastDayOfThisMonthCollectionName = getEarliestCollectionName(lastDayOfThisMonth, allCollectionNames);
  console.log(lastDayOfThisMonthCollectionName.predecessorDate, "get rlzd dyanmic date");

  console.log(earliestPortfolioName.predecessorDate, "get portfolio");
  console.log(lastDayBeforeToday.predecessorDate, "get portfolio yesterday");

  let timestamp_11 = new Date().getTime();

  let documents: PositionBeforeFormatting[] = await getHistoricalPortfolio(earliestPortfolioName.predecessorDate, portfolioId, true);
  const lastDayOfLastYear = new Date(new Date().getFullYear(), 0, 0);

  for (let index = 0; index < documents.length; index++) {
    //we used to use quantity before jan 2024
    documents[index]["Notes"] = "";
    let latestDateKey;

    latestDateKey = Object.keys(documents[index]["Interest"]).sort((a, b) => {
      // Parse the date strings into actual date objects
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();

      // Compare the dates to sort them
      return dateB - dateA; // This will sort in descending order
    })[0]; // Take the first item after sorting

    const latestDate = latestDateKey ? new Date(latestDateKey) : null;

    if (latestDate && latestDate <= lastDayOfLastYear && documents[index]["Notional Amount"] == 0) {
      // If not, remove the document from the array
      documents.splice(index, 1);
    }
  }

  let thisMonth = monthlyRlzdDate(date);

  let currentDayDate: Date = new Date(date);
  let previousMonthDates = getAllDatesSinceLastMonthLastDay(currentDayDate);
  let previousYearDate = getAllDatesSinceLastYearLastDay(currentDayDate);
  let lastYear = monthlyRlzdDate(previousYearDate);
  //+ 23:59 to make sure getEarliestcollectionname get the lastest date on last day of the month
  let lastMonthLastCollectionName = getEarliestCollectionName(previousMonthDates[0] + " 23:59", allCollectionNames);
  let lastYearLastCollectionName = getEarliestCollectionName(previousYearDate + " 23:59", allCollectionNames);
  console.log(lastYearLastCollectionName.predecessorDate, "last year collection name");
  let timestamp_7 = new Date().getTime();
  let lastMonthPortfolio = await getHistoricalPortfolio(lastMonthLastCollectionName.predecessorDate, portfolioId);
  let timestamp_8 = new Date().getTime();
  console.log("To get one portfolio: ", (timestamp_8 - timestamp_7) / 1000 + " seconds");

  let previousDayPortfolio = await getHistoricalPortfolio(lastDayBeforeToday.predecessorDate, portfolioId);
  let previousPreviousDayPortfolio = await getHistoricalPortfolio(lastDayBeforeYesterday.predecessorDate, portfolioId);
  console.log("3-day analytics referencce", lastDayBeforeYesterday.predecessorDate);

  let timestamp_2 = new Date().getTime();

  console.log("To get all portfolios: ", (timestamp_2 - timestamp_11) / 1000 + " seconds");

  let ytdDocuments = getYTDInt(documents, lastYearLastCollectionName.predecessorDate, date);
  documents = ytdDocuments.portfolio;
  let ytdinterest = ytdDocuments.ytdinterest;

  documents = documents.filter((position: PositionBeforeFormatting) => {
    if (position["Notional Amount"] == 0) {
      let monthsTrades = Object.keys(position["Interest"] || {});

      for (let index = 0; index < monthsTrades.length; index++) {
        monthsTrades[index] = monthlyRlzdDate(monthsTrades[index]);
      }

      if (monthsTrades.includes(thisMonth)) {
        return position;
      } else {
        if (typeof position["Cost MTD"] != "object") {
          position["Cost MTD"] = {};
        }
        let monthsCostTrades = Object.keys(position["Cost MTD"] || {});
        for (let index = 0; index < monthsCostTrades.length; index++) {
          monthsCostTrades[index] = monthlyRlzdDate(monthsCostTrades[index]);
        }
        if (monthsCostTrades.includes(thisMonth)) {
          return position;
        }
      }
    } else {
      return position;
    }
  });
  documents = getMTDParams(documents, lastMonthPortfolio, earliestPortfolioName.predecessorDate);
  documents = getDayParams(documents, previousDayPortfolio, lastDayBeforeToday.predecessorDate, false);
  documents = getDayParams(documents, previousPreviousDayPortfolio, lastDayBeforeYesterday.predecessorDate, true);

  let timestamp_3 = new Date().getTime();
  let mtdTrades: CentralizedTrade[] = await getTradesMTD(date);
  documents = getMTDURlzdInt(documents, new Date(date), mtdTrades);
  let timestamp_4 = new Date().getTime();
  console.log("To calculate rlzd: ", (timestamp_4 - timestamp_3) / 1000 + " seconds");

  let dayParamsWithLatestUpdates = getDayURlzdInt(documents, new Date(date));
  documents = dayParamsWithLatestUpdates.portfolio;

  documents = getPL(documents, date);
  let dates = {
    today: earliestPortfolioName.predecessorDate,
    yesterday: lastDayBeforeToday.predecessorDate,
    lastMonth: lastMonthLastCollectionName.predecessorDate,
  };
  let timestamp_9 = new Date().getTime();

  let previousMonthDate = monthlyRlzdDate(previousMonthDates[0]);
  let fundDetailsMTD: any = await getFundDetails(previousMonthDate, "portfolio_main");
  let fundDetailsYTD: any = await getFundDetails(lastYear, "portfolio_main");
  let timestamp_10 = new Date().getTime();
  console.log("To get fund: ", (timestamp_10 - timestamp_9) / 1000 + " seconds");

  if (fundDetailsMTD.length == 0) {
    return { error: "fundDetailsMTD Does not exist" };
  }

  if (!fundDetailsYTD.length) {
    fundDetailsYTD = fundDetailsMTD;
  }
  fundDetailsYTD = fundDetailsYTD[0];
  let fund = fundDetailsMTD[0];
  let portfolioFormattedSorted;
  if (view == "fact sheet") {
    portfolioFormattedSorted = formatFactSheetStatsTable({ portfolio: documents, date: date, fund: fund, dates: dates, sort: sort, sign: sign, conditions: conditions, fundDetailsYTD: fundDetailsYTD, sortBy: sortBy, ytdinterest: ytdinterest });
    let fundDetails = portfolioFormattedSorted.fundDetails;
    let final_timestamp = new Date().getTime();
    console.log("final: ", (final_timestamp - timestamp) / 1000 + " seconds");

    return { fundDetails: fundDetails, analysis: portfolioFormattedSorted.analysis, error: null, mtdExpensesAmount: 0 };
  } else {
    if (view == "front office" || view == "exposure") {
      portfolioFormattedSorted = formatFrontOfficeTable({ portfolio: documents, date: date, fund: fund, dates: dates, sort: sort, sign: sign, conditions: conditions, fundDetailsYTD: fundDetailsYTD, sortBy: sortBy, view: view, ytdinterest: ytdinterest });
    } else {
      portfolioFormattedSorted = formatBackOfficeTable({ portfolio: documents, date: date, fund: fund, dates: dates, sort: sort, sign: sign, conditions: conditions, fundDetailsYTD: fundDetailsYTD, sortBy: sortBy, ytdinterest: ytdinterest });
    }
    let fundDetails = portfolioFormattedSorted.fundDetails;
    let finalDocuments = portfolioFormattedSorted.portfolio;
    let final_timestamp = new Date().getTime();
    console.log("final: ", (final_timestamp - timestamp) / 1000 + " seconds");

    return { portfolio: finalDocuments, fundDetails: fundDetails, analysis: portfolioFormattedSorted.analysis, uploadTradesDate: dayParamsWithLatestUpdates.lastUploadTradesDate, updatePriceDate: dayParamsWithLatestUpdates.lastUpdatePricesDate, collectionName: earliestPortfolioName.predecessorDate, error: null, mtdExpensesAmount: portfolioFormattedSorted.mtdExpensesAmount };
  }
}

export function getDayParams(portfolio: PositionBeforeFormatting[] | any, previousDayPortfolio: any, dateInput: any, threeDayAnalytics = false) {
  // try {

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    let thisMonth = monthlyRlzdDate(dateInput);

    if (!threeDayAnalytics) {
      if (!portfolio[index]["Mid"] && portfolio[index]["Type"] != "FX") {
        portfolio[index]["Mid"] = portfolio[index]["Entry Price"][thisMonth];
      }
      let previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue: any) => previousDayIssue["ISIN"] == position["ISIN"] && previousDayIssue["ISIN"] && position["ISIN"] && previousDayIssue["Notional Amount"] != 0) : null;

      if (previousDayPosition) {
        let previousMark = previousDayPosition["Mid"];
        let previousFxRate = previousDayPosition["FX Rate"];
        portfolio[index]["Previous FX"] = previousFxRate;
        portfolio[index]["Previous Mark"] = previousMark;
      }

      if (!portfolio[index]["Type"]) {
        portfolio[index]["Type"] = portfolio[index]["BB Ticker"].split(" ")[0] == "T" || portfolio[index]["Issuer"] == "US TREASURY N/B" ? "UST" : portfolio[index]["ISIN"].includes(" IB") ? "FUT" : "BND";
      }

      if (!portfolio[index]["Strategy"]) {
        portfolio[index]["Strategy"] = portfolio[index]["Notional Amount"] < 0 ? "Hedge" : portfolio[index]["BB Ticker"].toLowerCase().includes("perp") ? "CE" : "VI";
      }

      if (portfolio[index]["Notional Amount"] < 0) {
        portfolio[index]["Asset Class"] = "Hedge";
      }
      portfolio[index]["Entry Price"] = portfolio[index]["Entry Price"] ? portfolio[index]["Entry Price"] : {};
      let latestEntryPrices = getLatestDateYYYYMM(Object.keys(portfolio[index]["Entry Price"]));
      let entryPrice = portfolio[index]["Entry Price"] ? (portfolio[index]["Entry Price"][latestEntryPrices] ? portfolio[index]["Entry Price"][latestEntryPrices] : portfolio[index]["MTD Mark"]) : portfolio[index]["MTD Mark"];
      portfolio[index]["Entry Price"] = entryPrice;

      if (!portfolio[index]["Previous Mark"]) {
        if (portfolio[index]["Notional Amount"] != 0) {
          console.log("position should start today " + portfolio[index]["BB Ticker"]);
        }
        portfolio[index]["Previous Mark"] = entryPrice ? entryPrice : portfolio[index]["Mid"];
        portfolio[index]["Notes"] = portfolio[index]["Notes"] ? portfolio[index]["Notes"] : "";
        portfolio[index]["Notes"] += " Previous Mark X ";
      }

      let todayPrice: any = position["Mid"];
      let yesterdayPrice: any = position["Previous Mark"];

      if (portfolio[index]["Type"] == "BND" || portfolio[index]["Type"] == "UST") {
        portfolio[index]["Day Price Move"] = Math.round((todayPrice - yesterdayPrice) * 10000) / 100 || 0;
      } else {
        portfolio[index]["Day Price Move"] = 0;
      }
    } else if (threeDayAnalytics) {
      let todayPrice: any = position["Mid"];
      let previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue: any) => previousDayIssue["ISIN"] == position["ISIN"] && previousDayIssue["ISIN"] && position["ISIN"]) : null;

      if (!previousDayPosition) {
        previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue: any) => previousDayIssue["BB Ticker"] == position["BB Ticker"] && previousDayIssue["BB Ticker"] && position["BB Ticker"]) : null;
      }
      let yesterdayTwoPrice = previousDayPosition ? previousDayPosition["Mid"] : todayPrice;
      if (portfolio[index]["Type"] == "BND" || portfolio[index]["Type"] == "UST") {
        portfolio[index]["3-Day Price Move"] = Math.round((todayPrice - yesterdayTwoPrice) * 10000) / 100 || 0;
      } else {
        portfolio[index]["3-Day Price Move"] = 0;
      }
    }
  }

  return portfolio;
}

export function getMTDParams(portfolio: any, lastMonthPortfolio: any, dateInput: string) {
  try {
    let thisMonth = monthlyRlzdDate(dateInput);

    for (let index = 0; index < portfolio.length; index++) {
      let position = portfolio[index];
      let lastMonthPosition;

      for (let lastMonthIndex = 0; lastMonthIndex < lastMonthPortfolio.length; lastMonthIndex++) {
        lastMonthPosition = lastMonthPortfolio[lastMonthIndex];
        portfolio[index]["Notes"] = portfolio[index]["Notes"] ? portfolio[index]["Notes"] : "";

        if (lastMonthPosition["ISIN"] == position["ISIN"] && parseFloat(lastMonthPosition["Mid"])) {
          portfolio[index]["MTD Mark"] = lastMonthPosition["Mid"];
          portfolio[index]["MTD FX"] = lastMonthPosition["FX Rate"] ? lastMonthPosition["FX Rate"] : portfolio[index]["Previous Rate"];
        }
        if (lastMonthPosition["ISIN"] == position["ISIN"] && lastMonthPosition["Location"] == position["Location"]) {
          portfolio[index]["MTD Notional"] = lastMonthPosition["Notional Amount"];
        }
      }
    }

    for (let index = 0; index < portfolio.length; index++) {
      if (portfolio[index]["Type"] != "FX") {
        if (!parseFloat(portfolio[index]["MTD Mark"]) && parseFloat(portfolio[index]["MTD Mark"]) != 0 && portfolio[index]["Entry Price"][thisMonth]) {
          portfolio[index]["MTD Mark"] = portfolio[index]["Entry Price"][thisMonth];
          portfolio[index]["Notes"] = portfolio[index]["Notes"] ? portfolio[index]["Notes"] : "";

          portfolio[index]["Notes"] += "MTD Mark X ";
        }
      }
    }

    return portfolio;
  } catch (error) {
    console.log(error);
    return portfolio;
  }
}

export function getDayURlzdInt(portfolio: any, date: any) {
  let lastUploadTradesDate = 0,
    lastUpdatePricesDate = 0;
  let weekend = isNotFirstMondayOfMonth(date);

  let daysRemaining = remainingDaysInYear(date);
  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    portfolio[index]["Principal"] = 0;
    let quantityGeneratingInterest = position["Notional Amount"];
    portfolio[index]["Interest"] = sortDateKeys(portfolio[index]["Interest"] || {});
    let interestInfo = position["Interest"] || {};
    let yesterdayPrice = position["Previous Mark"];
    if (!yesterdayPrice) {
      console.log("huge error: ", position["BB Ticker"]);
    }

    if (position["Last Upload Trade"] > lastUploadTradesDate) {
      lastUploadTradesDate = parseFloat(position["Last Upload Trade"]);
    }
    if (position["Last Price Update"] > lastUpdatePricesDate) {
      lastUpdatePricesDate = parseFloat(position["Last Price Update"]);
    }

    let todayPrice: any = parseFloat(position["Mid"]);
    portfolio[index]["Day URlzd"] = portfolio[index]["Type"] == "CDS" ? ((parseFloat(todayPrice) - parseFloat(yesterdayPrice)) * portfolio[index]["Notional Amount"]) / portfolio[index]["Original Face"] : (parseFloat(todayPrice) - parseFloat(yesterdayPrice)) * portfolio[index]["Notional Amount"] || 0;

    if (portfolio[index]["Day URlzd"] == undefined || portfolio[index]["Day URlzd"] == null) {
      portfolio[index]["Day URlzd"] = 0;
    }

    let settlementDates = Object.keys(interestInfo);
    for (let indexSettlementDate = 0; indexSettlementDate < settlementDates.length; indexSettlementDate++) {
      let settlementDate = settlementDates[indexSettlementDate];
      let settlementDateTimestamp = new Date(settlementDate).getTime();
      portfolio[index]["Principal"] += interestInfo[settlementDate];
      portfolio[index]["Interest"][settlementDate + " Total"] = portfolio[index]["Principal"];
      if (settlementDateTimestamp >= new Date(date).getTime()) {
        quantityGeneratingInterest -= interestInfo[settlementDate];
      }
    }
    let couponDaysYear = parseFloat(portfolio[index]["Coupon Duration"]) || 360;
    portfolio[index]["Day Int."] = ((parseFloat(quantityGeneratingInterest) * (portfolio[index]["Coupon Rate"] / 100.0)) / couponDaysYear) * weekend;
    portfolio[index]["30-Day Int. EST"] = ((parseFloat(position["Notional Amount"]) * (portfolio[index]["Coupon Rate"] / 100.0)) / couponDaysYear) * 30;
    portfolio[index]["365-Day Int. EST"] = ((parseFloat(position["Notional Amount"]) * (portfolio[index]["Coupon Rate"] / 100.0)) / couponDaysYear) * daysRemaining || 0;

    if (!portfolio[index]["Day Int."]) {
      portfolio[index]["Day Int."] = 0;
    }
    if (position["Notional Amount"] == 0) {
      //rlzd positions, the reason why we dont seperate prinicpal calculation, its too complicated to maintain and calculate, better off modify it at end of month.
      position["Principal"] = 0;
    }
  }
  return { portfolio: portfolio, lastUpdatePricesDate: lastUpdatePricesDate, lastUploadTradesDate: lastUploadTradesDate };
}

export function getPrincipal(portfolio: any) {
  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    portfolio[index]["Principal"] = 0;
    let interestInfo = position["Interest"] || {};

    let settlementDates = Object.keys(interestInfo);
    for (let indexSettlementDate = 0; indexSettlementDate < settlementDates.length; indexSettlementDate++) {
      let settlementDate = settlementDates[indexSettlementDate];
      portfolio[index]["Principal"] += parseFloat(interestInfo[settlementDate]);
    }
  }
  return { portfolio: portfolio };
}

export function getMTDURlzdInt(portfolio: any, date: any, mtdTrades: CentralizedTrade[]) {
  let currentDayDate: string = new Date(date).toISOString().slice(0, 10);
  let previousMonthDates = getAllDatesSinceLastMonthLastDay(currentDayDate);
  let monthlyInterest: any = {};
  let dateInTradeDateFormat = formatDateUS(date);

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    let todayPrice = parseFloat(portfolio[index]["Mid"]);

    let tradeType: "vcons" | "ib" | "emsx" | "written_blotter" | "cds_gs" | "fx" = "vcons";
    let identifier = portfolio[index]["ISIN"];
    let typeCheck = portfolio[index]["Type"] || "";
    if (identifier.includes("IB")) {
      tradeType = "ib";
    } else if (identifier.includes("1393")) {
      tradeType = "emsx";
    } else if (typeCheck.includes("CDS")) {
      tradeType = "cds_gs";
    } else if (typeCheck.includes("FX")) {
      tradeType = "fx";
    }

    let multiplier = tradeType == "vcons" ? 100 : 1;
    if (tradeType != "fx") {
      let trades = getRlzdTradesWithTrades(`${tradeType}`, identifier, portfolio[index]["Location"], date, portfolio[index]["MTD Mark"] * multiplier, portfolio[index]["MTD Notional"], mtdTrades, portfolio[index]["BB Ticker"]);
      portfolio[index]["MTD Rlzd"] = trades.totalRow["Rlzd P&L Amount"];
      portfolio[index]["Day Rlzd"] = trades.pnlDayRlzdHistory[dateInTradeDateFormat] || 0;

      portfolio[index]["Average Cost MTD"] = trades.averageCostMTD / multiplier;
    } else {
      portfolio[index]["MTD Rlzd"] = 0;
      portfolio[index]["Day Rlzd"] = 0;
      portfolio[index]["Average Cost MTD"] = portfolio[index]["MTD Mark"];
    }

    portfolio[index]["MTD URlzd"] = portfolio[index]["Type"] == "CDS" ? ((todayPrice - portfolio[index]["MTD Mark"]) * portfolio[index]["Notional Amount"]) / portfolio[index]["Original Face"] : (todayPrice - portfolio[index]["MTD Mark"]) * portfolio[index]["Notional Amount"];

    if (portfolio[index]["MTD URlzd"] == 0) {
      portfolio[index]["MTD URlzd"] = 0;
    } else if (!portfolio[index]["MTD URlzd"]) {
      portfolio[index]["MTD URlzd"] = 0;
    }

    if (portfolio[index]["Type"] == "BND" || portfolio[index]["Type"] == "UST") {
      portfolio[index]["MTD Price Move"] = Math.round((todayPrice - portfolio[index]["Average Cost MTD"]) * 100000000) / 1000000 || 0;
    } else {
      portfolio[index]["MTD Price Move"] = 0;
    }
    let quantityGeneratingInterest = position["Notional Amount"];
    let interestInfo = position["Interest"] || {};

    portfolio[index]["MTD Int."] = 0;

    let settlementDates = Object.keys(interestInfo);

    monthlyInterest[position["BB Ticker"]] = {};
    // reason why 1, to ignore last day of last month
    for (let indexPreviousMonthDates = 1; indexPreviousMonthDates < previousMonthDates.length; indexPreviousMonthDates++) {
      let dayInCurrentMonth = previousMonthDates[indexPreviousMonthDates]; //OCT 1st -
      monthlyInterest[position["BB Ticker"]][dayInCurrentMonth] = quantityGeneratingInterest; // 2000 000

      for (let indexSettlementDate = 0; indexSettlementDate < settlementDates.length; indexSettlementDate++) {
        let settlementDate = settlementDates[indexSettlementDate]; // oct 11th
        let settlementDateTimestamp = new Date(settlementDate).getTime();
        if (settlementDateTimestamp > new Date(dayInCurrentMonth).getTime()) {
          monthlyInterest[position["BB Ticker"]][dayInCurrentMonth] -= interestInfo[settlementDate]; // 25 00 000
        }
      }
      let couponDaysYear = parseFloat(position["Coupon Duration"]) ? parseFloat(position["Coupon Duration"]) : 360;

      let dayInCurrentMonthInterestEarned = (parseFloat(monthlyInterest[position["BB Ticker"]][dayInCurrentMonth]) * (portfolio[index]["Coupon Rate"] / 100.0)) / couponDaysYear;
      if (!dayInCurrentMonthInterestEarned) {
        dayInCurrentMonthInterestEarned = 0;
      }

      monthlyInterest[position["BB Ticker"]][dayInCurrentMonth] = dayInCurrentMonthInterestEarned;
      portfolio[index]["MTD Int."] += dayInCurrentMonthInterestEarned;
    }
  }

  return portfolio;
}

export function getYTDInt(portfolio: any, lastYearDate: any, date: any) {
  let ytdinterest = 0;
  for (let index = 0; index < portfolio.length; index++) {
    portfolio[index]["Coupon Rate"] = portfolio[index]["Coupon Rate"] ? portfolio[index]["Coupon Rate"] : parseBondIdentifier(portfolio[index]["BB Ticker"]).rate || 0;

    portfolio[index]["Coupon Duration"] = parseFloat(portfolio[index]["Coupon Duration"]) ? parseFloat(portfolio[index]["Coupon Duration"]) : portfolio[index]["Type"] == "UST" ? 365.0 : 360.0;
    portfolio[index]["YTD Int."] = portfolio[index]["Type"] != "FX" ? calculateAccruedSinceLastYear(portfolio[index]["Interest"], portfolio[index]["Coupon Rate"] / 100, portfolio[index]["Coupon Duration"], lastYearDate, portfolio[index]["ISIN"], date) : 0;
    ytdinterest += portfolio[index]["YTD Int."];
  }

  return { portfolio: portfolio, ytdinterest: ytdinterest };
}

export function getPL(portfolio: any, date: any) {
  let thisMonth = monthlyRlzdDate(date);
  for (let index = 0; index < portfolio.length; index++) {
    portfolio[index]["Cost MTD"] = portfolio[index]["Cost MTD"] ? portfolio[index]["Cost MTD"][thisMonth] || 0 : 0;
    portfolio[index]["Day P&L"] = parseFloat(portfolio[index]["Day Int."]) + parseFloat(portfolio[index]["Day Rlzd"]) + parseFloat(portfolio[index]["Day URlzd"]) ? parseFloat(portfolio[index]["Day Int."]) + parseFloat(portfolio[index]["Day Rlzd"]) + parseFloat(portfolio[index]["Day URlzd"]) : 0;
    portfolio[index]["MTD P&L"] = parseFloat(portfolio[index]["MTD Rlzd"]) + (parseFloat(portfolio[index]["MTD URlzd"]) || 0) + parseFloat(portfolio[index]["MTD Int."]) || 0;
    portfolio[index]["YTD P&L"] = (parseFloat(portfolio[index]["YTD Rlzd"]) || 0) + (parseFloat(portfolio[index]["YTD URlzd"]) || 0) + parseFloat(portfolio[index]["YTD Int."]) || 0;
  }
  return portfolio;
}

export function calculateAccruedSinceLastYear(interestInfo: any, couponRate: any, numOfDaysInAYear: any, lastYearDate: any, isin: string, dateInput: any) {
  try {
    let quantityDates = Object.keys(interestInfo).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    lastYearDate = new Date(lastYearDate).getTime();
    quantityDates.push(formatDateUS(new Date(dateInput)));
    dateInput = new Date(dateInput).getTime();
    couponRate = couponRate ? couponRate : 0;
    let quantity = interestInfo[quantityDates[0]];
    let interest = 0;
    for (let index = 0; index < quantityDates.length; index++) {
      if (quantityDates[index + 1]) {
        if (new Date(quantityDates[index]).getTime() < lastYearDate && new Date(quantityDates[index + 1]).getTime() > lastYearDate) {
          let numOfDays = getDaysBetween(lastYearDate, quantityDates[index + 1]);

          interest += (couponRate / numOfDaysInAYear) * numOfDays * quantity;
        } else if (new Date(quantityDates[index]).getTime() > lastYearDate && new Date(quantityDates[index + 1]).getTime() < dateInput) {
          let numOfDays = getDaysBetween(quantityDates[index], quantityDates[index + 1]);

          interest += (couponRate / numOfDaysInAYear) * numOfDays * quantity;
        } else if (new Date(quantityDates[index]).getTime() > lastYearDate && new Date(quantityDates[index + 1]).getTime() > dateInput) {
          let numOfDays = getDaysBetween(quantityDates[index], dateInput);

          interest += (couponRate / numOfDaysInAYear) * numOfDays * quantity;
        }
      }
      quantity += interestInfo[quantityDates[index + 1]] ? interestInfo[quantityDates[index + 1]] : 0;
    }

    return interest;
  } catch (error) {
    console.log(error);
  }
}

export function calculateRlzd(trades: RlzdTrades[], mark: number, issue: string, assetClass = "") {
  let total = 0;

  for (let index = 0; index < trades.length; index++) {
    let trade = trades[index];
    let price = parseFloat(trade.price);
    let quantity = parseFloat(trade.quantity);
    if (assetClass.toString().includes("CDS")) {
      quantity = quantity / 10000000;
    }

    let rlzdTrade = (price - mark) * quantity;

    total += rlzdTrade;
  }

  return total;
}

export function calculateAccruedSinceInception(interestInfo: any, couponRate: any, numOfDaysInAYear: any, isin: string, date: string) {
  if (!interestInfo) {
    interestInfo = {};
  }
  let quantityDates = Object.keys(interestInfo)
    .filter((date: string, index: number) => !date.includes("Total"))
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  quantityDates.push(formatDateUS(new Date(date)));
  couponRate = couponRate ? couponRate : 0;
  let quantity = interestInfo[quantityDates[0]];
  let interest = 0;

  for (let index = 0; index < quantityDates.length; index++) {
    if (quantityDates[index + 1]) {
      let numOfDays = getDaysBetween(quantityDates[index], quantityDates[index + 1]);

      interest += (couponRate / numOfDaysInAYear) * numOfDays * quantity;
    }
    quantity += interestInfo[quantityDates[index + 1]] ? interestInfo[quantityDates[index + 1]] : 0;
  }

  return interest;
}

export async function getPortfolioOnSpecificDate(collectionDate: string, onlyThisMonth: null | string = null, portfolioId: string): Promise<{ portfolio: PositionInDB[] | []; date: string }> {
  try {
    let date = getDateTimeInMongoDBCollectionFormat(new Date(collectionDate)).split(" ")[0] + " 23:59";
    let allCollectionNames = await getAllCollectionNames(portfolioId);
    let earliestCollectionName = getEarliestCollectionName(date, allCollectionNames);

    let documents: PositionBeforeFormatting[] = await getHistoricalPortfolio(earliestCollectionName.predecessorDate, portfolioId, true);

    if (onlyThisMonth) {
      let thisMonth = monthlyRlzdDate(collectionDate);
      documents.filter((position: any) => {
        if (position["Notional Amount"] == 0) {
          let monthsTrades = Object.keys(position["Interest"] || {});
          for (let index = 0; index < monthsTrades.length; index++) {
            monthsTrades[index] = monthlyRlzdDate(monthsTrades[index]);
          }
          if (monthsTrades.includes(thisMonth)) {
            return position;
          } else {
            if (typeof position["Cost MTD"] != "object") {
              position["Cost MTD"] = {};
            }
            let monthsCostTrades = Object.keys(position["Cost MTD"] || {});
            for (let index = 0; index < monthsCostTrades.length; index++) {
              monthsCostTrades[index] = monthlyRlzdDate(monthsCostTrades[index]);
            }
            if (monthsCostTrades.includes(thisMonth)) {
              return position;
            }
          }
        } else {
          return position;
        }
      });
    }

    return { portfolio: documents, date: earliestCollectionName.predecessorDate };
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getPortfolioOnSpecificDate", "controllers/operations/operations.ts");
    return { portfolio: [], date: "" };
  }
}

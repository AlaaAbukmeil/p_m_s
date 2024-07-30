import { client } from "../userManagement/auth";

import { formatDateRlzdDaily, getAllDatesSinceLastMonthLastDay, getAllDatesSinceLastYearLastDay, getDateTimeInMongoDBCollectionFormat, getDaysBetween, getEarliestDateKeyAndValue, getLastDayOfMonth, monthlyRlzdDate } from "./common";
import { getFundDetails } from "../operations/fund";

import { formatDateUS } from "../common";
import { getEarliestCollectionName, parseBondIdentifier, remainingDaysInYear } from "./tools";
import { getHistoricalPortfolio, getPinnedPositions } from "../operations/positions";
import { FinalPositionBackOffice, FundExposureOnlyMTD, FundMTD, PositionBeforeFormatting, PositionInDB, RlzdTrades } from "../../models/portfolio";
import { Position } from "../../models/position";
import { formatFrontOfficeTable } from "../analytics/tables/frontOffice";
import { formatBackOfficeTable, formatFactSheetStatsTable } from "../analytics/tables/backOffice";
import { getRlzdTrades } from "./trades";
import { insertEditLogs } from "../operations/logs";
import { getMonthInFundDetailsFormat } from "../operations/tools";

export async function getPortfolioWithAnalytics(date: string, sort: string, sign: number, conditions: any = null, view: "front office" | "back office" | "exposure" | "fact sheet", sortBy: "pl" | "price move" | null): Promise<{ portfolio: FinalPositionBackOffice[]; fundDetails: FundMTD; analysis: any; uploadTradesDate: any; updatePriceDate: number; collectionName: string; error: null } | { fundDetails: FundExposureOnlyMTD; analysis: any; error: null } | { error: string }> {
  const database = client.db("portfolios");
  let earliestPortfolioName = await getEarliestCollectionName(date);

  let yesterdayPortfolioName = getDateTimeInMongoDBCollectionFormat(new Date(new Date(earliestPortfolioName.predecessorDate).getTime() - 1 * 24 * 60 * 60 * 1000)).split(" ")[0] + " 23:59";
  let lastDayBeforeToday = await getEarliestCollectionName(yesterdayPortfolioName);
  let lastDayOfThisMonth = getLastDayOfMonth(date);
  let yesterdayYesterdayPortfolioName = getDateTimeInMongoDBCollectionFormat(new Date(new Date(lastDayBeforeToday.predecessorDate).getTime() - 1 * 24 * 60 * 60 * 1000)).split(" ")[0] + " 23:59";
  let lastDayBeforeYesterday = await getEarliestCollectionName(yesterdayYesterdayPortfolioName);

  let lastDayOfThisMonthCollectionName = await getEarliestCollectionName(lastDayOfThisMonth);
  console.log(lastDayOfThisMonthCollectionName.predecessorDate, "get rlzd dyanmic date");

  console.log(earliestPortfolioName.predecessorDate, "get portfolio");
  console.log(lastDayBeforeToday.predecessorDate, "get portfolio yesterday");

  const reportCollection = database.collection(`portfolio-${earliestPortfolioName.predecessorDate}`);

  let documents: PositionBeforeFormatting[] = await reportCollection
    .aggregate([
      {
        $sort: {
          "BB Ticker": 1, // replace 'BB Ticker' with the name of the field you want to sort alphabetically
        },
      },
    ])
    .toArray();
  const lastDayOfLastYear = new Date(new Date().getFullYear(), 0, 0);

  for (let index = 0; index < documents.length; index++) {
    //we used to use quantity before jan 2024
    documents[index]["Notional Amount"] = documents[index]["Notional Amount"] || parseFloat(documents[index]["Notional Amount"]) == 0 ? documents[index]["Notional Amount"] : documents[index]["Quantity"];
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

    if (latestDate && latestDate <= lastDayOfLastYear && parseFloat(documents[index]["Notional Amount"]) == 0) {
      // If not, remove the document from the array
      documents.splice(index, 1);
    }
  }
  let latestCollectionDate = documents;
  if (earliestPortfolioName.predecessorDate != lastDayOfThisMonthCollectionName.predecessorDate) {
    latestCollectionDate = await getHistoricalPortfolio(lastDayOfThisMonthCollectionName.predecessorDate);
  }

  let thisMonth = monthlyRlzdDate(date);

  let currentDayDate: Date = new Date(date);
  let previousMonthDates = getAllDatesSinceLastMonthLastDay(currentDayDate);
  let previousYearDate = getAllDatesSinceLastYearLastDay(currentDayDate);
  let lastYear = monthlyRlzdDate(previousYearDate);
  //+ 23:59 to make sure getEarliestcollectionname get the lastest date on last day of the month
  let lastMonthLastCollectionName = await getEarliestCollectionName(previousMonthDates[0] + " 23:59");
  let lastYearLastCollectionName = await getEarliestCollectionName(previousYearDate + " 23:59");
  console.log(lastYearLastCollectionName.predecessorDate, "last year collection name");
  let lastMonthPortfolio = await getHistoricalPortfolio(lastMonthLastCollectionName.predecessorDate);
  let previousDayPortfolio = await getHistoricalPortfolio(lastDayBeforeToday.predecessorDate);
  let previousPreviousDayPortfolio = await getHistoricalPortfolio(lastDayBeforeYesterday.predecessorDate);
  let ytdDocuments = await getYTDInt(documents, lastYearLastCollectionName.predecessorDate, date);
  documents = ytdDocuments.portfolio;
  let ytdinterest = ytdDocuments.ytdinterest;

  documents = documents.filter((position: PositionBeforeFormatting) => {
    if (parseFloat(position["Notional Amount"]) == 0) {
      let monthsTrades = Object.keys(position["Interest"] || {});
      for (let index = 0; index < monthsTrades.length; index++) {
        monthsTrades[index] = monthlyRlzdDate(monthsTrades[index]);
      }
      if (monthsTrades.includes(thisMonth)) {
        return position;
      } else {
      }
    } else {
      return position;
    }
  });
  documents = getDayParams(documents, previousDayPortfolio, lastDayBeforeToday.predecessorDate, false);
  documents = getDayParams(documents, previousPreviousDayPortfolio, lastDayBeforeYesterday.predecessorDate, true);
  documents = getMTDParams(documents, lastMonthPortfolio, earliestPortfolioName.predecessorDate);

  documents = await getMTDURlzdInt(documents, new Date(date));
  let dayParamsWithLatestUpdates = await getDayURlzdInt(documents, new Date(date));
  documents = dayParamsWithLatestUpdates.portfolio;

  documents = await getPL(documents, latestCollectionDate, date);
  let dates = {
    today: earliestPortfolioName.predecessorDate,
    yesterday: lastDayBeforeToday.predecessorDate,
    lastMonth: lastMonthLastCollectionName.predecessorDate,
  };
  let pinnedPositions = await getPinnedPositions();
  documents = assignPinnedPositions(documents, pinnedPositions);
  let previousMonthDate = monthlyRlzdDate(previousMonthDates[0]);
  let fundDetailsMTD: any = await getFundDetails(previousMonthDate);
  let fundDetailsYTD: any = await getFundDetails(lastYear);

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
    return { fundDetails: fundDetails, analysis: portfolioFormattedSorted.analysis, error: null };
  } else {
    if (view == "front office" || view == "exposure") {
      portfolioFormattedSorted = formatFrontOfficeTable({ portfolio: documents, date: date, fund: fund, dates: dates, sort: sort, sign: sign, conditions: conditions, fundDetailsYTD: fundDetailsYTD, sortBy: sortBy, view: view, ytdinterest: ytdinterest });
    } else {
      portfolioFormattedSorted = formatBackOfficeTable({ portfolio: documents, date: date, fund: fund, dates: dates, sort: sort, sign: sign, conditions: conditions, fundDetailsYTD: fundDetailsYTD, sortBy: sortBy, ytdinterest: ytdinterest });
    }
    let fundDetails = portfolioFormattedSorted.fundDetails;
    let finalDocuments = portfolioFormattedSorted.portfolio;
    return { portfolio: finalDocuments, fundDetails: fundDetails, analysis: portfolioFormattedSorted.analysis, uploadTradesDate: dayParamsWithLatestUpdates.lastUploadTradesDate, updatePriceDate: dayParamsWithLatestUpdates.lastUpdatePricesDate, collectionName: earliestPortfolioName.predecessorDate, error: null };
  }
}

export function getDayParams(portfolio: PositionBeforeFormatting[], previousDayPortfolio: any, dateInput: any, threeDayAnalytics = false) {
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
        let previousMark = previousDayPosition ? (previousDayPosition["Mid"] ? previousDayPosition["Mid"] : null) : null;
        let previousFxRate = previousDayPosition ? (previousDayPosition["FX Rate"] ? previousDayPosition["FX Rate"] : previousDayPosition["holdPortfXrate"] ? previousDayPosition["holdPortfXrate"] : portfolio[index]["FX Rate"]) : portfolio[index]["FX Rate"];

        portfolio[index]["Previous FX"] = previousFxRate;
        portfolio[index]["Previous Mark"] = previousMark;
      }

      if (!portfolio[index]["Type"]) {
        portfolio[index]["BB Ticker"] = portfolio[index]["BB Ticker"] ? portfolio[index]["BB Ticker"] : portfolio[index]["Issue"];
        portfolio[index]["Type"] = portfolio[index]["BB Ticker"].split(" ")[0] == "T" || portfolio[index]["Issuer"] == "US TREASURY N/B" ? "UST" : portfolio[index]["ISIN"].includes(" IB") ? "FUT" : "BND";
      }
      if (!portfolio[index]["BB Ticker"]) {
        portfolio[index]["BB Ticker"] = portfolio[index]["Issue"];
      }

      if (!portfolio[index]["Strategy"]) {
        portfolio[index]["Strategy"] = portfolio[index]["BB Ticker"].toLowerCase().includes("perp") ? "CE" : "VI";
      }
      portfolio[index]["Asset Class"] = portfolio[index]["Asset Class"] ? portfolio[index]["Asset Class"] : portfolio[index]["Rating Class"] ? portfolio[index]["Rating Class"] : "";

      if (parseFloat(portfolio[index]["Notional Amount"]) < 0) {
        portfolio[index]["Asset Class"] = "Hedge";
      }

      if (!portfolio[index]["Previous Mark"]) {
        portfolio[index]["Previous Mark"] = portfolio[index]["Mid"];
        portfolio[index]["Notes"] = portfolio[index]["Notes"] ? portfolio[index]["Notes"] : "";
        portfolio[index]["Notes"] += " Previous Mark X ";
      }

      let type = portfolio[index]["Type"] == "CDS" ? -1 : parseFloat(portfolio[index]["Notional Amount"]) < 0 ? -1 : 1;
      let todayPrice: any = parseFloat(position["Mid"]);
      let yesterdayPrice: any = parseFloat(position["Previous Mark"]);

      if (portfolio[index]["Type"] == "BND" || portfolio[index]["Type"] == "UST") {
        portfolio[index]["Day Price Move"] = Math.round((todayPrice - yesterdayPrice) * 10000 * type) / 100 || 0;
      } else {
        portfolio[index]["Day Price Move"] = 0;
      }
    } else if (threeDayAnalytics) {
      let type = portfolio[index]["Type"] == "CDS" ? -1 : parseFloat(portfolio[index]["Notional Amount"]) < 0 ? -1 : 1;
      let todayPrice: any = parseFloat(position["Mid"]);
      let previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue: any) => previousDayIssue["ISIN"] == position["ISIN"] && previousDayIssue["ISIN"] && position["ISIN"]) : null;

      if (!previousDayPosition) {
        previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue: any) => previousDayIssue["BB Ticker"] == position["BB Ticker"] && previousDayIssue["BB Ticker"] && position["BB Ticker"]) : null;
      }
      let yesterdayTwoPrice = previousDayPosition ? previousDayPosition["Mid"] : todayPrice;
      if (portfolio[index]["Type"] == "BND" || portfolio[index]["Type"] == "UST") {
        portfolio[index]["3-Day Price Move"] = Math.round((todayPrice - yesterdayTwoPrice) * 10000 * type) / 100 || 0;
      } else {
        portfolio[index]["3-Day Price Move"] = 0;
      }
    }
  }

  return portfolio;
}

export function assignPinnedPositions(portfolio: PositionBeforeFormatting[], pinnedPositions: any): PositionBeforeFormatting[] {
  // try {

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];

    let pinnedPosition = pinnedPositions ? pinnedPositions.find((pinned: any) => pinned["ISIN"] == position["ISIN"] && pinned["Location"].replace(" Rlzd", "") == position["Location"]) : null;
    if (pinnedPosition) {
      portfolio[index]["Pin"] = pinnedPosition["Pin"];
    } else {
      portfolio[index]["Pin"] = "not pinned";
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

        if (lastMonthPosition["ISIN"] == position["ISIN"] && lastMonthPosition["Mid"]) {
          portfolio[index]["MTD Mark"] = lastMonthPosition["Mid"];
          portfolio[index]["MTD FX"] = lastMonthPosition["FX Rate"] ? lastMonthPosition["FX Rate"] : lastMonthPosition["holdPortfXrate"] ? lastMonthPosition["holdPortfXrate"] : portfolio[index]["Previous Rate"];
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
  let daysRemaining = remainingDaysInYear(date);
  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    portfolio[index]["Principal"] = 0;
    let quantityGeneratingInterest = position["Notional Amount"];

    let interestInfo = position["Interest"] || {};
    let yesterdayPrice;
    if (position["Previous Mark"]) {
      yesterdayPrice = position["Previous Mark"];
    } else {
      yesterdayPrice = position["Mid"];
    }

    if (new Date(position["Last Upload Trade"]).getTime() > lastUploadTradesDate) {
      lastUploadTradesDate = new Date(position["Last Upload Trade"]).getTime();
    }
    if (new Date(position["Last Price Update"]).getTime() > lastUpdatePricesDate) {
      lastUpdatePricesDate = new Date(position["Last Price Update"]).getTime();
    }

    let todayPrice: any = parseFloat(position["Mid"]);
    portfolio[index]["Day URlzd"] = portfolio[index]["Type"] == "CDS" ? ((parseFloat(todayPrice) - parseFloat(yesterdayPrice)) * portfolio[index]["Notional Amount"]) / portfolio[index]["Original Face"] : (parseFloat(todayPrice) - parseFloat(yesterdayPrice)) * portfolio[index]["Notional Amount"] || 0;

    if (portfolio[index]["Day URlzd"] == 0) {
      portfolio[index]["Day URlzd"] = 0;
    } else if (!portfolio[index]["Day URlzd"]) {
      portfolio[index]["Day URlzd"] = "0";
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
    let couponDaysYear = portfolio[index]["Coupon Duration"] || 360;
    portfolio[index]["Day Int."] = (parseFloat(quantityGeneratingInterest) * (portfolio[index]["Coupon Rate"] / 100.0)) / couponDaysYear;
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
      portfolio[index]["Principal"] += interestInfo[settlementDate];
    }
  }
  return { portfolio: portfolio };
}

export async function getMTDURlzdInt(portfolio: any, date: any) {
  let currentDayDate: string = new Date(date).toISOString().slice(0, 10);
  let previousMonthDates = getAllDatesSinceLastMonthLastDay(currentDayDate);
  let monthlyInterest: any = {};
  let thisDay = formatDateRlzdDaily(date);

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    let todayPrice = parseFloat(portfolio[index]["Mid"]);
    let type = portfolio[index]["Type"] == "CDS" ? -1 : portfolio[index]["Notional Amount"] < 0 ? -1 : 1;

    let tradeType = "vcons";
    let identifier = portfolio[index]["ISIN"];
    let typeCheck = portfolio[index]["Type"] || "";
    if (identifier.includes("IB")) {
      tradeType = "ib";
    } else if (identifier.includes("1393")) {
      tradeType = "emsx";
    } else if (typeCheck.includes("CDS")) {
      tradeType = "gs";
    } else if (typeCheck.includes("FX")) {
      tradeType = "fx";
    }

    let multiplier = tradeType == "vcons" ? 100 : 1;

    let trades = await getRlzdTrades(`${tradeType}`, identifier, portfolio[index]["Location"], date, portfolio[index]["MTD Mark"] * multiplier, portfolio[index]["MTD Notional"]);

    portfolio[index]["MTD Rlzd"] = trades.totalRow["Rlzd P&L Amount"];

    portfolio[index]["Average Cost MTD"] = trades.averageCostMTD / multiplier;

    portfolio[index]["MTD URlzd"] = portfolio[index]["Type"] == "CDS" ? ((todayPrice - portfolio[index]["Average Cost MTD"]) * portfolio[index]["Notional Amount"]) / portfolio[index]["Original Face"] : (todayPrice - portfolio[index]["Average Cost MTD"]) * portfolio[index]["Notional Amount"];

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
      let couponDaysYear = position["Coupon Duration"] ? position["Coupon Duration"] : 360;

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

    portfolio[index]["Coupon Duration"] = portfolio[index]["Coupon Duration"] ? portfolio[index]["Coupon Duration"] : portfolio[index]["Type"] == "UST" ? 365.0 : 360.0;

    portfolio[index]["YTD Int."] = portfolio[index]["Type"] != "FX" ? calculateAccruedSinceLastYear(portfolio[index]["Interest"], portfolio[index]["Coupon Rate"] / 100, portfolio[index]["Coupon Duration"], lastYearDate, portfolio[index]["ISIN"], date) : 0;
    ytdinterest += portfolio[index]["YTD Int."];
  }

  return { portfolio: portfolio, ytdinterest: ytdinterest };
}

export async function getPL(portfolio: any, latestPortfolioThisMonth: any, date: any) {
  let thisMonth = monthlyRlzdDate(date);
  let thisDay = formatDateRlzdDaily(date);
  for (let index = 0; index < portfolio.length; index++) {
    let positionUpToDateThisMonth = latestPortfolioThisMonth.filter((position: any, count: number) => portfolio[index]["Location"] == position["Location"] && portfolio[index]["ISIN"] == position["ISIN"]);
    if (positionUpToDateThisMonth.length > 1) {
      console.log(portfolio[index]["BB Ticker"], "mtd rlzd wrong duplicate");
    }
    positionUpToDateThisMonth = positionUpToDateThisMonth[0];
    if (!positionUpToDateThisMonth) {
      console.log(portfolio[index]["BB Ticker"] || portfolio[index]["Issue"], "mtd rlzd wrong");
      positionUpToDateThisMonth = portfolio[index];
    }
    portfolio[index]["Day Rlzd"] = positionUpToDateThisMonth["Day Rlzd"] ? (positionUpToDateThisMonth["Day Rlzd"][thisDay] ? calculateRlzd(positionUpToDateThisMonth["Day Rlzd"][thisDay], portfolio[index]["Average Cost MTD"], portfolio[index]["BB Ticker"], portfolio[index]["Asset Class"]) : 0) : 0;

    portfolio[index]["Cost MTD"] = portfolio[index]["Cost MTD"] ? portfolio[index]["Cost MTD"][thisMonth] || 0 : 0;
    portfolio[index]["Day P&L"] = parseFloat(portfolio[index]["Day Int."]) + parseFloat(portfolio[index]["Day Rlzd"]) + parseFloat(portfolio[index]["Day URlzd"]) ? parseFloat(portfolio[index]["Day Int."]) + parseFloat(portfolio[index]["Day Rlzd"]) + parseFloat(portfolio[index]["Day URlzd"]) : 0;
    portfolio[index]["MTD P&L"] = parseFloat(portfolio[index]["MTD Rlzd"]) + (parseFloat(portfolio[index]["MTD URlzd"]) || 0) + parseFloat(portfolio[index]["MTD Int."]) || 0;
    portfolio[index]["YTD P&L"] = (parseFloat(portfolio[index]["YTD Rlzd"]) || 0) + (parseFloat(portfolio[index]["YTD URlzd"]) || 0) + parseFloat(portfolio[index]["YTD Int."]) || 0;

    portfolio[index]["Entry Price"] = portfolio[index]["Entry Price"] ? (portfolio[index]["Entry Price"][thisMonth] ? portfolio[index]["Entry Price"][thisMonth] : portfolio[index]["MTD Mark"]) : portfolio[index]["MTD Mark"];
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

export async function getPortfolioOnSpecificDate(collectionDate: string): Promise<{ portfolio: PositionInDB[] | []; date: string }> {
  try {
    const database = client.db("portfolios");
    let date = getDateTimeInMongoDBCollectionFormat(new Date(collectionDate)).split(" ")[0] + " 23:59";
    let earliestCollectionName = await getEarliestCollectionName(date);
    console.log(earliestCollectionName, "check");
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
    return { portfolio: [], date: "" };
  }
}

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

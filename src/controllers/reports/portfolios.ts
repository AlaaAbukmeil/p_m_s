import { getEarliestCollectionName, getHistoricalPortfolio } from "../reports";
import { client } from "../auth";

import { formatDateRlzdDaily, getAllDatesSinceLastMonthLastDay, getAllDatesSinceLastYearLastDay, getDateTimeInMongoDBCollectionFormat, getDaysBetween, getEarliestDateKeyAndValue, getLastDayOfMonth, monthlyRlzdDate } from "./common";
import { getFundDetails, insertEditLogs } from "../operations";
import { formatFrontEndSummaryTable, formatFrontEndTable } from "../tableFormatter";
import { formatDateUS } from "../common";
import { parseBondIdentifier } from "./tools";
import { tradesMTDRlzd } from "../../models/reports";
export async function getPortfolioWithAnalytics(date: string, sort: any, sign: number, conditions = null, view: "front office" | "back office") {
  const database = client.db("portfolios");
  let earliestPortfolioName = await getEarliestCollectionName(date);

  let sameDayCollectionsPublished = earliestPortfolioName.collectionNames;
  let yesterdayPortfolioName = getDateTimeInMongoDBCollectionFormat(new Date(new Date(earliestPortfolioName.predecessorDate).getTime() - 1 * 24 * 60 * 60 * 1000)).split(" ")[0] + " 23:59";
  let lastDayBeforeToday = await getEarliestCollectionName(yesterdayPortfolioName);
  let lastDayOfThisMonth = getLastDayOfMonth(date);

  let lastDayOfThisMonthCollectionName = await getEarliestCollectionName(lastDayOfThisMonth);
  console.log(lastDayOfThisMonthCollectionName.predecessorDate, "get rlzd dyanmic date");

  console.log(earliestPortfolioName.predecessorDate, "get portfolio");
  const reportCollection = database.collection(`portfolio-${earliestPortfolioName.predecessorDate}`);

  let documents = await reportCollection
    .aggregate([
      {
        $sort: {
          "BB Ticker": 1, // replace 'BB Ticker' with the name of the field you want to sort alphabetically
        },
      },
    ])
    .toArray();
  for (let index = 0; index < documents.length; index++) {
    documents[index]["Notional Amount"] = documents[index]["Notional Amount"] || parseFloat(documents[index]["Notional Amount"]) == 0 ? documents[index]["Notional Amount"] : documents[index]["Quantity"];
  }
  let latestCollectionDate = documents;
  if (earliestPortfolioName.predecessorDate != lastDayOfThisMonthCollectionName.predecessorDate) {
    latestCollectionDate = await getHistoricalPortfolio(lastDayOfThisMonthCollectionName.predecessorDate);
  }

  let uploadTradesDate: any = "";
  let thisMonth = monthlyRlzdDate(date);

  let currentDayDate: any = new Date(date);
  let previousMonthDates = getAllDatesSinceLastMonthLastDay(currentDayDate);
  let previousYearDate = getAllDatesSinceLastYearLastDay(currentDayDate);
  //+ 23:59 to make sure getEarliestcollectionname get the lastest date on last day of the month
  let lastMonthLastCollectionName = await getEarliestCollectionName(previousMonthDates[0] + " 23:59");
  let lastYearLastCollectionName = await getEarliestCollectionName(previousYearDate + " 23:59");
  console.log(lastYearLastCollectionName.predecessorDate, "last year collection name");
  try {
    let lastMonthPortfolio = await getHistoricalPortfolio(lastMonthLastCollectionName.predecessorDate);
    let previousDayPortfolio = await getHistoricalPortfolio(lastDayBeforeToday.predecessorDate);
    let previousYearPortfolio = await getHistoricalPortfolio(lastYearLastCollectionName.predecessorDate);

    documents = getDayParams(documents, previousDayPortfolio, lastDayBeforeToday.predecessorDate);
    documents = getMTDParams(documents, lastMonthPortfolio, earliestPortfolioName.predecessorDate);
    documents = getYTDParams(documents, previousYearPortfolio, lastYearLastCollectionName.predecessorDate);
  } catch (error) {
    console.log(error);
  }

  documents = await getMTDURlzdInt(documents, new Date(date));
  documents = await getDayURlzdInt(documents, new Date(date));
  documents = await getYTDURlzdInt(documents, lastYearLastCollectionName.predecessorDate);
  documents = getPL(documents, latestCollectionDate, date, lastYearLastCollectionName.predecessorDate);
  let dates = {
    today: earliestPortfolioName.predecessorDate,
    yesterday: lastDayBeforeToday.predecessorDate,
    lastMonth: lastMonthLastCollectionName.predecessorDate,
  };
  let fundDetailsInfo: any = await getFundDetails(thisMonth);

  if (fundDetailsInfo.length == 0) {
    return { error: "Does not exist" };
  }
  let fund = fundDetailsInfo[0];
  let portfolioFormattedSorted;
  if (view == "front office") {
    portfolioFormattedSorted = formatFrontEndSummaryTable(documents, date, fund, dates, sort, sign, conditions);
  } else {
    portfolioFormattedSorted = formatFrontEndTable(documents, date, fund, dates, sort, sign);
  }
  let fundDetails = portfolioFormattedSorted.fundDetails;
  documents = portfolioFormattedSorted.portfolio;

  documents = documents.filter((position: any) => {
    if (position["Notional Amount"] == 0) {
      let monthsTrades = Object.keys(position["MTD Rlzd DC"] || {});

      if (monthsTrades.includes(thisMonth)) {
        return position;
      }
    } else {
      return position;
    }
  });
  return { portfolio: documents, sameDayCollectionsPublished: sameDayCollectionsPublished, fundDetails: fundDetails, analysis: portfolioFormattedSorted.analysis, uploadTradesDate: uploadTradesDate };
}


export function getDayParams(portfolio: any, previousDayPortfolio: any, dateInput: any) {
  // try {

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    let thisMonth = monthlyRlzdDate(dateInput);

    if (!portfolio[index]["Mid"]) {
      portfolio[index]["Mid"] = portfolio[index]["Entry Price"][thisMonth];
    }

    let previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue: any) => previousDayIssue["ISIN"] == position["ISIN"] && previousDayIssue["ISIN"] && position["ISIN"]) : null;

    if (!previousDayPosition) {
      previousDayPosition = previousDayPortfolio ? previousDayPortfolio.find((previousDayIssue: any) => previousDayIssue["BB Ticker"] == position["BB Ticker"] && previousDayIssue["BB Ticker"] && position["BB Ticker"]) : null;
    }
    let previousMark = previousDayPosition ? previousDayPosition["Mid"] : "0";
    let previousFxRate = previousDayPosition ? (previousDayPosition["FX Rate"] ? previousDayPosition["FX Rate"] : previousDayPosition["holdPortfXrate"] ? previousDayPosition["holdPortfXrate"] : portfolio[index]["FX Rate"]) : portfolio[index]["FX Rate"];

    portfolio[index]["Previous FX"] = previousFxRate;
    portfolio[index]["Previous Mark"] = previousMark;

    if (portfolio[index]["Previous Mark"] == 0) {
      portfolio[index]["Previous Mark"] = 0;
    } else if (portfolio[index]["Previous Mark"] == "0") {
      portfolio[index]["Previous Mark"] = portfolio[index]["Mid"];
      portfolio[index]["Notes"] += " Previous Mark X";
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
        portfolio[index]["Notes"] = "";

        if (((lastMonthPosition["ISIN"] == position["ISIN"] && position["ISIN"] && lastMonthPosition["ISIN"]) || (lastMonthPosition["BB Ticker"] == position["BB Ticker"] && position["BB Ticker"] && lastMonthPosition["BB Ticker"])) && lastMonthPosition["Mid"]) {
          portfolio[index]["MTD Mark"] = lastMonthPosition["Mid"];
          portfolio[index]["MTD FX"] = lastMonthPosition["FX Rate"] ? lastMonthPosition["FX Rate"] : lastMonthPosition["holdPortfXrate"] ? lastMonthPosition["holdPortfXrate"] : portfolio[index]["Previous Rate"];
        }
      }
    }

    for (let index = 0; index < portfolio.length; index++) {
      if (!parseFloat(portfolio[index]["MTD Mark"]) && parseFloat(portfolio[index]["MTD Mark"]) != 0 && portfolio[index]["Entry Price"][thisMonth]) {
        portfolio[index]["MTD Mark"] = portfolio[index]["Entry Price"][thisMonth];
        portfolio[index]["Notes"] = "MTD Mark X";
      }
    }

    return portfolio;
  } catch (error) {
    return portfolio;
  }
}

export function getYTDParams(portfolio: any, lastYearPortfolio: any, date: any) {
  try {
    for (let index = 0; index < portfolio.length; index++) {
      let position = portfolio[index];
      let lastYearPosition;
      let currencies: any = {};
      for (let lastMonthIndex = 0; lastMonthIndex < lastYearPortfolio.length; lastMonthIndex++) {
        lastYearPosition = lastYearPortfolio[lastMonthIndex];
        portfolio[index]["Notes"] = "";

        if (((lastYearPosition["ISIN"] == position["ISIN"] && position["ISIN"] && lastYearPosition["ISIN"]) || (lastYearPosition["BB Ticker"] == position["BB Ticker"] && position["BB Ticker"] && lastYearPosition["BB Ticker"])) && lastYearPosition["Mid"]) {
          portfolio[index]["YTD Mark"] = lastYearPosition["Mid"];
          portfolio[index]["YTD FX"] = lastYearPosition["FX Rate"] ? lastYearPosition["FX Rate"] : portfolio[index]["MTD FX"] || 1;

          currencies[portfolio[index]["Currency"]] = portfolio[index]["YTD FX"];
        }
      }

      for (let index = 0; index < portfolio.length; index++) {
        if (!parseFloat(portfolio[index]["YTD Mark"]) && parseFloat(portfolio[index]["YTD Mark"]) != 0 && portfolio[index]["Entry Price"]) {
          portfolio[index]["YTD Mark"] = getEarliestDateKeyAndValue(portfolio[index]["Entry Price"], date);
          portfolio[index]["Notes"] = "YTD Mark X";
        }
        if (!portfolio[index]["YTD FX"]) {
          portfolio[index]["YTD FX"] = currencies[portfolio[index]["Currency"]] || portfolio[index]["MTD FX"];
        }
      }

      return portfolio;
    }
  } catch (error) {
    return portfolio;
  }
}

function getDayURlzdInt(portfolio: any, date: any) {
  let thisMonth = monthlyRlzdDate(date);
  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];

    let quantityGeneratingInterest = position["Notional Amount"];
    let interestInfo = position["Interest"];
    let yesterdayPrice;
    if (position["Previous Mark"] && position["Previous Mark"] != "0") {
      yesterdayPrice = position["Previous Mark"];
    } else {
      yesterdayPrice = position["Mid"];
    }

    position["Previous Mark"] = yesterdayPrice;
    let todayPrice: any = parseFloat(position["Mid"]);

    portfolio[index]["Day URlzd"] = portfolio[index]["Type"] == "CDS" ? ((parseFloat(todayPrice) - parseFloat(yesterdayPrice)) * portfolio[index]["Notional Amount"]) / portfolio[index]["Original Face"] : (parseFloat(todayPrice) - parseFloat(yesterdayPrice)) * portfolio[index]["Notional Amount"] || 0;
    let settlementDates = Object.keys(interestInfo);
    for (let indexSettlementDate = 0; indexSettlementDate < settlementDates.length; indexSettlementDate++) {
      let settlementDate = settlementDates[indexSettlementDate];
      let settlementDateTimestamp = new Date(settlementDate).getTime();
      if (settlementDateTimestamp >= new Date(date).getTime()) {
        quantityGeneratingInterest -= interestInfo[settlementDate];
      }
    }
    let couponDaysYear = portfolio[index]["Coupon Duration"] || 360;
    portfolio[index]["Day Int."] = (parseFloat(quantityGeneratingInterest) * (portfolio[index]["Coupon Rate"] / 100.0)) / couponDaysYear;
    if (!portfolio[index]["Day Int."]) {
      portfolio[index]["Day Int."] = 0;
    }
  }
  return portfolio;
}

export function getMTDURlzdInt(portfolio: any, date: any) {
  let currentDayDate = new Date(date).toISOString().slice(0, 10);
  let previousMonthDates = getAllDatesSinceLastMonthLastDay(currentDayDate);
  let monthlyInterest: any = {};

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];

    portfolio[index]["MTD URlzd"] = portfolio[index]["Type"] == "CDS" ? ((parseFloat(portfolio[index]["Mid"]) - parseFloat(portfolio[index]["MTD Mark"])) * portfolio[index]["Notional Amount"]) / portfolio[index]["Original Face"] : (parseFloat(portfolio[index]["Mid"]) - parseFloat(portfolio[index]["MTD Mark"])) * portfolio[index]["Notional Amount"];
    if (portfolio[index]["MTD URlzd"] == 0) {
      portfolio[index]["MTD URlzd"] = 0;
    } else if (!portfolio[index]["MTD URlzd"]) {
      portfolio[index]["MTD URlzd"] = "0";
    }

    let quantityGeneratingInterest = position["Notional Amount"];
    let interestInfo = position["Interest"];
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
        if (settlementDateTimestamp >= new Date(dayInCurrentMonth).getTime()) {
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

export function getYTDURlzdInt(portfolio: any, date: any) {
  for (let index = 0; index < portfolio.length; index++) {
    portfolio[index]["YTD URlzd"] = portfolio[index]["Type"] == "CDS" ? ((parseFloat(portfolio[index]["Mid"]) - parseFloat(portfolio[index]["YTD Mark"])) * portfolio[index]["Notional Amount"]) / portfolio[index]["Original Face"] : (parseFloat(portfolio[index]["Mid"]) - parseFloat(portfolio[index]["YTD Mark"])) * portfolio[index]["Notional Amount"];
    if (portfolio[index]["YTD URlzd"] == 0) {
      portfolio[index]["YTD URlzd"] = 0;
    } else if (!portfolio[index]["YTD URlzd"]) {
      portfolio[index]["YTD URlzd"] = "0";
    }

    portfolio[index]["Coupon Rate"] = portfolio[index]["Coupon Rate"] ? portfolio[index]["Coupon Rate"] : parseBondIdentifier(portfolio[index]["BB Ticker"]).rate || 0;
    portfolio[index]["Coupon Duration"] = portfolio[index]["Coupon Duration"] ? portfolio[index]["Coupon Duration"] : portfolio[index]["Type"] == "UST" ? 365.0 : 360.0;

    portfolio[index]["YTD Int."] = calculateAccruedSinceLastYear(portfolio[index]["Interest"], portfolio[index]["Coupon Rate"] / 100, portfolio[index]["Coupon Duration"], date, portfolio[index]["ISIN"]);
  }

  return portfolio;
}

function getPL(portfolio: any, latestPortfolioThisMonth: any, date: any, lastYearDate: any) {
  let thisMonth = monthlyRlzdDate(date);
  let thisDay = formatDateRlzdDaily(date);
  // console.log(latestPortfolioThisMonth[0])
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
    // ytd depends on mtd object
    portfolio[index]["YTD Rlzd"] = getYTDRlzd(portfolio[index]["MTD Rlzd"], portfolio[index]["YTD Mark"], lastYearDate, portfolio[index]["BB Ticker"]);
    portfolio[index]["Day Rlzd"] = positionUpToDateThisMonth["Day Rlzd"] ? (positionUpToDateThisMonth["Day Rlzd"][thisDay] ? calculateRlzd(positionUpToDateThisMonth["Day Rlzd"][thisDay], portfolio[index]["Previous Mark"], portfolio[index]["BB Ticker"]) : 0) : 0;
    //deep copy
    portfolio[index]["MTD Rlzd DC"] = portfolio[index]["MTD Rlzd"];
    portfolio[index]["MTD Rlzd"] = portfolio[index]["MTD Rlzd"] ? (portfolio[index]["MTD Rlzd"][thisMonth] ? calculateRlzd(portfolio[index]["MTD Rlzd"][thisMonth], portfolio[index]["MTD Mark"], portfolio[index]["BB Ticker"]) : 0) : 0;

    portfolio[index]["Cost MTD"] = portfolio[index]["Cost MTD"] ? portfolio[index]["Cost MTD"][thisMonth] || 0 : 0;
    portfolio[index]["Day P&L"] = parseFloat(portfolio[index]["Day Int."]) + parseFloat(portfolio[index]["Day Rlzd"]) + parseFloat(portfolio[index]["Day URlzd"]) ? parseFloat(portfolio[index]["Day Int."]) + parseFloat(portfolio[index]["Day Rlzd"]) + parseFloat(portfolio[index]["Day URlzd"]) : 0;
    portfolio[index]["MTD P&L"] = parseFloat(portfolio[index]["MTD Rlzd"]) + (parseFloat(portfolio[index]["MTD URlzd"]) || 0) + parseFloat(portfolio[index]["MTD Int."]) || 0;
    portfolio[index]["YTD P&L"] = (parseFloat(portfolio[index]["YTD Rlzd"]) || 0) + (parseFloat(portfolio[index]["YTD URlzd"]) || 0) + parseFloat(portfolio[index]["YTD Int."]) || 0;
    portfolio[index]["Entry Price"] = portfolio[index]["Entry Price"] ? getEarliestDateKeyAndValue(portfolio[index]["Entry Price"]) : 0;
  }
  return portfolio;
}

function getYTDRlzd(rlzdTradesObject: any, ytdPrice: any, ytdDate: any, bbTicker: string) {
  let rlzd = 0;
  let rlzdTrades = [];
  ytdDate = new Date(ytdDate).getTime();
  for (let month in rlzdTradesObject) {
    let dateComponents = month.split("/");
    let date = new Date(dateComponents[1] + "/28/" + dateComponents[0]).getTime();
    if (date > ytdDate) {
      rlzdTrades.push(...rlzdTradesObject[month]);
    }
  }
  rlzd = calculateRlzd(rlzdTrades, ytdPrice, bbTicker);

  return rlzd;
}

export function calculateAccruedSinceLastYear(interestInfo: any, couponRate: any, numOfDaysInAYear: any, lastYearDate: any, isin: string) {
  try {
    let quantityDates = Object.keys(interestInfo).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    lastYearDate = new Date(lastYearDate).getTime();
    quantityDates.push(formatDateUS(new Date()));
    couponRate = couponRate ? couponRate : 0;
    let quantity = interestInfo[quantityDates[0]];
    let interest = 0;
    for (let index = 0; index < quantityDates.length; index++) {
      if (quantityDates[index + 1]) {
        if (new Date(quantityDates[index]).getTime() < lastYearDate && new Date(quantityDates[index + 1]).getTime() > lastYearDate) {
          let numOfDays = getDaysBetween(lastYearDate, quantityDates[index + 1]);
          interest += (couponRate / numOfDaysInAYear) * numOfDays * quantity;
        } else if (new Date(quantityDates[index]).getTime() > lastYearDate) {
          let numOfDays = getDaysBetween(quantityDates[index], quantityDates[index + 1]);
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

export function calculateRlzd(trades: tradesMTDRlzd[], mark: number, issue: string) {
  let total = 0;

  for (let index = 0; index < trades.length; index++) {
    let trade = trades[index];
    let price = trade.price;
    let quantity = trade.quantity;

    let rlzdTrade = (price - mark) * quantity;

    total += rlzdTrade;
  }

  return total;
}

require("dotenv").config()


import {
  getAverageCost, readBloombergTriadaEBlot, uploadToGCloudBucket, readPricingSheet, getAllDatesSinceLastMonthLastDay,
  parseBondIdentifier, calculateDailyProfitLoss, calculateMonthlyProfitLoss, readVconEBlot, getSettlementDateYear, readPortfolioFromImagine, formatUpdatedPositions
} from "./portfolioFunctions";
import util from 'util';
import { getDate, getTime, getCurrentDateVconFormat, formatDate } from "./common";


const xlsx = require("xlsx")
const fs = require('fs');
const writeFile = util.promisify(fs.writeFile);
const { PassThrough } = require('stream');
const axios = require("axios")
const {
  MongoClient,
  ServerApiVersion
} = require('mongodb');
const mongoose = require('mongoose');

const uri = "mongodb+srv://alaa:" + process.env.MONGODBPASSWORD + "@atlascluster.zpfpywq.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

mongoose.connect(uri, {
  useNewUrlParser: true
})

export async function getHistoricalPortfolioWithAnalytics(date: string) {
  const database = client.db("portfolios");
  const reportCollection = database.collection(`portfolio-${date}`);
  let documents = await reportCollection.aggregate([
    {
      $addFields: {
        quantityIsZero: {
          $cond: { if: { $eq: ["$Quantity", 0] }, then: 1, else: 0 }
        }
      }
    },
    {
      $sort: {
        quantityIsZero: 1,  // sort by quantityIsZero first
        "Issue": 1  // replace 'name' with the name of the field you want to sort alphabetically
      }
    },
    {
      $project: {
        quantityIsZero: 0  // remove the temporary quantityIsZero field
      }
    }
  ]).toArray()

  let currentDayDate = new Date(new Date(date).getTime() - 0 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let previousMonthDates = getAllDatesSinceLastMonthLastDay(currentDayDate)
  let lastMonthPortfolio = await getHistoricalPortfolio(previousMonthDates[0])

  documents = getMTDParams(documents, lastMonthPortfolio)
  documents = calculateMonthlyInterest(documents, new Date())
  documents = calculateDailyInterestUnRlzdCapitalGains(documents, new Date())
  return documents
}

export async function getHistoricalPortfolio(date: string) {
  const database = client.db("portfolios");
  const reportCollection = database.collection(`portfolio-${date}`);
  let documents = await reportCollection.find().toArray()
  return documents
}

export async function getPortfolioWithAnalytics() {
  try {
    const database = client.db("portfolios");
    const reportCollection = database.collection(`portfolio`);
    let documents = await reportCollection.aggregate([
      {
        $addFields: {
          quantityIsZero: {
            $cond: { if: { $eq: ["$Quantity", 0] }, then: 1, else: 0 }
          }
        }
      },
      {
        $sort: {
          quantityIsZero: 1,  // sort by quantityIsZero first
          "Issue": 1  // replace 'name' with the name of the field you want to sort alphabetically
        }
      },
      {
        $project: {
          quantityIsZero: 0  // remove the temporary quantityIsZero field
        }
      }
    ]).toArray()

    let currentDayDate = new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    let previousMonthDates = getAllDatesSinceLastMonthLastDay(currentDayDate)
    let lastMonthPortfolio = await getHistoricalPortfolio(previousMonthDates[0])


    documents = await getMTDParams(documents, lastMonthPortfolio)
    documents = calculateMonthlyInterest(documents, new Date())
    documents = calculateDailyInterestUnRlzdCapitalGains(documents, new Date())
    documents = calculateMonthlyURlzd(documents)
    return documents
  } catch (error) {
    return error
  }
}

export async function getPortfolio() {
  try {
    const database = client.db("portfolios");
    const reportCollection = database.collection(`portfolio`);
    let documents = await reportCollection.find().toArray()
    return documents
  } catch (error) {
    return error
  }
}

export async function getTrades() {
  try {
    const database = client.db("trades");
    const reportCollection = database.collection(`vcons`);
    let documents = await reportCollection.find().sort({ "Trade Date": -1 }).toArray();
    return documents
  } catch (error) {
    return error
  }
}

function getSecurityInPortfolio(portfolio: any, identifier: string, isinOrIssue: number) {
  let document = 404
  for (let index = 0; index < portfolio.length; index++) {
    let issue = portfolio[index];
    if (isinOrIssue == 0) {
      if (identifier.includes(issue["ISIN"])) {
        document = issue
      }
    } else {
      if (identifier.includes(issue["Issue"])) {
        document = issue
      } else if (identifier.includes(issue["BB Ticker"])) {
        document = issue
      }
    }
  }

  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return document

}

export async function getDailyEarnedInterestRlzPtf(dates: string[]) {
  let dailyInterestSum: any = {}
  let realizedProfit: any = {}
  let lastMonthLastDayPortfolio = await getHistoricalPortfolio(dates[0])
  let mtd: any = {}
  for (let index = 1; index < dates.length; index++) {
    let date = dates[index];
    let portfolio = await getHistoricalPortfolio(date).then((responese) => {
      for (let y = 0; y < responese.length; y++) {
        let security = responese[y];
        if (dailyInterestSum[security["Issue"]]) {
          dailyInterestSum[security["Issue"]] += security["Daily P&L Interest"]
        } else {
          dailyInterestSum[security["Issue"]] = security["Daily P&L Interest"]
        }

        if (realizedProfit[security["Issue"]]) {
          realizedProfit[security["Issue"]] += security["Daily P&L Rlzd"]
        } else {
          // If it doesn't exist, set it equal to dailyInterest
          realizedProfit[security["Issue"]] = security["Daily P&L Rlzd"]
        }
      }
    })


  }
  for (let z = 0; z < lastMonthLastDayPortfolio.length; z++) {
    const security = lastMonthLastDayPortfolio[z];
    mtd[security["Issue"]] = security["Mid"]
  }
  let object = {
    "monthlyInterest": dailyInterestSum,
    "monthlyRealizedProfit": realizedProfit,
    "lastMonthLastDayPortfolio": mtd
  }
  return object
}

export async function insertTrade(trades: any) {

  const database = client.db("trades");
  const reportCollection = database.collection("vcons");

  const operations = trades.map((trade: any) => ({
    updateOne: {
      filter: { "Seq No": trade["Seq No"] },
      update: { $set: trade },
      upsert: true
    }
  }));

  // Execute the operations in bulk
  try {
    const result = await reportCollection.bulkWrite(operations);
    return result
  } catch (error) {

    return error;
  }
}


async function tradesSequalNumbers() {
  try {
    const database = client.db("trades");
    const reportCollection = database.collection("vcons");
    const document = await reportCollection.findOne()
    if (document) {
      let sequalNumbers = []
      for (let index = 0; index < document.length; index++) {
        let trade = document[index];
        sequalNumbers.push(trade["Seq No"])
      }

      return sequalNumbers
    } else {
      return []
    }
  } catch (error) {
    return error
  }
}

export async function getBBTicker(obj: any) {

  let index = 0
  let bbTicker: any = {}

  try {
    while (index < obj.length) {
      let end = index + 99
      if (end > obj.length) {
        end = obj.length
      }
      let params = obj.slice(index, end)
      index += 99
      let action = await axios.post("https://api.openfigi.com/v3/mapping", params, {
        headers: {
          "X-OPENFIGI-APIKEY": process.env.OPEN_FIGI_API_KEY
        }
      })

      let responseArr = action.data


      for (let responseIndex = 0; responseIndex < responseArr.length; responseIndex++) {
        if (responseArr[responseIndex] && (!responseArr[responseIndex].error)) {
          let response = responseArr[responseIndex].data[0];
          bbTicker[params[responseIndex]["idValue"]] = response["ticker"]

        }
      }
    }

    return bbTicker
  } catch (error) {
    return error
  }
}

export async function uploadPortfolioFromImagine(path: string) {

  let data: any = await readPortfolioFromImagine(path)
  // return data
  if (data.error) {
    return data
  } else {
    try {
      let positions: any = {}
      let portfolio = await getPortfolio()
      for (let index = 0; index < data.length; index++) {
        let row = data[index];
        let identifier = (row["BB Ticker"])
        let issueOrBBTicker = (row["BB Ticker"]) ? 0 : 1
        let object: any = {}
        let securityInPortfolio: any = 404//getSecurityInPortfolio(portfolio, identifier, issueOrBBTicker)//404// 
        let previousQuantity = securityInPortfolio["Quantity"]
        let previousAverageCost = (securityInPortfolio["Average Cost"]) ? (securityInPortfolio["Average Cost"]) : 0
        let tradeType = row["Buy/Sell"]
        let operation = tradeType == "B" ? 1 : -1
        let currentPrice: number = row["Price"] / 100
        let currentQuantity: any = parseInt(row["Quantity"])//
        let currentNet = parseInt(row["Net"]) //
        let bondCouponMaturity: any = parseBondIdentifier(row["BB Ticker"])//Issue
        let tradeExistsAlready = false //await checkIfTradeExists(row["Seq No"])

        if (row["Status"] == "Accepted" && !(tradeExistsAlready) && (identifier)) {
          if (!positions[identifier]) {
            let settlementDate = getSettlementDateYear(row["Trade Date"], row["Settle Date"])
            object["Mid"] = row["Mid"] //only for upload portfolio from imagine
            object["BB Ticker"] = row["BB Ticker"]

            object["Quantity"] = securityInPortfolio !== 404 ? securityInPortfolio["Quantity"] + currentQuantity : currentQuantity
            object["Net"] = securityInPortfolio !== 404 ? securityInPortfolio["Net"] + currentNet : currentNet
            object["Application"] = row["Application"] == "" ? "USD" : row["Application"]
            object["Average Cost"] = securityInPortfolio !== 404 ? getAverageCost(currentQuantity, previousQuantity, currentPrice, previousAverageCost) : (currentPrice) ? currentPrice : 0
            object["Coupon Rate"] = bondCouponMaturity[0]
            object["Maturity"] = bondCouponMaturity[1] !== "Not Applicable" ? formatDate(bondCouponMaturity[1]) : bondCouponMaturity[1];
            let interestQuantity;
            object["Interest"] = {};
            (securityInPortfolio["Interest"]) ? interestQuantity = currentQuantity + (securityInPortfolio["Interest"][settlementDate] ? securityInPortfolio["Interest"][settlementDate] : 0) : interestQuantity = currentQuantity
            object["Interest"][settlementDate] = interestQuantity
            object["Daily P&L Rlzd"] = operation == -1 ? (parseInt(currentQuantity) * (previousAverageCost - currentPrice)) : 0
            positions[identifier] = object

          }

        }
      }
      try {


        let insertion = await insertTradesInPortfolio(Object.values(positions))
        return insertion

      } catch (error) {
        return { error: error }

      }
    } catch (error) {
      return { error: error }
    }


  }
}

export async function updatePositionPortfolio(path: string) {

  let data: any = await readVconEBlot(path)
  if (data.error) {
    return data
  } else {
    try {
      let positions: any = {}
      let portfolio = await getPortfolio()
      let sequalNumbers: any = await tradesSequalNumbers()
      for (let index = 0; index < data.length; index++) {
        let row = data[index];
        let identifier = (row["ISIN"]) ? row["ISIN"] : row["Issue"]
        let isinOrIssue = (row["ISIN"]) ? 0 : 1
        let object: any = {}
        let securityInPortfolio: any = getSecurityInPortfolio(portfolio, identifier, isinOrIssue)
        let previousQuantity = securityInPortfolio["Quantity"]
        let previousAverageCost = (securityInPortfolio["Average Cost"]) ? (securityInPortfolio["Average Cost"]) : 0
        let tradeType = row["Buy/Sell"]
        let operation = tradeType == "B" ? 1 : -1
        let currentPrice: number = row["Price"] / 100
        let currentQuantity: any = parseInt(row["Quantity"].replace(/,/g, '')) * operation
        let currentNet = parseInt(row["Net"].replace(/,/g, '')) * operation
        let bondCouponMaturity: any = parseBondIdentifier(row["BB Ticker"])
        let tradeExistsAlready = sequalNumbers.includes(row["Seq No"])
        if (row["Status"] == "Accepted" && !(tradeExistsAlready) && identifier !== "") {
          if (!positions[identifier]) {
            let settlementDate = getSettlementDateYear(row["Trade Date"], row["Settle Date"])
            object["BB Ticker"] = row["BB Ticker"]
            object["Issue"] = row["Issue"]
            object["ISIN"] = row["ISIN"]
            object["Quantity"] = securityInPortfolio !== 404 ? securityInPortfolio["Quantity"] + currentQuantity : currentQuantity
            object["Net"] = securityInPortfolio !== 404 ? securityInPortfolio["Net"] + currentNet : currentNet
            object["Application"] = row["Application"] == "" ? "USD" : row["Application"]
            object["Average Cost"] = securityInPortfolio !== 404 ? getAverageCost(currentQuantity, previousQuantity, currentPrice, previousAverageCost) : currentPrice
            object["Coupon Rate"] = bondCouponMaturity[0]
            object["Maturity"] = bondCouponMaturity[1]
            let interestQuantity;
            object["Interest"] = {};
            (securityInPortfolio["Interest"]) ? interestQuantity = currentQuantity + (securityInPortfolio["Interest"][settlementDate] ? securityInPortfolio["Interest"][settlementDate] : 0) : interestQuantity = currentQuantity
            object["Interest"][settlementDate] = interestQuantity
            object["Daily Capital Gains Rlzd"] = operation == -1 ? (parseInt(currentQuantity) * (previousAverageCost - currentPrice)) : 0
            positions[identifier] = object
          }
          else if (positions[identifier]) {
            let settlementDate = getSettlementDateYear(row["Trade Date"], row["Settle Date"])
            let samePositionQuantity = positions[identifier]["Quantity"]
            object["BB Ticker"] = row["BB Ticker"]
            object["Issue"] = row["Issue"]
            object["ISIN"] = row["ISIN"]
            object["Coupon Rate"] = bondCouponMaturity[0]
            object["Application"] = row["Application"] == "" ? "USD" : row["Application"]
            object["Quantity"] = securityInPortfolio !== 404 ? securityInPortfolio["Quantity"] + currentQuantity + positions[identifier]["Quantity"] : currentQuantity + positions[identifier]["Quantity"]
            object["Net"] = securityInPortfolio !== 404 ? securityInPortfolio["Net"] + currentNet + positions[identifier]["Net"] : (currentNet) + positions[identifier]["Net"]
            object["Average Cost"] = securityInPortfolio !== 404 ? getAverageCost((currentQuantity + positions[identifier]["Quantity"]), previousQuantity, currentPrice, previousAverageCost) : getAverageCost(currentQuantity + samePositionQuantity, previousQuantity, currentPrice, previousAverageCost);
            object["Daily Capital Gains Rlzd"] = operation == -1 ? (parseInt(currentQuantity) * (positions[identifier]["Average Cost"] - currentPrice) + positions[identifier]["Daily Capital Gains Rlzd"]) : 0
            object["Maturity"] = bondCouponMaturity[1]
            let interestQuantity;
            object["Interest"] = positions[identifier]["Interest"] ? positions[identifier]["Interest"] : {};
            (securityInPortfolio["Interest"]) ? interestQuantity = currentQuantity + (securityInPortfolio["Interest"][settlementDate] ? securityInPortfolio["Interest"][settlementDate] : 0) : interestQuantity = currentQuantity
            object["Interest"][settlementDate] = interestQuantity + (positions[identifier]["Interest"][settlementDate] ? positions[identifier]["Interest"][settlementDate] : 0)
            positions[identifier] = object
          }
        }
      }

      try {
        let logs = `date: ${getDate() + " " + getTime()} e-blot-link: ${path}} \n\n`
        await writeFile('trades-logs.txt', logs, { flag: 'a' });
        let action = await insertTrade(data)
        let updatedPortfolio = formatUpdatedPositions(positions, portfolio)
        let insertion = await insertTradesInPortfolio(updatedPortfolio)
        return positions
      } catch (error) {
        return { error: error }

      }
    } catch (error) {
      return { error: error }
    }


  }
}

export async function insertTradesInPortfolio(trades: any) {

  const database = client.db("portfolios");
  const reportCollection = database.collection("portfolio");

  // Create an array of updateOne operations
  const operations = trades.map((trade: any) => ({
    updateOne: {
      filter: { "Issue": trade["Issue"] },
      update: { $set: trade },
      upsert: true
    }
  }));

  // Execute the operations in bulk
  try {
    const result = await reportCollection.bulkWrite(operations);
    const date = new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const historicalReportCollection = database.collection(`portfolio-${date}`);
    let action = await historicalReportCollection.bulkWrite(operations);
    // let aggregate = await reportCollection.aggregate([{ $match: {} }])

    return action
  } catch (error) {

    return error;
  }
}

export async function updatePricesPortfolio(path: string) {
  try {
    const data = await readPricingSheet(path)
    let portfolio = await getPortfolio()
    if (data.error) {
      return data
    } else {
      let updatedPricePortofolio = []
      for (let index = 0; index < data.length; index++) {
        let row = data[index];
        let object: any = getSecurityInPortfolio(portfolio, row["BB Ticker"].replace("Corps", "").replace("Govt", ""), 1)
        if (object == 404) {
          break;
        }
        delete object["_id"]

        //pricing sheet names bb ticker for vcon issue
        // object["ISIN"] = row["ISIN"]
        object["BB Ticker"] = row["BB Ticker"].replace("Corp", "").replace("Govt", "").trim()
        object["Mid"] = row["Mid"]
        object["Ask"] = row["Ask"]
        object["Bid"] = row["Bid"]
        object["YTM"] = row["Mid Yield Maturity"]
        object["DV01"] = row["DV01"]
        object["Trade Idea Code"] = row["Trade Idea Code"]
        object["Country"] = row["Country"]
        console.log(object)
        updatedPricePortofolio.push(object)
      }
      try {

        let logs = `date: ${new Date()} e-blot-link: ${path} \n\n`
        await writeFile('prices-logs.txt', logs, { flag: 'a' }); // 'a' flag for append mode
        let action = await insertPricesUpdatesInPortfolio(updatedPricePortofolio)
        return action
      } catch (error) {
        return error
      }
    }
  }
  catch (error) {
    return error
  }

}

export async function insertPricesUpdatesInPortfolio(prices: any) {

  const database = client.db("portfolios");
  const reportCollection = database.collection("portfolio");

  // Create an array of updateOne operations
  const operations = prices.map((price: any) => ({
    updateOne: {
      filter: {
        $or: [
          { "ISIN": price["ISIN"] },
          { "BB Ticker": price["BB Ticker"] },
          { "Issue": price["Issue"] }
        ]
      },
      update: { $set: price },
      upsert: true
    }
  }));

  // Execute the operations in bulk
  try {
    const result = await reportCollection.bulkWrite(operations);
    const date = new Date(new Date().getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const historicalReportCollection = database.collection(`portfolio-${date}`);
    let action = await historicalReportCollection.bulkWrite(operations);

    return result
  } catch (error) {

    return error;
  }
}

function calculateDailyInterestUnRlzdCapitalGains(portfolio: any, date: any) {

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    let quantityGeneratingInterest = position["Quantity"]
    let interestInfo = position["Interest"]
    let averageCost = parseFloat(position["Average Cost"]) / 100
    let todayPrice = parseFloat(position["Mid"]) / 100
    portfolio[index]["Daily Capital Gains URlzd"] = (averageCost - todayPrice) * parseFloat(position["Quantity"]) || 0
    let settlementDates = Object.keys(interestInfo)
    for (let indexSettlementDate = 0; indexSettlementDate < settlementDates.length; indexSettlementDate++) {
      let settlementDate = settlementDates[indexSettlementDate];
      let settlementDateTimestamp = new Date(settlementDate).getTime()
      if (settlementDateTimestamp >= new Date(date).getTime()) {
        quantityGeneratingInterest -= interestInfo[settlementDate]
      }
    }
    let couponDaysYear = portfolio[index]["Issue"].split(" ")[0] == "T" ? 365 : 360
    portfolio[index]["Daily Interest Income"] = (parseFloat(quantityGeneratingInterest) * (portfolio[index]["Coupon Rate"] / 100)) / couponDaysYear
    if (!portfolio[index]["Daily Interest Income"]) {
      portfolio[index]["Daily Interest Income"] = 0
    }
  }
  return portfolio
}

function calculateMonthlyInterest(portfolio: any, date: any) {
  let currentDayDate = new Date(new Date(date).getTime() - 0 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  let previousMonthDates = getAllDatesSinceLastMonthLastDay(currentDayDate)
  let monthlyInterest: any = {}
  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    let quantityGeneratingInterest = position["Quantity"]
    let interestInfo = position["Interest"]
    portfolio[index]["Monthly Interest Income"] = 0
    let settlementDates = Object.keys(interestInfo)
    monthlyInterest[position["Issue"]] = {}
    // reason why 1, to ignore last day of last month
    for (let indexPreviousMonthDates = 1; indexPreviousMonthDates < previousMonthDates.length; indexPreviousMonthDates++) {
      let dayInCurrentMonth = previousMonthDates[indexPreviousMonthDates];
      monthlyInterest[position["Issue"]][dayInCurrentMonth] = quantityGeneratingInterest

      for (let indexSettlementDate = 0; indexSettlementDate < settlementDates.length; indexSettlementDate++) {
        let settlementDate = settlementDates[indexSettlementDate];
        let settlementDateTimestamp = new Date(settlementDate).getTime()
        if (settlementDateTimestamp >= new Date(dayInCurrentMonth).getTime()) {
          monthlyInterest[position["Issue"]][dayInCurrentMonth] -= interestInfo[settlementDate]
        }
      }
      let couponDaysYear = position["Issue"].split(" ")[0] == "T" ? 365 : 360
      let dayInCurrentMonthInterestEarned = (parseFloat(monthlyInterest[position["Issue"]][dayInCurrentMonth]) * (portfolio[index]["Coupon Rate"] / 100)) / couponDaysYear
      if (!dayInCurrentMonthInterestEarned) {
        dayInCurrentMonthInterestEarned = 0
      }
      monthlyInterest[position["Issue"]][dayInCurrentMonth] = dayInCurrentMonthInterestEarned
      portfolio[index]["Monthly Interest Income"] += dayInCurrentMonthInterestEarned
    }

  }
  return portfolio
}

async function getMTDParams(portfolio: any, lastMonthPortfolio: any) {

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];

    for (let indexLastMonthPortfolio = 0; indexLastMonthPortfolio < lastMonthPortfolio.length; indexLastMonthPortfolio++) {
      let lastMonthPosition = lastMonthPortfolio[indexLastMonthPortfolio];
      if (position["Issue"] == lastMonthPosition["Issue"]) {
        portfolio[index]["MTD Mark"] = lastMonthPosition["Mid"] || "Not Applicable";
      }
    }
  }
  return portfolio
}

function calculateMonthlyURlzd(portfolio: any) {

  for (let index = 0; index < portfolio.length; index++) {
    portfolio[index]["Monthly Capital Gains URlzd"] = ((parseFloat(portfolio[index]["MTD Mark"]) - parseFloat(portfolio[index]["Mid"])) / 100.0) * portfolio[index]["Quantity"]
  }
  return portfolio
}


import { CentralizedTrade } from "../../models/trades";
import { client } from "../userManagement/auth";
import { formatDateUS, formatDateWorld } from "../common";
import { getAllDatesSinceLastMonthLastDay, getDateTimeInMongoDBCollectionFormat } from "./common";

export function getAverageCost(currentQuantity: number, previousQuantity: number, currentPrice: any, previousAverageCost: any) {
  if (!previousQuantity) {
    previousQuantity = 0;
  }
  if (!previousAverageCost) {
    previousAverageCost = 0;
  }
  if (Math.round(currentQuantity + previousQuantity) == 0) {
    return currentPrice;
  } else {
    let previousPrice = previousAverageCost;
    let averageCost = (currentQuantity * currentPrice + previousQuantity * previousPrice) / (currentQuantity + previousQuantity);
    // console.log("testing " + currentQuantity, previousQuantity, currentPrice, "previous average cost: " +previousAverageCost, "result: " + averageCost);
    return averageCost;
  }
}

export function settlementDatePassed(settlementDate: string, ticker: string) {
  let parts: any = settlementDate.split("/");
  let year = parseInt(parts[2], 10);
  year += year < 70 ? 2000 : 1900; // Adjust year
  let inputDate = new Date(year, parts[0] - 1, parts[1]);

  let today = new Date();

  // Set the time of both dates to be the same
  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return today >= inputDate;
}
export function remainingDaysInYear(inputDate: any) {
  inputDate = new Date(inputDate);
  // Get the current year from the input date
  const year = inputDate.getFullYear();

  // Create a new Date object for the last day of the current year
  const lastDayOfYear = new Date(year, 11, 31); // Months are zero-based in JavaScript

  // Calculate the difference between the last day of the year and the input date in milliseconds
  const timeDiff = lastDayOfYear.getTime() - inputDate.getTime();

  // Convert milliseconds to days and add 1 to include the input date
  const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;

  return daysRemaining;
}
export function parseBondIdentifier(identifier: any): any {
  // Split the identifier into components
  try {
    if (identifier) {
      const components: any = identifier.split(" ");
      let dateIndex = 2;
      const fractionMap: any = {
        "⅛": 0.125,
        "¼": 0.25,
        "⅓": 0.3333333333333333,
        "⅜": 0.375,
        "½": 0.5,
        "⅝": 0.625,
        "⅔": 0.6666666666666666,
        "¾": 0.75,
        "⅞": 0.875,
      };
      try {
        let rate;
        if (components.length > 2) {
          rate = parseFloat(components[1].replace("V", "").trim()) ? parseFloat(components[1].replace("V", "").trim()) : "";
          // console.log(rate, "reate before");
          if (rate) {
            let fractions = Object.keys(fractionMap);
            for (let index = 0; index < fractions.length; index++) {
              let fraction = fractions[index];
              if (components.includes(fraction)) {
                rate += fractionMap[fraction];
                dateIndex += 1;
              }
            }
          }
          // console.log(rate, "reate after");
          for (let index = dateIndex; index < components.length; index++) {
            if (components[dateIndex]) {
              if (components[dateIndex].split("/").length <= 2) {
                dateIndex++;
              }
            }
          }
          let date: any;
          if (components[dateIndex]) {
            let dateComponents = components[dateIndex].split("/");
            date = new Date(`${dateComponents[0]}/${dateComponents[1]}/${"20" + dateComponents[2]}`);
            if (identifier.toString().toLowerCase().includes("perp")) {
              date = null;
            }

            if (date) {
              date = formatDateWorld(date);
            }
          }
          return { rate: rate, date: date };
        } else {
          return { rate: 0, date: 0 };
        }
      } catch (error: any) {
        console.log(error);
        return { rate: 0, date: 0 };
      }
    } else {
      return { rate: 0, date: 0 };
    }
  } catch (error) {
    return { rate: 0, date: 0 };
  }
}

export function getSettlementDateYear(date1: string, date2: string) {
  // Parse the month and year from the first date

  const [month1, day1, year1] = date1.split("/").map(Number);

  // Parse the month from the second date
  let [month2, day2]: any = date2.split("/").map(Number);

  // If the month of the second date is less than the month of the first date,
  // it means we've crossed into a new year, so increment the year
  const year2 = month2 < month1 ? year1 + 1 : year1;

  // Add leading zero if month2 or day2 is less than 10
  month2 = month2 < 10 ? month2.toString().padStart(2, "0") : month2;
  day2 = day2 < 10 ? day2.toString().padStart(2, "0") : day2;

  // Return the second date with the year appended
  return `${month2}/${day2}/${year2}`;
}

export function findTradeRecord(trades: CentralizedTrade[], rowId: any): number | null {
  const index = trades.findIndex((trade: any) => trade["Triada Trade Id"] === rowId);
  return index !== -1 ? index : null;
}

export function formatUpdatedPositions(positions: any, portfolio: any, lastUpdatedDescription: string): { updatedPortfolio: any[]; positionsThatDoNotExistsNames: any[]; positionsThatGotUpdated: any[]; positionsThatDoNotExists: any[] } {
  let positionsIndexThatExists = [];
  let positionsThatGotUpdated = [];
  let positionsThatDoNotExists = [];
  let positionsThatDoNotExistsNames: any = {};
  for (let indexPositions = 0; indexPositions < positions.length; indexPositions++) {
    const position = positions[indexPositions];
    for (let indexPortfolio = 0; indexPortfolio < portfolio.length; indexPortfolio++) {
      const portfolioPosition = portfolio[indexPortfolio];

      if ((position["ISIN"] == portfolioPosition["ISIN"] || position["BB Ticker"] == portfolioPosition["BB Ticker"]) && position["Location"].trim() == portfolioPosition["Location"].trim()) {
        portfolio[indexPortfolio] = position;
        positionsThatGotUpdated.push(`${position["BB Ticker"]} ${position["Location"]}\n`);

        positionsIndexThatExists.push(indexPositions);
      }
      portfolio[indexPortfolio][lastUpdatedDescription] = new Date();
    }
  }

  for (let indexPositionsExists = 0; indexPositionsExists < positions.length; indexPositionsExists++) {
    if (!positionsIndexThatExists.includes(indexPositionsExists)) {
      positionsThatGotUpdated.push(`${positions[indexPositionsExists]["BB Ticker"]} ${positions[indexPositionsExists]["Location"]}\n`);
      positionsThatDoNotExists.push(positions[indexPositionsExists]);
    }
  }

  for (let indexPositions = 0; indexPositions < portfolio.length; indexPositions++) {
    if (!positionsThatGotUpdated.includes(`${portfolio[indexPositions]["BB Ticker"]} ${portfolio[indexPositions]["Location"]}\n`) && portfolio[indexPositions]["Notional Amount"] != 0) {
      positionsThatDoNotExistsNames[portfolio[indexPositions]["BB Ticker"]] = { location: portfolio[indexPositions]["Location"], notional: portfolio[indexPositions]["Notional Amount"] };
    }
  }
  // let data = [[...portfolio, ...positionsThatDoNotExists], positionsThatDoNotExistsNames, positionsThatGotUpdated, positionsThatDoNotExists, positionsIndexThatExists];
  let data = { updatedPortfolio: [...portfolio, ...positionsThatDoNotExists], positionsThatDoNotExistsNames: positionsThatDoNotExistsNames, positionsThatGotUpdated: positionsThatGotUpdated, positionsThatDoNotExists: positionsThatDoNotExists };

  return data;
}

export async function getCollectionName(originalDate: any) {
  const database = client.db("portfolios");
  const targetDate = new Date(originalDate);
  let day = targetDate.getDate();
  let month = targetDate.getMonth() + 1;
  let year = targetDate.getFullYear();
  let regexPattern = `portfolio-${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  const cursor = database.listCollections({ name: { $regex: new RegExp(regexPattern) } });
  const collections = await cursor.toArray();

  let collectionNames = [];
  for (let index = 0; index < collections.length; index++) {
    let collection = collections[index];
    let collectionDateName = collection.name.split("-");
    let collectionDate = collectionDateName[1] + "-" + collectionDateName[2] + "-" + collectionDateName[3].split(" ")[0];
    if (originalDate.includes(collectionDate)) {
      collectionNames.push(collection.name);
    }
  }

  let dates: any = [];
  for (let collectionIndex = 0; collectionIndex < collections.length; collectionIndex++) {
    let collection = collections[collectionIndex];
    let collectionDateName = collection.name.split("-");
    let collectionDate = collectionDateName[1] + "/" + collectionDateName[2] + "/" + collectionDateName[3];

    if (new Date(collectionDate)) {
      dates.push(new Date(collectionDate));
    }
  }
  if (dates.length == 0) {
    return null;
  }
  let predecessorDate: any = new Date(Math.max.apply(null, dates));
  if (predecessorDate) {
    predecessorDate = getDateTimeInMongoDBCollectionFormat(new Date(predecessorDate));
  }
  return predecessorDate;
}
export async function getEarliestCollectionName(originalDate: string): Promise<{ predecessorDate: string; collectionNames: string[] }> {
  const database = client.db("portfolios");

  const targetDate = new Date(originalDate);
  const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 2, targetDate.getDate());

  // Generate regex pattern to match collections within the two-month range
  let startMonth = startDate.getMonth() + 1;
  let startYear = startDate.getFullYear();
  let endMonth = targetDate.getMonth() + 1;
  let endYear = targetDate.getFullYear();

  let regexPattern = `^portfolio-(${startYear}-${startMonth.toString().padStart(2, "0")}`;
  if (startYear !== endYear || startMonth !== endMonth) {
    for (let date = new Date(startDate); date <= targetDate; date.setMonth(date.getMonth() + 1)) {
      let month = date.getMonth() + 1;
      let year = date.getFullYear();
      regexPattern += `|${year}-${month.toString().padStart(2, "0")}`;
    }
  }
  regexPattern += ")";

  const cursor = database.listCollections({ name: { $regex: new RegExp(regexPattern) } });
  const collections = await cursor.toArray();

  let collectionNames = [];
  for (let index = 0; index < collections.length; index++) {
    let collection = collections[index];
    let collectionDateName = collection.name.split("-");
    let collectionDate = collectionDateName[1] + "-" + collectionDateName[2] + "-" + collectionDateName[3].split(" ")[0];
    if (originalDate.includes(collectionDate)) {
      collectionNames.push(collection.name);
    }
  }

  let dates = [];
  for (let collectionIndex = 0; collectionIndex < collections.length; collectionIndex++) {
    let collection = collections[collectionIndex];
    let collectionDateName = collection.name.split("-");
    let collectionDate = collectionDateName[1] + "/" + collectionDateName[2] + "/" + collectionDateName[3];

    if (new Date(collectionDate)) {
      dates.push(new Date(collectionDate));
    }
  }
  let inputDate = new Date(originalDate);

  let predecessorDates: any = dates.filter((date) => date < inputDate);

  if (predecessorDates.length == 0) {
    return { predecessorDate: "", collectionNames: collectionNames };
  }
  let predecessorDate: any = new Date(Math.max.apply(null, predecessorDates));
  if (predecessorDate) {
    predecessorDate = getDateTimeInMongoDBCollectionFormat(new Date(predecessorDate));
  }
  return { predecessorDate: predecessorDate, collectionNames: collectionNames };
}

export async function getAllCollectionDatesSinceStartMonth(originalDate: string) {
  const database = client.db("portfolios");
  let collections = await database.listCollections().toArray();
  let currentDayDate = new Date(new Date(originalDate).getTime()).toISOString().slice(0, 10);
  let previousMonthDates = getAllDatesSinceLastMonthLastDay(currentDayDate);

  let dates = [];
  for (let collectionIndex = 0; collectionIndex < collections.length; collectionIndex++) {
    let collection = collections[collectionIndex];
    let collectionDateName = collection.name.split("-");
    let collectionDate: any = collectionDateName[1] + "/" + collectionDateName[2] + "/" + collectionDateName[3];
    collectionDate = new Date(collectionDate);
    if (collectionDate.getTime() > new Date(previousMonthDates[0]) && collectionDate.getTime() < new Date(previousMonthDates[previousMonthDates.length - 1])) {
      dates.push(collection.name);
    }
  }

  return dates;
}

export function getDaysBetween(startDate: any, endDate: any) {
  // Parse the start and end dates into Date objects
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  // Calculate the difference in milliseconds
  const diffInMs = end - start;

  // Convert milliseconds to days (1 day = 24 hours * 60 minutes * 60 seconds * 1000 milliseconds)
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  // Return the absolute value of the difference in days
  return Math.abs(Math.round(diffInDays)) || 0;
}

export function getStatistics(array: any) {
  const n = array.length;
  if (n < 4) {
    // Ensure there are enough data points to calculate these metrics
    throw new Error("Array must contain at least four data points.");
  }

  const mean = array.reduce((a: any, b: any) => a + b, 0) / n;

  let sumOfSquares = 0;
  let sumOfCubedDeviations = 0;
  let sumOfQuarticDeviations = 0;

  array.forEach((x: any) => {
    const deviation = x - mean;
    sumOfSquares += deviation ** 2;
    sumOfCubedDeviations += deviation ** 3;
    sumOfQuarticDeviations += deviation ** 4;
  });

  const sd = Math.sqrt(sumOfSquares / (n - 1));
  const skewness = (n / ((n - 1) * (n - 2))) * (sumOfCubedDeviations / sd ** 3);
  const kurtosis = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * (sumOfQuarticDeviations / sd ** 4) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));

  return {
    mean: mean,
    sd: sd,
    skewness: skewness,
    kurtosis: kurtosis,
    arrLength: n,
  };
}
export function getSampleStandardDeviation(array: any): { sd: number; mean: number; arrLength: number } {
  const n = array.length;
  const mean = array.reduce((a: any, b: any) => a + b) / n;
  let sd = Math.sqrt(array.map((x: any) => Math.pow(x - mean, 2)).reduce((a: any, b: any) => a + b, 0) / (n - 1));
  return { sd: sd, mean: mean, arrLength: n };
}

export function updateStats({ data, returnMonth, cumulativeReturn, numOfMonths, returns, positiveReturns, negativeReturns, peak, trough, variable, troughReturn, peakReturn, monthsIndex }: { data: any; returnMonth: any; cumulativeReturn: any; numOfMonths: any; returns: any; positiveReturns: any; negativeReturns: any; peak: any; trough: any; variable: string; troughReturn: any; peakReturn: any; monthsIndex: any }) {
  if (data[monthsIndex].data[variable] && data[monthsIndex - 1].data[variable]) {
    returnMonth[variable] = data[monthsIndex].data[variable] / data[monthsIndex - 1].data[variable] - 1;
    cumulativeReturn[variable] = cumulativeReturn[variable] * (returnMonth[variable] + 1);
    numOfMonths[variable] += 1;
    returns[variable].push(returnMonth[variable]);

    if (returnMonth[variable] >= 0) {
      positiveReturns[variable].push(returnMonth[variable]);
    } else {
      negativeReturns[variable].push(returnMonth[variable]);
    }

    if (data[monthsIndex].data[variable] > peak[variable]) {
      peak[variable] = data[monthsIndex].data[variable];
    }
    if (data[monthsIndex].data[variable] < trough[variable]) {
      trough[variable] = data[monthsIndex].data[variable];
    }
    if (returnMonth[variable] > peakReturn[variable]) {
      peakReturn[variable] = returnMonth[variable];
    }
    if (returnMonth[variable] < troughReturn[variable]) {
      troughReturn[variable] = returnMonth[variable];
    }
  }
}
function monthName(monthNum: any) {
  const monthNames: any = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    "10": "Oct",
    "11": "Nov",
    "12": "Dec",
    Cumulative: "Cumulative",
  };
  return monthNames[monthNum];
}

// Function to transform data
export function transformData(data: any, yearlyData: any) {
  const formattedData: any = {};
  let keys = Object.keys(data);
  // Initialize formatted data structure
  keys.forEach((date) => {
    const [month, year] = date.split("/");
    const monthStr = monthName(month);

    Object.entries(data[date]).forEach(([key, value]) => {
      if (!formattedData[key]) {
        formattedData[key] = {};
      }
      if (!formattedData[key][year]) {
        formattedData[key][year] = {
          Jan: null,
          Feb: null,
          Mar: null,
          Apr: null,
          May: null,
          Jun: null,
          Jul: null,
          Aug: null,
          Sep: null,
          Oct: null,
          Nov: null,
          Dec: null,
          Cumulative: null,
        };
      }
      formattedData[key][year][monthStr] = value;
    });
  });

  return formattedData;
}

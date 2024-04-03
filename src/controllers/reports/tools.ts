import { CentralizedTrade } from "../../models/trades";
import { client } from "../auth";
import { formatDateUS, formatDateWorld } from "../common";
import { insertEditLogs } from "../operations/portfolio";
import { getAllDatesSinceLastMonthLastDay, getDateTimeInMongoDBCollectionFormat } from "./common";

export function getAverageCost(currentQuantity: number, previousQuantity: number, currentPrice: any, previousAverageCost: any) {
  if (!previousQuantity) {
    previousQuantity = 0;
  }
  if (!previousAverageCost) {
    previousAverageCost = 0;
  }
  if (currentQuantity + previousQuantity == 0) {
    let previousPrice = previousAverageCost;
    return (previousPrice + currentPrice) / 2.0;
  } else {
    let previousPrice = previousAverageCost;
    let averageCost = (currentQuantity * currentPrice + previousQuantity * previousPrice) / (currentQuantity + previousQuantity);
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
          while (dateIndex < components.length && components[dateIndex].split("/").length <= 2) {
            dateIndex++;
          }
          let dateComponents = components[dateIndex].split("/");
          let date: any = new Date(`${dateComponents[0]}/${dateComponents[1]}/${"20" + dateComponents[2]}`);
          if (identifier.toString().toLowerCase().includes("perp")) {
            date = null;
          }

          if (date) {
            date = formatDateUS(date);
          }
          return { rate: rate, date: date };
        } else {
          return { rate: 0, date: 0 };
        }
      } catch (error: any) {
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
    if (!positionsThatGotUpdated.includes(`${portfolio[indexPositions]["BB Ticker"]} ${portfolio[indexPositions]["Location"]}\n`)) {
      positionsThatDoNotExistsNames[portfolio[indexPositions]["BB Ticker"]] = { location: portfolio[indexPositions]["Location"], notional: portfolio[indexPositions]["Notional Amount"] };
    }
  }
  let data = { updatedPortfolio: [...portfolio, ...positionsThatDoNotExists], positionsThatDoNotExistsNames: positionsThatDoNotExistsNames, positionsThatGotUpdated: positionsThatGotUpdated, positionsThatDoNotExists: positionsThatDoNotExists };

  return data;
}

export async function getEarliestCollectionName(originalDate: string): Promise<{ predecessorDate: string; collectionNames: string[] }> {
  const database = client.db("portfolios");
  let collections = await database.listCollections().toArray();
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
  //hong kong time difference with utc
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

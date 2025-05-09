import { bucket, bucketPublic, formatDateUS, generateRandomString } from "../common";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { insertEditLogs } from "./logs";
import { chromium } from "@playwright/test";
import { uploadToGCloudBucketPDF } from "./readExcel";
import { parseBondIdentifier } from "../reports/tools";
import { PositionInDB } from "../../models/portfolio";

export function formatDateNomura(dateString: any) {
  // Split the input date string by '/'
  const parts = dateString.split("/");

  // Extract month, day, and year from the parts
  const month = parts[0];
  const day = parts[1];
  const year = parts[2];

  // Return the formatted string in 'yyyymmdd' format
  return `${year}${month}${day}`;
}
export function formatDateToIso(dateString: any) {
  // Split the input date string by '/'
  const parts = dateString.split("/");

  // Extract month, day, and year from the parts
  const day = parts[0];
  const month = parts[1];
  const year = parts[2];

  // Return the formatted string in 'yyyymmdd' format
  return new Date(`${year}-${month}-${day}`);
}
export function parseYYYYMMDDAndReturnMonth(dateString: string) {
  // Ensure the input is a string and has exactly 8 characters
  // Extract year, month, and day from the input string
  const year = parseInt(dateString.slice(0, 4), 10);
  const month = parseInt(dateString.slice(4, 6), 10) - 1; // Month is zero-based (0 = January)
  const day = parseInt(dateString.slice(6, 8), 10);

  // Create and return a new Date object
  return month + 1;
}

export function getCollectionDays(collections: { name: string; timestamp: number }[]): string[] {
  try {
    let dates: any = [];
    for (let index = 0; index < collections.length; index++) {
      let collectionTime = collections[index].name.split("portfolio");
      let date = formatDateUS(collectionTime);
      if (!dates.includes(date)) {
        dates.push(date);
      }
    }
    dates.sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime());

    return dates;
  } catch (error: any) {
    console.log({ getCollectionDays: error });
    return [];
  }
}
export function getCollectionIndexDays(collections: { name: string; timestamp: number }[]): string[] {
  try {
    let dates: any = [];
    let datesIndex: any = [];

    for (let index = 0; index < collections.length; index++) {
      let collectionTime = collections[index].name.split("portfolio");
      let date = formatDateUS(collectionTime);
      if (!dates.includes(date)) {
        dates.push(date);
        datesIndex.push(collections[index].name);
      }
    }

    return datesIndex;
  } catch (error: any) {
    console.log({ getCollectionDays: error });
    return [];
  }
}
export function getSecurityInPortfolioWithoutLocation(portfolio: any, identifier: string, fx = false): PositionInDB[] | 404 {
  let document: any = [];
  if (identifier == "" || !identifier) {
    return document;
  }
  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    if (identifier.includes(position["ISIN"])) {
      if (position["ISIN"] != "" && (position["Type"] != "FX" || fx)) {
        document.push(position);
      }
    } else if (identifier.includes(position["BB Ticker"])) {
      if (position["BB Ticker"] != "" && (position["Type"] != "FX" || fx)) {
        document.push(position);
      }
    } else if (identifier.includes(position["Bloomberg ID"])) {
      if (position["Bloomberg ID"] != "" && (position["Type"] != "FX" || fx)) {
        document.push(position);
      }
    }
  }
  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return document.length ? document : 404;
}

export function compareMonths(a: any, b: any) {
  // Reformat the month string to 'MM/01/YYYY' for comparison
  let reformattedMonthA = a.month.substring(5) + "/01/" + a.month.substring(0, 4);
  let reformattedMonthB = b.month.substring(5) + "/01/" + b.month.substring(0, 4);
  // Convert the reformatted strings to date objects
  let dateA = new Date(reformattedMonthA).getTime();
  let dateB = new Date(reformattedMonthB).getTime();

  // Compare the date objects
  return dateB - dateA;
}

export function getMonthInFundDetailsFormat(date: any) {
  let fundDetailsMonth = "";
  date = new Date(date);
  let month = date.getMonth() + 1;
  if (month < 10) {
    month = "0" + month;
  }
  let year = date.getFullYear();
  return `${year}/${month}`;
}

export function getDateAndOneWeekLater() {
  // Create a Date object from the input date
  let startDate = new Date();

  // Check if the date is valid

  // Create a new Date object for the date one week later
  let endDate = new Date(startDate.getTime());

  // Add 7 days to the date
  endDate.setDate(startDate.getDate() + 7);

  // Format dates to a more readable form, e.g., YYYY-MM-DD
  const options: any = { year: "numeric", month: "2-digit", day: "2-digit" };
  let formattedStartDate = startDate.toLocaleDateString("en-CA", options);
  let formattedEndDate = endDate.toLocaleDateString("en-CA", options);

  // Return the original and the one week later dates
  return {
    startDate: formattedStartDate,
    endDate: formattedEndDate,
  };
}
export function getSQLIndexFormat(date: string, portfolioId: string) {
  let name = date.split("-");
  let nameInDB = name[2] + "/" + name[3].split(" ")[0] + "/" + name[1];
  return portfolioId + "_" + nameInDB.replace(/-/g, "_").replace(/\//g, "_");
}

export function takeDateWithTimeAndReturnTimestamp(date: any) {
  const [month, day, year, time] = date.split(/[/ ]/);
  const [hours, minutes] = time.split(":");
  const timestamp = new Date(year, month - 1, day, hours, minutes).getTime();
  return timestamp;
}

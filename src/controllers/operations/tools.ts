import { Position } from "../../models/position";
import { client } from "../userManagement/auth";
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

export async function getCollectionDays(): Promise<string[]> {
  try {
    const database = client.db("portfolios");
    let collections = await database.listCollections().toArray();
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
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getCollectionDays", "controllers/operations/operations.ts");

    return [];
  }
}
export function getSecurityInPortfolioWithoutLocation(portfolio: any, identifier: string): PositionInDB[] | 404 {
  let document: any = [];
  if (identifier == "" || !identifier) {
    return document;
  }
  for (let index = 0; index < portfolio.length; index++) {
    let issue = portfolio[index];
    if (identifier.includes(issue["ISIN"])) {
      if (issue["ISIN"] != "") {
        document.push(issue);
      }
    } else if (identifier.includes(issue["BB Ticker"])) {
      if (issue["BB Ticker"] != "") {
        document.push(issue);
      }
    } else if (identifier.includes(issue["Bloomberg ID"])) {
      if (issue["Bloomber ID"] != "") {
        document.push(issue);
      }
    }
  }
  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return document.length ? document : 404;
}
export function getSecurityInPortfolioById(portfolio: any, id: string) {
  let document = 404;
  if (id == "" || !id) {
    return document;
  }
  for (let index = 0; index < portfolio.length; index++) {
    let issue = portfolio[index];
    if (id.toString() == issue["_id"].toString()) {
      document = issue;
    }
  }
  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return document;
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

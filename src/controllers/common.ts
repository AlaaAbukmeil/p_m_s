import { Request, Response, NextFunction, CookieOptions } from "express";
require("dotenv").config();

const jwt = require("jsonwebtoken");

export const uri = "mongodb+srv://" + process.env.MONGODBUSERNAME + ":" + process.env.NEWMONGODBPASSWORD + "@app.ywfxr8w.mongodb.net/?retryWrites=true&w=majority";
export const platform = "https://admin.triadacapital.com/reset-password?sent=none";
export const bucket = "https://storage.cloud.google.com/app-backend-414212.appspot.com";
export const bucketPublic = "https://storage.googleapis.com/public_triada_admin";

const { Storage } = require("@google-cloud/storage");
const { PassThrough } = require("stream");

export const storage = new Storage({ keyFilename: process.env.KEYPATHFILE });
export const bucketPublicBucket = storage.bucket(process.env.BUCKET_PUBLIC);

export async function generateSignedUrl(fileName: string): Promise<string> {
  const options = {
    version: "v4",
    action: "read",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  };

  const [url] = await storage.bucket(process.env.BUCKET).file(fileName).getSignedUrl(options);

  return url;
}

export function getCurrentMonthDateRange(): string {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const formattedFirstDay = `${monthNames[currentMonth]} ${firstDayOfMonth.getDate()}${getOrdinalSuffix(firstDayOfMonth.getDate())} ${currentYear}`;
  const formattedLastDay = `${monthNames[currentMonth]} ${lastDayOfMonth.getDate()}${getOrdinalSuffix(lastDayOfMonth.getDate())} ${currentYear}`;

  return `${formattedFirstDay} - ${formattedLastDay}`;
}

export function getOrdinalSuffix(date: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = date % 100;
  return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
}

export function getDate(dateInput: any | null) {
  let date = new Date();
  if (dateInput) {
    date = new Date(dateInput); // Current date
  }

  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "2-digit", // two-digit day
    month: "2-digit", // two-digit month
    year: "numeric", // four-digit year
  });
  return formattedDate;
}
export function parsePercentage(str: string) {
  // Remove the percent sign and any surrounding whitespace, then parse to float
  try {
    return parseFloat(str.toString().replace("%", "").trim());
  } catch (error) {
    // console.log(str, "wrong value str%", error);
    return 0;
  }
}
export function formatDate(date: any) {
  date = new Date(date);
  if (!date) {
    return "Not Applicable";
  }
  const formattedDate = date.toLocaleDateString("en-GB", {
    day: "2-digit", // two-digit day
    month: "2-digit", // two-digit month
    year: "numeric", // four-digit year
  });
  return formattedDate;
}

export function formatDateFile(date: string) {
  let d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [month, day].join("-");
}

export function formatDateUS(date: any): any {
  let d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate(),
    year = d.getFullYear();
  if (year == 1970) {
    return 0;
  }

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [month, day, year].join("/");
}

export function getTime(input: any = null) {
  let date = new Date(); // Current date and time
  if (input) {
    date = new Date(input);
  }

  let hours: any = date.getHours();
  let minutes: any = date.getMinutes();

  // Convert hours and minutes to strings and pad with zeros if necessary
  hours = hours < 10 ? "0" + hours : "" + hours;
  minutes = minutes < 10 ? "0" + minutes : "" + minutes;

  const time = `${hours}:${minutes}`;

  return time;
}

export const verifyToken = (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies["triada.admin.cookie"].token;

    if (!token) {
      return res.sendStatus(401);
    }

    const decoded = jwt.verify(token, process.env.SECRET);
    req.accessRole = decoded.accessRole;
    req.email = decoded.email;
    if (decoded.accessRole != "admin") {
      return res.sendStatus(401);
    }
    next();
  } catch (error) {
    console.log(error);
    return res.sendStatus(401);
  }
};

export const verifyTokenRiskMember = (req: Request | any, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies["triada.admin.cookie"].token;

    if (!token) {
      return res.sendStatus(401);
    }

    const decoded = jwt.verify(token, process.env.SECRET);
    req.accessRole = decoded.accessRole;
    req.email = decoded.email;

    if (decoded.accessRole != "member (risk report)" && decoded.accessRole != "admin") {
      return res.sendStatus(401);
    }
    next();
  } catch (error) {
    console.log(error);
    return res.sendStatus(401);
  }
};
export const verifyTokenFactSheetMember = (req: Request | any, res: Response, next: NextFunction) => {
  try {
    req.cookies["triada.admin.cookie"] = req.cookies["triada.admin.cookie"] ? req.cookies["triada.admin.cookie"] : {};
    let token = req.cookies["triada.admin.cookie"].token;
    req.query = req.query ? req.query : {};
    let tokenQuery = req.query.token;
    let linkToken = false;
    // console.log(!token && !tokenQuery, "test 1");
    if (!token && !tokenQuery) {
      return res.sendStatus(401);
    }
    if (!token) {
      token = tokenQuery;
      linkToken = true;
    }

    const decoded = jwt.verify(token, process.env.SECRET);
    req.accessRole = decoded.accessRole;
    req.shareClass = decoded.shareClass;
    req.email = decoded.email;
    req.link = decoded.link;
    req.token = token;
    if (decoded.accessRole != "member (risk report)" && decoded.accessRole != "admin" && decoded.accessRole != "member (factsheet report)") {
      return res.sendStatus(401);
    }
    if (linkToken) {
      let cookie: CookieOptions = {
        maxAge: 3 * 24 * 60 * 60 * 1000,
        httpOnly: process.env.PRODUCTION === "production",
        secure: process.env.PRODUCTION === "production", // Set to true if using HTTPS
        sameSite: "lax",
        path: "/",
        domain: ".triadacapital.com",
      };

      res.cookie("triada.admin.cookie", { token: token }, cookie);
    }
    next();
  } catch (error) {
    console.log(error);
    return res.sendStatus(401);
  }
};

export function getCurrentDateVconFormat() {
  // Get current date
  const date = new Date();

  // Get day, month, and year
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based in JavaScript
  const year = date.getFullYear();

  // Format date as dd/mm/yyyy
  return `${day}/${month}/${year}`;
}

export function formatTradeDate(date: Date) {
  date = new Date(date);
  const year = date.getFullYear().toString();
  let month = (date.getMonth() + 1).toString();
  let day = date.getDate().toString();

  month = month.length < 2 ? "0" + month : month;
  day = day.length < 2 ? "0" + day : day;

  return `${month}/${day}/${year}`;
}

export function getTradeDateYearTrades(date: any) {
  // Parse the month and year from the first date

  let dateComponenets = date.split("/");
  return `${dateComponenets[0]}/${dateComponenets[1]}/${"20" + dateComponenets[2]}`;
}
export function getTradeDateYearTradesWithoutTheCentury(date: any) {
  // Parse the month and year from the first date

  let dateComponenets = date.split("/");
  return `${dateComponenets[0]}/${dateComponenets[1]}/${dateComponenets[2]}`;
}
export function isNotNullOrUndefined(value: any) {
  return value !== undefined && value !== null;
}

export function getYear(dateInput: string) {
  let date = new Date(dateInput);
  const year = date.getFullYear();
  return `${year}`;
}

export function formatDateWorld(inputDate: any) {
  let date = new Date(inputDate);
  let day = `${date.getDate()}`.padStart(2, "0"); // get the day
  let month = `${date.getMonth() + 1}`.padStart(2, "0"); // get the month (months are 0-indexed in JS, so add 1)
  let year = `${date.getFullYear()}`.slice(-2); // get the year and take the last two digits

  return `${day}/${month}/${year}`;
}
export function swapMonthDay(dateStr: string) {
  // Split the string into components
  const parts = dateStr.split("/");

  // Check if the input is correct
  if (parts.length === 3 && parts.every((part: any) => !isNaN(part))) {
    const [day, month, year] = parts;
    // Reassemble the date string in the format "mm/dd/yyyy"
    return `${month}/${day}/${year}`;
  } else {
    // If the input is not valid, return an error message
    return "Invalid date format. Please use 'dd/mm/yyyy'.";
  }
}

export function convertExcelDateToJSDate(serial: any) {
  if (parseFloat(serial) < 45000) {
    return serial;
  }
  const excelStartDate = new Date(1900, 0, 1);
  const correctSerial = serial - 2; //Excel and JS have different leap year behaviors
  const millisecondsInDay = 24 * 60 * 60 * 1000;

  const jsDate = new Date(excelStartDate.getTime() + correctSerial * millisecondsInDay);

  const year = jsDate.getFullYear();
  const month = jsDate.getMonth() + 1; // JavaScript months start at 0
  const day = jsDate.getDate();

  const formattedMonth = month < 10 ? "0" + month : month;
  const formattedDay = day < 10 ? "0" + day : day;

  return `${formattedMonth}/${formattedDay}/${year}`;
}
export function convertExcelDateToJSDateTime(serial: any) {
  if (parseFloat(serial) < 45000) {
    return serial;
  }

  const excelStartDate = new Date(1900, 0, 1);
  const correctSerial = serial - 2; //Excel and JS have different leap year behaviors
  const millisecondsInDay = 24 * 60 * 60 * 1000;

  const jsDate = new Date(excelStartDate.getTime() + correctSerial * millisecondsInDay);

  const year = jsDate.getFullYear();
  const month = jsDate.getMonth() + 1; // JavaScript months start at 0
  const day = jsDate.getDate();
  const hours = jsDate.getHours();
  const minutes = jsDate.getMinutes();
  const seconds = jsDate.getSeconds();

  const formattedMonth = month < 10 ? "0" + month : month;
  const formattedDay = day < 10 ? "0" + day : day;
  const formattedHours = hours < 10 ? "0" + hours : hours;
  const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
  const formattedSeconds = seconds < 10 ? "0" + seconds : seconds;

  return `${formattedHours}:${formattedMinutes}`;
}

export function convertBBGEmexDate(date: string) {
  try {
    let dateComponenets = date.split("/");
    return `${dateComponenets[0]}/${dateComponenets[1]}/20${dateComponenets[2]}`;
  } catch (error) {
    return date;
  }
}
export function generateRandomString(length: number) {
  let result = "";
  let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function getCurrentDateTime() {
  const now = new Date();

  const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-11 in JavaScript
  const day = String(now.getDate()).padStart(2, "0");
  const year = now.getFullYear();

  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return `${month}/${day}/${year} ${hours}:${minutes}`;
}

export function dateWithNoDay(input: string) {
  let dateComponenets = input.split("/");
  return `${dateComponenets[0]}/01/${dateComponenets[1]}`;
}

export function dateWithMonthOnly(input: string) {
  let dateComponenets = input.split("/");
  return `${dateComponenets[1]}/${dateComponenets[2]}`;
}

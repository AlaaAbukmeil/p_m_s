import { Request, Response, NextFunction } from "express";
require("dotenv").config();

const jwt = require("jsonwebtoken");

export const uri = "mongodb+srv://alaa:" + process.env.MONGODBPASSWORD + "@atlascluster.zpfpywq.mongodb.net/?retryWrites=true&w=majority";

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

export function formatDateVconFile(date: string) {
  let d = new Date(date),
    month = "" + (d.getMonth() + 1),
    day = "" + d.getDate();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  return [month, day].join("-");
}

export function formatDateReadable(date: string) {
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

export function getTime() {
  const date = new Date(); // Current date and time

  let hours: any = date.getHours();
  let minutes: any = date.getMinutes();

  // Convert hours and minutes to strings and pad with zeros if necessary
  hours = hours < 10 ? "0" + hours : "" + hours;
  minutes = minutes < 10 ? "0" + minutes : "" + minutes;

  const time = `${hours}:${minutes}`;

  return time;
}

export const verifyToken = (req: Request | any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.sendStatus(401);
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    req.userRole = decoded.accessRole;
    next();
  } catch (error) {
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

export function formatSettleDateVcon(date: Date) {
  date = new Date(date);
  const year = date.getFullYear().toString().slice(-2);
  let month = (date.getMonth() + 1).toString();
  let day = date.getDate().toString();

  month = month.length < 2 ? "0" + month : month;
  day = day.length < 2 ? "0" + day : day;

  return `${month}/${day}`;
}

export function getSettlementDateYearTrades(date1: string, date2: string): string {
  try {
    // Convert the input strings to Date objects
    let dateObj1 = new Date(date1);
    let dateObj2 = new Date(date2);

    // Check if the dates are valid
    if (isNaN(dateObj1.getTime()) || isNaN(dateObj2.getTime())) {
      throw new Error("Invalid date format. Use mm/dd/yyyy.");
    }

    // If the month of the second date is less than the month of the first date,
    // it means we've crossed into a new year, so increment the year
    if (dateObj2.getMonth() < dateObj1.getMonth()) {
      dateObj2.setFullYear(dateObj2.getFullYear() + 1);
    }

    // Format the date as mm/dd/yyyy
    let year = dateObj2.getFullYear();
    let month = (dateObj2.getMonth() + 1).toString().padStart(2, "0"); // padStart ensures two-digit month
    let day = dateObj2.getDate().toString().padStart(2, "0"); // padStart ensures two-digit day

    // Return the second date with the potentially updated year
    return `${month}/${day}/${year}`;
  } catch (error: any) {
    console.error(error.message);
    return "";
  }
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

export function monthlyRlzdDate(dateInput: string) {
  let date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}/${month}`;
}

export function getDateMufg(inputDate: any) {
  let date = new Date(inputDate);
  let day = `${date.getDate()}`.padStart(2, "0"); // get the day
  let month = `${date.getMonth() + 1}`.padStart(2, "0"); // get the month (months are 0-indexed in JS, so add 1)
  let year = `${date.getFullYear()}`.slice(-2); // get the year and take the last two digits

  return `${month}/${day}/${year}`;
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

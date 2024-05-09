const xlsx = require("xlsx");
export function monthlyRlzdDate(dateInput: string) {
  let date = new Date(dateInput);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}/${month}`;
}

export function formatDateRlzdDaily(date: any) {
  date = new Date(date);
  let day = date.getDate().toString().padStart(2, "0"); // Pad with a zero if needed
  let month = (date.getMonth() + 1).toString().padStart(2, "0"); // Pad with a zero if needed, and note that months are 0-indexed in JS
  let year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

export function getDateTimeInMongoDBCollectionFormat(date: any) {
  let today: any = new Date(date);

  let day = today.getDate();
  let month = today.getMonth() + 1;
  let year = today.getFullYear();
  let hours: any = today.getHours();
  let minutes: any = today.getMinutes();
  if (day < 10) {
    day = "0" + day;
  }
  if (month < 10) {
    month = "0" + month;
  }

  // Pad single digit minutes or hours with a leading zero
  if (hours < 10) hours = "0" + hours;
  if (minutes < 10) minutes = "0" + minutes;

  let formattedDateTime = year + "-" + month + "-" + day + " " + hours + ":" + minutes;
  return formattedDateTime;
}


export function mapDatetimeToSameDay(datetimeList: any, daytimeInput: any) {
  // Convert daytimeInput to a string in the "yyyy-mm-dd" format
  let dateStr = new Date(daytimeInput).toISOString().slice(0, 10);

  // Filter datetimeList to keep only the strings with the same date
  let sameDateStrings = datetimeList.filter((s: any) => s.includes(dateStr));
  // If there are no strings with the same date, return null
  if (sameDateStrings.length === 0) {
    return null;
  }

  // Sort the remaining strings in descending order and return the first one
  sameDateStrings.sort((a: any, b: any) => {
    let dateA: any = new Date(a.split("-").slice(1).join("-"));
    let dateB: any = new Date(b.split("-").slice(1).join("-"));
    return dateA - dateB;
  });
  return sameDateStrings[0];
}

export function getLastDayOfMonth(dateInput: any) {
  // Create a date object from the date input
  let date = new Date(dateInput);

  // Set the date to the first day of the next month
  date.setMonth(date.getMonth() + 1);
  date.setDate(1);

  // Subtract one day to get the last day of the input month
  date.setDate(date.getDate() - 1);

  // Format the date components
  let lastDay = date.getDate();
  let month = date.getMonth() + 1; // In JavaScript, months are 0-indexed
  let year = date.getFullYear();

  // Return the formatted string
  return `${month}/${lastDay}/${year} 23:59`;
}

export function sortVconTrades(object: any) {
  let issues = Object.keys(object);
  let trades = [];
  for (let index = 0; index < issues.length; index++) {
    let issue = object[issues[index]];
    trades.push(issue);
  }
  return trades;
}

export function getAllDatesSinceLastMonthLastDay(date: string | Date | null): string[] {
  const today = date == null ? new Date() : new Date(date);
  const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const dates = [];

  for (let d = lastDayOfLastMonth; d <= today; d.setDate(d.getDate() + 1)) {
    let month = "" + (d.getMonth() + 1);
    let day = "" + d.getDate();
    let year = d.getFullYear();

    if (month.length < 2) month = "0" + month;
    if (day.length < 2) day = "0" + day;

    dates.push([year, month, day].join("-"));
  }

  return dates;
}

export function getAllDatesSinceLastYearLastDay(date: Date | null): string {
  const today = date == null ? new Date() : new Date(date);
  const lastDayOfLastYear = new Date(today.getFullYear() - 1, 11, 31); // December 31 of the previous year

  let d = new Date(lastDayOfLastYear);
  let month = "" + (d.getMonth() + 1);
  let day = "" + d.getDate();
  let year = d.getFullYear();

  if (month.length < 2) month = "0" + month;
  if (day.length < 2) day = "0" + day;

  let lastYearDate = [year, month, day].join("-");

  return lastYearDate;
}
export function getEarliestDateKeyAndValue(obj: any, dateLimit: any = 0): { value: string; date: string } {
  try {
    let earliestDate: any;

    let earliestKey: any;
    if (dateLimit) {
      dateLimit = new Date(dateLimit).getTime();
    }
    Object.keys(obj).forEach((key) => {
      const [month, year] = key.split("/").map(Number);
      const date = new Date(year, month - 1); // JavaScript months are 0-indexed

      if ((!earliestDate || date < earliestDate) && new Date(date).getTime() > dateLimit) {
        earliestDate = date;
        earliestKey = key;
      }
    });

    return { value: obj[earliestKey], date: earliestKey };
  } catch (error) {
    console.log(error);
    return { value: "", date: "" };
  }
}
export function mergeSort(array: any[]): any {
  if (array.length <= 1) {
    return array;
  }

  const middle = Math.floor(array.length / 2);
  const left = array.slice(0, middle);
  const right = array.slice(middle);

  return merge(mergeSort(left), mergeSort(right));
}

function merge(left: any, right: any) {
  let resultArray = [],
    leftIndex = 0,
    rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    const dateLeft = new Date(left[leftIndex]["Trade Date"]);
    const dateRight = new Date(right[rightIndex]["Trade Date"]);

    if (dateLeft < dateRight) {
      resultArray.push(left[leftIndex]);
      leftIndex++;
    } else {
      resultArray.push(right[rightIndex]);
      rightIndex++;
    }
  }

  return resultArray.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
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
  //+1 because of settlement date
  return Math.abs(Math.round(diffInDays + 1)) || 0;
}

export function formatExcelDate(date: any) {
  if (typeof date === "number") {
    // If date is a number, parse it as an Excel date code
    const parsedDate = xlsx.SSF.parse_date_code(date);
    return `${parsedDate.d < 10 ? "0" + parsedDate.d : parsedDate.d}/${parsedDate.m < 10 ? "0" + parsedDate.m : parsedDate.m}/${parsedDate.y}`;
  } else {
    // If date is a string, check if it needs to be updated to the yyyy format
    const parts = date.split("/");
    if (parts[2].length === 2) {
      parts[2] = "20" + parts[2];
    }
    return parts.join("/");
  }
}

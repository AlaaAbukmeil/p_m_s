import { PinnedPosition } from "../../models/position";
import { isNotNullOrUndefined, parsePercentage } from "../common";

export function sortObjectBasedOnKey(object: any) {
  return Object.keys(object)
    .sort((a, b) => object[b] - object[a])
    .reduce((acc, key) => ({ ...acc, [key]: object[key] }), {});
}

export function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isRatingHigherThanBBBMinus(rating: string) {
  const ratingsOrder = [
    "AAA",
    "AA+",
    "AA",
    "AA-",
    "A+",
    "A",
    "A-",
    "BBB+",
    "BBB",
    "BBB-", // 'BBB-' is the benchmark
    "BB+",
    "BB",
    "BB-",
    "B+",
    "B",
    "B-",
    "CCC+",
    "CCC",
    "CCC-",
    // Add more if there are other ratings
  ];

  rating = rating.toUpperCase().trim();

  const ratingIndex = ratingsOrder.indexOf(rating.toUpperCase().trim());

  const benchmarkIndex = ratingsOrder.indexOf("BBB-");

  // Check if the rating is valid
  if (ratingIndex === -1) {
    return "";
  }

  // If the rating index is less than the benchmark index, it's higher (since the array is sorted from highest to lowest)
  return ratingIndex < benchmarkIndex ? "IG" : "HY";
}

export function bbgRating(rating: string) {
  const ratingsOrder = [
    "AAA",
    "AA+",
    "AA",
    "AA-",
    "A+",
    "A",
    "A-",
    "BBB+",
    "BBB",
    "BBB-", // 'BBB-' is the benchmark
    "BB+",
    "BB",
    "BB-",
    "B+",
    "B",
    "B-",
    "CCC+",
    "CCC",
    "CCC-",
    // Add more if there are other ratings
  ];

  const ratingIndex = ratingsOrder.indexOf(rating.toUpperCase());
  const benchmarkIndex = ratingsOrder.indexOf("BBB-");

  // Check if the rating is valid
  if (ratingIndex === -1) {
    return "";
  }

  // If the rating index is less than the benchmark index, it's higher (since the array is sorted from highest to lowest)
  return -benchmarkIndex;
}

export function moodyRating(rating: string) {
  const ratings = ["Aaa", "Aa1", "Aa2", "Aa3", "A1", "A2", "A3", "Baa1", "Baa2", "Baa3", "Ba1", "Ba2", "Ba3", "B1", "B2", "B3", "Caa1", "Caa2", "Caa3", "Ca", "C"];

  const index = ratings.indexOf(rating);

  if (index !== -1) {
    return -index;
  }
  return "";
}
export function oasWithChange(oas: any): any {
  if (oas < 50) {
    return [30, 30];
  } else if (oas >= 50 && oas < 100) {
    return [40, 40];
  } else if (oas >= 100 && oas < 150) {
    return [50, 50];
  } else if (oas >= 150 && oas < 250) {
    return [75, 75];
  } else if (oas >= 250 && oas < 400) {
    return [100, 100];
  } else if (oas >= 400) {
    return [parseFloat(oas) * 0.25, "25 % of spread"];
  }
}

export function checkPosition(position: any, conditions: any) {
  try {
    let country = position["Country"] ? position["Country"].toString().toLowerCase() : null;
    let sector = position["Sector"] ? position["Sector"].toString().toLowerCase() : null;
    let strategy = position["Strategy"] ? position["Strategy"].toString().toLowerCase() : null;
    let duration = position["Duration"] ? position["Duration"].toString().toLowerCase() : null;
    let currency = position["Currency"] ? position["Currency"].toString().toLowerCase() : null;
    let issuer = position["Issuer"] ? position["Issuer"].toString().toLowerCase() : null;
    let ticker = position["BB Ticker"] ? position["BB Ticker"].toString().toLowerCase() : null;
    let coupon = position["Coupon Rate"] ? parsePercentage(position["Coupon Rate"]) : 0;
    let yieldParam = position["YTM"] ? parsePercentage(position["YTM"]) : 0;
    let assetClass = position["Asset Class"] ? position["Asset Class"].toString().toLowerCase() : "";

    if (conditions.country) {
      if (!country.includes(conditions.country.toString().toLowerCase())) {
        return false;
      }
    }
    if (conditions.sector) {
      if (!sector.includes(conditions.sector.toString().toLowerCase())) {
        return false;
      }
    }
    if (conditions.strategy) {
      if (!strategy.includes(conditions.strategy.toString().toLowerCase())) {
        return false;
      }
    }
    if (conditions.currency) {
      if (!currency.includes(conditions.currency.toString().toLowerCase())) {
        return false;
      }
    }
    if (conditions.issuer) {
      if (!issuer.includes(conditions.issuer.toString().toLowerCase())) {
        return false;
      }
    }

    if (conditions.ticker) {
      if (!ticker.includes(conditions.ticker.toString().toLowerCase())) {
        return false;
      }
    }
    if (conditions.coupon) {
      if (coupon < conditions.coupon) {
        return false;
      }
    }
    if (conditions.assetClass && assetClass) {
      if (!assetClass.includes(conditions.assetClass.toString().toLowerCase())) {
        return false;
      }
    }
    if (conditions.yield && yieldParam) {
      if (yieldParam < conditions.yield) {
        return false;
      }
    }
    if (conditions.durationStart && !conditions.durationEnd) {
      conditions.durationEnd = 100;
    }
    if (conditions.durationStart && conditions.durationEnd) {
      if (isNotNullOrUndefined(conditions.durationStart) && isNotNullOrUndefined(conditions.durationEnd) && (duration < parseFloat(conditions.durationStart) || duration > parseFloat(conditions.durationEnd))) {
        return false;
      }
    }
    return true;
  } catch (error) {
    console.log(conditions, error);
    return false;
  }
}

export function formatMarkDate(date: any) {
  date = new Date(date);

  let day = date.getDate().toString();
  let month = (date.getMonth() + 1).toString(); // getMonth() is zero-based
  let year = date.getFullYear().toString().substr(-2); // get only the last two digits of the year

  // Ensuring day and month are two digits by adding a leading '0' if necessary
  day = day.length < 2 ? "0" + day : day;
  month = month.length < 2 ? "0" + month : month;

  return `${month}/${day}/${year}`;
}

export function yearsUntil(dateString: any, dateInput: any, bbTicker: string) {
  try {
    // Parse the date string and create a new Date object
    if (dateString == 0 || dateString == "0") {
      return 0;
    }

    let dateComponents = dateString.split("/");
    if (dateComponents[2].length <= 2) {
      dateComponents[2] = "20" + dateComponents[2];
    }

    dateString = dateComponents[1] + "/" + dateComponents[0] + "/" + dateComponents[2];
    let date = new Date(dateString).getTime();

    // Get the current date
    const now: any = new Date(dateInput).getTime();

    // Calculate the difference in milliseconds
    const diff: any = date - now;

    // Convert the difference from milliseconds to years
    let years = diff / (1000 * 60 * 60 * 24 * 365.25);

    // If the difference is negative (i.e., the date is in the future), take the absolute value
    if (years < 0) {
      years = 0;
    }

    // Round to two decimal places and return
    return Math.round(years * 100) / 100;
  } catch (error: any) {
    console.log("maturity/call date error: " + bbTicker);
    return 0;
  }
}

export function getDuration(duration: any) {
  duration = parseFloat(duration);
  if (duration < 2) {
    return "0 To 2";
  } else if (duration >= 2 && duration < 5) {
    return "2 To 5";
  } else if (duration >= 5 && duration < 10) {
    return "5 To 10";
  } else if (duration >= 10 && duration < 30) {
    return "10 To 30";
  } else if (duration >= 30) {
    return "> 30";
  }
}

export function getSectorAssetClass(issue: string, sector: string) {
  if (issue.toLocaleLowerCase().includes("perp")) {
    if (sector) {
      if (sector.toLocaleLowerCase().includes("bank")) {
        return "FINS Perps";
      } else {
        return "Corps Perps";
      }
    } else {
      return "Corps Perps";
    }
  } else {
    return "Bonds";
  }
}

export class AggregatedData {
  "Day P&L (USD)": number;
  "MTD P&L (USD)": number;
  "DV01": number;
  "USD Market Value": number;
  "OAS": number;
  "Z Spread": number;
  "OAS W Change": number;
  "DV01 Dollar Value Impact": number;
  "DV01 Dollar Value Impact % of Nav": number;
  "DV01 Dollar Value Impact Limit % of Nav": number;
  "DV01 Dollar Value Impact Utilization % of Nav": number;
  "DV01 Dollar Value Impact Test": string;

  "Value (BC) % of Nav": number;
  "Value (BC) % of GMV": number;
  "Value (BC) Limit % of Nav": number;

  "Value (BC) Utilization % of Nav": number;

  "Value (BC) Test": string;
  "Capital Gain/ Loss since Inception (Live Position)": number;
  "% of Capital Gain/ Loss since Inception (Live Position)": number;
  "Accrued Int. Since Inception (BC)": number;
  "Total Gain/ Loss (USD)": number;
  "% of Total Gain/ Loss since Inception (Live Position)": number;
  "Notional Amount": number;
  constructor() {
    this["Day P&L (USD)"] = 0;
    this["MTD P&L (USD)"] = 0;
    this["DV01"] = 0;
    this["USD Market Value"] = 0;
    this["OAS"] = 0;
    this["Z Spread"] = 0;
    this["OAS W Change"] = 0;
    this["DV01 Dollar Value Impact"] = 0;
    this["DV01 Dollar Value Impact % of Nav"] = 0;
    this["DV01 Dollar Value Impact Limit % of Nav"] = 0;
    this["DV01 Dollar Value Impact Utilization % of Nav"] = 0;
    this["DV01 Dollar Value Impact Test"] = "Pass";

    this["Value (BC) % of Nav"] = 0;
    this["Value (BC) % of GMV"] = 0;
    this["Value (BC) Limit % of Nav"] = 0;

    this["Value (BC) Utilization % of Nav"] = 0;

    this["Value (BC) Test"] = "Pass";
    this["Capital Gain/ Loss since Inception (Live Position)"] = 0;
    this["% of Capital Gain/ Loss since Inception (Live Position)"] = 0;
    this["Accrued Int. Since Inception (BC)"] = 0;
    this["Total Gain/ Loss (USD)"] = 0;
    this["% of Total Gain/ Loss since Inception (Live Position)"] = 0;
    this["Notional Amount"] = 0;
  }
}
function alphabetIndex(char: string) {
  return (char.toUpperCase().charCodeAt(0) - "A".charCodeAt(0) + 1) / 1000;
}
export function assignAssetClass(locationCode: string, group: any, assetClassOrder: any, view: "front office" | "exposure" | "back office") {
  try {
    let rlzd = 0,
      assetClass = "";
    let unrlzdPositionsNum = group.filter((position: any) => position["Notional Amount"] != 0).length;
    for (let index = 0; index < group.length; index++) {
      let position: PinnedPosition = group[index];
      let duration = parseFloat(position["Duration"]) / 100;

      if (position["Notional Amount"] != 0) {
        if (!position["Type"]) {
          return assetClassOrder.undefined + (view == "exposure" ? duration : 0);
        }
        if (view != "exposure") {
          if ((position["Type"].includes("UST") || position["Strategy"] == "RV") && position["Notional Amount"] <= 0 && unrlzdPositionsNum > 1) {
            return assetClassOrder.UST_HEDGE + alphabetIndex(position["BB Ticker"]);
          }
          if (position["Type"].includes("FUT") && position["Notional Amount"] <= 0 && unrlzdPositionsNum > 1) {
            return assetClassOrder.CURR_HEDGE;
          }
          if (position["Type"].includes("UST") && position["Notional Amount"] <= 0 && (unrlzdPositionsNum == 1 || position["Strategy"] == "Global Hedge")) {
            return assetClassOrder.UST_GLOBAL;
          }

          if (position["Type"] == "FUT") {
            return assetClassOrder.FUT;
          }
          if (position["Asset Class"] == "Illiquid") {
            return assetClassOrder.Illiquid;
          }
          if (position["Type"] == "CDS") {
            return assetClassOrder.CDS;
          }
          if (position["Currency"] != "USD") {
            return assetClassOrder.NON_USD;
          }
          if (position["Asset Class"] == "IG") {
            assetClass = "IG";
          }

          if (position["Asset Class"] == "HY" && assetClass != "IG") {
            assetClass = "HY";
          }

          //if one of them is not rlzd, then its not appliacable
          rlzd = 1;
        } else if (view == "exposure") {
          if (locationCode == "Rate Sensitive" && view == "exposure") {
            return assetClassOrder.R_S + (view == "exposure" ? duration : 0);
          }
          if (locationCode == "Rate Insensitive" && view == "exposure") {
            return assetClassOrder.R_IS + (view == "exposure" ? duration : 0);
          }
          if (position["Strategy"] == "RV") {
            return assetClassOrder.UST_HEDGE + (view == "exposure" ? duration : 0);
          }

          if (position["Type"].includes("UST") && position["Notional Amount"] <= 0 && (unrlzdPositionsNum == 1 || position["Strategy"] == "Global Hedge")) {
            return assetClassOrder.UST_GLOBAL + (view == "exposure" ? duration : 0);
          }

          if (position["Type"].includes("FUT") && position["Notional Amount"] <= 0 && unrlzdPositionsNum > 1) {
            return assetClassOrder.CURR_HEDGE + (view == "exposure" ? duration : 0);
          }

          if (position["Type"] == "FUT" && position["Notional Amount"] <= 0) {
            return assetClassOrder.FUT + (view == "exposure" ? duration : 0);
          }
          if (position["Asset Class"] == "Illiquid") {
            return assetClassOrder.Illiquid + (view == "exposure" ? duration : 0);
          }
          if (position["Type"] == "CDS") {
            return assetClassOrder.CDS + (view == "exposure" ? duration : 0);
          }
          if (position["Currency"] != "USD") {
            return assetClassOrder.NON_USD + (view == "exposure" ? duration : 0);
          }

          //if one of them is not rlzd, then its not appliacable
          rlzd = 1;
        }
      } else {
        if (rlzd == 0 || rlzd == 2) {
          rlzd = 2;
        }
      }
    }
    let position: PinnedPosition = group[0];
    let duration = parseFloat(position["Duration"]) / 100;

    if (rlzd == 2) {
      return assetClassOrder.RLZD;
    }
    if (assetClass == "IG") {
      return assetClassOrder.IG;
    }
    if (assetClass == "HY") {
      return assetClassOrder.HY;
    }
    return assetClassOrder.undefined + (view == "exposure" ? duration : 0);
  } catch (error) {
    console.log(error);
    return assetClassOrder.undefined;
  }
}

export function parseStringWithNoSpecialCharacters(word: string): string {
  if (typeof word == "string") {
    return word.toLowerCase().replace(/[^a-z0-9]/gi, "");
  } else {
    return "";
  }
}

export function getDurationBucket(duration: string) {
  let numDuration = parseFloat(duration);

  if (numDuration < 2) {
    return "0 To 2";
  } else if (numDuration >= 2 && numDuration < 5) {
    return "2 To 5";
  } else if (numDuration >= 5 && numDuration < 10) {
    return "5 To 10";
  } else if (numDuration >= 10 && numDuration < 30) {
    return "10 To 30";
  } else if (numDuration >= 30) {
    return "> 30";
  } else {
    return "Error";
  }
}
export let assetClassOrderFrontOffice: any = {
  //hedge UST and hedge

  UST_HEDGE: 1,
  IG: 2,
  HY: 3,
  CURR_HEDGE: 4,
  NON_USD: 5,
  FUT: 6,
  CDS: 7,
  UST_GLOBAL: 8,
  Illiquid: 9,
  undefined: 10,
  RLZD: 11,
};

export let assetClassOrderExposure: any = {
  //hedge UST and hedge

  UST_GLOBAL: 1,
  R_S: 2,
  R_IS: 3,
  CURR_HEDGE: 4,
  NON_USD: 5,
  FUT: 6,
  CDS: 7,
  UST_HEDGE: 8,
  Illiquid: 9,
  undefined: 10,
  RLZD: 11,
};

export function rateSensitive(yieldInput: string, coupon: string, duration: string) {
  let yieldNum = parsePercentage(yieldInput);
  let couponNum = parsePercentage(coupon);
  let durationNum = parsePercentage(duration);

  if (yieldNum > 7 && couponNum > 7 && durationNum > 2) {
    return "Rate Insensitive";
  } else {
    return "Rate Sensitive";
  }
}

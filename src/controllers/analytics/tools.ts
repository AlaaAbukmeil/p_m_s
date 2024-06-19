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
    .replace("&", " ")
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

export function getStandardRating(bbg: any, sp: any, moody: any, fitch: any) {
  // Mapping Moody's ratings to standard S&P/Moody's ratings
  const moodyToStandard: any = {
    Aaa: "AAA",
    Aa1: "AA+",
    Aa2: "AA",
    Aa3: "AA-",
    A1: "A+",
    A2: "A",
    A3: "A-",
    Baa1: "BBB+",
    Baa2: "BBB",
    Baa3: "BBB-",
    Ba1: "BB+",
    Ba2: "BB",
    Ba3: "BB-",
    B1: "B+",
    B2: "B",
    B3: "B-",
    Caa1: "CCC+",
    Caa2: "CCC",
    Caa3: "CCC-",
  };

  // Mapping Fitch ratings to standard S&P/Moody's ratings
  const fitchToStandard: any = {
    AAA: "AAA",
    "AA+": "AA+",
    AA: "AA",
    "AA-": "AA-",
    "A+": "A+",
    A: "A",
    "A-": "A-",
    "BBB+": "BBB+",
    BBB: "BBB",
    "BBB-": "BBB-",
    "BB+": "BB+",
    BB: "BB",
    "BB-": "BB-",
    "B+": "B+",
    B: "B",
    "B-": "B-",
    "CCC+": "CCC+",
    CCC: "CCC",
    "CCC-": "CCC-",
  };

  // Check and return the first available rating in the order of preference
  if (bbg && bbg != "NR") {
    return bbg;
  } else if (sp && sp != "NR") {
    return sp;
  } else if (moody && moodyToStandard[moody] && moody != "NR") {
    return moodyToStandard[moody];
  } else if (fitch && fitchToStandard[fitch] && fitch != "NR") {
    return fitchToStandard[fitch];
  } else {
    return "NR";
  }
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
export function padInteger(num: any) {
  // Convert integer to string
  let numStr = num;

  // Pad the string with leading zeros to ensure it has at least 3 digits
  return numStr.toFixed(3);
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
    let rating = position["Rating Score"] ? position["Rating Score"].toString().toLowerCase() : "";

    let region = position["Region"] ? position["Region"].toString().toLowerCase() : "";

    let marketType = position["Market Type"] ? position["Market Type"].toString().toLowerCase() : "";

    if (conditions.country) {
      if (!checkPassedCondition(conditions.country, country)) {
        return false;
      }
    }
    if (conditions.sector) {
      if (!checkPassedCondition(conditions.sector, sector)) {
        return false;
      }
    }
    if (conditions.strategy) {
      if (!checkPassedCondition(conditions.strategy, strategy)) {
        return false;
      }
    }
    if (conditions.currency) {
      if (!checkPassedCondition(conditions.currency, currency)) {
        return false;
      }
    }
    if (conditions.issuer) {
      if (!checkPassedCondition(conditions.issuer, issuer)) {
        return false;
      }
    }

    if (conditions.ticker) {
      if (!checkPassedCondition(conditions.ticker, ticker)) {
        return false;
      }
    }
    if (conditions.coupon) {
      if (coupon < conditions.coupon) {
        return false;
      }
    }
    if (conditions.assetClass && assetClass) {
      if (!checkPassedCondition(conditions.assetClass, assetClass)) {
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
    if (conditions.rating && rating) {
      if (!checkPassedCondition(conditions.rating, rating, true)) {
        return false;
      }
    }
    if (conditions.region && region) {
      if (!checkPassedCondition(conditions.region, region)) {
        return false;
      }
    }
    if (conditions.marketType && marketType) {
      if (!checkPassedCondition(conditions.marketType, marketType)) {
        return false;
      }
    }
    return true;
  } catch (error) {
    // console.log(conditions, error);
    return false;
  }
}

function checkPassedCondition(param: any, input: any, test = false) {
  let paramArray = param.toString().split("@");
  if (test) {
  }
  for (let index = 0; index < paramArray.length; index++) {
    let paramArrayElement = paramArray[index].toLowerCase();

    if (paramArrayElement.toLowerCase().trim() == input.toLowerCase().trim() && paramArrayElement != "") {
      return true;
    }
  }
  return false;
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
  "CR01": number;

  "USD Market Value": number;
  "OAS": number;
  "Z Spread": number;
  "OAS W Change": number;
  "DV01 Dollar Value Impact": number;
  "DV01 Dollar Value Impact % of Nav": number;
  "DV01 Dollar Value Impact Limit % of Nav": number;
  "DV01 Dollar Value Impact Utilization % of Nav": number;
  "DV01 Dollar Value Impact Test": string;

  "CR01 Dollar Value Impact": number;
  "CR01 Dollar Value Impact % of Nav": number;
  "CR01 Dollar Value Impact Limit % of Nav": number;
  "CR01 Dollar Value Impact Utilization % of Nav": number;
  "CR01 Dollar Value Impact Test": string;

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
    this["CR01"] = 0;

    this["USD Market Value"] = 0;
    this["OAS"] = 0;
    this["Z Spread"] = 0;
    this["OAS W Change"] = 0;
    this["DV01 Dollar Value Impact"] = 0;
    this["DV01 Dollar Value Impact % of Nav"] = 0;
    this["DV01 Dollar Value Impact Limit % of Nav"] = 0;
    this["DV01 Dollar Value Impact Utilization % of Nav"] = 0;
    this["DV01 Dollar Value Impact Test"] = "Pass";

    this["CR01 Dollar Value Impact"] = 0;
    this["CR01 Dollar Value Impact % of Nav"] = 0;
    this["CR01 Dollar Value Impact Limit % of Nav"] = 0;
    this["CR01 Dollar Value Impact Utilization % of Nav"] = 0;
    this["CR01 Dollar Value Impact Test"] = "Pass";

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
            return assetClassOrder.RV + alphabetIndex(position["BB Ticker"]);
          }
          if ((position["Type"].includes("FUT") || position["Type"].includes("FX")) && position["Notional Amount"] <= 0 && unrlzdPositionsNum > 1) {
            return assetClassOrder.RV;
          }
          if (position["Type"].includes("UST") && position["Notional Amount"] <= 0 && (unrlzdPositionsNum == 1 || position["Strategy"] == "Global Hedge")) {
            return assetClassOrder.UST_GLOBAL;
          }

          if (position["Type"] == "FUT") {
            return assetClassOrder.FUT_CURR;
          }
          if (position["Asset Class"] == "Illiquid") {
            return assetClassOrder.Illiquid;
          }
          if (position["Type"] == "CDS") {
            return assetClassOrder.CDS;
          }
          if (position["Currency"] != "USD" && unrlzdPositionsNum == 1) {
            return assetClassOrder.FUT_CURR;
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
            return assetClassOrder.RV + (view == "exposure" ? duration : 0);
          }

          if (position["Type"].includes("UST") && position["Notional Amount"] <= 0 && (unrlzdPositionsNum == 1 || position["Strategy"] == "Global Hedge")) {
            return assetClassOrder.UST_GLOBAL + (view == "exposure" ? duration : 0);
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
            return assetClassOrder.FUT_CURR + (view == "exposure" ? duration : 0);
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

  RV: 1,
  IG: 2,
  HY: 3,
  FUT_CURR: 6,
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
  FUT_CURR: 6,
  CDS: 7,
  RV: 8,
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

export class AggregateRow {
  "L/S": string;
  "Color": string;
  "Location": string;
  "USD Market Value": number;
  "DV01": number;
  "CR01": number;

  "Day P&L (USD)": number;
  "MTD Int. (USD)": number;
  "YTD Int. (USD)": number;
  "MTD P&L (USD)": number;
  "Notional Amount": number;
  "Row Index": number;

  constructor(title: string) {
    this["L/S"] = title;
    this["Color"] = "#F9F4D2";
    this["Location"] = "Global Hedge";
    this["USD Market Value"] = 0;
    this["DV01"] = 0;
    this["CR01"] = 0;

    this["Day P&L (USD)"] = 0;
    this["MTD Int. (USD)"] = 0;
    this["YTD Int. (USD)"] = 0;
    this["MTD P&L (USD)"] = 0;
    this["Notional Amount"] = 0;
    this["Row Index"] = -1;
  }
}

export function classifyCountry(country: any) {
  // Define the country classification and region in a structured object
  if (!country || country == "") {
    return { marketType: "NA", region: "NA", country: country };
  }
  const countryClassification: any = {
    americas: {
      developed: ["canada", "united states"],
      emerging: ["argentina", "brazil", "chile", "colombia"],
      frontier: ["panama", "jamaica"],
    },
    europe: {
      developed: ["austria", "belgium", "denmark", "finland", "france", "germany", "ireland", "italy", "luxembourg", "netherlands", "norway", "portugal", "spain", "sweden", "switzerland", "united kingdom", "britain", "jersey"],
      emerging: ["czech republic", "greece", "hungary", "poland", "iceland"],
      frontier: ["croatia", "romania", "serbia", "slovenia"],
    },
    "asia - oceania": {
      developed: ["australia", "hong kong", "japan", "new zeland", "singapore", "south korea"],
      emerging: ["china", "india", "indonesia", "macau", "malaysia", "philippines", "taiwan", "thailand"],
      frontier: ["bangladesh", "laos", "mongolia", "pakistan", "sri lanka", "vietnam","cambodia"],
    },
    "Middle East Africa": {
      developed: ["israel"],
      emerging: ["bahrain", "egypt", "ivory coast", "kuwait", "morocco", "oman", "qatar", "saudi arabia", "south africa", "turkey", "uae", "tunisia", "mauritius"],
      frontier: ["jordan", "kazakhstan", "kenya", "lebanon", "ghana","uzbekistan"],
    },
  };
  for (const region in countryClassification) {
    for (const marketType in countryClassification[region]) {
      if (countryClassification[region][marketType].includes(country.toString().toLowerCase())) {
        return { marketType: toTitleCase(marketType), region: toTitleCase(region), country: country };
      }
    }
  }
  return { marketType: "NA", region: "NA", country: country };
}

import { isNotNullOrUndefined } from "../common";

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
    console.log(position, error);
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

  export function yearsUntil(dateString: any, dateInput: any) {
    // Parse the date string and create a new Date object
    if (dateString == 0 || dateString == "0") {
      return 0;
    }
  
    let dateComponents = dateString.split("/");
    
    dateString = dateComponents[0] + "/" + dateComponents[1] + "/" + dateComponents[2];
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
  
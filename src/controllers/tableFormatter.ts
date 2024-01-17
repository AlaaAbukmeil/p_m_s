import { tradesMTDRlzd } from "../models/reports";

export function formatGeneralTable(portfolio: any, date: any, fund: any, dates: any) {
  let currencies: any = {};
  let formatted = [];
  let mtdpl = 0,
    mtdrlzd = 0,
    mtdurlzd = 0,
    mtdint = 0,
    dayint = 0,
    daypl = 0,
    dayfx = 0,
    mtdfx = 0,
    dayurlzd = 0,
    dayrlzd = 0;
  for (let index = 0; index < portfolio.length; index++) {
    let position: any = portfolio[index];
    let originalFace = position["Original Face"] || 1;
    let usdRatio = parseFloat(position["FX Rate"] || position["holdPortfXrate"]) || 1;
    let holdBackRatio = (position["Asset Class"] || position["Rating Class"]) == "Illiquid" ? parseFloat(fund.holdBackRatio) : 1;

    let currency = position["Currency"];
    if (!position["FX Rate"]) {
      if (currencies[currency]) {
        usdRatio = currencies[currency];
      }
    } else {
      currencies[currency] = usdRatio;
    }
    position["FX Rate"] = usdRatio;
    position["Asset Class"] = position["Asset Class"] ? position["Asset Class"] : position["Rating Class"] ? position["Rating Class"] : "";
    position["Cost"] = position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") ? Math.round(position["Average Cost"] * position["Quantity"] * 10000) / (10000 * position["Original Face"]) : Math.round(position["Average Cost"] * position["Quantity"] * 1000000) / 1000000;
    position["Daily Accrual (Local Currency)"] = Math.round(position["Daily Interest Income"] * 1000000 * holdBackRatio) / 1000000;
    position["FX Rate"] = Math.round((position["FX Rate"] || position["FX Rate"]) * 1000000) / 1000000;
    position["Value"] = position["ISIN"].includes("CDS") || position["ISIN"].includes("ITRX") ? Math.round((position["Quantity"] * position["Mid"] * 10000 * usdRatio) / originalFace) / 10000 || 0 : Math.round(position["Quantity"] * position["Mid"] * usdRatio * 10000) / 10000 || 0;

    position["Mid"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Mid"] * 1000000) / 1000000 : Math.round(position["Mid"] * 1000000) / 10000;
    position["Bid"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Bid"] * 1000000) / 1000000 : Math.round(position["Bid"] * 1000000) / 10000;
    position["Ask"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Ask"] * 1000000) / 1000000 : Math.round(position["Ask"] * 1000000) / 10000;

    position["Average Cost"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Average Cost"] * 1000000) / 1000000 : Math.round(position["Average Cost"] * 1000000) / 10000;
    position["YTM"] = Math.round(position["YTM"] * 1000000) / 1000000 || 0;
    position["CR01"] = "0";
    position["MTD Rlzd"] = position["MTD Rlzd"] ? position["MTD Rlzd"] : 0;
    position["MTD Mark"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["MTD Mark"] * 1000000) / 1000000 : Math.round(position["MTD Mark"] * 1000000) / 10000;
    position["Previous Mark"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Previous Mark"] * 1000000) / 1000000 : Math.round(position["Previous Mark"] * 1000000) / 10000;

    position["Ptf MTD Int.Income (Local Currency)"] = Math.round(position["Monthly Interest Income"] * 1000000 * holdBackRatio) / 1000000;
    position["Ptf MTD Rlzd (Local Currency)"] = Math.round(position["MTD Rlzd"] * 1000000 * holdBackRatio) / 1000000;
    position["Ptf MTD URlzd (Local Currency)"] = Math.round(position["MTD URlzd"] * 1000000 * holdBackRatio) / 1000000;

    position["Monthly Interest Income (Base Currency)"] = Math.round(position["Monthly Interest Income"] * 1000000 * usdRatio * holdBackRatio) / 1000000;
    position["Ptf MTD Rlzd (Base Currency)"] = Math.round(position["MTD Rlzd"] * 1000000 * usdRatio * holdBackRatio) / 1000000;
    position["Ptf MTD URlzd (Base Currency)"] = Math.round(position["MTD URlzd"] * 1000000 * usdRatio * holdBackRatio) / 1000000;

    position["Cost MTD Ptf (Local Currency)"] = Math.round(position["Cost MTD Ptf"] * 1000000) / 1000000;
    position["Cost (Local Currency)"] = Math.round(position["Cost"] * 1000000) / 1000000;

    position["Average Cost"] = Math.round(position["Average Cost"] * 1000000) / 1000000;
    if (!position["Previous FX Rate"]) {
      position["Previous FX Rate"] = position["FX Rate"];
    }
    position["MTD FX"] = position["MTD FX"] ? Math.round(position["MTD FX"] * 1000000) / 1000000 : Math.round(position["Previous FX Rate"] * 1000000) / 1000000;

    position["Daily Interest FX P&L"] = Math.round((position["FX Rate"] - position["Previous FX Rate"]) * 1000000 * position["Daily Interest Income"]) / 1000000;
    position["Daily Interest Income (Base Currency)"] = position["Daily Interest Income"] * usdRatio * holdBackRatio;
    position["Notional Total"] = position["Quantity"];
    position["Quantity"] = position["Quantity"] / originalFace;
    position["#"] = index + 1;
    position["ISIN"] = position["ISIN"].length != 12 ? "" : position["ISIN"];

    position["Ptf Day P&L (Local Currency)"] = Math.round(position["Ptf Day P&L"] * usdRatio * holdBackRatio * 1000000) / 1000000;
    // multiply mtd pl with usd since all components are not  multiplied by usd when they are summed
    position["Ptf MTD P&L (Local Currency)"] = Math.round(position["Ptf MTD P&L"] * usdRatio * holdBackRatio * 1000000) / 1000000;

    position["Ptf Day P&L (Base Currency)"] = Math.round(position["Ptf Day P&L"] * usdRatio * holdBackRatio * 1000000) / 1000000;
    // multiply mtd pl with usd since all components are not  multiplied by usd when they are summed
    position["Ptf MTD P&L (Base Currency)"] = Math.round(position["Ptf MTD P&L"] * usdRatio * holdBackRatio * 1000000) / 1000000;

    position["Day Rlzd K G/L"] = Math.round(position["Day Rlzd K G/L"] * usdRatio * holdBackRatio * 1000000) / 1000000;
    position["Day URlzd K G/L"] = Math.round(position["Day URlzd K G/L"] * usdRatio * holdBackRatio * 1000000) / 1000000;

    position["MTD Rlzd"] = Math.round(position["MTD Rlzd"] * usdRatio * holdBackRatio * 1000000) / 1000000;

    position["Previous FX Rate"] = Math.round(position["Previous FX Rate"] * 1000000) / 1000000;
    position["Maturity"] = position["Maturity"] ? position["Maturity"] : 0;
    position["Call Date"] = position["Call Date"] ? position["Call Date"] : 0;

    position["Color"] = position["Maturity"] ? (areDatesInSameMonthAndYear(position["Maturity"], date) ? "red" : "") : "";
    position["L/S"] = position["Quantity"] >= 0 && !position["Issue"].includes("CDS") ? "Long" : "Short";
    position["_id"] = position["_id"];
    position["Duration(Mkt)"] = yearsUntil(position["Maturity"], date);
    position["Coupon Duration"] = position["Coupon Duration"] ? position["Coupon Duration"] : position["Issue"].split(" ")[0] == "T" || position["Issue"].includes("GOVT") ? 365.0 : 360.0;
    position["Coupon Rate"] = position["Coupon Rate"] ? position["Coupon Rate"] : 0;
    position["Issuer"] = position["Issuer"] == "0" ? "" : position["Issuer"];

    position["DV01"] = (position["DV01"] / 1000000) * position["Notional Total"];
    position["DV01"] = Math.round(position["DV01"] * 1000000) / 1000000 || 0;

    position["Long Security Name"] = position["Issue"];

    if (position["Issue"].includes("CDS")) {
      position["Day P&L FX"] = Math.round(((parseFloat(position["FX Rate"]) - parseFloat(position["Previous FX Rate"])) / parseFloat(position["Previous FX Rate"])) * position["Quantity"] * 1000000) / 1000000 || 0;
      position["MTD P&L FX"] = Math.round(((parseFloat(position["FX Rate"]) - parseFloat(position["MTD FX"] || position["FX Rate"])) / parseFloat(position["MTD FX"] || position["FX Rate"])) * position["Quantity"] * 1000000) / 1000000 || 0;
    } else {
      position["Day P&L FX"] = Math.round(((parseFloat(position["FX Rate"]) - parseFloat(position["Previous FX Rate"])) / parseFloat(position["Previous FX Rate"])) * position["Notional Total"] * 1000000) / 1000000;
      position["MTD P&L FX"] = (Math.round(((parseFloat(position["FX Rate"]) - parseFloat(position["MTD FX"] || position["FX Rate"])) / parseFloat(position["MTD FX"] || position["FX Rate"])) * position["Notional Total"]) * 1000000) / 1000000 || 0;
    }
    mtdpl += position["Ptf MTD P&L (Base Currency)"];

    mtdrlzd += position["Ptf MTD Rlzd (Base Currency)"];
    mtdurlzd += position["Ptf MTD URlzd (Base Currency)"];
    mtdint += position["Monthly Interest Income (Base Currency)"];

    dayint += position["Daily Interest Income (Base Currency)"];

    daypl += position["Ptf Day P&L (Base Currency)"];
    dayfx += position["Day P&L FX"];
    mtdfx += position["MTD P&L FX"];

    dayurlzd += position["Day URlzd K G/L"];
    dayrlzd += position["Day Rlzd K G/L"];
  }
  let fundDetails = {
    nav: parseFloat(fund.nav),
    holdbackRatio: parseFloat(fund.holdBackRatio),
    monthGross: Math.round((mtdpl / parseFloat(fund.nav)) * 100000) / 1000,
    dayGross: Math.round((daypl / parseFloat(fund.nav)) * 100000) / 1000,
    mtdpl: Math.round(mtdpl * 1000) / 1000,
    mtdrlzd: Math.round(mtdrlzd * 1000) / 1000,
    mtdurlzd: Math.round(mtdurlzd * 1000) / 1000,
    mtdint: Math.round(mtdint * 1000) / 1000,
    dayint: Math.round(dayint * 1000) / 1000,
    daypl: Math.round(daypl * 1000) / 1000,
    dayfx: Math.round(dayfx * 1000) / 1000,
    mtdfx: Math.round(mtdfx * 1000) / 1000,
    dayurlzd: Math.round(dayurlzd * 1000) / 1000,
    dayrlzd: Math.round(dayrlzd * 1000) / 1000,
  };
  return { portfolio: portfolio, fundDetails: fundDetails };
}

export function formatFrontEndTable(portfolio: any, date: any, fund: any, dates: any) {
  let formattedPortfolio = formatGeneralTable(portfolio, date, fund, dates);
  let analyzedPortfolio = groupAndSortByLocationAndType(formattedPortfolio.portfolio, formattedPortfolio.fundDetails.nav);

  return { portfolio: analyzedPortfolio.portfolio, fundDetails: formattedPortfolio.fundDetails, analysis: analyzedPortfolio };
}

function yearsUntil(dateString: any, dateInput: any) {
  // Parse the date string and create a new Date object
  // if(dateString == 0 || "0"){
  //   return dateString
  // }
  const date: any = new Date(dateString).getTime();

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

export function calculateMTDRlzd(trades: tradesMTDRlzd[], mtdMark: number, issue: string) {
  let total = 0;

  for (let index = 0; index < trades.length; index++) {
    let trade = trades[index];
    let price = trade.price;
    let quantity = trade.quantity;

    let rlzdTrade = (price - mtdMark) * quantity;

    total += rlzdTrade;
  }

  return total;
}
function formatMarkDate(date: any) {
  date = new Date(date);
  const options = { day: "2-digit", month: "short" };
  const formattedDate = date.toLocaleDateString("en-US", options).replace(/\s/g, "-").toLowerCase();

  // Remove the period '.' from the month abbreviation if present (some locales include it)
  return formattedDate.replace(".", "");
}

export function formatSummaryPosition(position: any, fundDetails: any, dates: any) {
  let titles = [
    "Type",
    "L/S",
    "Strategy",
    "Asset Class",
    "Location",
    "Long Security Name",
    "BB Ticker",
    "Notional Total",
    "USD Market Value",
    "USD MTM % of NAV",
    `${formatMarkDate(dates.lastMonth)}`,
    `${formatMarkDate(dates.yesterday)}`,
    `${formatMarkDate(dates.today)}`,
    "DV01",
    "YTM",
    "Bid",
    "Ask",
    "Average Cost",

    "Day P&L (USD)",

    "Realizd MTD P&L (USD)",
    "Unrealizd MTD P&L (USD)",
    "MTD Interest Income (USD)",
    "MTD P&L (USD)",
    "Daily P&L Attribution %",
    "MTD P&L Attribution %",
    "Realised MTD P&L (USD) %",
    "Unrealised MTD P&L (USD) %",
    "MTD Interest Income (USD) %",
    "Sector",
    "Country",
    "Issuer",
  ];

  let titlesValues: any = {
    Type: "Type",
    "L/S": "L/S",
    Strategy: "Strategy",
    "Asset Class": "Asset Class",
    Location: "Location",
    "Long Security Name": "Issue",
    "BB Ticker": "BB Ticker",
    "Notional Total": "Notional Total",
    "USD Market Value": "Value",
    Maturity: "Maturity",
    "USD MTM % of NAV": "USD MTM % of NAV",
    YTM: "YTM",
    DV01: "DV01",
    Bid: "Bid",
    Ask: "Ask",
    "Average Cost": "Average Cost",
    Cost: "Cost",
    "Day P&L FX (USD)": "Day P&L FX",
    "Day P&L (USD)": "Ptf Day P&L (Base Currency)",
    "MTD FX P&L (USD)": "MTD P&L FX",
    "Realizd MTD P&L (USD)": "Ptf MTD Rlzd (Base Currency)",
    "Unrealizd MTD P&L (USD)": "Ptf MTD URlzd (Base Currency)",
    "MTD Interest Income (USD)": "Monthly Interest Income (Base Currency)",
    "MTD P&L (USD)": "Ptf MTD P&L (Base Currency)",
    "Daily P&L Attribution %": "Daily Attribution %",
    "MTD P&L Attribution %": "MTD Attribution %",
    "Realised MTD P&L (USD) %": "Realised MTD P&L (USD) %",
    "Unrealised MTD P&L (USD) %": "Unrealised MTD P&L (USD) %",
    "MTD Interest Income (USD) %": "MTD Interest Income (USD) %",
    "Daily Interest Income (USD)": "Daily Interest Income (Base Currency)",
    Sector: "Sector",
    Country: "Country",
  };

  titlesValues[formatMarkDate(dates.lastMonth)] = "MTD Mark";
  titlesValues[formatMarkDate(dates.yesterday)] = "Previous Mark";
  titlesValues[formatMarkDate(dates.today)] = "Mid";
  let object: any = {};
  for (let titleIndex = 0; titleIndex < titles.length; titleIndex++) {
    let title = titles[titleIndex];
    if (isFinite(position[titlesValues[title]]) && position[titlesValues[title]] != null && position[titlesValues[title]] != "") {
      if (Math.abs(position[titlesValues[title]]) > 200) {
        object[title] = Math.round(position[titlesValues[title]]);
      } else {
        object[title] = position[titlesValues[title]].toFixed(2);
      }
    } else {
      object[title] = position[titlesValues[title]];
    }
  }

  object["Daily P&L Attribution %"] = ((object["Day P&L (USD)"] / fundDetails.nav) * 100).toFixed(3) + " %";
  object["MTD P&L Attribution %"] = ((object["MTD P&L (USD)"] / fundDetails.nav) * 100).toFixed(3) + " %";
  object["Realised MTD P&L (USD) %"] = ((object["Realizd MTD P&L (USD)"] / fundDetails.nav) * 100).toFixed(3) + " %";
  object["Unrealised MTD P&L (USD) %"] = ((object["Unrealizd MTD P&L (USD)"] / fundDetails.nav) * 100).toFixed(3) + " %";
  object["MTD Interest Income (USD) %"] = ((object["MTD Interest Income (USD)"] / fundDetails.nav) * 100).toFixed(3) + " %";
  object["USD MTM % of NAV"] = ((object["USD Market Value"] / fundDetails.nav) * 100).toFixed(3) + " %";
  object["Color"] = object["Notional Total"] == 0 ? "#E6F2FD" : "";
  object["ISIN"] = position["ISIN"];
  object["Issuer"] = position["Issuer"];
  object["Last Price Update"] = position["Last Price Update"];

  return object;
}

export function formatFrontEndSummaryTable(portfolio: any, date: any, fund: any, dates: any) {
  let formattedPortfolio = formatGeneralTable(portfolio, date, fund, dates);
  let formatted = [];
  let test = 0;
  for (let formattedPortfolioIndex = 0; formattedPortfolioIndex < formattedPortfolio.portfolio.length; formattedPortfolioIndex++) {
    let unformattedPosition = formattedPortfolio.portfolio[formattedPortfolioIndex];
    let formattedPosition = formatSummaryPosition(unformattedPosition, formattedPortfolio.fundDetails, dates);
    formatted.push(formattedPosition);
  }

  let analyzedPortfolio = groupAndSortByLocationAndType(formatted, formattedPortfolio.fundDetails.nav);

  return { portfolio: analyzedPortfolio.portfolio, fundDetails: formattedPortfolio.fundDetails, analysis: analyzedPortfolio };
}
function groupAndSortByLocationAndType(formattedPortfolio: any, nav: number) {
  // Group objects by location
  let pairHedgeNotional = 0,
    pairIGNotional = 0,
    pairHedgeDV01Sum = 0,
    pairIGDV01Sum = 0,
    globalHedgeNotional = 0,
    singleIGNotional = 0,
    globalHedgeDV01Sum = 0,
    singleIGDV01Sum = 0,
    hedgeCurrencyNotional = 0,
    HYNotional = 0,
    HYDV01Sum = 0,
    cdsNotional = 0;

  let countryNAVPercentage: any = {};
  let sectorNAVPercentage: any = {};
  let strategyNAVPercentage: any = {};

  let durationSummary = {
    "0 To 2": { durationSum: 0, dv01Sum: 0 },
    "2 To 5": { durationSum: 0, dv01Sum: 0 },
    "5 To 10": { durationSum: 0, dv01Sum: 0 },
    "> 10": { durationSum: 0, dv01Sum: 0 },
  };

  const groupedByLocation = formattedPortfolio.reduce((group: any, item: any) => {
    const { Location } = item;
    let notional = item["Notional Total"];
    if (notional != 0) {
      group[Location] = group[Location] ? group[Location] : { data: [] };
      group[Location].data.push(item);
      return group;
    } else {
      group["Rlzd"] = group["Rlzd"] ? group["Rlzd"] : { data: [] };
      group["Rlzd"].data.push(item);
      return group;
    }
  }, {});
  // let assetClassOrder: any = {
  //   //hedge UST and hedge
  //   UST_HEDGE: 1,
  //   IG: 2,
  //   HY: 3,
  //   FUT: 4,
  //   undefined: 5,
  //   CDS: 6,
  //   UST_GLOBAL: 7,
  //   Illiquid: 8,
  //   RLZD: 9,
  // };

  for (let locationCode in groupedByLocation) {
    groupedByLocation[locationCode].order = sortSummary(locationCode, groupedByLocation[locationCode].data);
    if (groupedByLocation[locationCode].order == 1) {
      groupedByLocation[locationCode].color = "#FEEBED";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        if (groupedByLocation[locationCode].data[index]["L/S"] == "Long") {
          pairIGNotional += groupedByLocation[locationCode].data[index]["Notional Total"] || 0;
          pairIGDV01Sum += groupedByLocation[locationCode].data[index]["DV01"] || 0;
        } else {
          pairHedgeNotional += groupedByLocation[locationCode].data[index]["Notional Total"] || 0;
          pairHedgeDV01Sum += groupedByLocation[locationCode].data[index]["DV01"] || 0;
        }
      }
    } else if (groupedByLocation[locationCode].order == 2) {
      groupedByLocation[locationCode].color = "#E1BEE7";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        singleIGNotional += groupedByLocation[locationCode].data[index]["Notional Total"] || 0;
        singleIGDV01Sum += groupedByLocation[locationCode].data[index]["DV01"] || 0;
      }
    } else if (groupedByLocation[locationCode].order == 3) {
      groupedByLocation[locationCode].color = "#C5CAE9";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        HYNotional += groupedByLocation[locationCode].data[index]["Notional Total"] || 0;
        HYDV01Sum += groupedByLocation[locationCode].data[index]["DV01"] || 0;
      }
    } else if (groupedByLocation[locationCode].order == 4) {
      groupedByLocation[locationCode].color = "#FFF9C4";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        hedgeCurrencyNotional += groupedByLocation[locationCode].data[index]["Notional Total"] || 0;
      }
    } else if (groupedByLocation[locationCode].order == 5) {
      groupedByLocation[locationCode].color = "#FFF59D";
    } else if (groupedByLocation[locationCode].order == 6) {
      groupedByLocation[locationCode].color = "#FFECB3";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        cdsNotional += groupedByLocation[locationCode].data[index]["Notional Total"] || 0;
      }
    } else if (groupedByLocation[locationCode].order == 7) {
      groupedByLocation[locationCode].color = "#CE93D8";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        globalHedgeNotional += groupedByLocation[locationCode].data[index]["Notional Total"] || 0;
        globalHedgeDV01Sum += groupedByLocation[locationCode].data[index]["DV01"] || 0;
      }
    } else if (groupedByLocation[locationCode].order == 8) {
      groupedByLocation[locationCode].color = "#E8F5E9";
    } else if (groupedByLocation[locationCode].order == 9) {
      groupedByLocation[locationCode].color = "#C5E1A5";
    }

    let groupDayPl = 0,
      groupMonthlyPl = 0;

    for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
      let country = groupedByLocation[locationCode].data[index]["Country"] ? groupedByLocation[locationCode].data[index]["Country"] : "Unspecified";
      let sector = groupedByLocation[locationCode].data[index]["Sector"] ? groupedByLocation[locationCode].data[index]["Sector"] : "Unspecified";
      let duration = groupedByLocation[locationCode].data[index]["YTM"] || 0;
      let dv01 = groupedByLocation[locationCode].data[index]["DV01"] || 0;
      let strategy = groupedByLocation[locationCode].data[index]["Strategy"] ? groupedByLocation[locationCode].data[index]["Strategy"] : "Unspecified";
      if (groupedByLocation[locationCode].data[index]["L/S"] == "Long") {
        countryNAVPercentage[country.toLowerCase()] = countryNAVPercentage[country.toLowerCase()] ? countryNAVPercentage[country.toLowerCase()] + groupedByLocation[locationCode].data[index]["Notional Total"] : groupedByLocation[locationCode].data[index]["Notional Total"];
        sectorNAVPercentage[sector.toLowerCase()] = sectorNAVPercentage[sector.toLowerCase()] ? sectorNAVPercentage[sector.toLowerCase()] + groupedByLocation[locationCode].data[index]["Notional Total"] : groupedByLocation[locationCode].data[index]["Notional Total"];
        strategyNAVPercentage[strategy.toLowerCase()] = strategyNAVPercentage[strategy.toLowerCase()] ? strategyNAVPercentage[strategy.toLowerCase()] + groupedByLocation[locationCode].data[index]["Notional Total"] : groupedByLocation[locationCode].data[index]["Notional Total"];
      }

      let dayPl = groupedByLocation[locationCode].data[index]["Day P&L (USD)"];

      let monthPl = groupedByLocation[locationCode].data[index]["MTD P&L (USD)"];

      groupDayPl += dayPl;
      groupMonthlyPl += monthPl;

      if (parseFloat(duration) < 2) {
        durationSummary["0 To 2"].durationSum += parseFloat(duration);
        durationSummary["0 To 2"].dv01Sum += parseFloat(dv01);
        durationSummary["0 To 2"].dv01Sum = Math.round(durationSummary["0 To 2"].dv01Sum * 100) / 100;
      } else if (duration >= 2 && duration < 5) {
        durationSummary["2 To 5"].durationSum += parseFloat(duration);
        durationSummary["2 To 5"].dv01Sum += parseFloat(dv01);
        durationSummary["2 To 5"].dv01Sum = Math.round(durationSummary["2 To 5"].dv01Sum * 100) / 100;
      } else if (duration >= 5 && duration < 10) {
        durationSummary["5 To 10"].durationSum += parseFloat(duration);
        durationSummary["5 To 10"].dv01Sum += parseFloat(dv01);
        durationSummary["5 To 10"].dv01Sum = Math.round(durationSummary["5 To 10"].dv01Sum * 100) / 100;
      } else if (duration >= 10) {
        durationSummary["> 10"].durationSum += parseFloat(duration);
        durationSummary["> 10"].dv01Sum += parseFloat(dv01);
        durationSummary["> 10"].dv01Sum = Math.round(durationSummary["> 10"].dv01Sum * 100) / 100;
      }
    }

    groupedByLocation[locationCode].groupDayPl = groupDayPl;
    groupedByLocation[locationCode].groupMonthlyPl = groupMonthlyPl;
  }

  let portfolio = [];

  const locationCodes = Object.entries(groupedByLocation)
    .sort((a: any, b: any) => a[1].order - b[1].order)
    .map((entry) => entry[0]);

  for (let index = 0; index < locationCodes.length; index++) {
    let locationCode = locationCodes[index];

    groupedByLocation[locationCode].data.sort((a: any, b: any) => {
      // Assuming "L/S" is a number that can be directly compared
      if (a["L/S"] < b["L/S"]) {
        return -1; // a comes first
      } else if (a["L/S"] > b["L/S"]) {
        return 1; // b comes first
      }
      return 0; // a and b are equal
    });

    for (let groupPositionIndex = 0; groupPositionIndex < groupedByLocation[locationCode].data.length; groupPositionIndex++) {
      if (groupedByLocation[locationCode].data[groupPositionIndex]["Notional Total"] == 0) {
        groupedByLocation[locationCode].data[groupPositionIndex]["Color"] = "#C5E1A5";
      } else {
        groupedByLocation[locationCode].data[groupPositionIndex]["Color"] = groupedByLocation[locationCode].color;
      }
      if (groupPositionIndex == 0) {
        groupedByLocation[locationCode].data[groupPositionIndex]["top"] = true;
      }
      if (groupPositionIndex == groupedByLocation[locationCode].data.length - 1) {
        groupedByLocation[locationCode].data[groupPositionIndex]["bottom"] = true;
      }
      if (!groupedByLocation[locationCode].data[groupPositionIndex]["top"]) {
        groupedByLocation[locationCode].data[groupPositionIndex]["bottom"] = false;
      }
      if (!groupedByLocation[locationCode].data[groupPositionIndex]["bottom"]) {
        groupedByLocation[locationCode].data[groupPositionIndex]["bottom"] = false;
      }
    }

    portfolio.push(...groupedByLocation[locationCode].data);
  }

  const entries = Object.entries(groupedByLocation).map(([key, value]: any) => ({
    key,
    groupDayPl: value.groupDayPl,
    groupMonthlyPl: value.groupMonthlyPl,
    data: value.data,
  }));
  // Step 2: Sort the array based on the `groupPL` property
  entries.sort((a, b) => b.groupDayPl - a.groupDayPl);

  // Step 3: Select the top 5 and worst 5 entries
  const top5Daily = entries.slice(0, 5);
  let worst5Daily = entries.slice(-5);
  worst5Daily = worst5Daily.sort((a, b) => a.groupDayPl - b.groupDayPl);
  entries.sort((a, b) => b.groupMonthlyPl - a.groupMonthlyPl);
  // Step 4: Map the selected entries to retrieve their `data` values

  const top5Monthly = entries.slice(0, 5);
  let worst5Monthly = entries.slice(-5);
  worst5Monthly = worst5Monthly.sort((a, b) => a.groupMonthlyPl - b.groupMonthlyPl);

  let topWorstPerformaners = {
    top5Daily: top5Daily,
    worst5Daily: worst5Daily,
    top5Monthly: top5Monthly,
    worst5Monthly: worst5Monthly,
  };

  let riskAssessment = {
    pairHedgeNotional: pairHedgeNotional,
    pairIGNotional: pairIGNotional,
    pairTradeNotionalSum: pairHedgeNotional + pairIGNotional,
    pairHedgeDV01Sum: pairHedgeDV01Sum,
    pairIGDV01Sum: pairIGDV01Sum,
    pairTradeDV01Sum: pairHedgeDV01Sum + pairIGDV01Sum,
    globalHedgeNotional: globalHedgeNotional,
    singleIGNotional: singleIGNotional,
    globalHedgeSingleIGNotionalSum: globalHedgeNotional + singleIGNotional,
    globalHedgeDV01Sum: globalHedgeDV01Sum,
    singleIGDV01Sum: singleIGDV01Sum,
    globalHedgeSingleIGDV01Sum: globalHedgeDV01Sum + singleIGDV01Sum,
    hedgeCurrencyNotional: hedgeCurrencyNotional,
    HYNotional: HYNotional,
    HYDV01Sum: HYDV01Sum,
    cdsNotional: -1 * cdsNotional,
  };
  let sumCountryLong = 0,
    sumStrategyLong = 0,
    sumSectorLong = 0;

  let countries = Object.keys(countryNAVPercentage);
  let sectors = Object.keys(sectorNAVPercentage);
  let strategies = Object.keys(strategyNAVPercentage);
  for (let index = 0; index < countries.length; index++) {
    if (countryNAVPercentage[countries[index]]) {
      countryNAVPercentage[toTitleCase(countries[index])] = Math.round((countryNAVPercentage[countries[index]] / nav) * 10000) / 100;
      sumCountryLong += countryNAVPercentage[toTitleCase(countries[index])];
      delete countryNAVPercentage[countries[index]];
    } else {
      delete countryNAVPercentage[countries[index]];
    }
  }

  for (let index = 0; index < sectors.length; index++) {
    if (sectorNAVPercentage[sectors[index]]) {
      sectorNAVPercentage[toTitleCase(sectors[index])] = Math.round((sectorNAVPercentage[sectors[index]] / nav) * 10000) / 100;
      sumSectorLong += sectorNAVPercentage[toTitleCase(sectors[index])];
      delete sectorNAVPercentage[sectors[index]];
    } else {
      delete sectorNAVPercentage[sectors[index]];
    }
  }
  for (let index = 0; index < strategies.length; index++) {
    if (strategyNAVPercentage[strategies[index]]) {
      strategyNAVPercentage[toTitleCase(strategies[index])] = Math.round((strategyNAVPercentage[strategies[index]] / nav) * 10000) / 100;
      sumStrategyLong += strategyNAVPercentage[toTitleCase(strategies[index])];
      delete strategyNAVPercentage[strategies[index]];
    } else {
      delete strategyNAVPercentage[strategies[index]];
    }
  }

  countryNAVPercentage["Sum"] = Math.round(sumCountryLong * 10) / 10;
  sectorNAVPercentage["Sum"] = Math.round(sumSectorLong * 10) / 10;
  strategyNAVPercentage["Sum"] = Math.round(sumStrategyLong * 10) / 10;

  return { portfolio: portfolio, duration: durationSummary, countryNAVPercentage: sortObjectBasedOnKey(countryNAVPercentage), sectorNAVPercentage: sortObjectBasedOnKey(sectorNAVPercentage), strategyNAVPercentage: sortObjectBasedOnKey(strategyNAVPercentage), riskAssessment: riskAssessment, topWorstPerformaners: topWorstPerformaners };
}

function sortSummary(locationCode: string, group: any) {
  let assetClassOrder: any = {
    //hedge UST and hedge
    UST_HEDGE: 1,
    IG: 2,
    HY: 3,
    FUT: 4,
    undefined: 5,
    CDS: 6,
    UST_GLOBAL: 7,
    Illiquid: 8,
    RLZD: 9,
  };

  try {
    let rlzd = 0,
      type = "";
    let unrlzdPositionsNum = group.filter((position: any) => position["Notional Total"] != 0).length;

    for (let index = 0; index < group.length; index++) {
      let position = group[index];
      if (position["Notional Total"] != 0) {
        if (!position["Type"]) {
          return assetClassOrder.undefined;
        }
        if ((position["Type"].includes("UST") || position["Type"].includes("FUT")) && position["Notional Total"] <= 0 && unrlzdPositionsNum > 1) {
          return assetClassOrder.UST_HEDGE;
        }
        if (position["Type"].includes("UST") && position["Notional Total"] <= 0 && unrlzdPositionsNum == 1) {
          return assetClassOrder.UST_GLOBAL;
        }
        if (position["Type"] == "FUT" && position["Notional Total"] <= 0) {
          return assetClassOrder.FUT;
        }
        if (position["Asset Class"] == "Illiquid") {
          return assetClassOrder.Illiquid;
        }
        if (position["Type"] == "CDS") {
          return assetClassOrder.CDS;
        }
        if (position["Asset Class"] == "IG") {
          type = "IG";
        }

        if (position["Asset Class"] == "HY" && type != "IG") {
          type = "HY";
        }

        //if one of them is not rlzd, then its not appliacable
        rlzd = 1;
      } else {
        if (rlzd == 0 || rlzd == 2) {
          rlzd = 2;
        }
      }
    }

    if (rlzd == 2) {
      return assetClassOrder.RLZD;
    }
    if (type == "IG") {
      return assetClassOrder.IG;
    }
    if (type == "HY") {
      return assetClassOrder.HY;
    }
    return assetClassOrder.undefined;
  } catch (error) {
    console.log(error);
    return assetClassOrder.undefined;
  }
}
function sortObjectBasedOnKey(object: any) {
  return Object.keys(object)
    .sort((a, b) => object[b] - object[a])
    .reduce((acc, key) => ({ ...acc, [key]: object[key] }), {});
}

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function areDatesInSameMonthAndYear(customDate: string, todaysDate: string) {
  return new Date(customDate).getMonth() === new Date(todaysDate).getMonth() && new Date(customDate).getFullYear() === new Date(todaysDate).getFullYear();
}

import { PositionBeforeFormatting } from "../../../models/portfolio";
import { formatGeneralTable, groupAndSortByLocationAndTypeDefineTables } from "./formatter";
import { bbgRating, formatMarkDate, moodyRating } from "../tools";

export function formatSummaryPosition(position: any, fundDetails: any, dates: any, sortBy: "pl" | null | "price move") {
  let titles = [
    "Category",
    "Group",
    "Type",
    "L/S",
    "Strategy",
    "Asset Class",
    "Location",
    "Issuer",
    "BB Ticker",
    "Notional Amount",

    "USD Market Value",
    "% of NAV",
    "Currency",
    "Bid",
    "Ask",
    "YTW",
    `Yesterday's Mid ${formatMarkDate(dates.yesterday)}`,
    `Mid ${formatMarkDate(dates.today)}`,

    "Current Spread (T)",
    "Spread (Z)",
    "Entry Spread (T)",
    "Entry Price",
    "Entry Yield",
    "Day P&L (USD)",
    "Day Price Move",
    "3-Day Price Move",

    // "Day P&L % (NAV)",
    "Duration",
    "DV01",
    "CR01",

    "Call Date",
    "Maturity",
    "BBG / S&P / Moody / Fitch Rating",
    "MTD P&L (USD)",
    "MTD Price Move",
    // "MTD P&L % (NAV)",
    "MTD Int. (USD)",

    "YTD Int. (USD)",
    "Average Cost",
    // `${formatMarkDate(dates.lastMonth)}`,
    // `${formatMarkDate(dates.yesterday)}`,
    "OAS",
    "OAS W Change",

    "Sector",
    "Country",
    "Issuer",
    "Last Day Since Realizd",
    "Security Description",

    "BBG Composite Rating",
    "Moody's Bond Rating",

    "DV01 Dollar Value Impact",
    "DV01 Dollar Value Impact % of Nav",
    "DV01 Dollar Value Impact Limit % of Nav",
    "DV01 Dollar Value Impact Utilization % of Nav",
    "DV01 Dollar Value Impact Test",
    "DV01 Dollar Value Impact Test Color",
    "Spread Change",

    "Value (BC) % of Nav",
    "Value (BC) Limit % of Nav",

    "Value (BC) Utilization % of Nav",

    "Value (BC) Test",
    "Value (BC) Test Color",
    "Capital Gain/ Loss since Inception (Live Position)",
    "% of Capital Gain/ Loss since Inception (Live Position)",
    "Accrued Int. Since Inception (BC)",
    "Total Gain/ Loss (USD)",
    "% of Total Gain/ Loss since Inception (Live Position)",
    "Coupon Rate",
    "Pin",
    // "Notional Amount",
    "Asset Class",
    "Sector",
    "Country",
    "Duration",
    "Base LTV",
    "Duration Bucket",
    "Rate Sensitivity",
    "30-Day Int. EST",
    "365-Day Int. EST",
    "Day Int. (BC)",
    "Rating Score",
    "Region",
    "Market Type",

    "CR01 Dollar Value Impact",
    "CR01 Dollar Value Impact % of Nav",
    "CR01 Dollar Value Impact Limit % of Nav",
    "CR01 Dollar Value Impact Utilization % of Nav",
    "CR01 Dollar Value Impact Test",
    "CR01 Dollar Value Impact Test Color",
  ];

  let titlesValues: any = {
    Type: "Type",
    "L/S": "L/S",
    "MTD Price Move": "MTD Price Move",
    "Day Price Move": "Day Price Move",
    "3-Day Price Move": "3-Day Price Move",

    Strategy: "Strategy",
    "Asset Class": "Asset Class",
    "Call Date": "Call Date",
    Location: "Location",
    "Entry Price": "Entry Price",
    "Previous Mark": "Previous Mark",
    "BB Ticker": "BB Ticker",
    "Notional Amount": "Notional Amount",
    Notional: "Notional Amount",
    "USD Market Value": "Value (BC)",
    Maturity: "Maturity",
    "% of NAV": "% of NAV",
    YTW: "YTW",
    "Day Int. (BC)": "Day Int. (BC)",
    "Entry Yield": "Entry Yield",
    DV01: "DV01",
    CR01: "CR01",

    Bid: "Bid",
    Ask: "Ask",
    "Average Cost": "Average Cost",
    Cost: "Cost",
    "Day P&L FX (USD)": "Day P&L FX",
    "Day P&L (USD)": "Day P&L (BC)",
    "MTD FX P&L (USD)": "MTD P&L FX",
    "Realizd MTD P&L (USD)": "MTD Rlzd (BC)",
    "Unrealizd MTD P&L (USD)": "MTD URlzd (BC)",
    "MTD Int. (USD)": "MTD Int. (USD)",
    "MTD P&L (USD)": "MTD P&L (BC)",
    "Day P&L Attribution %": "Day Attribution %",
    "MTD P&L Attribution %": "MTD Attribution %",
    "Realised MTD P&L (USD) %": "Realised MTD P&L (USD) %",
    "Unrealised MTD P&L (USD) %": "Unrealised MTD P&L (USD) %",
    "MTD Int. (USD) %": "MTD Int. (USD) %",
    "Day Int. (USD)": "Day Int. (BC)",
    "30-Day Int. EST": "30-Day Int. EST",
    "365-Day Int. EST": "365-Day Int. EST",
    Sector: "Sector",
    Country: "Country",
    "Last Day Since Realizd": "Last Day Since Realizd",
    Currency: "Currency",
    "Security Description": "Security Description",
    Duration: "Duration",
    OAS: "OAS",
    "Z Spread": "Z Spread",
    "OAS W Change": "OAS W Change",
    "Spread Change": "Spread Change",
    "DV01 Dollar Value Impact": "DV01 Dollar Value Impact",
    "DV01 Dollar Value Impact % of Nav": "DV01 Dollar Value Impact % of Nav",
    "DV01 Dollar Value Impact Limit % of Nav": "DV01 Dollar Value Impact Limit % of Nav",
    "DV01 Dollar Value Impact Utilization % of Nav": "DV01 Dollar Value Impact Utilization % of Nav",
    "DV01 Dollar Value Impact Test": "DV01 Dollar Value Impact Test",
    "DV01 Dollar Value Impact Test Color": "DV01 Dollar Value Impact Test Color",
    "Value (BC) % of Nav": "Value (BC) % of Nav",
    "Value (BC) Limit % of Nav": "Value (BC) Limit % of Nav",

    "Value (BC) Utilization % of Nav": "Value (BC) Utilization % of Nav",
    "Accrued Int. Since Inception (BC)": "Accrued Int. Since Inception (BC)",
    "YTD Int. (USD)": "YTD Int. (USD)",
    "Value (BC) Test": "Value (BC) Test",
    "Value (BC) Test Color": "Value (BC) Test Color",
    "Capital Gain/ Loss since Inception (Live Position)": "Capital Gain/ Loss since Inception (Live Position)",
    "% of Capital Gain/ Loss since Inception (Live Position)": "% of Capital Gain/ Loss since Inception (Live Position)",
    "Total Gain/ Loss (USD)": "Total Gain/ Loss (USD)",
    "% of Total Gain/ Loss since Inception (Live Position)": "% of Total Gain/ Loss since Inception (Live Position)",
    "Coupon Rate": "Coupon Rate",
    Pin: "Pin",
    "Base LTV": "Base LTV",
    "Duration Bucket": "Duration Bucket",
    "Rate Sensitivity": "Rate Sensitivity",
    "Rating Score": "Rating Score",
    Region: "Region",
    "Market Type": "Market Type",

    "CR01 Dollar Value Impact": "CR01 Dollar Value Impact",
    "CR01 Dollar Value Impact % of Nav": "CR01 Dollar Value Impact % of Nav",
    "CR01 Dollar Value Impact Limit % of Nav": "CR01 Dollar Value Impact Limit % of Nav",
    "CR01 Dollar Value Impact Utilization % of Nav": "CR01 Dollar Value Impact Utilization % of Nav",
    "CR01 Dollar Value Impact Test": "CR01 Dollar Value Impact Test",
    "CR01 Dollar Value Impact Test Color": "CR01 Dollar Value Impact Test Color",
  };

  let twoDigits = [`${formatMarkDate(dates.lastMonth)}`, `${formatMarkDate(dates.yesterday)}`, `Mid ${formatMarkDate(dates.today)}`, `Yesterday's Mid ${formatMarkDate(dates.yesterday)}`, "Bid", "Ask", "Duration", "Average Cost", "Entry Price", "Previous Mark", "Day Price Move", "MTD Price Move", "3-Day Price Move"];

  // titlesValues[formatMarkDate(dates.lastMonth)] = "MTD Mark";
  // titlesValues[formatMarkDate(dates.yesterday)] = "Previous Mark";
  titlesValues[`Mid ${formatMarkDate(dates.today)}`] = "Mid";
  titlesValues[`Yesterday's Mid ${formatMarkDate(dates.yesterday)}`] = "Previous Mark";

  let object: any = {};
  for (let titleIndex = 0; titleIndex < titles.length; titleIndex++) {
    let title = titles[titleIndex];
    if (isFinite(position[titlesValues[title]]) && position[titlesValues[title]] != null && position[titlesValues[title]] != "") {
      if (!twoDigits.includes(title)) {
        object[title] = Math.round(position[titlesValues[title]]);
      } else {
        object[title] = parseFloat(position[titlesValues[title]]).toFixed(2);
      }
    } else {
      object[title] = position[titlesValues[title]];
    }
  }

  // object["Day P&L % (NAV)"] = ((object["Day P&L (USD)"] / fundDetails.nav) * 100).toFixed(2) + " %";
  // object["MTD P&L % (NAV)"] = ((object["MTD P&L (USD)"] / fundDetails.nav) * 100).toFixed(2) + " %";
  object["% of NAV"] = ((object["USD Market Value"] / fundDetails.nav) * 100).toFixed(2) + " %";
  object["Color"] = object["Notional Amount"] == 0 ? "#E6F2FD" : "";
  object["ISIN"] = position["ISIN"];
  object["Issuer"] = position["Issuer"];
  object["Last Price Update"] = position["Last Price Update"];
  object["Value (BC) % of GMV"] = Math.abs(Math.round((position["Value (BC)"] / fundDetails.gmv) * 10000) / 100) + " %";
  object[`BBG / S&P / Moody / Fitch Rating`] = (position["BBG Composite Rating"] || "NR") + " " + (position["S&P Bond Rating"] || "NR") + " " + (position["Moody's Bond Rating"] || "NR") + " " + (position["Fitch Bond Rating"] || "NR") + " ";
  object["Spread (Z)"] = position["Z Spread"].toFixed(0);
  object["Current Spread (T)"] = "";
  object["Category"] = "";
  object["Group"] = "";

  object["Entry Spread (T)"] = "";
  return object;
}

export function formatFrontOfficeTable({ portfolio, date, fund, dates, sort, sign, conditions, fundDetailsYTD, sortBy, view, ytdinterest }: { portfolio: PositionBeforeFormatting[]; date: any; fund: any; dates: any; sort: any; sign: number; conditions: null | any; fundDetailsYTD: any; sortBy: "pl" | null | "price move"; view: "front office" | "back office" | "exposure"; ytdinterest: any }) {
  let formattedPortfolio: any = formatGeneralTable({ portfolio: portfolio, date: date, fund: fund, dates: dates, conditions: conditions, fundDetailsYTD: fundDetailsYTD, ytdinterest });

  let formatted = [];

  for (let formattedPortfolioIndex = 0; formattedPortfolioIndex < formattedPortfolio.portfolio.length; formattedPortfolioIndex++) {
    let unformattedPosition = formattedPortfolio.portfolio[formattedPortfolioIndex];
    if (unformattedPosition) {
      let formattedPosition = formatSummaryPosition(unformattedPosition, formattedPortfolio.fundDetails, dates, sortBy);
      formatted.push(formattedPosition);
    }
  }

  let analyzedPortfolio = groupAndSortByLocationAndTypeDefineTables({ formattedPortfolio: formatted, nav: formattedPortfolio.fundDetails.nav, sort: sort, sign: sign, view: view, currencies: formattedPortfolio.currencies, format: "summary", sortBy: sortBy, fundDetails: formattedPortfolio.fundDetails, date: date });
  return { portfolio: analyzedPortfolio.portfolio, fundDetails: formattedPortfolio.fundDetails, analysis: analyzedPortfolio };
}
export function getTopWorst(groupedByLocation: any, sortBy: "pl" | null | "price move") {
  let entries = Object.entries(groupedByLocation).map(([key, value]: any) => ({
    key,
    groupDayPl: value.groupDayPl,
    groupMTDPl: value.groupMTDPl,
    groupDayPriceMoveSum: value.groupDayPriceMoveSum,
    groupMTDPriceMoveSum: value.groupMTDPriceMoveSum,
    data: value.data,
  }));
  // Step 2: Sort the array based on the `groupPL` property
  let top5Day, worst5Day, top5MTD, worst5MTD;
  if (sortBy == "pl" || sortBy == null) {
    entries = entries.filter((object: any, index) => !object["key"].includes("Rlzd"));
    entries.sort((a, b) => b.groupDayPl - a.groupDayPl);

    // Step 3: Select the top 5 and worst 5 entries
    top5Day = entries.slice(0, 5);
    worst5Day = entries.slice(-5).sort((a, b) => a.groupDayPl - b.groupDayPl);
    entries.sort((a, b) => b.groupMTDPl - a.groupMTDPl);
    // Step 4: Map the selected entries to retrieve their `data` values

    top5MTD = entries.slice(0, 5);
    worst5MTD = entries.slice(-5);
    worst5MTD = worst5MTD.sort((a, b) => a.groupMTDPl - b.groupMTDPl);
  } else if (sortBy == "price move") {
    entries = entries.filter((object: any, index) => !object["key"].includes("Rlzd"));
    entries.sort((a, b) => b.groupDayPriceMoveSum - a.groupDayPriceMoveSum);

    // Step 3: Select the top 5 and worst 5 entries
    top5Day = entries.slice(0, 5);
    worst5Day = entries.slice(-5).sort((a, b) => a.groupDayPriceMoveSum - b.groupDayPriceMoveSum);
    entries.sort((a, b) => b.groupMTDPriceMoveSum - a.groupMTDPriceMoveSum);
    // Step 4: Map the selected entries to retrieve their `data` values

    top5MTD = entries.slice(0, 5);
    worst5MTD = entries.slice(-5);
    worst5MTD = worst5MTD.sort((a, b) => a.groupMTDPriceMoveSum - b.groupMTDPriceMoveSum);
  }

  let topWorstPerformaners = {
    top5Day: top5Day,
    worst5Day: worst5Day,
    top5MTD: top5MTD,
    worst5MTD: worst5MTD,
  };
  return topWorstPerformaners;
}

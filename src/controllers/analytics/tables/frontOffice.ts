import { PositionBeforeFormatting } from "../../../models/portfolio";
import { formatGeneralTable, groupAndSortByLocationAndTypeDefineTables } from "./formatter";
import { bbgRating, formatMarkDate, moodyRating } from "../tools";

export function formatSummaryPosition(position: any, fundDetails: any, dates: any, sortBy: "pl" | null | "delta" | "gamma") {
  let titles = [
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
    "Bid",
    "Ask",

    "Current Spread (T)",
    `Last Mid ${formatMarkDate(dates.today)}`,
    "YTW",
    "Entry Spread (T)",
    "Entry Price",
    "Spread (Z)",
    "Entry Yield",
    "Day P&L (USD)",
    "Delta",
    "Delta (BP)",

    "Gamma",
    "Day P&L % (NAV)",
    "Duration",
    "DV01",
    "Call Date",
    "BBG / S&P / Moody / Fitch Rating",
    "MTD P&L (USD)",
    "MTD Delta",
    "MTD Delta (BP)",
    "MTD P&L % (NAV)",
    "Rlzd MTD P&L (USD)",
    "Rlzd MTD P&L (USD) %",
    "MTD Int. (USD)",
    "MTD Int. (USD) %",
    "URlzd MTD (USD)",
    "URlzd MTD (USD) %",
    "Average Cost",
    // `${formatMarkDate(dates.lastMonth)}`,
    // `${formatMarkDate(dates.yesterday)}`,
    "OAS",
    "OAS W Change",

    "Sector",
    "Country",
    "Issuer",
    "Last Day Since Realizd",
    "Currency",
    "Security Description",

    "BBG Composite Rating",
    "Moody's Bond Rating",

    "DV01 Dollar Value Impact",
    "DV01 Dollar Value Impact % of Nav",
    "Spread Change",
    "DV01 Dollar Value Impact % of Nav",
    "DV01 Dollar Value Impact Limit % of Nav",
    "DV01 Dollar Value Impact Utilization % of Nav",
    "DV01 Dollar Value Impact Test",
    "DV01 Dollar Value Impact Color Test",

    "Value (BC) % of Nav",
    "Value (BC) Limit % of Nav",

    "Value (BC) Utilization % of Nav",

    "Value (BC) Test",
    "Value (BC) Color Test",
    "Capital Gain/ Loss since Inception (Live Position)",
    "% of Capital Gain/ Loss since Inception (Live Position)",
    "Accrued Int. Since Inception (BC)",
    "Total Gain/ Loss (USD)",
    "% of Total Gain/ Loss since Inception (Live Position)",
    "Coupon Rate",

    // "Notional Amount",
  ];

  let titlesValues: any = {
    Type: "Type",
    "L/S": "L/S",
    "MTD Delta (BP)": "MTD Delta (BP)",
    "Delta (BP)": "Delta (BP)",


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
    "Entry Yield": "Entry Yield",
    DV01: "DV01",
    Bid: "Bid",
    Ask: "Ask",
    "Average Cost": "Average Cost",
    Cost: "Cost",
    "Day P&L FX (USD)": "Day P&L FX",
    "Day P&L (USD)": "Day P&L (BC)",
    "MTD FX P&L (USD)": "MTD P&L FX",
    "Realizd MTD P&L (USD)": "MTD Rlzd (BC)",
    "Unrealizd MTD P&L (USD)": "MTD URlzd (BC)",
    "MTD Int. (USD)": "MTD Int. (BC)",
    "MTD P&L (USD)": "MTD P&L (BC)",
    "Day P&L Attribution %": "Day Attribution %",
    "MTD P&L Attribution %": "MTD Attribution %",
    "Realised MTD P&L (USD) %": "Realised MTD P&L (USD) %",
    "Unrealised MTD P&L (USD) %": "Unrealised MTD P&L (USD) %",
    "MTD Int. (USD) %": "MTD Int. (USD) %",
    "Day Int. (USD)": "Day Int. (BC)",
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
    "DV01 Dollar Value Impact Color Test": "DV01 Dollar Value Impact Color Test",
    "Value (BC) % of Nav": "Value (BC) % of Nav",
    "Value (BC) Limit % of Nav": "Value (BC) Limit % of Nav",

    "Value (BC) Utilization % of Nav": "Value (BC) Utilization % of Nav",
    "Accrued Int. Since Inception (BC)": "Accrued Int. Since Inception (BC)",

    "Value (BC) Test": "Value (BC) Test",
    "Value (BC) Color Test": "Value (BC) Color Test",
    "Capital Gain/ Loss since Inception (Live Position)": "Capital Gain/ Loss since Inception (Live Position)",
    "% of Capital Gain/ Loss since Inception (Live Position)": "% of Capital Gain/ Loss since Inception (Live Position)",
    "Total Gain/ Loss (USD)": "Total Gain/ Loss (USD)",
    "% of Total Gain/ Loss since Inception (Live Position)": "% of Total Gain/ Loss since Inception (Live Position)",
    "Coupon Rate": "Coupon Rate",
    Delta: "Delta",
    "MTD Delta": "MTD Delta",
    Gamma: "Gamma",
  };

  let twoDigits = [`${formatMarkDate(dates.lastMonth)}`, `${formatMarkDate(dates.yesterday)}`, `Last Mid ${formatMarkDate(dates.today)}`, "Bid", "Ask", "Duration", "Average Cost", "Entry Price", "Previous Mark", "Delta (BP)", "MTD Delta (BP)"];

  // titlesValues[formatMarkDate(dates.lastMonth)] = "MTD Mark";
  // titlesValues[formatMarkDate(dates.yesterday)] = "Previous Mark";
  titlesValues[`Last Mid ${formatMarkDate(dates.today)}`] = "Mid";

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

  object["Day P&L % (NAV)"] = ((object["Day P&L (USD)"] / fundDetails.nav) * 100).toFixed(2) + " %";
  object["MTD P&L % (NAV)"] = ((object["MTD P&L (USD)"] / fundDetails.nav) * 100).toFixed(2) + " %";
  object["Rlzd MTD (USD) %"] = ((position["MTD Rlzd (BC)"] / fundDetails.nav) * 100).toFixed(2) + " %";
  object["Rlzd MTD (USD)"] = Math.round(position["MTD Rlzd (BC)"]);
  object["URlzd MTD (USD) %"] = ((position["MTD URlzd (BC)"] / fundDetails.nav) * 100).toFixed(2) + " %";
  object["URlzd MTD (USD)"] = Math.round(position["MTD URlzd (BC)"]);
  object["MTD Int. (USD) %"] = ((position["MTD Int. (BC)"] / fundDetails.nav) * 100).toFixed(2) + " %";
  object["% of NAV"] = ((object["USD Market Value"] / fundDetails.nav) * 100).toFixed(2) + " %";
  object["Color"] = object["Notional Amount"] == 0 ? "#E6F2FD" : "";
  object["ISIN"] = position["ISIN"];
  object["Issuer"] = position["Issuer"];
  object["Last Price Update"] = position["Last Price Update"];
  object["Rating Score"] = position["BBG Composite Rating"] && position["BBG Composite Rating"] !== "NR" ? bbgRating(position["BBG Composite Rating"]) : position["Moody's Bond Rating"] ? moodyRating(position["Moody's Bond Rating"]) : -99;
  object["Value (BC) % of GMV"] = Math.abs(Math.round((position["Value (BC)"] / fundDetails.gmv) * 10000) / 100) + " %";
  object[`BBG / S&P / Moody / Fitch Rating`] = (position["BBG Composite Rating"] || "NR") + " " + (position["S&P Bond Rating"] || "NR") + " " + (position["Moody's Bond Rating"] || "NR") + " " + (position["Fitch Bond Rating"] || "NR") + " ";
  object["Spread (Z)"] = position["Z Spread"].toFixed(0);
  object["Current Spread (T)"] = "";

  object["Entry Spread (T)"] = "";

  // object["Delta"] = Math.round((object[`Last Mid ${formatMarkDate(dates.today)}`] - object["Previous Mark"])/object[`Last Mid ${formatMarkDate(dates.today)}`] * 10000)/100 + " %"
  return object;
}

export function formatFrontOfficeTable(portfolio: PositionBeforeFormatting[], date: any, fund: any, dates: any, sort: any, sign: number, conditions = null, fundDetailsYTD: any, sortBy: "pl" | null | "delta" | "gamma") {
  let formattedPortfolio: any = formatGeneralTable(portfolio, date, fund, dates, conditions, fundDetailsYTD);

  let formatted = [];

  for (let formattedPortfolioIndex = 0; formattedPortfolioIndex < formattedPortfolio.portfolio.length; formattedPortfolioIndex++) {
    let unformattedPosition = formattedPortfolio.portfolio[formattedPortfolioIndex];
    if (unformattedPosition) {
      let formattedPosition = formatSummaryPosition(unformattedPosition, formattedPortfolio.fundDetails, dates, sortBy);
      formatted.push(formattedPosition);
    }
  }

  let analyzedPortfolio = groupAndSortByLocationAndTypeDefineTables(formatted, formattedPortfolio.fundDetails.nav, sort, sign, "frontOffice", formattedPortfolio.currencies, "summary", sortBy);

  return { portfolio: analyzedPortfolio.portfolio, fundDetails: formattedPortfolio.fundDetails, analysis: analyzedPortfolio };
}
export function getTopWorst(groupedByLocation: any, sortBy: "pl" | null | "delta" | "gamma") {
  let entries = Object.entries(groupedByLocation).map(([key, value]: any) => ({
    key,
    groupDayPl: value.groupDayPl,
    groupMTDPl: value.groupMTDPl,
    groupDelta: value.groupDelta,
    groupGamma: value.groupGamma,
    groupMTDDelta: value.groupMTDDelta,
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
  } else if (sortBy == "delta") {
    entries = entries.filter((object: any, index) => !object["key"].includes("Rlzd"));
    entries.sort((a, b) => b.groupDelta - a.groupDelta);

    // Step 3: Select the top 5 and worst 5 entries
    top5Day = entries.slice(0, 5);
    worst5Day = entries.slice(-5).sort((a, b) => a.groupDelta - b.groupDelta);
    entries.sort((a, b) => b.groupMTDDelta - a.groupMTDDelta);
    // Step 4: Map the selected entries to retrieve their `data` values

    top5MTD = entries.slice(0, 5);
    worst5MTD = entries.slice(-5);
    worst5MTD = worst5MTD.sort((a, b) => a.groupMTDDelta - b.groupMTDDelta);
  } else if (sortBy == "gamma") {
    entries = entries.filter((object: any, index) => !object["key"].includes("Rlzd"));
    entries.sort((a, b) => b.groupGamma - a.groupGamma);

    // Step 3: Select the top 5 and worst 5 entries
    top5Day = entries.slice(0, 5);
    worst5Day = entries.slice(-5).sort((a, b) => a.groupGamma - b.groupGamma);
    entries.sort((a, b) => b.groupGamma - a.groupGamma);
    // Step 4: Map the selected entries to retrieve their `data` values

    top5MTD = entries.slice(0, 5);
    worst5MTD = entries.slice(-5);
    worst5MTD = worst5MTD.sort((a, b) => a.groupGamma - b.groupGamma);
  }

  let topWorstPerformaners = {
    top5Day: top5Day,
    worst5Day: worst5Day,
    top5MTD: top5MTD,
    worst5MTD: worst5MTD,
  };
  return topWorstPerformaners;
}

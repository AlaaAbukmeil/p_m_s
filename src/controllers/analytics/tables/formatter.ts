import { FundMTD, PositionBeforeFormatting, PositionGeneralFormat } from "../../../models/portfolio";
import { formatDateUS, parsePercentage } from "../../common";
import { calculateAccruedSinceInception } from "../../reports/portfolios";
import { parseBondIdentifier } from "../../reports/tools";
import { getCountrySectorStrategySum } from "./statistics";
import { sortObjectBasedOnKey, oasWithChange, checkPosition, yearsUntil, getDuration, getSectorAssetClass, AggregatedData, assignAssetClass, getDurationBucket, assetClassOrderFrontOffice, assetClassOrderExposure, rateSensitive } from "../tools";
import { getTopWorst } from "./frontOffice";
import { adjustMarginMultiplier, nomuraRuleMargin } from "../cash/rules";

export function formatGeneralTable({ portfolio, date, fund, dates, conditions, fundDetailsYTD }: { portfolio: PositionBeforeFormatting[]; date: any; fund: any; dates: any; conditions: any; fundDetailsYTD: any }): { portfolio: PositionGeneralFormat[]; fundDetails: FundMTD; currencies: any } {
  let currencies: any = {};
  let dv01Sum = 0;
  let mtdpl = 0,
    mtdrlzd = 0,
    mtdurlzd = 0,
    mtdint = 0,
    mtdfx = 0,
    dayint = 0,
    daypl = 0,
    dayfx = 0,
    dayurlzd = 0,
    dayrlzd = 0,
    ytdint = 0,
    ytdpl = 0,
    ytdfx = 0,
    ytdurlzd = 0,
    ytdrlzd = 0,
    nmv = 0,
    lmv = 0,
    ytdEstInt = 0,
    smv = 0;
  for (let index = 0; index < portfolio.length; index++) {
    let position: any = portfolio[index];

    let originalFace = position["Original Face"] || 1;
    let usdRatio = parseFloat(position["FX Rate"] || position["holdPortfXrate"]) || 1;
    let holdBackRatio = (position["Asset Class"] || position["Rating Class"]) == "Illiquid" ? parseFloat(fund.holdBackRatio) : 1;

    position["Quantity"] = position["Notional Amount"] / originalFace;

    let bondDivider = position["Type"] == "BND" || position["Type"] == "UST" ? 100 : 1;

    let currency = position["Currency"];

    if (!position["FX Rate"]) {
      if (currencies[currency]) {
        usdRatio = currencies[currency];
      }
    } else {
      if (position["Notional Amount"] != 0) {
        currencies[currency] = usdRatio;
      }
    }
    position["FX Rate"] = usdRatio;

    position["Cost (BC)"] = position["Type"] == "CDS" ? Math.round((position["Average Cost"] * position["Notional Amount"] * usdRatio) / position["Original Face"]) : Math.round(position["Average Cost"] * position["Notional Amount"] * usdRatio);
    position["FX Rate"] = Math.round(position["FX Rate"] * 1000) / 1000;
    position["Value (LC)"] = position["Type"] == "CDS" ? Math.round((position["Notional Amount"] * position["Mid"]) / originalFace) || 0 : Math.round(position["Notional Amount"] * position["Mid"]) || 0;
    position["Value (BC)"] = position["Type"] == "CDS" ? Math.round((position["Notional Amount"] * position["Mid"] * usdRatio) / originalFace) || 0 : Math.round(position["Notional Amount"] * position["Mid"] * usdRatio) || 0;

    position["USD Market Value"] = position["Value (BC)"];

    if (position["Value (BC)"] > 0) {
      lmv += position["Value (BC)"];
    } else {
      smv += position["Value (BC)"];
    }
    nmv += position["Value (BC)"];

    position["Mid"] = Math.round(position["Mid"] * 1000 * bondDivider) / 1000;
    position["Bid"] = Math.round(position["Bid"] * 1000 * bondDivider) / 1000;
    position["Ask"] = Math.round(position["Ask"] * 1000 * bondDivider) / 1000;

    position["Entry Price"] = Math.round(position["Entry Price"] * 1000 * bondDivider) / 1000;

    position["Average Cost"] = Math.round(position["Average Cost"] * 1000 * bondDivider) / 1000;
    position["YTM"] = (Math.round(position["YTM"] * 100) / 100 || 0) + " %" || "0 %";
    position["YTW"] = (Math.round(position["YTW"] * 100) / 100 || 0) + " %" || "0 %";
    position["MTD Rlzd"] = position["MTD Rlzd"] ? position["MTD Rlzd"] : 0;
    position["MTD Mark"] = Math.round(position["MTD Mark"] * 1000 * bondDivider) / 1000;
    position["Day Rlzd"] = position["Day Rlzd"] ? position["Day Rlzd"] : 0;
    position["Previous Mark"] = Math.round(position["Previous Mark"] * 1000 * bondDivider) / 1000;
    position["YTD Mark"] = Math.round(position["YTD Mark"] * 1000 * bondDivider) / 1000;

    if (!position["Previous FX"]) {
      position["Previous FX"] = position["FX Rate"];
    }
    position["DV01"] = (position["DV01"] / 1000000) * position["Notional Amount"] * usdRatio;
    position["DV01"] = Math.round(position["DV01"] * 100) / 100 || 0;

    position["Day P&L FX"] = (position["FX Rate"] - position["Previous FX"]) * position["Value (BC)"];
    position["MTD P&L FX"] = (position["FX Rate"] - position["MTD FX"]) * position["Value (BC)"];
    position["YTD P&L FX"] = (position["FX Rate"] - position["YTD FX"]) * position["Value (BC)"];

    if (!position["Day P&L FX"]) {
      position["Day P&L FX"] = 0;
    }
    if (!position["MTD P&L FX"]) {
      position["MTD P&L FX"] = 0;
    }
    if (!position["YTD P&L FX"]) {
      position["YTD P&L FX"] = 0;
    }

    position["MTD FX"] = position["MTD FX"] ? Math.round(position["MTD FX"] * 1000) / 1000 : Math.round(position["Previous FX"] * 1000) / 1000;

    position["MTD Int. (LC)"] = Math.round(position["MTD Int."] * holdBackRatio);
    position["MTD Rlzd (LC)"] = Math.round(position["MTD Rlzd"] * holdBackRatio);
    position["MTD URlzd (LC)"] = Math.round(position["MTD URlzd"] * holdBackRatio);
    position["MTD P&L (LC)"] = Math.round(position["MTD P&L"] * holdBackRatio);

    position["MTD Int. (BC)"] = Math.round(position["MTD Int."] * usdRatio * holdBackRatio);
    position["MTD Int. (USD)"] = position["MTD Int. (BC)"];

    position["MTD Rlzd (BC)"] = Math.round(position["MTD Rlzd"] * usdRatio * holdBackRatio);
    position["MTD URlzd (BC)"] = Math.round(position["MTD URlzd"] * usdRatio * holdBackRatio);

    position["MTD P&L (BC)"] = Math.round(position["MTD P&L"] * usdRatio * holdBackRatio + position["MTD P&L FX"]);

    position["YTD Int. (LC)"] = Math.round(position["YTD Int."] * holdBackRatio);
    position["YTD Rlzd (LC)"] = Math.round(position["YTD Rlzd"] * holdBackRatio);
    position["YTD URlzd (LC)"] = Math.round(position["YTD URlzd"] * holdBackRatio);
    position["YTD P&L (LC)"] = Math.round(position["YTD P&L"] * holdBackRatio);

    position["YTD Int. (BC)"] = Math.round(position["YTD Int."] * usdRatio * holdBackRatio);
    position["YTD Int. (USD)"] = position["YTD Int. (BC)"];

    position["YTD Rlzd (BC)"] = Math.round(position["YTD Rlzd"] * usdRatio * holdBackRatio);
    position["YTD URlzd (BC)"] = Math.round(position["YTD URlzd"] * usdRatio * holdBackRatio);

    position["YTD P&L (BC)"] = Math.round(position["YTD P&L"] * usdRatio * holdBackRatio + position["YTD P&L FX"]);

    // position["MTD Cost (LC)"] = Math.round(position["MTD Cost"] * holdBackRatio * 1000000) / 1000000;
    position["Cost (LC)"] = Math.round((position["Average Cost"] / bondDivider) * position["Notional Amount"] * holdBackRatio);
    position["Cost MTD (LC)"] = position["Cost MTD"];

    position["Day Int. (LC)"] = Math.round(position["Day Int."] * holdBackRatio);
    position["Day Rlzd (LC)"] = Math.round(position["Day Rlzd"] * holdBackRatio);
    position["Day URlzd (LC)"] = Math.round(position["Day URlzd"] * holdBackRatio);
    position["Day P&L (LC)"] = Math.round(position["Day P&L"] * holdBackRatio);

    position["Day Int. (BC)"] = Math.round(position["Day Int."] * usdRatio * holdBackRatio);
    position["Day Rlzd (BC)"] = Math.round(position["Day Rlzd"] * usdRatio * holdBackRatio);
    position["Day URlzd (BC)"] = Math.round(position["Day URlzd"] * usdRatio * holdBackRatio);

    position["Day P&L (BC)"] = Math.round(position["Day P&L"] * usdRatio * holdBackRatio + position["Day P&L FX"]);

    position["ISIN"] = position["ISIN"];

    position["Maturity"] = position["Maturity"] ? position["Maturity"] : parseBondIdentifier(position["BB Ticker"]).date || 0;

    position["Call Date"] = position["Call Date"] ? position["Call Date"] : "0";

    position["L/S"] = position["Notional Amount"] > 0 && position["Type"] != "CDS" ? "Long" : position["Notional Amount"] == 0 && position["Type"] != "CDS" ? "Rlzd" : "Short";
    position["Duration"] = yearsUntil(position["Call Date"] && position["Call Date"] != "0" && position["BB Ticker"].toLowerCase().includes("perps") ? position["Call Date"] : position["Maturity"], date, position["BB Ticker"]);

    position["Duration Bucket"] = getDurationBucket(position["Duration"]);
    position["Issuer"] = position["Issuer"] == "0" ? "" : position["Issuer"];

    position["Base LTV"] = nomuraRuleMargin(position);
    position["OAS"] = (position["OAS"] / 1000000) * position["Notional Amount"] * usdRatio;
    position["OAS"] = Math.round(position["OAS"] * 100) / 100 || 0;

    position["OAS W Change"] = oasWithChange(position["OAS"])[0];
    position["Spread Change"] = oasWithChange(position["OAS"])[1];
    position["DV01 Dollar Value Impact"] = Math.round(position["OAS W Change"] * position["DV01"]);
    position["DV01 Dollar Value Impact % of Nav"] = Math.round(((position["DV01 Dollar Value Impact"] * position["OAS W Change"]) / fund.nav) * 10000) / 100 + " %";
    position["DV01 Dollar Value Impact Limit % of Nav"] = position["Value (BC)"] / fund.nav > 10 ? 2 + " %" : 1.5 + " %";
    position["DV01 Dollar Value Impact Utilization % of Nav"] = Math.round((parsePercentage(position["DV01 Dollar Value Impact % of Nav"]) / parsePercentage(position["DV01 Dollar Value Impact Limit % of Nav"])) * 10000) / 100 + " %";
    position["DV01 Dollar Value Impact Test"] = Math.abs(parsePercentage(position["DV01 Dollar Value Impact Utilization % of Nav"])) < 100 ? "Pass" : "Fail";
    position["DV01 Dollar Value Impact Color Test"] = position["DV01 Dollar Value Impact Test"] == "Pass" ? "#C5E1A5" : "#FFAB91";

    position["Value (BC) % of Nav"] = Math.round((position["Value (BC)"] / fund.nav) * 10000) / 100 + " %";

    position["Value (BC) Limit % of Nav"] = Math.abs(parsePercentage(position["Value (BC) % of Nav"])) > 10 ? 15 + " %" : 10 + " %";
    position["Value (BC) Utilization % of Nav"] = Math.round((parsePercentage(position["Value (BC) % of Nav"]) / parsePercentage(position["Value (BC) Limit % of Nav"])) * 10000) / 100 + " %";

    position["Value (BC) Test"] = Math.abs(parsePercentage(position["Value (BC) Utilization % of Nav"])) < 100 ? "Pass" : "Fail";
    position["Value (BC) Color Test"] = position["Value (BC) Test"] == "Pass" ? "#C5E1A5" : "#FFAB91";

    position["Capital Gain/ Loss since Inception (Live Position)"] = position["Value (BC)"] - position["Cost (BC)"];
    let shortLongType = position["Value (BC)"] > 0 ? 1 : -1;
    position["% of Capital Gain/ Loss since Inception (Live Position)"] = Math.round((position["Value (BC)"] / position["Cost (BC)"] - 1) * shortLongType * 10000) / 100 + " %";
    position["Accrued Int. Since Inception (BC)"] = calculateAccruedSinceInception(position["Interest"], position["Coupon Rate"] / 100, position["Coupon Duration"], position["ISIN"], date) * usdRatio;

    position["Total Gain/ Loss (USD)"] = Math.round(position["Capital Gain/ Loss since Inception (Live Position)"] + position["Accrued Int. Since Inception (BC)"]);
    position["% of Total Gain/ Loss since Inception (Live Position)"] = Math.round(((position["Total Gain/ Loss (USD)"] + position["Cost (BC)"]) / position["Cost (BC)"] - 1) * shortLongType * 10000) / 100 + " %";

    position["Z Spread"] = (position["Z Spread"] / 1000000) * position["Notional Amount"] * usdRatio;
    position["Z Spread"] = Math.round(position["Z Spread"] * 1000000) / 1000000 || 0;
    position["Entry Yield"] = position["Entry Yield"] ? Math.round(position["Entry Yield"] * 100) / 100 + " %" : "0 %";
    position["Coupon Rate"] = position["Coupon Rate"] + " %";
    position["Rate Sensitivity"] = position["Type"] == "UST" ? "" : rateSensitive(position["YTW"], position["Coupon Rate"], position["Duration"]);
    position["MTD Notional"] = position["MTD Notional"] ? position["MTD Notional"] : 0;

    let latestDateKey;

    latestDateKey = Object.keys(position["Interest"]).sort((a, b) => {
      // Parse the date strings into actual date objects
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();

      // Compare the dates to sort them
      return dateB - dateA; // This will sort in descending order
    })[0]; // Take the first item after sorting

    const latestDate = latestDateKey ? new Date(latestDateKey) : null;

    position["Last Day Since Realizd"] = position["Notional Amount"] == 0 ? formatDateUS(latestDate) : null;

    if (conditions) {
      if (checkPosition(position, conditions)) {
        mtdpl += position["MTD P&L (BC)"];
        mtdrlzd += position["MTD Rlzd (BC)"];
        mtdurlzd += position["MTD URlzd (BC)"];
        mtdint += position["MTD Int. (BC)"];
        mtdfx += position["MTD P&L FX"];

        ytdpl += position["YTD P&L (BC)"];
        ytdrlzd += position["YTD Rlzd (BC)"];
        ytdurlzd += position["YTD URlzd (BC)"];
        ytdint += position["YTD Int. (BC)"];
        ytdfx += position["YTD P&L FX"];

        dayint += position["Day Int. (BC)"];

        daypl += position["Day P&L (BC)"];
        dayfx += position["Day P&L FX"];

        dayurlzd += position["Day URlzd (BC)"];
        dayrlzd += position["Day Rlzd (BC)"];
        dv01Sum += position["DV01"];
        ytdEstInt += position["365-Day Int. EST"];
      } else {
        delete portfolio[index];
      }
    } else {
      mtdpl += position["MTD P&L (BC)"];
      mtdrlzd += position["MTD Rlzd (BC)"];
      mtdurlzd += position["MTD URlzd (BC)"];
      mtdint += position["MTD Int. (BC)"];

      dayint += position["Day Int. (BC)"];

      daypl += position["Day P&L (BC)"];
      dayfx += position["Day P&L FX"];

      mtdfx += position["MTD P&L FX"];

      ytdpl += position["YTD P&L (BC)"];
      ytdrlzd += position["YTD Rlzd (BC)"];
      ytdurlzd += position["YTD URlzd (BC)"];
      ytdint += position["YTD Int. (BC)"];
      ytdfx += position["YTD P&L FX"];

      dayurlzd += position["Day URlzd (BC)"];
      dayrlzd += position["Day Rlzd (BC)"];
      dv01Sum += position["DV01"];
      ytdEstInt += position["365-Day Int. EST"];
    }
  }

  let dayGross = Math.round((daypl / parseFloat(fund.nav)) * 100000) / 1000;
  let dayFXGross = Math.round((dayfx / parseFloat(fund.nav)) * 100000) / 1000;

  let mtdFXGross = Math.round((mtdfx / parseFloat(fund.nav)) * 100000) / 1000;
  let monthGross = Math.round((mtdpl / parseFloat(fund.nav)) * 100000) / 1000;
  let ytdFXGross = Math.round((ytdfx / parseFloat(fundDetailsYTD.nav)) * 100000) / 1000;
  let shadawNAV = parseFloat(fundDetailsYTD.nav) + mtdpl;
  let yearGross = Math.round((1 - shadawNAV / parseFloat(fund.nav) - fund.expenses / 10000) * 100000) / 1000;
  let fundDetails = {
    nav: parseFloat(fund.nav),
    holdbackRatio: parseFloat(fund.holdBackRatio),
    mtdGross: monthGross,
    mtdpl: Math.round(mtdpl * 1000) / 1000,
    mtdrlzd: Math.round(mtdrlzd * 1000) / 1000,
    mtdurlzd: Math.round(mtdurlzd * 1000) / 1000,
    mtdint: Math.round(mtdint * 1000) / 1000,
    mtdfx: Math.round(mtdfx * 1000) / 1000,
    mtdintPercentage: Math.round((mtdint / parseFloat(fund.nav)) * 100000) / 1000,
    mtdFXGross: mtdFXGross,

    ytdGross: yearGross,
    ytdpl: Math.round(ytdpl * 1000) / 1000,
    ytdrlzd: Math.round(ytdrlzd * 1000) / 1000,
    ytdurlzd: Math.round(ytdurlzd * 1000) / 1000,
    ytdint: Math.round(ytdint * 1000) / 1000,
    ytdfx: Math.round(ytdfx * 1000) / 1000,
    ytdintPercentage: Math.round((ytdint / parseFloat(fundDetailsYTD.nav)) * 100000) / 1000,
    ytdFXGross: ytdFXGross,

    dayGross: dayGross,
    dayFXGross: dayFXGross,
    dayint: Math.round(dayint * 1000) / 1000,
    dayintPercentage: Math.round((dayint / parseFloat(fund.nav)) * 100000) / 1000,
    daypl: Math.round(daypl * 1000) / 1000,
    dayfx: Math.round(dayfx * 1000) / 1000,
    dayurlzd: Math.round(dayurlzd * 1000) / 1000,
    dayrlzd: Math.round(dayrlzd * 1000) / 1000,
    dv01Sum: Math.round(dv01Sum * 1000) / 1000,
    lmv: Math.round(lmv * 1000) / 1000,
    smv: Math.round(smv * 1000) / 1000,
    gmv: Math.round((lmv - smv) * 1000) / 1000,
    nmv: Math.round(nmv * 1000) / 1000,
    lmvOfNav: Math.round(lmv * 10000) / (100 * fund.nav),
    smvOfNav: Math.round(smv * 10000) / (100 * fund.nav),
    gmvOfNav: Math.round((lmv - smv) * 10000) / (100 * fund.nav),
    nmvOfNav: Math.round(nmv * 10000) / (100 * fund.nav),
    ytdEstInt: ytdEstInt,
    ytdEstIntPercentage: Math.round((ytdEstInt / parseFloat(fundDetailsYTD.nav)) * 100000) / 1000 || 0,
  };
  let updatedPortfolio: PositionGeneralFormat[] | any = portfolio;

  return { portfolio: updatedPortfolio, fundDetails: fundDetails, currencies: currencies };
}

function sumTable({ table, data, view, param, subtotal, subtotalParam }: { table: any; data: any; view: "front office" | "back office" | "exposure"; param: any; subtotal: boolean; subtotalParam: string }) {
  try {
    let dv01DollarValueImpact = parseFloat(data["DV01 Dollar Value Impact"]);

    let dv01DollarValueOfNav = parsePercentage(data["DV01 Dollar Value Impact % of Nav"]);
    let dv01DollarValueLimitOfNav = parsePercentage(data["DV01 Dollar Value Impact Limit % of Nav"]);
    let dv01DollarValueLimitUtilization = parsePercentage(data["DV01 Dollar Value Impact Utilization % of Nav"]);

    let dv01DollarValueImpactTest = data["DV01 Dollar Value Impact Test"];
    let valueUSDOfNav = parsePercentage(data["Value (BC) % of Nav"]);
    //gmv only for front office
    let valueUSDOfGmv = 0;
    if (view == "front office" || view == "exposure") {
      valueUSDOfGmv = parsePercentage(data["Value (BC) % of GMV"]) || 0;
    }
    let valueUSDLimitOfNav = parsePercentage(data["Value (BC) Limit % of Nav"]);

    let valueUSDUtilizationOfNav = parsePercentage(data["Value (BC) Utilization % of Nav"]);
    let valueUSDOfNavTest = data["Value (BC) Test"];
    let capitalGains = parseFloat(data["Capital Gain/ Loss since Inception (Live Position)"]);
    let capitalGainsPercentage = parsePercentage(data["% of Capital Gain/ Loss since Inception (Live Position)"]);

    let accruedInterestSinceInception = parseFloat(data["Accrued Int. Since Inception (BC)"]);
    let totalCaptialGains = parseFloat(data["Total Gain/ Loss (USD)"]);
    let totalCaptialGainsPercentage = parsePercentage(data["% of Total Gain/ Loss since Inception (Live Position)"]);

    param = param ? param : getSectorAssetClass(data["BB Ticker"], data["Sector"]);

    let dayPl;
    let monthPl;
    let usdMarketValue;
    let duration = parseFloat(data["Duration"]);
    let oasSum = parseFloat(data["OAS"]);
    let zSpreadSum = parseFloat(data["Z Spread"]);
    let oasWChangeSum = parseFloat(data["OAS W Change"]);
    let dv01 = parseFloat(data["DV01"]) || 0;
    let notional = parseFloat(data["Notional Amount"]);
    let delta = parsePercentage(data["Day Price Move"]);
    let mtdDelta = parsePercentage(data["MTD Price Move"]);
    let strategy = data["Strategy"];
    let location = data["Location"];

    if (view == "front office" || view == "exposure") {
      usdMarketValue = parseFloat(data["USD Market Value"]) || 0;
      dayPl = parseFloat(data["Day P&L (USD)"]);
      monthPl = parseFloat(data["MTD P&L (USD)"]);
    } else {
      usdMarketValue = parseFloat(data["Value (BC)"]) || 0;
      dayPl = parseFloat(data["Day P&L (BC)"]);
      monthPl = parseFloat(data["MTD P&L (BC)"]);
    }
    table[param + " Aggregated"] = table[param + " Aggregated"] ? table[param + " Aggregated"] : new AggregatedData();
    table[param + " Aggregated"].Location = location;
    table[param + " Aggregated"]["DV01"] += dv01;
    table[param + " Aggregated"]["MTD P&L (USD)"] += monthPl;
    table[param + " Aggregated"]["USD Market Value"] += usdMarketValue;
    table[param + " Aggregated"]["Day P&L (USD)"] += dayPl;
    table[param + " Aggregated"]["OAS"] += oasSum;
    table[param + " Aggregated"]["Z Spread"] += zSpreadSum;
    table[param + " Aggregated"]["OAS W Change"] += oasWChangeSum;

    table[param + " Aggregated"]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
    table[param + " Aggregated"]["DV01 Dollar Value Impact % of Nav"] += dv01DollarValueOfNav;
    table[param + " Aggregated"]["DV01 Dollar Value Impact Limit % of Nav"] += dv01DollarValueLimitOfNav;
    table[param + " Aggregated"]["DV01 Dollar Value Impact Utilization % of Nav"] += dv01DollarValueLimitUtilization;

    if (dv01DollarValueImpactTest == "Fail") {
      table[param + " Aggregated"]["DV01 Dollar Value Impact Test"] = "Fail";
      table[param + " Aggregated"]["DV01 Dollar Value Impact Color Test"] = "#FFAB91"; // : "#FFAB91";
    }

    table[param + " Aggregated"]["Value (BC) % of Nav"] += Math.round(valueUSDOfNav * 100) / 100;
    table[param + " Aggregated"]["Value (BC) % of GMV"] += Math.round(valueUSDOfGmv * 100) / 100;
    table[param + " Aggregated"]["Value (BC) Limit % of Nav"] += valueUSDLimitOfNav;

    table[param + " Aggregated"]["Value (BC) Utilization % of Nav"] += valueUSDUtilizationOfNav;
    if (valueUSDOfNavTest == "Fail") {
      table[param + " Aggregated"]["Value (BC) Test"] = "Fail";
      table[param + " Aggregated"]["Value (BC) Color Test"] = "#FFAB91";
    }
    table[param + " Aggregated"]["Capital Gain/ Loss since Inception (Live Position)"] += capitalGains;
    table[param + " Aggregated"]["% of Capital Gain/ Loss since Inception (Live Position)"] += capitalGainsPercentage;

    table[param + " Aggregated"]["Accrued Int. Since Inception (BC)"] += accruedInterestSinceInception;
    table[param + " Aggregated"]["Total Gain/ Loss (USD)"] += totalCaptialGains;
    table[param + " Aggregated"]["% of Total Gain/ Loss since Inception (Live Position)"] += totalCaptialGainsPercentage;
    table[param + " Aggregated"]["Notional Amount"] += notional;
    table[param + " Aggregated"]["Day Price Move"] += delta;
    table[param + " Aggregated"]["MTD Price Move"] += mtdDelta;

    table["Total"] = table["Total"] ? table["Total"] : new AggregatedData();
    table["Total"]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
    table["Total"]["DV01 Dollar Value Impact % of Nav"] += dv01DollarValueOfNav;
    table["Total"]["DV01 Dollar Value Impact Limit % of Nav"] += dv01DollarValueLimitOfNav;
    table["Total"]["DV01 Dollar Value Impact Utilization % of Nav"] += dv01DollarValueLimitUtilization;

    if (dv01DollarValueImpactTest == "Fail") {
      table["Total"]["DV01 Dollar Value Impact Test"] = "Fail";
      table["Total"]["DV01 Dollar Value Impact Color Test"] = "#FFAB91"; // : "#FFAB91";
    }

    table["Total"]["Value (BC) % of Nav"] += valueUSDOfNav;
    table["Total"]["Value (BC) % of GMV"] += valueUSDOfGmv;
    table["Total"]["Value (BC) Limit % of Nav"] += valueUSDLimitOfNav;

    table["Total"]["Value (BC) Utilization % of Nav"] += valueUSDUtilizationOfNav;
    if (valueUSDOfNavTest == "Fail") {
      table["Total"]["Value (BC) Test"] = "Fail";
      table["Total"]["Value (BC) Color Test"] = "#FFAB91";
    }
    table["Total"]["Capital Gain/ Loss since Inception (Live Position)"] += capitalGains;
    table["Total"]["% of Capital Gain/ Loss since Inception (Live Position)"] += capitalGainsPercentage;

    table["Total"]["Accrued Int. Since Inception (BC)"] += accruedInterestSinceInception;
    table["Total"]["Total Gain/ Loss (USD)"] += totalCaptialGains;
    table["Total"]["% of Total Gain/ Loss since Inception (Live Position)"] += totalCaptialGainsPercentage;
    table["Total"]["Notional Amount"] += notional;

    table["Total"]["DV01"] += dv01;
    table["Total"]["MTD P&L (USD)"] += monthPl;
    table["Total"]["Day P&L (USD)"] += dayPl;
    table["Total"]["USD Market Value"] += usdMarketValue;
    table["Total"]["OAS"] += oasSum;
    table["Total"]["Z Spread"] += zSpreadSum;
    table["Total"]["OAS"] += oasWChangeSum;
    table["Total"]["Day Price Move"] += delta;
    table["Total"]["MTD Price Move"] += mtdDelta;

    if (subtotal) {
      table[subtotalParam] = table[subtotalParam] ? table[subtotalParam] : new AggregatedData();

      table[subtotalParam][strategy] = table[subtotalParam][strategy] ? table[subtotalParam][strategy] : new AggregatedData();
      table[subtotalParam]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;

      table[subtotalParam]["DV01 Dollar Value Impact % of Nav"] += Math.round(dv01DollarValueOfNav * 100) / 100 || 0;
      table[subtotalParam]["DV01 Dollar Value Impact Limit % of Nav"] += dv01DollarValueLimitOfNav;
      table[subtotalParam]["DV01 Dollar Value Impact Utilization % of Nav"] += dv01DollarValueLimitUtilization;

      table[subtotalParam]["Value (BC) % of Nav"] += Math.round(valueUSDOfNav * 100) / 100 || 0;
      table[subtotalParam]["Value (BC) % of GMV"] += Math.round(valueUSDOfGmv * 100) / 100 || 0;
      table[subtotalParam]["Value (BC) Limit % of Nav"] += valueUSDLimitOfNav;

      table[subtotalParam]["Value (BC) Utilization % of Nav"] += valueUSDUtilizationOfNav;

      table[subtotalParam]["Capital Gain/ Loss since Inception (Live Position)"] += capitalGains;
      table[subtotalParam]["% of Capital Gain/ Loss since Inception (Live Position)"] += Math.round(capitalGainsPercentage * 100) / 100 || 0;

      table[subtotalParam]["Accrued Int. Since Inception (BC)"] += accruedInterestSinceInception;
      table[subtotalParam]["Total Gain/ Loss (USD)"] += totalCaptialGains;
      table[subtotalParam]["% of Total Gain/ Loss since Inception (Live Position)"] += Math.round(totalCaptialGainsPercentage * 100) / 100 || 0;
      table[subtotalParam]["Notional Amount"] += notional;
      table[subtotalParam]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
      table[subtotalParam]["USD Market Value"] += usdMarketValue;
      table[subtotalParam]["Duration"] = duration;

      table[subtotalParam]["DV01"] += dv01;
      table[subtotalParam]["MTD P&L (USD)"] += monthPl;
      table[subtotalParam]["Day P&L (USD)"] += dayPl;
      table[subtotalParam]["USD Market Value"] += usdMarketValue;
      table[subtotalParam]["OAS"] += oasSum;
      table[subtotalParam]["Z Spread"] += zSpreadSum;
      table[subtotalParam]["OAS W Change"] += oasWChangeSum;
      table[subtotalParam]["L/S"] = subtotalParam;

      ///
      table[subtotalParam][strategy]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
      table[subtotalParam][strategy]["DV01 Dollar Value Impact % of Nav"] += dv01DollarValueOfNav;
      table[subtotalParam][strategy]["DV01 Dollar Value Impact Limit % of Nav"] += dv01DollarValueLimitOfNav;
      table[subtotalParam][strategy]["DV01 Dollar Value Impact Utilization % of Nav"] += dv01DollarValueLimitUtilization;

      table[subtotalParam][strategy]["Value (BC) % of Nav"] += Math.round(valueUSDOfNav * 100) / 100 || 0;
      table[subtotalParam][strategy]["Value (BC) % of GMV"] += Math.round(valueUSDOfGmv * 100) / 100 || 0;
      table[subtotalParam][strategy]["Value (BC) Limit % of Nav"] += valueUSDLimitOfNav;

      table[subtotalParam][strategy]["Value (BC) Utilization % of Nav"] += valueUSDUtilizationOfNav;

      table[subtotalParam][strategy]["Capital Gain/ Loss since Inception (Live Position)"] += capitalGains;
      table[subtotalParam][strategy]["% of Capital Gain/ Loss since Inception (Live Position)"] += Math.round(capitalGainsPercentage * 100) / 100 || 0;

      table[subtotalParam][strategy]["Accrued Int. Since Inception (BC)"] += accruedInterestSinceInception;
      table[subtotalParam][strategy]["Total Gain/ Loss (USD)"] += totalCaptialGains;
      table[subtotalParam][strategy]["% of Total Gain/ Loss since Inception (Live Position)"] += Math.round(totalCaptialGainsPercentage * 100) / 100 || 0;
      table[subtotalParam][strategy]["Notional Amount"] += notional;
      table[subtotalParam][strategy]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
      table[subtotalParam][strategy]["USD Market Value"] += usdMarketValue;
      table[subtotalParam][strategy]["Duration"] = duration;

      table[subtotalParam][strategy]["DV01"] += dv01;
      table[subtotalParam][strategy]["MTD P&L (USD)"] += monthPl;
      table[subtotalParam][strategy]["Day P&L (USD)"] += dayPl;
      table[subtotalParam][strategy]["USD Market Value"] += usdMarketValue;
      table[subtotalParam][strategy]["OAS"] += oasSum;
      table[subtotalParam][strategy]["Z Spread"] += zSpreadSum;
      table[subtotalParam][strategy]["OAS W Change"] += oasWChangeSum;
      table[subtotalParam][strategy]["L/S"] = strategy;

      table[param] = table[param] ? table[param] : {};
      table[param][subtotalParam] = table[param][subtotalParam] ? table[param][subtotalParam] : {};
      table[param][subtotalParam][strategy] = table[param][subtotalParam][strategy] ? table[param][subtotalParam][strategy] : [];
      table[param][subtotalParam][strategy].push(data);
    } else {
      table[param] = table[param] ? table[param] : [];
      table[param].push(data);
    }
  } catch (error) {
    console.log(error);
  }
}

export function assignColorAndSortParamsBasedOnAssetClass({
  countryNAVPercentage,
  sectorNAVPercentage,
  strategyNAVPercentage,
  longShort,
  durationSummary,
  groupedByLocation,
  view,
  ustTable,
  igTable,
  hyTable,
  currTable,
  ustTableByCoupon,
  issuerNAVPercentage,
  rvPairTable,
  tickerTable,
  countryGMVPercentage,
  sectorGMVPercentage,
  strategyGMVPercentage,
  issuerGMVPercentage,
  date,
}: {
  countryNAVPercentage: any;
  sectorNAVPercentage: any;
  strategyNAVPercentage: any;
  longShort: any;
  durationSummary: any;
  groupedByLocation: any;
  view: "front office" | "back office" | "exposure";
  ustTable: any;
  igTable: any;
  hyTable: any;
  currTable: any;
  issuerTable: any;
  ustTableByCoupon: any;
  issuerNAVPercentage: any;
  rvPairTable: any;
  tickerTable: any;
  countryGMVPercentage: any;
  sectorGMVPercentage: any;
  strategyGMVPercentage: any;
  issuerGMVPercentage: any;
  date: string;
}) {
  let assetClassOrder = view == "exposure" ? assetClassOrderExposure : assetClassOrderFrontOffice;
  for (let locationCode in groupedByLocation) {
    groupedByLocation[locationCode].order = assignAssetClass(locationCode, groupedByLocation[locationCode].data, assetClassOrder, view);
    if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.UST_HEDGE) {
      groupedByLocation[locationCode].color = "#FEEBED";

      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        let duration: any = getDuration(groupedByLocation[locationCode].data[index]["Duration"]);
        let couponRate: any = groupedByLocation[locationCode].data[index]["Coupon Rate"];
        let notional = groupedByLocation[locationCode].data[index]["Notional Amount"];
        let issue: any = groupedByLocation[locationCode].data[index]["BB Ticker"];

        sumTable({ table: rvPairTable, data: groupedByLocation[locationCode].data[index], view: view, param: locationCode, subtotal: false, subtotalParam: "" });
        if (notional < 0) {
          sumTable({ table: ustTableByCoupon, data: groupedByLocation[locationCode].data[index], view: view, param: couponRate, subtotal: false, subtotalParam: "" });
          sumTable({ table: ustTable, data: groupedByLocation[locationCode].data[index], view: view, param: duration, subtotal: true, subtotalParam: issue });
        }
        groupedByLocation[locationCode].data[index]["Strategy"] = "RV";
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.IG || Math.round(groupedByLocation[locationCode].order) == assetClassOrder.R_S) {
      groupedByLocation[locationCode].color = "#E1BEE7";
      if (view != "exposure") {
        for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
          sumTable({ table: igTable, data: groupedByLocation[locationCode].data[index], view: view, param: null, subtotal: false, subtotalParam: "" });
        }
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.HY || Math.round(groupedByLocation[locationCode].order) == assetClassOrder.R_IS) {
      groupedByLocation[locationCode].color = "#C5CAE9";
      if (view != "exposure") {
        for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
          sumTable({ table: hyTable, data: groupedByLocation[locationCode].data[index], view: view, param: null, subtotal: false, subtotalParam: "" });
        }
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.CURR_HEDGE) {
      groupedByLocation[locationCode].color = "#FFF9C4";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        let currency = groupedByLocation[locationCode].data[index]["ISIN"].includes("IB") ? groupedByLocation[locationCode].data[index]["Security Description"] : groupedByLocation[locationCode].data[index]["Currency"];
        if (!currency) {
          currency = "Bonds";
        }

        sumTable({ table: currTable, data: groupedByLocation[locationCode].data[index], view: view, param: currency, subtotal: false, subtotalParam: "" });
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.NON_USD) {
      groupedByLocation[locationCode].color = "#FFF9C4";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        let currency = groupedByLocation[locationCode].data[index]["ISIN"].includes("IB") ? groupedByLocation[locationCode].data[index]["Security Description"] : groupedByLocation[locationCode].data[index]["Currency"];
        if (!currency) {
          currency = "Bonds";
        }

        sumTable({ table: currTable, data: groupedByLocation[locationCode].data[index], view: view, param: currency, subtotal: false, subtotalParam: "" });
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.FUT) {
      groupedByLocation[locationCode].color = "#FFF9C4";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        let currency = groupedByLocation[locationCode].data[index]["ISIN"].includes("IB") ? groupedByLocation[locationCode].data[index]["Security Description"] : groupedByLocation[locationCode].data[index]["Currency"];
        if (!currency) {
          currency = "Bonds";
        }

        sumTable({ table: currTable, data: groupedByLocation[locationCode].data[index], view: view, param: currency, subtotal: false, subtotalParam: "" });
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.CDS) {
      groupedByLocation[locationCode].color = "#CE93D8";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {}
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.UST_GLOBAL) {
      groupedByLocation[locationCode].color = "#E8F5E9";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        let duration: any = getDuration(groupedByLocation[locationCode].data[index]["Duration"]);
        let couponRate: any = groupedByLocation[locationCode].data[index]["Coupon Rate"];
        let notional = groupedByLocation[locationCode].data[index]["Notional Amount"];
        let issue: any = groupedByLocation[locationCode].data[index]["BB Ticker"];
        //  console.log(issue, couponRate, "table")
        if (notional < 0) {
          sumTable({ table: ustTableByCoupon, data: groupedByLocation[locationCode].data[index], view: view, param: couponRate, subtotal: false, subtotalParam: "" });
          sumTable({ table: ustTable, data: groupedByLocation[locationCode].data[index], view: view, param: duration, subtotal: true, subtotalParam: issue });
        }
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.Illiquid) {
      groupedByLocation[locationCode].color = "#9FA8DA";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {}
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.undefined) {
      groupedByLocation[locationCode].color = "#E5D1B4";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {}
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.RLZD) {
      groupedByLocation[locationCode].color = "#C5E1A5";
    }

    let groupDayPl = 0,
      groupMTDPl = 0,
      groupDV01Sum = 0,
      groupCallDate = null,
      groupMaturity = null,
      groupMTDIntSum = 0,
      groupYTDIntSum = 0,
      groupDayPriceMoveSum = null,
      groupMTDPriceMoveSum = null,
      groupUSDMarketValue = 0,
      groupRating = -99,
      groupNotional = 0,
      groupSpreadTZ,
      groupEntrySpreadTZ;

    groupedByLocation[locationCode]["DV01 Dollar Value Impact"] = 0;
    groupedByLocation[locationCode]["DV01 Dollar Value Impact % of Nav"] = 0;
    groupedByLocation[locationCode]["DV01 Dollar Value Impact Limit % of Nav"] = 0;
    groupedByLocation[locationCode]["DV01 Dollar Value Impact Utilization % of Nav"] = 0;

    for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
      let country = groupedByLocation[locationCode].data[index]["Country"] ? groupedByLocation[locationCode].data[index]["Country"] : "Unspecified";
      let issuer = groupedByLocation[locationCode].data[index]["Issuer"] ? groupedByLocation[locationCode].data[index]["Issuer"] : "Unspecified";
      let sector = groupedByLocation[locationCode].data[index]["Sector"] ? groupedByLocation[locationCode].data[index]["Sector"] : "Unspecified";
      let strategy = groupedByLocation[locationCode].data[index]["Strategy"];
      let bbTicker = groupedByLocation[locationCode].data[index]["BB Ticker"] ? groupedByLocation[locationCode].data[index]["BB Ticker"] : "Unspecified";
      let duration = parseFloat(groupedByLocation[locationCode].data[index]["Duration"]) || 0;
      let dv01 = parseFloat(groupedByLocation[locationCode].data[index]["DV01"]) || 0;
      let dayPriceMove = parseFloat(groupedByLocation[locationCode].data[index]["Day Price Move"]) || 0;

      let mtdPriceMove = parseFloat(groupedByLocation[locationCode].data[index]["MTD Price Move"]) || 0;

      let notional = parseFloat(groupedByLocation[locationCode].data[index]["Notional Amount"]) || 0;
      let ratingScore = groupedByLocation[locationCode].data[index]["Rating Score"];
      let usdMarketValue;
      let dayPl;
      let monthPl;
      let dv01DollarValueImpact = parseFloat(groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact"]);
      let dv01DollarValueOfNav = parseFloat(groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact % of Nav"]);
      let dv01DollarValueLimitOfNav = parseFloat(groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact Limit % of Nav"]);
      let dv01DollarValueLimitUtilization = parseFloat(groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact Utilization % of Nav"]);
      let mtdInt = parseFloat(groupedByLocation[locationCode].data[index]["MTD Int. (USD)"]);
      let YTDInt = parseFloat(groupedByLocation[locationCode].data[index]["YTD Int. (USD)"]);
      let maturity = yearsUntil(groupedByLocation[locationCode].data[index]["Maturity"], date, groupedByLocation[locationCode].data[index]["BB Ticker"]);
      let callDate = yearsUntil(groupedByLocation[locationCode].data[index]["Call Date"], date, groupedByLocation[locationCode].data[index]["BB Ticker"]);

      let ytw = parseFloat(groupedByLocation[locationCode].data[index]["YTW"]);
      let entryYtw = parsePercentage(groupedByLocation[locationCode].data[index]["Entry Yield"]);
      let type = groupedByLocation[locationCode].data[index]["Type"];
      if (view == "front office" || view == "exposure") {
        usdMarketValue = parseFloat(groupedByLocation[locationCode].data[index]["USD Market Value"]) || 0;
        dayPl = parseFloat(groupedByLocation[locationCode].data[index]["Day P&L (USD)"]);
        monthPl = parseFloat(groupedByLocation[locationCode].data[index]["MTD P&L (USD)"]);
      } else {
        usdMarketValue = parseFloat(groupedByLocation[locationCode].data[index]["Value (BC)"]) || 0;
        dayPl = parseFloat(groupedByLocation[locationCode].data[index]["Day P&L (BC)"]);
        monthPl = parseFloat(groupedByLocation[locationCode].data[index]["MTD P&L (BC)"]);
      }

      let absoulteUsdMarketValue = Math.abs(usdMarketValue);

      strategyNAVPercentage[strategy] = strategyNAVPercentage[strategy] ? strategyNAVPercentage[strategy] + usdMarketValue : usdMarketValue;
      issuerNAVPercentage[issuer] = issuerNAVPercentage[issuer] ? issuerNAVPercentage[issuer] + usdMarketValue : usdMarketValue;
      if (usdMarketValue > 0) {
        countryNAVPercentage[country.toLowerCase()] = countryNAVPercentage[country.toLowerCase()] ? countryNAVPercentage[country.toLowerCase()] + usdMarketValue : usdMarketValue;
        sectorNAVPercentage[sector.toLowerCase()] = sectorNAVPercentage[sector.toLowerCase()] ? sectorNAVPercentage[sector.toLowerCase()] + usdMarketValue : usdMarketValue;
      }

      strategyGMVPercentage[strategy] = strategyGMVPercentage[strategy] ? strategyGMVPercentage[strategy] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      issuerGMVPercentage[issuer] = issuerGMVPercentage[issuer] ? issuerGMVPercentage[issuer] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      countryGMVPercentage[country.toLowerCase()] = countryGMVPercentage[country.toLowerCase()] ? countryGMVPercentage[country.toLowerCase()] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      sectorGMVPercentage[sector.toLowerCase()] = sectorGMVPercentage[sector.toLowerCase()] ? sectorGMVPercentage[sector.toLowerCase()] + absoulteUsdMarketValue : absoulteUsdMarketValue;

      tickerTable[bbTicker] = "";
      if (usdMarketValue > 0) {
        longShort["Long"].dv01Sum += Math.round(parseFloat(groupedByLocation[locationCode].data[index]["DV01"]) || 0);
        longShort["Long"].intSum += Math.round(parseFloat(groupedByLocation[locationCode].data[index]["Day Int. (BC)"]) || 0);
      } else if (usdMarketValue < 0 || groupedByLocation[locationCode].data[index]["Type"] == "CDS") {
        longShort["Short"].dv01Sum += Math.round(parseFloat(groupedByLocation[locationCode].data[index]["DV01"]) || 0);
        longShort["Short"].intSum += Math.round(parseFloat(groupedByLocation[locationCode].data[index]["Day Int. (BC)"]) || 0);
      }

      if (type == "BND" && strategy == "RV") {
        if (!groupSpreadTZ) {
          groupSpreadTZ = 0;
        }
        groupSpreadTZ += ytw;
        if (!groupEntrySpreadTZ) {
          groupEntrySpreadTZ = 0;
        }
        groupEntrySpreadTZ += entryYtw;
      } else if (type == "UST" && strategy == "RV") {
        if (!groupSpreadTZ) {
          groupSpreadTZ = 0;
        }
        groupSpreadTZ -= ytw;
        if (!groupEntrySpreadTZ) {
          groupEntrySpreadTZ = 0;
        }
        groupEntrySpreadTZ -= entryYtw;
      }

      groupDayPl += dayPl;
      groupMTDPl += monthPl;
      groupDV01Sum += dv01;

      groupMTDIntSum += mtdInt;

      groupYTDIntSum += YTDInt;

      groupDayPriceMoveSum = groupDayPriceMoveSum && groupDayPriceMoveSum < dayPriceMove ? groupDayPriceMoveSum : dayPriceMove;
      groupMTDPriceMoveSum = groupMTDPriceMoveSum && groupMTDPriceMoveSum < mtdPriceMove ? groupMTDPriceMoveSum : mtdPriceMove;

      groupCallDate = groupCallDate && groupCallDate < callDate ? groupCallDate : callDate;
      groupMaturity = groupMaturity && groupMaturity < maturity ? groupMaturity : maturity;

      groupUSDMarketValue += usdMarketValue;
      groupRating = groupRating < ratingScore ? ratingScore : groupRating;
      groupNotional += notional;

      groupedByLocation[locationCode]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;

      groupedByLocation[locationCode]["DV01 Dollar Value Impact % of Nav"] = dv01DollarValueOfNav;
      groupedByLocation[locationCode]["DV01 Dollar Value Impact Limit % of Nav"] = dv01DollarValueLimitOfNav;
      groupedByLocation[locationCode]["DV01 Dollar Value Impact Utilization % of Nav"] = dv01DollarValueLimitUtilization;

      if (duration < 2) {
        durationSummary["0 To 2"].durationSum += duration;
        durationSummary["0 To 2"].dv01Sum += dv01;
        durationSummary["0 To 2"].dv01Sum = Math.round(durationSummary["0 To 2"].dv01Sum * 1);
      } else if (duration >= 2 && duration < 5) {
        durationSummary["2 To 5"].durationSum += duration;
        durationSummary["2 To 5"].dv01Sum += dv01;
        durationSummary["2 To 5"].dv01Sum = Math.round(durationSummary["2 To 5"].dv01Sum * 100) / 100;
      } else if (duration >= 5 && duration < 10) {
        durationSummary["5 To 10"].durationSum += duration;
        durationSummary["5 To 10"].dv01Sum += dv01;
        durationSummary["5 To 10"].dv01Sum = Math.round(durationSummary["5 To 10"].dv01Sum * 100) / 100;
      } else if (duration >= 10 && duration < 30) {
        durationSummary["10 To 30"].durationSum += duration;
        durationSummary["10 To 30"].dv01Sum += dv01;
        durationSummary["10 To 30"].dv01Sum = Math.round(durationSummary["10 To 30"].dv01Sum * 100) / 100;
      } else if (duration >= 30) {
        durationSummary["> 30"].durationSum += duration;
        durationSummary["> 30"].dv01Sum += dv01;
        durationSummary["> 30"].dv01Sum = Math.round(durationSummary["> 30"].dv01Sum * 100) / 100;
      }

      let pinned = groupedByLocation[locationCode].data[index]["Pin"];
      if (pinned == "pinned") {
        groupedByLocation[locationCode].order = 0;
        // groupedByLocation[locationCode].color = "#f59542";
      }
    }

    groupedByLocation[locationCode].groupDayPl = groupDayPl;
    groupedByLocation[locationCode].groupDV01Sum = groupDV01Sum;
    groupedByLocation[locationCode].groupMaturity = groupMaturity;

    groupedByLocation[locationCode].groupCallDate = groupCallDate;

    groupedByLocation[locationCode].groupMTDIntSum = groupMTDIntSum;

    groupedByLocation[locationCode].groupYTDIntSum = groupYTDIntSum;

    groupedByLocation[locationCode].groupDayPriceMoveSum = groupDayPriceMoveSum;
    groupedByLocation[locationCode].groupMTDPriceMoveSum = groupMTDPriceMoveSum;

    groupedByLocation[locationCode].groupUSDMarketValue = groupUSDMarketValue;
    groupedByLocation[locationCode].groupMTDPl = groupMTDPl;
    groupedByLocation[locationCode].groupNotional = groupNotional;

    groupedByLocation[locationCode].groupEntrySpreadTZ = groupEntrySpreadTZ;
    groupedByLocation[locationCode].groupSpreadTZ = groupSpreadTZ;
  }
}

export function assignBorderAndCustomSortAggregateGroup({ portfolio, groupedByLocation, sort, sign, view }: { portfolio: any; groupedByLocation: any; sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMTDPl" | "groupDV01Sum" | "groupMTDPriceMoveSum" | "groupDayPriceMoveSum" | "groupCallDate" | "groupMaturity"; sign: any; view: "front office" | "back office" | "exposure" }) {
  sign = parseFloat(sign);
  if (sort == "order") {
    //because order should be descending
    sign = -1 * sign;
  }
  let durationBuckets = ["0 To 2", "2 To 5", "5 To 10", "10 To 30", "> 30"];
  let locationCodes;
  let macroHedgeIndex = 0;
  let nonHedgeIndex, rvIndex;
  let macro = {
    "Global Hedge": {
      "L/S": "Global Hedge",
      Color: "#F9F4D2",
      Location: "Global Hedge",
      "USD Market Value": 0,
      DV01: 0,
      "Day P&L (USD)": 0,
      "MTD Int. (USD)": 0,

      "YTD Int. (USD)": 0,

      "MTD P&L (USD)": 0,
      "Notional Amount": 0,
    },
    "Non-Hedge Bonds": {
      "L/S": "Non-Hedge Bonds",
      Color: "#F9F4D2",
      Location: "Non-Hedge Bonds",
      "USD Market Value": 0,
      DV01: 0,
      "Day P&L (USD)": 0,
      "MTD Int. (USD)": 0,

      "YTD Int. (USD)": 0,
      "MTD P&L (USD)": 0,
      "Notional Amount": 0,
    },
    RV: {
      "L/S": "RV",
      Color: "#F9F4D2",
      Location: "RV",
      "USD Market Value": 0,
      DV01: 0,
      "Day P&L (USD)": 0,
      "MTD Int. (USD)": 0,

      "YTD Int. (USD)": 0,
      "MTD P&L (USD)": 0,
      "Notional Amount": 0,
    },
  };
  if (view == "exposure") {
    locationCodes = Object.entries(groupedByLocation);
    locationCodes = locationCodes
      .sort((a: any, b: any) => {
        const orderMap: any = {
          "Rate Sensitive": 1000, // Large numbers to ensure these come after all numeric ranges
          "Rate Insensitive": 2000,
        };

        // Helper function to convert location string to a sortable numeric value
        function getSortValue(location: string, item: any): number {
          if (location in orderMap) {
            return orderMap[location]; // Return predefined values for special categories
          } else if (durationBuckets.includes(location)) {
            // Assume the location is a numeric range and parse the first number
            const match = location.match(/^\s*(\d+)/); // Matches the first number sequence
            return match ? parseInt(match[1], 10) : Infinity; // Use Infinity for unexpected formats to sort them last
          } else {
            return 3000;
          }
        }

        // Calculate sort values for both locations
        const sortValueA = getSortValue(a[0], a);
        const sortValueB = getSortValue(b[0], b);

        // Compare these sort values
        return sortValueA - sortValueB;
      })
      .map((entry) => entry[0]);
  } else {
    locationCodes = Object.entries(groupedByLocation)
      .sort((a: any, b: any) => (sign == -1 ? a[1][`${sort}`] - b[1][`${sort}`] : b[1][`${sort}`] - a[1][`${sort}`]))
      .map((entry) => entry[0]);
  }

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
    if (view == "exposure" && (locationCode == "Rate Sensitive" || locationCode == "Rate Insensitive")) {
      groupedByLocation[locationCode].data.sort((a: any, b: any) => {
        // Assuming "L/S" is a number that can be directly compared
        if (parseFloat(a["Duration"]) < parseFloat(b["Duration"])) {
          return -1; // a comes first
        } else if (parseFloat(a["Duration"]) > parseFloat(b["Duration"])) {
          return 1; // b comes first
        }
        return 0; // a and b are equal
      });
    }
    let totalTicker = "";

    for (let groupPositionIndex = 0; groupPositionIndex < groupedByLocation[locationCode].data.length; groupPositionIndex++) {
      if (groupedByLocation[locationCode].data[groupPositionIndex]["Notional Amount"] == 0) {
        groupedByLocation[locationCode].data[groupPositionIndex]["Color"] = "#C5E1A5";
        //   //no need for borders when rlzd
        //   // continue;
      } else {
        groupedByLocation[locationCode].data[groupPositionIndex]["Color"] = groupedByLocation[locationCode].color;
      }

      let length = groupedByLocation[locationCode].data.length;
      if (groupedByLocation[locationCode].data.length > 1) {
        groupedByLocation[locationCode].data[length - 1]["bottom"] = true;
      }
      let bbticker = groupedByLocation[locationCode].data[groupPositionIndex]["BB Ticker"].toString().split(" ");
      totalTicker += bbticker[0] + " " + (bbticker[1] || "") + (groupPositionIndex < length - 1 ? " + " : "");
    }

    if (groupedByLocation[locationCode].data.length > 1 || (view == "exposure" && durationBuckets.includes(locationCode))) {
      let portfolioViewType = view;

      let newObject: any = {};

      if (portfolioViewType == "front office") {
        newObject = {
          "L/S": "Total",
          "BB Ticker": totalTicker,
          Color: "white",
          Location: locationCode,
          "USD Market Value": groupedByLocation[locationCode].groupUSDMarketValue,
          DV01: groupedByLocation[locationCode].groupDV01Sum,

          "MTD Int. (USD)": groupedByLocation[locationCode].groupMTDIntSum,

          "YTD Int. (USD)": groupedByLocation[locationCode].groupYTDIntSum,

          "Day Price Move": groupedByLocation[locationCode].groupDayPriceMoveSum,

          "MTD Price Move": groupedByLocation[locationCode].groupMTDPriceMoveSum,

          "Day P&L (USD)": groupedByLocation[locationCode].groupDayPl,
          "MTD P&L (USD)": groupedByLocation[locationCode].groupMTDPl,
          "Notional Amount": groupedByLocation[locationCode].groupNotional,
        };
        if (groupedByLocation[locationCode].groupSpreadTZ || groupedByLocation[locationCode].groupSpreadTZ == 0) {
          newObject["Current Spread (T)"] = Math.round(groupedByLocation[locationCode].groupSpreadTZ * 100);
        }
        if (groupedByLocation[locationCode].groupEntrySpreadTZ || groupedByLocation[locationCode].groupEntrySpreadTZ == 0) {
          newObject["Entry Spread (T)"] = Math.round(groupedByLocation[locationCode].groupEntrySpreadTZ * 100);
        }
      } else if (portfolioViewType == "exposure") {
        newObject = {
          "L/S": locationCode,
          Color: "white",
          Location: locationCode,
          "USD Market Value": groupedByLocation[locationCode].groupUSDMarketValue,
          DV01: groupedByLocation[locationCode].groupDV01Sum,
          "MTD Int. (USD)": groupedByLocation[locationCode].groupMTDIntSum,

          "YTD Int. (USD)": groupedByLocation[locationCode].groupYTDIntSum,
          "Day P&L (USD)": groupedByLocation[locationCode].groupDayPl,
          "Day Price Move": groupedByLocation[locationCode].groupDayPriceMoveSum,

          "MTD Price Move": groupedByLocation[locationCode].groupMTDPriceMoveSum,

          "MTD P&L (USD)": groupedByLocation[locationCode].groupMTDPl,
          "Notional Amount": groupedByLocation[locationCode].groupNotional,
        };
        if (groupedByLocation[locationCode].groupSpreadTZ || groupedByLocation[locationCode].groupSpreadTZ == 0) {
          newObject["Current Spread (T)"] = Math.round(groupedByLocation[locationCode].groupSpreadTZ * 100);
        }
        if (groupedByLocation[locationCode].groupEntrySpreadTZ || groupedByLocation[locationCode].groupEntrySpreadTZ == 0) {
          newObject["Entry Spread (T)"] = Math.round(groupedByLocation[locationCode].groupEntrySpreadTZ * 100);
        }

        if (durationBuckets.includes(locationCode)) {
          macro["Global Hedge"]["USD Market Value"] += groupedByLocation[locationCode].groupUSDMarketValue;
          macro["Global Hedge"]["Notional Amount"] += groupedByLocation[locationCode].groupNotional;
          macro["Global Hedge"]["DV01"] += groupedByLocation[locationCode].groupDV01Sum;
          macro["Global Hedge"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["Global Hedge"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["Global Hedge"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["Global Hedge"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
        } else if (locationCode == "Rate Sensitive" || locationCode == "Rate Insensitive") {
          if (!nonHedgeIndex) {
            nonHedgeIndex = portfolio.length + 1;
          }
          macro["Non-Hedge Bonds"]["USD Market Value"] += groupedByLocation[locationCode].groupUSDMarketValue;
          macro["Non-Hedge Bonds"]["Notional Amount"] += groupedByLocation[locationCode].groupNotional;
          macro["Non-Hedge Bonds"]["DV01"] += groupedByLocation[locationCode].groupDV01Sum;
          macro["Non-Hedge Bonds"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["Non-Hedge Bonds"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["Non-Hedge Bonds"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["Non-Hedge Bonds"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
        } else {
          if (!rvIndex) {
            rvIndex = portfolio.length + 2;
          }
          macro["RV"]["USD Market Value"] += groupedByLocation[locationCode].groupUSDMarketValue;
          macro["RV"]["Notional Amount"] += groupedByLocation[locationCode].groupNotional;
          macro["RV"]["DV01"] += groupedByLocation[locationCode].groupDV01Sum;
          macro["RV"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["RV"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["RV"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["RV"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
        }
      } else if (view == "back office") {
        newObject = {
          Type: "Total",
          Color: "white",
          Location: locationCode,
          "Value (BC)": groupedByLocation[locationCode].groupUSDMarketValue,
          DV01: groupedByLocation[locationCode].groupDV01Sum,
          "Day P&L (BC)": groupedByLocation[locationCode].groupDayPl,
          "Day Price Move": groupedByLocation[locationCode].groupDayPriceMoveSum,
          "MTD Int. (BC)": groupedByLocation[locationCode].groupMTDIntSum,

          "YTD Int. (BC)": groupedByLocation[locationCode].groupYTDIntSum,
          "MTD Price Move": groupedByLocation[locationCode].groupMTDPriceMoveSum,

          "MTD P&L (BC)": groupedByLocation[locationCode].groupMTDPl,
          "Notional Amount": groupedByLocation[locationCode].groupNotional,
        };

        if (groupedByLocation[locationCode].groupSpreadTZ || groupedByLocation[locationCode].groupSpreadTZ == 0) {
          newObject["Current Spread (T)"] = Math.round(groupedByLocation[locationCode].groupSpreadTZ * 100);
        }
        if (groupedByLocation[locationCode].groupEntrySpreadTZ || groupedByLocation[locationCode].groupEntrySpreadTZ == 0) {
          newObject["Entry Spread (T)"] = Math.round(groupedByLocation[locationCode].groupEntrySpreadTZ * 100);
        }
      }

      groupedByLocation[locationCode].data.unshift(newObject);
    }

    portfolio.push(...groupedByLocation[locationCode].data);
  }

  if (view == "exposure") {
    portfolio.splice(macroHedgeIndex, 0, macro["Global Hedge"]);
    portfolio.splice(nonHedgeIndex, 0, macro["Non-Hedge Bonds"]);
    portfolio.splice(rvIndex, 0, macro["RV"]);
  }
}

export function groupAndSortByLocationAndTypeDefineTables({ formattedPortfolio, nav, sort, sign, view, currencies, format, sortBy, fundDetails, date }: { formattedPortfolio: PositionGeneralFormat[]; nav: number; sort: any; sign: number; view: "front office" | "exposure" | "back office"; currencies: any; format: "risk" | "summary"; sortBy: "pl" | null | "price move"; fundDetails: any; date: "string" }) {
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
  let issuerNAVPercentage: any = {};

  let countryGMVPercentage: any = {};
  let sectorGMVPercentage: any = {};
  let strategyGMVPercentage: any = {};
  let issuerGMVPercentage: any = {};

  let longShort = { Long: { dv01Sum: 0, intSum: 0 }, Short: { dv01Sum: 0, intSum: 0 }, Total: { dv01Sum: 0, intSum: 0 } };

  let durationSummary = {
    "0 To 2": { durationSum: 0, dv01Sum: 0 },
    "2 To 5": { durationSum: 0, dv01Sum: 0 },
    "5 To 10": { durationSum: 0, dv01Sum: 0 },
    "10 To 30": { durationSum: 0, dv01Sum: 0 },
    "> 30": { durationSum: 0, dv01Sum: 0 },
    Total: { durationSum: 0, dv01Sum: 0 },
  };

  let ustTable: any = {
    "0 To 2": {},
    "0 To 2 Aggregated": new AggregatedData(),
    "2 To 5": {},
    "2 To 5 Aggregated": new AggregatedData(),
    "5 To 10": {},
    "5 To 10 Aggregated": new AggregatedData(),
    "10 To 30": {},
    "10 To 30 Aggregated": new AggregatedData(),
    "> 30": {},
    "> 30 Aggregated": new AggregatedData(),
    Total: new AggregatedData(),
  };

  let ustTableByCoupon: any = {
    Total: new AggregatedData(),
  };

  let igTable: any = {
    Bonds: [],
    "Bonds Aggregated": new AggregatedData(),
    "FINS Perps": [],
    "FINS Perps Aggregated": new AggregatedData(),
    "Corps Perps": [],
    "Corps Perps Aggregated": new AggregatedData(),
    Total: new AggregatedData(),
  };
  let hyTable: any = {
    Bonds: [],
    "Bonds Aggregated": new AggregatedData(),
    "FINS Perps": [],
    "FINS Perps Aggregated": new AggregatedData(),
    "Corps Perps": [],
    "Corps Perps Aggregated": new AggregatedData(),
    Total: new AggregatedData(),
  };
  let currTable: any = {
    Total: new AggregatedData(),
  };
  let issuerTable: any = {
    Total: new AggregatedData(),
  };

  let rvPairTable: any = {
    Total: new AggregatedData(),
  };
  let tickerTable: any = {};
  const groupedByLocation = formattedPortfolio.reduce((group: any, item: any) => {
    const { Location } = item;
    let notional = item["Notional Amount"];
    let strategy = item["Strategy"];
    let type = item["Type"];
    let durationBucket = item["Duration Bucket"];
    let rate = item["Rate Sensitivity"];
    let assetClass = item["Asset Class"];
    let currency = item["Currency"];
    let pinned = item["Pin"];
    // group = group ? group : {};

    let rlzdTimestamp = new Date(item["Last Day Since Realizd"]).getTime();
    if (notional != 0 && type == "UST" && strategy == "Global Hedge" && view == "exposure") {
      group[durationBucket] = group[durationBucket] ? group[durationBucket] : { data: [] };
      group[durationBucket].data.push(item);
      return group;
    } else if (notional > 0 && type == "BND" && (assetClass == "IG" || assetClass == "HY") && view == "exposure" && currency == "USD" && strategy != "RV") {
      group[rate] = group[rate] ? group[rate] : { data: [] };
      group[rate].data.push(item);
      return group;
    } else if (view == "exposure" && strategy == "RV" && notional != 0) {
      group[Location] = group[Location] ? group[Location] : { data: [] };
      group[Location].data.push(item);
      return group;
    } else if (notional != 0 && view != "exposure") {
      group[Location] = group[Location] ? group[Location] : { data: [] };
      group[Location].data.push(item);
      return group;
    } else if (notional == 0 && view != "exposure") {
      group[Location + " Rlzd"] = group[Location + " Rlzd"] ? group[Location + " Rlzd"] : { data: [], "Last Day Since Realizd": 0 };
      if (rlzdTimestamp > group[Location + " Rlzd"]["Last Day Since Realizd"]) {
        group[Location + " Rlzd"]["Last Day Since Realizd"] = rlzdTimestamp;
      }
      group[Location + " Rlzd"].data.push(item);
      return group;
    } else {
      return group;
    }
  }, {});

  assignColorAndSortParamsBasedOnAssetClass({
    groupedByLocation: groupedByLocation,
    longShort: longShort,
    durationSummary: durationSummary,
    countryNAVPercentage: countryNAVPercentage,
    sectorNAVPercentage: sectorNAVPercentage,
    strategyNAVPercentage: strategyNAVPercentage,
    issuerNAVPercentage: issuerNAVPercentage,

    countryGMVPercentage: countryGMVPercentage,
    sectorGMVPercentage: sectorGMVPercentage,
    strategyGMVPercentage: strategyGMVPercentage,
    issuerGMVPercentage: issuerGMVPercentage,

    view: view,
    ustTable: ustTable,
    igTable: igTable,
    hyTable: hyTable,
    currTable: currTable,
    issuerTable: issuerTable,
    ustTableByCoupon: ustTableByCoupon,
    rvPairTable: rvPairTable,
    tickerTable: tickerTable,
    date: date,
  });

  let portfolio: any = [];

  assignBorderAndCustomSortAggregateGroup({ portfolio: portfolio, groupedByLocation: groupedByLocation, sort: sort, sign: sign, view: view });

  let topWorstPerformaners = getTopWorst(groupedByLocation, sortBy);

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
  getCountrySectorStrategySum(countryNAVPercentage, sectorNAVPercentage, strategyNAVPercentage, issuerNAVPercentage, fundDetails.nav);

  getCountrySectorStrategySum(countryGMVPercentage, sectorGMVPercentage, strategyGMVPercentage, issuerGMVPercentage, fundDetails.nav);
  let capacity = adjustMarginMultiplier(portfolio, sectorGMVPercentage, issuerNAVPercentage);

  durationSummary["Total"].dv01Sum = Math.round(durationSummary["0 To 2"].dv01Sum + durationSummary["2 To 5"].dv01Sum + durationSummary["5 To 10"].dv01Sum + durationSummary["10 To 30"].dv01Sum + durationSummary["> 30"].dv01Sum);
  longShort["Total"].dv01Sum = Math.round(longShort["Long"].dv01Sum + longShort["Short"].dv01Sum);
  longShort["Total"].intSum = Math.round(longShort["Long"].intSum + longShort["Short"].intSum);

  return {
    portfolio: capacity.portfolio,
    duration: durationSummary,
    countryNAVPercentage: sortObjectBasedOnKey(countryNAVPercentage),
    sectorNAVPercentage: sortObjectBasedOnKey(sectorNAVPercentage),
    strategyNAVPercentage: sortObjectBasedOnKey(strategyNAVPercentage),
    issuerNAVPercentage: sortObjectBasedOnKey(issuerNAVPercentage),
    capacity: capacity.capacity,
    countryGMVPercentage: sortObjectBasedOnKey(countryGMVPercentage),
    sectorGMVPercentage: sortObjectBasedOnKey(sectorGMVPercentage),
    strategyGMVPercentage: sortObjectBasedOnKey(strategyGMVPercentage),
    issuerGMVPercentage: sortObjectBasedOnKey(issuerGMVPercentage),
    riskAssessment: riskAssessment,
    topWorstPerformaners: topWorstPerformaners,
    longShort: longShort,
    ustTable: ustTable,
    igTable: igTable,
    hyTable: hyTable,
    currTable: currTable,
    currencies: currencies,
    issuerTable: issuerTable,
    ustTableByCoupon: ustTableByCoupon,
    rvPairTable: rvPairTable,
    tickerTable: tickerTable,
  };
}

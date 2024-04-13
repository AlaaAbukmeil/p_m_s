import { FundMTD, PositionBeforeFormatting, PositionGeneralFormat, RlzdTrades } from "../../../models/portfolio";
import { formatDateUS, formatDateWorld, parsePercentage } from "../../common";
import { calculateAccruedSinceInception } from "../../reports/portfolios";
import { parseBondIdentifier } from "../../reports/tools";
import { getCountrySectorStrategySum } from "./statistics";
import { bbgRating, isRatingHigherThanBBBMinus, sortObjectBasedOnKey, toTitleCase, oasWithChange, checkPosition, formatMarkDate, yearsUntil, getDuration, getSectorAssetClass, moodyRating, AggregatedData, assignAssetClass } from "../tools";
import { getTopWorst } from "./frontOffice";
import { adjustMarginMultiplier, nomuraRuleMargin } from "../cash/rules";
export let assetClassOrder: any = {
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

export function formatGeneralTable(object: { portfolio: any; date: any; fund: any; dates: any; conditions: any; fundDetailsYTD: any }): { portfolio: PositionGeneralFormat[]; fundDetails: FundMTD; currencies: any } {
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
    smv = 0;
  for (let index = 0; index < object.portfolio.length; index++) {
    let position: any = object.portfolio[index];

    let originalFace = position["Original Face"] || 1;
    let usdRatio = parseFloat(position["FX Rate"] || position["holdPortfXrate"]) || 1;
    let holdBackRatio = (position["Asset Class"] || position["Rating Class"]) == "Illiquid" ? parseFloat(object.fund.holdBackRatio) : 1;

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

    position["Day P&L FX"] = ((position["FX Rate"] - position["Previous FX"]) / position["FX Rate"]) * position["Value (BC)"];
    position["MTD P&L FX"] = ((position["FX Rate"] - position["MTD FX"]) / position["FX Rate"]) * position["Value (BC)"];
    position["YTD P&L FX"] = ((position["FX Rate"] - position["YTD FX"]) / position["FX Rate"]) * position["Value (BC)"];

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
    position["MTD Rlzd (BC)"] = Math.round(position["MTD Rlzd"] * usdRatio * holdBackRatio);
    position["MTD URlzd (BC)"] = Math.round(position["MTD URlzd"] * usdRatio * holdBackRatio);

    position["MTD P&L (BC)"] = Math.round(position["MTD P&L"] * usdRatio * holdBackRatio + position["MTD P&L FX"]);

    position["YTD Int. (LC)"] = Math.round(position["YTD Int."] * holdBackRatio);
    position["YTD Rlzd (LC)"] = Math.round(position["YTD Rlzd"] * holdBackRatio);
    position["YTD URlzd (LC)"] = Math.round(position["YTD URlzd"] * holdBackRatio);
    position["YTD P&L (LC)"] = Math.round(position["YTD P&L"] * holdBackRatio);

    position["YTD Int. (BC)"] = Math.round(position["YTD Int."] * usdRatio * holdBackRatio);
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
    position["Duration"] = yearsUntil(position["Call Date"] && position["Call Date"] != "0" ? position["Call Date"] : position["Maturity"], object.date, position["BB Ticker"]);

    position["Issuer"] = position["Issuer"] == "0" ? "" : position["Issuer"];

    position["DV01"] = (position["DV01"] / 1000000) * position["Notional Amount"] * usdRatio;
    position["DV01"] = Math.round(position["DV01"] * 100) / 100 || 0;
    position["Base Margin"] = nomuraRuleMargin(position);
    position["OAS"] = (position["OAS"] / 1000000) * position["Notional Amount"] * usdRatio;
    position["OAS"] = Math.round(position["OAS"] * 100) / 100 || 0;

    position["OAS W Change"] = oasWithChange(position["OAS"])[0];
    position["Spread Change"] = oasWithChange(position["OAS"])[1];
    position["DV01 Dollar Value Impact"] = Math.round(position["OAS W Change"] * position["DV01"]);
    position["DV01 Dollar Value Impact % of Nav"] = Math.round(((position["DV01 Dollar Value Impact"] * position["OAS W Change"]) / object.fund.nav) * 10000) / 100 + " %";
    position["DV01 Dollar Value Impact Limit % of Nav"] = position["Value (BC)"] / object.fund.nav > 10 ? 2 + " %" : 1.5 + " %";
    position["DV01 Dollar Value Impact Utilization % of Nav"] = Math.round((parsePercentage(position["DV01 Dollar Value Impact % of Nav"]) / parsePercentage(position["DV01 Dollar Value Impact Limit % of Nav"])) * 10000) / 100 + " %";
    position["DV01 Dollar Value Impact Test"] = Math.abs(parsePercentage(position["DV01 Dollar Value Impact Utilization % of Nav"])) < 100 ? "Pass" : "Fail";
    position["DV01 Dollar Value Impact Color Test"] = position["DV01 Dollar Value Impact Test"] == "Pass" ? "#C5E1A5" : "#FFAB91";

    position["Value (BC) % of Nav"] = Math.round((position["Value (BC)"] / object.fund.nav) * 10000) / 100 + " %";

    position["Value (BC) Limit % of Nav"] = Math.abs(parsePercentage(position["Value (BC) % of Nav"])) > 10 ? 15 + " %" : 10 + " %";
    position["Value (BC) Utilization % of Nav"] = Math.round((parsePercentage(position["Value (BC) % of Nav"]) / parsePercentage(position["Value (BC) Limit % of Nav"])) * 10000) / 100 + " %";

    position["Value (BC) Test"] = Math.abs(parsePercentage(position["Value (BC) Utilization % of Nav"])) < 100 ? "Pass" : "Fail";
    position["Value (BC) Color Test"] = position["Value (BC) Test"] == "Pass" ? "#C5E1A5" : "#FFAB91";

    position["Capital Gain/ Loss since Inception (Live Position)"] = position["Value (BC)"] - position["Cost (BC)"];
    let shortLongType = position["Value (BC)"] > 0 ? 1 : -1;
    position["% of Capital Gain/ Loss since Inception (Live Position)"] = Math.round((position["Value (BC)"] / position["Cost (BC)"] - 1) * shortLongType * 10000) / 100 + " %";
    position["Accrued Int. Since Inception (BC)"] = calculateAccruedSinceInception(position["Interest"], position["Coupon Rate"] / 100, position["Coupon Duration"], position["ISIN"], object.date) * usdRatio;

    position["Total Gain/ Loss (USD)"] = Math.round(position["Capital Gain/ Loss since Inception (Live Position)"] + position["Accrued Int. Since Inception (BC)"]);
    position["% of Total Gain/ Loss since Inception (Live Position)"] = Math.round(((position["Total Gain/ Loss (USD)"] + position["Cost (BC)"]) / position["Cost (BC)"] - 1) * shortLongType * 10000) / 100 + " %";

    position["Z Spread"] = (position["Z Spread"] / 1000000) * position["Notional Amount"] * usdRatio;
    position["Z Spread"] = Math.round(position["Z Spread"] * 1000000) / 1000000 || 0;
    position["Entry Yield"] = position["Entry Yield"] ? Math.round(position["Entry Yield"] * 100) / 100 + " %" : "0 %";
    position["Coupon Rate"] = position["Coupon Rate"] + " %";
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

    if (object.conditions) {
      if (checkPosition(position, object.conditions)) {
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
      } else {
        delete object.portfolio[index];
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
    }
  }

  let dayGross = Math.round((daypl / parseFloat(object.fund.nav)) * 100000) / 1000;
  let dayFXGross = Math.round((dayfx / parseFloat(object.fund.nav)) * 100000) / 1000;

  let mtdFXGross = Math.round((mtdfx / parseFloat(object.fund.nav)) * 100000) / 1000;
  let monthGross = Math.round((mtdpl / parseFloat(object.fund.nav)) * 100000) / 1000;
  let ytdFXGross = Math.round((ytdfx / parseFloat(object.fundDetailsYTD.nav)) * 100000) / 1000;
  let yearGross = Math.round((ytdpl / parseFloat(object.fundDetailsYTD.nav)) * 100000) / 1000;
  let fundDetails = {
    nav: parseFloat(object.fund.nav),
    holdbackRatio: parseFloat(object.fund.holdBackRatio),
    mtdGross: monthGross,
    mtdpl: Math.round(mtdpl * 1000) / 1000,
    mtdrlzd: Math.round(mtdrlzd * 1000) / 1000,
    mtdurlzd: Math.round(mtdurlzd * 1000) / 1000,
    mtdint: Math.round(mtdint * 1000) / 1000,
    mtdfx: Math.round(mtdfx * 1000) / 1000,
    mtdintPercentage: Math.round((mtdint / parseFloat(object.fund.nav)) * 100000) / 1000,
    mtdFXGross: mtdFXGross,

    ytdGross: yearGross,
    ytdpl: Math.round(ytdpl * 1000) / 1000,
    ytdrlzd: Math.round(ytdrlzd * 1000) / 1000,
    ytdurlzd: Math.round(ytdurlzd * 1000) / 1000,
    ytdint: Math.round(ytdint * 1000) / 1000,
    ytdfx: Math.round(ytdfx * 1000) / 1000,
    ytdintPercentage: Math.round((ytdint / parseFloat(object.fundDetailsYTD.nav)) * 100000) / 1000,
    ytdFXGross: ytdFXGross,

    dayGross: dayGross,
    dayFXGross: dayFXGross,
    dayint: Math.round(dayint * 1000) / 1000,
    dayintPercentage: Math.round((dayint / parseFloat(object.fund.nav)) * 100000) / 1000,
    daypl: Math.round(daypl * 1000) / 1000,
    dayfx: Math.round(dayfx * 1000) / 1000,
    dayurlzd: Math.round(dayurlzd * 1000) / 1000,
    dayrlzd: Math.round(dayrlzd * 1000) / 1000,
    dv01Sum: Math.round(dv01Sum * 1000) / 1000,
    lmv: Math.round(lmv * 1000) / 1000,
    smv: Math.round(smv * 1000) / 1000,
    gmv: Math.round((lmv - smv) * 1000) / 1000,
    nmv: Math.round(nmv * 1000) / 1000,
    lmvOfNav: Math.round(lmv * 10000) / (100 * object.fund.nav),
    smvOfNav: Math.round(smv * 10000) / (100 * object.fund.nav),
    gmvOfNav: Math.round((lmv - smv) * 10000) / (100 * object.fund.nav),
    nmvOfNav: Math.round(nmv * 10000) / (100 * object.fund.nav),
  };

  return { portfolio: object.portfolio, fundDetails: fundDetails, currencies: currencies };
}

function sumTable(object: { table: any; data: any; view: "front office" | "back office" | "exposure"; param: any; subtotal: boolean; subtotalParam: string }) {
  try {
    let dv01DollarValueImpact = parseFloat(object.data["DV01 Dollar Value Impact"]);

    let dv01DollarValueOfNav = parsePercentage(object.data["DV01 Dollar Value Impact % of Nav"]);
    let dv01DollarValueLimitOfNav = parsePercentage(object.data["DV01 Dollar Value Impact Limit % of Nav"]);
    let dv01DollarValueLimitUtilization = parsePercentage(object.data["DV01 Dollar Value Impact Utilization % of Nav"]);

    let dv01DollarValueImpactTest = object.data["DV01 Dollar Value Impact Test"];
    let valueUSDOfNav = parsePercentage(object.data["Value (BC) % of Nav"]);
    //gmv only for front office
    let valueUSDOfGmv = 0;
    if (object.view == "front office" || object.view == "exposure") {
      valueUSDOfGmv = parsePercentage(object.data["Value (BC) % of GMV"]) || 0;
    }
    let valueUSDLimitOfNav = parsePercentage(object.data["Value (BC) Limit % of Nav"]);

    let valueUSDUtilizationOfNav = parsePercentage(object.data["Value (BC) Utilization % of Nav"]);
    let valueUSDOfNavTest = object.data["Value (BC) Test"];
    let capitalGains = parseFloat(object.data["Capital Gain/ Loss since Inception (Live Position)"]);
    let capitalGainsPercentage = parsePercentage(object.data["% of Capital Gain/ Loss since Inception (Live Position)"]);

    let accruedInterestSinceInception = parseFloat(object.data["Accrued Int. Since Inception (BC)"]);
    let totalCaptialGains = parseFloat(object.data["Total Gain/ Loss (USD)"]);
    let totalCaptialGainsPercentage = parsePercentage(object.data["% of Total Gain/ Loss since Inception (Live Position)"]);

    object.param = object.param ? object.param : getSectorAssetClass(object.data["BB Ticker"], object.data["Sector"]);

    let dayPl;
    let monthPl;
    let usdMarketValue;
    let duration = parseFloat(object.data["Duration"]);
    let oasSum = parseFloat(object.data["OAS"]);
    let zSpreadSum = parseFloat(object.data["Z Spread"]);
    let oasWChangeSum = parseFloat(object.data["OAS W Change"]);
    let dv01 = parseFloat(object.data["DV01"]) || 0;
    let notional = parseFloat(object.data["Notional Amount"]);
    let delta = parsePercentage(object.data["Delta"]);
    let gamma = parsePercentage(object.data["Gamma"]);
    let mtdDelta = parsePercentage(object.data["MTD Delta"]);
    let strategy = object.data["Strategy"];
    let location = object.data["Location"];

    if (object.view == "front office" || object.view == "exposure") {
      usdMarketValue = parseFloat(object.data["USD Market Value"]) || 0;
      dayPl = parseFloat(object.data["Day P&L (USD)"]);
      monthPl = parseFloat(object.data["MTD P&L (USD)"]);
    } else {
      usdMarketValue = parseFloat(object.data["Value (BC)"]) || 0;
      dayPl = parseFloat(object.data["Day P&L (BC)"]);
      monthPl = parseFloat(object.data["MTD P&L (BC)"]);
    }
    object.table[object.param + " Aggregated"] = object.table[object.param + " Aggregated"] ? object.table[object.param + " Aggregated"] : new AggregatedData();
    object.table[object.param + " Aggregated"].Location = location;
    object.table[object.param + " Aggregated"]["DV01"] += dv01;
    object.table[object.param + " Aggregated"]["MTD P&L (USD)"] += monthPl;
    object.table[object.param + " Aggregated"]["USD Market Value"] += usdMarketValue;
    object.table[object.param + " Aggregated"]["Day P&L (USD)"] += dayPl;
    object.table[object.param + " Aggregated"]["OAS"] += oasSum;
    object.table[object.param + " Aggregated"]["Z Spread"] += zSpreadSum;
    object.table[object.param + " Aggregated"]["OAS W Change"] += oasWChangeSum;

    object.table[object.param + " Aggregated"]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
    object.table[object.param + " Aggregated"]["DV01 Dollar Value Impact % of Nav"] += dv01DollarValueOfNav;
    object.table[object.param + " Aggregated"]["DV01 Dollar Value Impact Limit % of Nav"] += dv01DollarValueLimitOfNav;
    object.table[object.param + " Aggregated"]["DV01 Dollar Value Impact Utilization % of Nav"] += dv01DollarValueLimitUtilization;

    if (dv01DollarValueImpactTest == "Fail") {
      object.table[object.param + " Aggregated"]["DV01 Dollar Value Impact Test"] = "Fail";
      object.table[object.param + " Aggregated"]["DV01 Dollar Value Impact Color Test"] = "#FFAB91"; // : "#FFAB91";
    }

    object.table[object.param + " Aggregated"]["Value (BC) % of Nav"] += Math.round(valueUSDOfNav * 100) / 100;
    object.table[object.param + " Aggregated"]["Value (BC) % of GMV"] += Math.round(valueUSDOfGmv * 100) / 100;
    object.table[object.param + " Aggregated"]["Value (BC) Limit % of Nav"] += valueUSDLimitOfNav;

    object.table[object.param + " Aggregated"]["Value (BC) Utilization % of Nav"] += valueUSDUtilizationOfNav;
    if (valueUSDOfNavTest == "Fail") {
      object.table[object.param + " Aggregated"]["Value (BC) Test"] = "Fail";
      object.table[object.param + " Aggregated"]["Value (BC) Color Test"] = "#FFAB91";
    }
    object.table[object.param + " Aggregated"]["Capital Gain/ Loss since Inception (Live Position)"] += capitalGains;
    object.table[object.param + " Aggregated"]["% of Capital Gain/ Loss since Inception (Live Position)"] += capitalGainsPercentage;

    object.table[object.param + " Aggregated"]["Accrued Int. Since Inception (BC)"] += accruedInterestSinceInception;
    object.table[object.param + " Aggregated"]["Total Gain/ Loss (USD)"] += totalCaptialGains;
    object.table[object.param + " Aggregated"]["% of Total Gain/ Loss since Inception (Live Position)"] += totalCaptialGainsPercentage;
    object.table[object.param + " Aggregated"]["Notional Amount"] += notional;
    object.table[object.param + " Aggregated"]["Delta"] += delta;
    object.table[object.param + " Aggregated"]["Gamma"] += gamma;
    object.table[object.param + " Aggregated"]["MTD Delta"] += mtdDelta;

    object.table["Total"] = object.table["Total"] ? object.table["Total"] : new AggregatedData();
    object.table["Total"]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
    object.table["Total"]["DV01 Dollar Value Impact % of Nav"] += dv01DollarValueOfNav;
    object.table["Total"]["DV01 Dollar Value Impact Limit % of Nav"] += dv01DollarValueLimitOfNav;
    object.table["Total"]["DV01 Dollar Value Impact Utilization % of Nav"] += dv01DollarValueLimitUtilization;

    if (dv01DollarValueImpactTest == "Fail") {
      object.table["Total"]["DV01 Dollar Value Impact Test"] = "Fail";
      object.table["Total"]["DV01 Dollar Value Impact Color Test"] = "#FFAB91"; // : "#FFAB91";
    }

    object.table["Total"]["Value (BC) % of Nav"] += valueUSDOfNav;
    object.table["Total"]["Value (BC) % of GMV"] += valueUSDOfGmv;
    object.table["Total"]["Value (BC) Limit % of Nav"] += valueUSDLimitOfNav;

    object.table["Total"]["Value (BC) Utilization % of Nav"] += valueUSDUtilizationOfNav;
    if (valueUSDOfNavTest == "Fail") {
      object.table["Total"]["Value (BC) Test"] = "Fail";
      object.table["Total"]["Value (BC) Color Test"] = "#FFAB91";
    }
    object.table["Total"]["Capital Gain/ Loss since Inception (Live Position)"] += capitalGains;
    object.table["Total"]["% of Capital Gain/ Loss since Inception (Live Position)"] += capitalGainsPercentage;

    object.table["Total"]["Accrued Int. Since Inception (BC)"] += accruedInterestSinceInception;
    object.table["Total"]["Total Gain/ Loss (USD)"] += totalCaptialGains;
    object.table["Total"]["% of Total Gain/ Loss since Inception (Live Position)"] += totalCaptialGainsPercentage;
    object.table["Total"]["Notional Amount"] += notional;

    object.table["Total"]["DV01"] += dv01;
    object.table["Total"]["MTD P&L (USD)"] += monthPl;
    object.table["Total"]["Day P&L (USD)"] += dayPl;
    object.table["Total"]["USD Market Value"] += usdMarketValue;
    object.table["Total"]["OAS"] += oasSum;
    object.table["Total"]["Z Spread"] += zSpreadSum;
    object.table["Total"]["OAS"] += oasWChangeSum;
    object.table["Total"]["Delta"] += delta;
    object.table["Total"]["Gamma"] += gamma;
    object.table["Total"]["MTD Delta"] += mtdDelta;

    if (object.subtotal) {
      object.table[object.subtotalParam] = object.table[object.subtotalParam] ? object.table[object.subtotalParam] : new AggregatedData();

      object.table[object.subtotalParam][strategy] = object.table[object.subtotalParam][strategy] ? object.table[object.subtotalParam][strategy] : new AggregatedData();
      object.table[object.subtotalParam]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;

      object.table[object.subtotalParam]["DV01 Dollar Value Impact % of Nav"] += Math.round(dv01DollarValueOfNav * 100) / 100 || 0;
      object.table[object.subtotalParam]["DV01 Dollar Value Impact Limit % of Nav"] += dv01DollarValueLimitOfNav;
      object.table[object.subtotalParam]["DV01 Dollar Value Impact Utilization % of Nav"] += dv01DollarValueLimitUtilization;

      object.table[object.subtotalParam]["Value (BC) % of Nav"] += Math.round(valueUSDOfNav * 100) / 100 || 0;
      object.table[object.subtotalParam]["Value (BC) % of GMV"] += Math.round(valueUSDOfGmv * 100) / 100 || 0;
      object.table[object.subtotalParam]["Value (BC) Limit % of Nav"] += valueUSDLimitOfNav;

      object.table[object.subtotalParam]["Value (BC) Utilization % of Nav"] += valueUSDUtilizationOfNav;

      object.table[object.subtotalParam]["Capital Gain/ Loss since Inception (Live Position)"] += capitalGains;
      object.table[object.subtotalParam]["% of Capital Gain/ Loss since Inception (Live Position)"] += Math.round(capitalGainsPercentage * 100) / 100 || 0;

      object.table[object.subtotalParam]["Accrued Int. Since Inception (BC)"] += accruedInterestSinceInception;
      object.table[object.subtotalParam]["Total Gain/ Loss (USD)"] += totalCaptialGains;
      object.table[object.subtotalParam]["% of Total Gain/ Loss since Inception (Live Position)"] += Math.round(totalCaptialGainsPercentage * 100) / 100 || 0;
      object.table[object.subtotalParam]["Notional Amount"] += notional;
      object.table[object.subtotalParam]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
      object.table[object.subtotalParam]["USD Market Value"] += usdMarketValue;
      object.table[object.subtotalParam]["Duration"] = duration;

      object.table[object.subtotalParam]["DV01"] += dv01;
      object.table[object.subtotalParam]["MTD P&L (USD)"] += monthPl;
      object.table[object.subtotalParam]["Day P&L (USD)"] += dayPl;
      object.table[object.subtotalParam]["USD Market Value"] += usdMarketValue;
      object.table[object.subtotalParam]["OAS"] += oasSum;
      object.table[object.subtotalParam]["Z Spread"] += zSpreadSum;
      object.table[object.subtotalParam]["OAS W Change"] += oasWChangeSum;
      object.table[object.subtotalParam]["L/S"] = object.subtotalParam;

      ///
      object.table[object.subtotalParam][strategy]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
      object.table[object.subtotalParam][strategy]["DV01 Dollar Value Impact % of Nav"] += dv01DollarValueOfNav;
      object.table[object.subtotalParam][strategy]["DV01 Dollar Value Impact Limit % of Nav"] += dv01DollarValueLimitOfNav;
      object.table[object.subtotalParam][strategy]["DV01 Dollar Value Impact Utilization % of Nav"] += dv01DollarValueLimitUtilization;

      object.table[object.subtotalParam][strategy]["Value (BC) % of Nav"] += Math.round(valueUSDOfNav * 100) / 100 || 0;
      object.table[object.subtotalParam][strategy]["Value (BC) % of GMV"] += Math.round(valueUSDOfGmv * 100) / 100 || 0;
      object.table[object.subtotalParam][strategy]["Value (BC) Limit % of Nav"] += valueUSDLimitOfNav;

      object.table[object.subtotalParam][strategy]["Value (BC) Utilization % of Nav"] += valueUSDUtilizationOfNav;

      object.table[object.subtotalParam][strategy]["Capital Gain/ Loss since Inception (Live Position)"] += capitalGains;
      object.table[object.subtotalParam][strategy]["% of Capital Gain/ Loss since Inception (Live Position)"] += Math.round(capitalGainsPercentage * 100) / 100 || 0;

      object.table[object.subtotalParam][strategy]["Accrued Int. Since Inception (BC)"] += accruedInterestSinceInception;
      object.table[object.subtotalParam][strategy]["Total Gain/ Loss (USD)"] += totalCaptialGains;
      object.table[object.subtotalParam][strategy]["% of Total Gain/ Loss since Inception (Live Position)"] += Math.round(totalCaptialGainsPercentage * 100) / 100 || 0;
      object.table[object.subtotalParam][strategy]["Notional Amount"] += notional;
      object.table[object.subtotalParam][strategy]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
      object.table[object.subtotalParam][strategy]["USD Market Value"] += usdMarketValue;
      object.table[object.subtotalParam][strategy]["Duration"] = duration;

      object.table[object.subtotalParam][strategy]["DV01"] += dv01;
      object.table[object.subtotalParam][strategy]["MTD P&L (USD)"] += monthPl;
      object.table[object.subtotalParam][strategy]["Day P&L (USD)"] += dayPl;
      object.table[object.subtotalParam][strategy]["USD Market Value"] += usdMarketValue;
      object.table[object.subtotalParam][strategy]["OAS"] += oasSum;
      object.table[object.subtotalParam][strategy]["Z Spread"] += zSpreadSum;
      object.table[object.subtotalParam][strategy]["OAS W Change"] += oasWChangeSum;
      object.table[object.subtotalParam][strategy]["L/S"] = strategy;

      object.table[object.param] = object.table[object.param] ? object.table[object.param] : {};
      object.table[object.param][object.subtotalParam] = object.table[object.param][object.subtotalParam] ? object.table[object.param][object.subtotalParam] : {};
      object.table[object.param][object.subtotalParam][strategy] = object.table[object.param][object.subtotalParam][strategy] ? object.table[object.param][object.subtotalParam][strategy] : [];
      object.table[object.param][object.subtotalParam][strategy].push(object.data);
    } else {
      object.table[object.param] = object.table[object.param] ? object.table[object.param] : [];
      object.table[object.param].push(object.data);
    }
  } catch (error) {
    console.log(error);
  }
}

export function assignColorAndSortParamsBasedOnAssetClass(object: {
  pairHedgeNotional: any;
  pairIGNotional: any;
  pairHedgeDV01Sum: any;
  pairIGDV01Sum: any;
  globalHedgeNotional: any;
  singleIGNotional: any;
  globalHedgeDV01Sum: any;
  singleIGDV01Sum: any;
  hedgeCurrencyNotional: any;
  HYNotional: any;
  HYDV01Sum: any;
  cdsNotional: any;
  countryNAVPercentage: any;
  sectorNAVPercentage: any;
  strategyNAVPercentage: any;
  longShortDV01Sum: any;
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
}) {
  for (let locationCode in object.groupedByLocation) {
    object.groupedByLocation[locationCode].order = assignAssetClass(locationCode, object.groupedByLocation[locationCode].data);
    if (object.groupedByLocation[locationCode].order == assetClassOrder.UST_HEDGE) {
      object.groupedByLocation[locationCode].color = "#FEEBED";

      for (let index = 0; index < object.groupedByLocation[locationCode].data.length; index++) {
        let duration: any = getDuration(object.groupedByLocation[locationCode].data[index]["Duration"]);
        let couponRate: any = object.groupedByLocation[locationCode].data[index]["Coupon Rate"];
        let notional = object.groupedByLocation[locationCode].data[index]["Notional Amount"];
        let issue: any = object.groupedByLocation[locationCode].data[index]["BB Ticker"];

        sumTable({ table: object.rvPairTable, data: object.groupedByLocation[locationCode].data[index], view: object.view, param: locationCode, subtotal: false, subtotalParam: "" });
        if (notional < 0) {
          sumTable({ table: object.ustTableByCoupon, data: object.groupedByLocation[locationCode].data[index], view: object.view, param: couponRate, subtotal: false, subtotalParam: "" });
          sumTable({ table: object.ustTable, data: object.groupedByLocation[locationCode].data[index], view: object.view, param: duration, subtotal: true, subtotalParam: issue });
        }
        object.groupedByLocation[locationCode].data[index]["Strategy"] = "RV";
      }
    } else if (object.groupedByLocation[locationCode].order == assetClassOrder.IG) {
      object.groupedByLocation[locationCode].color = "#E1BEE7";

      for (let index = 0; index < object.groupedByLocation[locationCode].data.length; index++) {
        object.singleIGNotional += object.groupedByLocation[locationCode].data[index]["Notional Amount"] || 0;
        object.singleIGDV01Sum += object.groupedByLocation[locationCode].data[index]["DV01"] || 0;

        sumTable({ table: object.igTable, data: object.groupedByLocation[locationCode].data[index], view: object.view, param: null, subtotal: false, subtotalParam: "" });
      }
    } else if (object.groupedByLocation[locationCode].order == assetClassOrder.HY) {
      object.groupedByLocation[locationCode].color = "#C5CAE9";
      for (let index = 0; index < object.groupedByLocation[locationCode].data.length; index++) {
        object.HYNotional += object.groupedByLocation[locationCode].data[index]["Notional Amount"] || 0;
        object.HYDV01Sum += object.groupedByLocation[locationCode].data[index]["DV01"] || 0;

        sumTable({ table: object.hyTable, data: object.groupedByLocation[locationCode].data[index], view: object.view, param: null, subtotal: false, subtotalParam: "" });
      }
    } else if (object.groupedByLocation[locationCode].order == assetClassOrder.CURR_HEDGE) {
      object.groupedByLocation[locationCode].color = "#FFF9C4";
      for (let index = 0; index < object.groupedByLocation[locationCode].data.length; index++) {
        object.hedgeCurrencyNotional += object.groupedByLocation[locationCode].data[index]["Notional Amount"] || 0;
        let currency = object.groupedByLocation[locationCode].data[index]["ISIN"].includes("IB") ? object.groupedByLocation[locationCode].data[index]["Security Description"] : object.groupedByLocation[locationCode].data[index]["Currency"];
        if (!currency) {
          currency = "Bonds";
        }

        sumTable({ table: object.currTable, data: object.groupedByLocation[locationCode].data[index], view: object.view, param: currency, subtotal: false, subtotalParam: "" });
      }
    } else if (object.groupedByLocation[locationCode].order == assetClassOrder.NON_USD) {
      object.groupedByLocation[locationCode].color = "#FFF9C4";
      for (let index = 0; index < object.groupedByLocation[locationCode].data.length; index++) {
        object.hedgeCurrencyNotional += object.groupedByLocation[locationCode].data[index]["Notional Amount"] || 0;
        let currency = object.groupedByLocation[locationCode].data[index]["ISIN"].includes("IB") ? object.groupedByLocation[locationCode].data[index]["Security Description"] : object.groupedByLocation[locationCode].data[index]["Currency"];
        if (!currency) {
          currency = "Bonds";
        }

        sumTable({ table: object.currTable, data: object.groupedByLocation[locationCode].data[index], view: object.view, param: currency, subtotal: false, subtotalParam: "" });
      }
    } else if (object.groupedByLocation[locationCode].order == assetClassOrder.FUT) {
      object.groupedByLocation[locationCode].color = "#FFF9C4";
      for (let index = 0; index < object.groupedByLocation[locationCode].data.length; index++) {
        object.hedgeCurrencyNotional += object.groupedByLocation[locationCode].data[index]["Notional Amount"] || 0;
        let currency = object.groupedByLocation[locationCode].data[index]["ISIN"].includes("IB") ? object.groupedByLocation[locationCode].data[index]["Security Description"] : object.groupedByLocation[locationCode].data[index]["Currency"];
        if (!currency) {
          currency = "Bonds";
        }

        sumTable({ table: object.currTable, data: object.groupedByLocation[locationCode].data[index], view: object.view, param: currency, subtotal: false, subtotalParam: "" });
      }
    } else if (object.groupedByLocation[locationCode].order == assetClassOrder.CDS) {
      object.groupedByLocation[locationCode].color = "#CE93D8";
      for (let index = 0; index < object.groupedByLocation[locationCode].data.length; index++) {
        object.cdsNotional += object.groupedByLocation[locationCode].data[index]["Notional Amount"] || 0;
      }
    } else if (object.groupedByLocation[locationCode].order == assetClassOrder.UST_GLOBAL) {
      object.groupedByLocation[locationCode].color = "#E8F5E9";
      for (let index = 0; index < object.groupedByLocation[locationCode].data.length; index++) {
        let duration: any = getDuration(object.groupedByLocation[locationCode].data[index]["Duration"]);
        let couponRate: any = object.groupedByLocation[locationCode].data[index]["Coupon Rate"];
        let notional = object.groupedByLocation[locationCode].data[index]["Notional Amount"];
        let issue: any = object.groupedByLocation[locationCode].data[index]["BB Ticker"];
        //  console.log(issue, couponRate, "table")
        if (notional < 0) {
          sumTable({ table: object.ustTableByCoupon, data: object.groupedByLocation[locationCode].data[index], view: object.view, param: couponRate, subtotal: false, subtotalParam: "" });
          sumTable({ table: object.ustTable, data: object.groupedByLocation[locationCode].data[index], view: object.view, param: duration, subtotal: true, subtotalParam: issue });
        }
      }
    } else if (object.groupedByLocation[locationCode].order == assetClassOrder.Illiquid) {
      object.groupedByLocation[locationCode].color = "#9FA8DA";
      for (let index = 0; index < object.groupedByLocation[locationCode].data.length; index++) {}
    } else if (object.groupedByLocation[locationCode].order == assetClassOrder.undefined) {
      object.groupedByLocation[locationCode].color = "#E5D1B4";
      for (let index = 0; index < object.groupedByLocation[locationCode].data.length; index++) {}
    } else if (object.groupedByLocation[locationCode].order == assetClassOrder.RLZD) {
      object.groupedByLocation[locationCode].color = "#C5E1A5";
    }

    let groupDayPl = 0,
      groupMTDPl = 0,
      groupDV01Sum = 0,
      groupUSDMarketValue = 0,
      groupDuration = 0,
      groupRating = -99,
      groupOAS = 0,
      groupOASWChange = 0,
      groupZSpread = 0,
      groupNotional = 0,
      groupDelta = 0,
      groupGamma = 0,
      groupMTDDelta = 0,
      groupSpreadTZ,
      groupEntrySpreadTZ;

    object.groupedByLocation[locationCode]["DV01 Dollar Value Impact"] = 0;
    object.groupedByLocation[locationCode]["DV01 Dollar Value Impact % of Nav"] = 0;
    object.groupedByLocation[locationCode]["DV01 Dollar Value Impact Limit % of Nav"] = 0;
    object.groupedByLocation[locationCode]["DV01 Dollar Value Impact Utilization % of Nav"] = 0;

    for (let index = 0; index < object.groupedByLocation[locationCode].data.length; index++) {
      let country = object.groupedByLocation[locationCode].data[index]["Country"] ? object.groupedByLocation[locationCode].data[index]["Country"] : "Unspecified";
      let issuer = object.groupedByLocation[locationCode].data[index]["Issuer"] ? object.groupedByLocation[locationCode].data[index]["Issuer"] : "Unspecified";
      let sector = object.groupedByLocation[locationCode].data[index]["Sector"] ? object.groupedByLocation[locationCode].data[index]["Sector"] : "Unspecified";
      let strategy = object.groupedByLocation[locationCode].data[index]["Strategy"];
      let bbTicker = object.groupedByLocation[locationCode].data[index]["BB Ticker"] ? object.groupedByLocation[locationCode].data[index]["BB Ticker"] : "Unspecified";
      let duration = parseFloat(object.groupedByLocation[locationCode].data[index]["Duration"]) || 0;
      let dv01 = parseFloat(object.groupedByLocation[locationCode].data[index]["DV01"]) || 0;
      let notional = parseFloat(object.groupedByLocation[locationCode].data[index]["Notional Amount"]) || 0;
      let ratingScore = object.groupedByLocation[locationCode].data[index]["Rating Score"];
      let usdMarketValue;
      let dayPl;
      let monthPl;
      let oasSum = parseFloat(object.groupedByLocation[locationCode].data[index]["OAS"]);
      let delta = parsePercentage(object.groupedByLocation[locationCode].data[index]["Delta"]);
      let gamma = parsePercentage(object.groupedByLocation[locationCode].data[index]["Gamma"]);
      let mtdDelta = parsePercentage(object.groupedByLocation[locationCode].data[index]["MTD Delta"]);
      let zSpreadSum = parseFloat(object.groupedByLocation[locationCode].data[index]["Z Spread"]);
      let oasWChangeSum = parseFloat(object.groupedByLocation[locationCode].data[index]["OAS W Change"]);
      let dv01DollarValueImpact = parseFloat(object.groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact"]);
      let dv01DollarValueOfNav = parseFloat(object.groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact % of Nav"]);
      let dv01DollarValueLimitOfNav = parseFloat(object.groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact Limit % of Nav"]);
      let dv01DollarValueLimitUtilization = parseFloat(object.groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact Utilization % of Nav"]);
      let ytw = parseFloat(object.groupedByLocation[locationCode].data[index]["YTW"]);
      let entryYtw = parsePercentage(object.groupedByLocation[locationCode].data[index]["Entry Yield"]);
      let type = object.groupedByLocation[locationCode].data[index]["Type"];
      if (object.view == "front office" || object.view == "exposure") {
        usdMarketValue = parseFloat(object.groupedByLocation[locationCode].data[index]["USD Market Value"]) || 0;
        dayPl = parseFloat(object.groupedByLocation[locationCode].data[index]["Day P&L (USD)"]);
        monthPl = parseFloat(object.groupedByLocation[locationCode].data[index]["MTD P&L (USD)"]);
      } else {
        usdMarketValue = parseFloat(object.groupedByLocation[locationCode].data[index]["Value (BC)"]) || 0;
        dayPl = parseFloat(object.groupedByLocation[locationCode].data[index]["Day P&L (BC)"]);
        monthPl = parseFloat(object.groupedByLocation[locationCode].data[index]["MTD P&L (BC)"]);
      }

      let absoulteUsdMarketValue = Math.abs(usdMarketValue);

      object.strategyNAVPercentage[strategy] = object.strategyNAVPercentage[strategy] ? object.strategyNAVPercentage[strategy] + usdMarketValue : usdMarketValue;
      object.issuerNAVPercentage[issuer] = object.issuerNAVPercentage[issuer] ? object.issuerNAVPercentage[issuer] + usdMarketValue : usdMarketValue;
      object.countryNAVPercentage[country.toLowerCase()] = object.countryNAVPercentage[country.toLowerCase()] ? object.countryNAVPercentage[country.toLowerCase()] + usdMarketValue : usdMarketValue;
      object.sectorNAVPercentage[sector.toLowerCase()] = object.sectorNAVPercentage[sector.toLowerCase()] ? object.sectorNAVPercentage[sector.toLowerCase()] + usdMarketValue : usdMarketValue;

      object.strategyGMVPercentage[strategy] = object.strategyGMVPercentage[strategy] ? object.strategyGMVPercentage[strategy] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      object.issuerGMVPercentage[issuer] = object.issuerGMVPercentage[issuer] ? object.issuerGMVPercentage[issuer] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      object.countryGMVPercentage[country.toLowerCase()] = object.countryGMVPercentage[country.toLowerCase()] ? object.countryGMVPercentage[country.toLowerCase()] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      object.sectorGMVPercentage[sector.toLowerCase()] = object.sectorGMVPercentage[sector.toLowerCase()] ? object.sectorGMVPercentage[sector.toLowerCase()] + absoulteUsdMarketValue : absoulteUsdMarketValue;

      object.tickerTable[bbTicker] = "";
      if (usdMarketValue > 0) {
        object.longShortDV01Sum["Long"] += Math.round(parseFloat(object.groupedByLocation[locationCode].data[index]["DV01"]) || 0);
      } else if (usdMarketValue < 0) {
        object.longShortDV01Sum["Short"] += Math.round(parseFloat(object.groupedByLocation[locationCode].data[index]["DV01"]) || 0);
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
      groupUSDMarketValue += usdMarketValue;
      groupDelta += delta;
      groupGamma += gamma;
      groupMTDDelta += mtdDelta;
      groupDuration += duration;
      groupRating = groupRating < ratingScore ? ratingScore : groupRating;
      groupOAS += oasSum;
      groupOASWChange += oasWChangeSum;
      groupZSpread += zSpreadSum;
      groupNotional += notional;

      object.groupedByLocation[locationCode]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;

      object.groupedByLocation[locationCode]["DV01 Dollar Value Impact % of Nav"] = dv01DollarValueOfNav;
      object.groupedByLocation[locationCode]["DV01 Dollar Value Impact Limit % of Nav"] = dv01DollarValueLimitOfNav;
      object.groupedByLocation[locationCode]["DV01 Dollar Value Impact Utilization % of Nav"] = dv01DollarValueLimitUtilization;

      if (duration < 2) {
        object.durationSummary["0 To 2"].durationSum += duration;
        object.durationSummary["0 To 2"].dv01Sum += dv01;
        object.durationSummary["0 To 2"].dv01Sum = Math.round(object.durationSummary["0 To 2"].dv01Sum * 1);
      } else if (duration >= 2 && duration < 5) {
        object.durationSummary["2 To 5"].durationSum += duration;
        object.durationSummary["2 To 5"].dv01Sum += dv01;
        object.durationSummary["2 To 5"].dv01Sum = Math.round(object.durationSummary["2 To 5"].dv01Sum * 100) / 100;
      } else if (duration >= 5 && duration < 10) {
        object.durationSummary["5 To 10"].durationSum += duration;
        object.durationSummary["5 To 10"].dv01Sum += dv01;
        object.durationSummary["5 To 10"].dv01Sum = Math.round(object.durationSummary["5 To 10"].dv01Sum * 100) / 100;
      } else if (duration >= 10 && duration < 30) {
        object.durationSummary["10 To 30"].durationSum += duration;
        object.durationSummary["10 To 30"].dv01Sum += dv01;
        object.durationSummary["10 To 30"].dv01Sum = Math.round(object.durationSummary["10 To 30"].dv01Sum * 100) / 100;
      } else if (duration >= 30) {
        object.durationSummary["> 30"].durationSum += duration;
        object.durationSummary["> 30"].dv01Sum += dv01;
        object.durationSummary["> 30"].dv01Sum = Math.round(object.durationSummary["> 30"].dv01Sum * 100) / 100;
      }

      let pinned = object.groupedByLocation[locationCode].data[index]["Pin"];
      if (pinned == "pinned") {
        object.groupedByLocation[locationCode].order = 0;
        // object.groupedByLocation[locationCode].color = "#f59542";
      }
    }

    object.groupedByLocation[locationCode].groupDayPl = groupDayPl;
    object.groupedByLocation[locationCode].groupDV01Sum = groupDV01Sum;
    object.groupedByLocation[locationCode].groupUSDMarketValue = groupUSDMarketValue;
    object.groupedByLocation[locationCode].groupDelta = Math.round(groupDelta * 100) / 100;
    object.groupedByLocation[locationCode].groupGamma = Math.round(groupGamma * 100) / 100;
    object.groupedByLocation[locationCode].groupMTDDelta = Math.round(groupMTDDelta * 100) / 100;
    object.groupedByLocation[locationCode].groupMTDPl = groupMTDPl;
    object.groupedByLocation[locationCode].groupDuration = groupDuration;
    object.groupedByLocation[locationCode].groupRating = groupRating;
    object.groupedByLocation[locationCode].groupOAS = groupOAS;
    object.groupedByLocation[locationCode].groupOASWChange = groupOASWChange;
    object.groupedByLocation[locationCode].groupNotional = groupNotional;
    object.groupedByLocation[locationCode].groupZSpread = groupZSpread;

    object.groupedByLocation[locationCode].groupSpreadTZ = groupSpreadTZ;
    object.groupedByLocation[locationCode].groupEntrySpreadTZ = groupEntrySpreadTZ;
  }
}

export function assignBorderAndCustomSortAggregateGroup(object: { portfolio: any; groupedByLocation: any; sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMTDPl" | "groupDV01Sum" | "groupDuration" | "groupRating" | "groupDelta" | "groupGamma" | "groupMTDDelta"; sign: any; view: "front office" | "back office" | "exposure" }) {
  object.sign = parseFloat(object.sign);
  if (object.sort == "order") {
    //because order should be descending
    object.sign = -1 * object.sign;
  }

  const locationCodes = Object.entries(object.groupedByLocation)
    .sort((a: any, b: any) => (object.sign == -1 ? a[1][`${object.sort}`] - b[1][`${object.sort}`] : b[1][`${object.sort}`] - a[1][`${object.sort}`]))
    .map((entry) => entry[0]);

  for (let index = 0; index < locationCodes.length; index++) {
    let locationCode = locationCodes[index];

    object.groupedByLocation[locationCode].data.sort((a: any, b: any) => {
      // Assuming "L/S" is a number that can be directly compared
      if (a["L/S"] < b["L/S"]) {
        return -1; // a comes first
      } else if (a["L/S"] > b["L/S"]) {
        return 1; // b comes first
      }
      return 0; // a and b are equal
    });

    for (let groupPositionIndex = 0; groupPositionIndex < object.groupedByLocation[locationCode].data.length; groupPositionIndex++) {
      if (object.groupedByLocation[locationCode].data[groupPositionIndex]["Notional Amount"] == 0) {
        object.groupedByLocation[locationCode].data[groupPositionIndex]["Color"] = "#C5E1A5";
        //   //no need for borders when rlzd
        //   // continue;
      } else {
        object.groupedByLocation[locationCode].data[groupPositionIndex]["Color"] = object.groupedByLocation[locationCode].color;
      }

      if (object.groupedByLocation[locationCode].data.length > 1) {
        let length = object.groupedByLocation[locationCode].data.length;
        object.groupedByLocation[locationCode].data[length - 1]["bottom"] = true;
      }
    }

    if (object.groupedByLocation[locationCode].data.length > 1) {
      let portfolioViewType = object.view;

      let newObject: any = {};

      if (portfolioViewType == "front office" || portfolioViewType == "exposure") {
        newObject = {
          "L/S": "Total",
          Color: "white",
          Location: locationCode,
          "USD Market Value": object.groupedByLocation[locationCode].groupUSDMarketValue,
          Delta: object.groupedByLocation[locationCode].groupDelta + " %",
          Gamma: object.groupedByLocation[locationCode].groupGamma + " %",
          "MTD Delta": object.groupedByLocation[locationCode].groupMTDDelta + " %",
          DV01: object.groupedByLocation[locationCode].groupDV01Sum,
          "Day P&L (USD)": object.groupedByLocation[locationCode].groupDayPl,

          "MTD P&L (USD)": object.groupedByLocation[locationCode].groupMTDPl,
          Duration: object.groupedByLocation[locationCode].groupDuration,
          OAS: object.groupedByLocation[locationCode].groupOAS,
          "OAS W Change": object.groupedByLocation[locationCode].groupOASWChange,
          "Notional Amount": object.groupedByLocation[locationCode].groupNotional,
          "Z Spread": object.groupedByLocation[locationCode].groupZSpread,
          "Rating Score": object.groupedByLocation[locationCode].groupRating,
        };
        if (object.groupedByLocation[locationCode].groupSpreadTZ || object.groupedByLocation[locationCode].groupSpreadTZ == 0) {
          newObject["Current Spread (T)"] = Math.round(object.groupedByLocation[locationCode].groupSpreadTZ * 100) / 100;
        }
        if (object.groupedByLocation[locationCode].groupEntrySpreadTZ || object.groupedByLocation[locationCode].groupEntrySpreadTZ == 0) {
          newObject["Entry Spread (T)"] = Math.round(object.groupedByLocation[locationCode].groupEntrySpreadTZ * 100) / 100;
        }
      } else {
        newObject = {
          Type: "Total",
          Color: "white",
          Location: locationCode,
          "Value (BC)": object.groupedByLocation[locationCode].groupUSDMarketValue,
          Delta: object.groupedByLocation[locationCode].groupDelta + " %",
          Gamma: object.groupedByLocation[locationCode].groupGamma + " %",
          "MTD Delta": object.groupedByLocation[locationCode].groupMTDDelta + " %",

          DV01: object.groupedByLocation[locationCode].groupDV01Sum,
          "Day P&L (BC)": object.groupedByLocation[locationCode].groupDayPl,

          "MTD P&L (BC)": object.groupedByLocation[locationCode].groupMTDPl,
          Duration: object.groupedByLocation[locationCode].groupDuration,
          OAS: object.groupedByLocation[locationCode].groupOAS,
          "OAS W Change": object.groupedByLocation[locationCode].groupOASWChange,
          "Notional Amount": object.groupedByLocation[locationCode].groupNotional,
          "Z Spread": object.groupedByLocation[locationCode].groupZSpread,
          "Rating Score": object.groupedByLocation[locationCode].groupRating,
        };
        if (object.groupedByLocation[locationCode].groupSpreadTZ || object.groupedByLocation[locationCode].groupSpreadTZ == 0) {
          newObject["Current Spread (T)"] = Math.round(object.groupedByLocation[locationCode].groupSpreadTZ * 100) / 100;
        }
        if (object.groupedByLocation[locationCode].groupEntrySpreadTZ || object.groupedByLocation[locationCode].groupEntrySpreadTZ == 0) {
          newObject["Entry Spread (T)"] = Math.round(object.groupedByLocation[locationCode].groupEntrySpreadTZ * 100) / 100;
        }
      }

      object.groupedByLocation[locationCode].data.unshift(newObject);
    }

    object.portfolio.push(...object.groupedByLocation[locationCode].data);
  }
}

export function groupAndSortByLocationAndTypeDefineTables(object: { formattedPortfolio: PositionGeneralFormat[]; nav: number; sort: any; sign: number; view: "front office" | "exposure" | "back office"; currencies: any; format: "risk" | "summary"; sortBy: "pl" | null | "delta" | "gamma"; fundDetails: any }) {
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

  let longShortDV01Sum = { Long: 0, Short: 0, Total: 0 };

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
  const groupedByLocation = object.formattedPortfolio.reduce((group: any, item: any) => {
    const { Location } = item;
    let notional = item["Notional Amount"];
    let strategy = item["Strategy"];
    let type = item["Type"];

    let rlzdTimestamp = new Date(item["Last Day Since Realizd"]).getTime();
    if (notional != 0 && !(type == "UST" && strategy == "Global Hedge" && object.view == "exposure")) {
      group[Location] = group[Location] ? group[Location] : { data: [] };
      group[Location].data.push(item);
      return group;
    } else if (notional != 0 && type == "UST" && strategy == "Global Hedge" && object.view == "exposure") {
      group[Location] = group[Location] ? group[Location] : { data: [] };
      group[Location].data.push(item);
    } else {
      group[Location + " Rlzd"] = group[Location + " Rlzd"] ? group[Location + " Rlzd"] : { data: [], "Last Day Since Realizd": 0 };
      if (rlzdTimestamp > group[Location + " Rlzd"]["Last Day Since Realizd"]) {
        group[Location + " Rlzd"]["Last Day Since Realizd"] = rlzdTimestamp;
      }
      group[Location + " Rlzd"].data.push(item);
      return group;
    }
  }, {});

  assignColorAndSortParamsBasedOnAssetClass({
    groupedByLocation: groupedByLocation,
    longShortDV01Sum: longShortDV01Sum,
    durationSummary: durationSummary,
    pairHedgeNotional: pairHedgeNotional,
    pairIGNotional: pairIGNotional,
    pairHedgeDV01Sum: pairHedgeDV01Sum,
    pairIGDV01Sum: pairIGDV01Sum,
    globalHedgeNotional: globalHedgeNotional,
    singleIGNotional: singleIGNotional,
    globalHedgeDV01Sum: globalHedgeDV01Sum,
    singleIGDV01Sum: singleIGDV01Sum,
    hedgeCurrencyNotional: hedgeCurrencyNotional,
    HYNotional: HYNotional,
    HYDV01Sum: HYDV01Sum,
    cdsNotional: cdsNotional,
    countryNAVPercentage: countryNAVPercentage,
    sectorNAVPercentage: sectorNAVPercentage,
    strategyNAVPercentage: strategyNAVPercentage,
    issuerNAVPercentage: issuerNAVPercentage,

    countryGMVPercentage: countryGMVPercentage,
    sectorGMVPercentage: sectorGMVPercentage,
    strategyGMVPercentage: strategyGMVPercentage,
    issuerGMVPercentage: issuerGMVPercentage,

    view: object.view,
    ustTable: ustTable,
    igTable: igTable,
    hyTable: hyTable,
    currTable: currTable,
    issuerTable: issuerTable,
    ustTableByCoupon: ustTableByCoupon,
    rvPairTable: rvPairTable,
    tickerTable: tickerTable,
  });

  let portfolio: any = [];

  assignBorderAndCustomSortAggregateGroup({ portfolio: portfolio, groupedByLocation: groupedByLocation, sort: object.sort, sign: object.sign, view: object.view });

  let topWorstPerformaners = getTopWorst(groupedByLocation, object.sortBy);

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
  getCountrySectorStrategySum(countryNAVPercentage, sectorNAVPercentage, strategyNAVPercentage, issuerNAVPercentage, object.fundDetails.nav);

  getCountrySectorStrategySum(countryGMVPercentage, sectorGMVPercentage, strategyGMVPercentage, issuerGMVPercentage, object.fundDetails.nav);
  let capacity = adjustMarginMultiplier(portfolio, sectorGMVPercentage, issuerNAVPercentage);

  durationSummary["Total"].dv01Sum = Math.round(durationSummary["0 To 2"].dv01Sum + durationSummary["2 To 5"].dv01Sum + durationSummary["5 To 10"].dv01Sum + durationSummary["10 To 30"].dv01Sum + durationSummary["> 30"].dv01Sum);
  longShortDV01Sum["Total"] = Math.round(longShortDV01Sum["Long"] + longShortDV01Sum["Short"]);
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
    longShortDV01Sum: longShortDV01Sum,
    ustTable: ustTable,
    igTable: igTable,
    hyTable: hyTable,
    currTable: currTable,
    currencies: object.currencies,
    issuerTable: issuerTable,
    ustTableByCoupon: ustTableByCoupon,
    rvPairTable: rvPairTable,
    tickerTable: tickerTable,
  };
}

import { Analysis, FundDetails, FundMTD, PositionBeforeFormatting, PositionGeneralFormat } from "../../../models/portfolio";
import { formatDateUS, parsePercentage } from "../../common";
import { calculateAccruedSinceInception } from "../../reports/portfolios";
import { daysSinceBeginningOfMonth, parseBondIdentifier } from "../../reports/tools";
import { getCountrySectorStrategySum } from "./statistics";
import { sortObjectBasedOnKey, oasWithChange, checkPosition, yearsUntil, getDuration, AggregatedData, assignAssetClass, getDurationBucket, assetClassOrderFrontOffice, assetClassOrderExposure, rateSensitive, toTitleCase, AggregateRow, getStandardRating, classifyCountry, padInteger, isRatingHigherThanBBBMinus, isNotInteger } from "../tools";
import { getTopWorst } from "./frontOffice";
import { adjustMarginMultiplier, nomuraRuleMargin } from "../cash/rules";
import { sumTable } from "./riskTables";

export function formatGeneralTable({ portfolio, date, fund, dates, conditions, fundDetailsYTD, ytdinterest }: { portfolio: PositionBeforeFormatting[]; date: any; fund: FundDetails; dates: any; conditions: any; fundDetailsYTD: FundDetails; ytdinterest: any }): { portfolio: PositionGeneralFormat[]; fundDetails: FundMTD; currencies: any } {
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
    nmv = 0,
    lmv = 0,
    ytdEstInt = 0,
    smv = 0,
    cr01Sum = 0;

  for (let index = 0; index < portfolio.length; index++) {
    let position: any = portfolio[index];

    //to make it consistent with previous versions
    let originalFace = position["Original Face"] || 1;
    let usdRatio = parseFloat(position["FX Rate"]) || 1;
    let holdBackRatio = position["Asset Class"] == "Illiquid" ? fund.holdBackRatio : 1;
    position["Interest"] = position["Interest"] ? position["Interest"] : {};
    position["Quantity"] = position["Notional Amount"] / originalFace;
    position["Interest"];
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
    if (position["Type"] == "FX") {
      position["FX Rate"] = 1;
      position["Previous FX"] = 1;
      position["MTD FX"] = 1;
      position["Currency"] = position["BB Ticker"];
    } else {
      position["FX Rate"] = usdRatio;

      position["MTD FX"] = parseFloat(position["MTD FX"]) ? position["MTD FX"] : position["FX Rate"];
      position["Previous FX"] = parseFloat(position["Previous FX"]) ? position["Previous FX"] : position["FX Rate"];
    }

    position["Cost (BC)"] = position["Type"] == "CDS" ? Math.round((position["Average Cost"] * position["Notional Amount"] * usdRatio) / position["Original Face"]) : Math.round(position["Average Cost"] * position["Notional Amount"] * usdRatio);
    position["Value (LC)"] = position["Type"] == "CDS" ? Math.round((position["Notional Amount"] * position["Mid"]) / originalFace) || 0 : Math.round(position["Principal"] * position["Mid"]) || 0;
    position["Value (BC)"] = position["Type"] == "CDS" ? Math.round((position["Notional Amount"] * position["Mid"] * usdRatio) / originalFace) || 0 : Math.round(position["Principal"] * position["Mid"] * usdRatio) || 0;

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
    position["Average Cost MTD"] = Math.round(position["Average Cost MTD"] * 1000 * bondDivider) / 1000;

    position["Entry Price"] = Math.round(position["Entry Price"] * 1000 * bondDivider) / 1000;

    position["Average Cost"] = Math.round(position["Average Cost"] * 1000 * bondDivider) / 1000;
    position["YTM"] = (Math.round(position["YTM"] * 100) / 100 || 0) + " %" || "0 %";
    position["YTW"] = (Math.round(position["YTW"] * 100) / 100 || 0) + " %" || "0 %";
    position["MTD Rlzd"] = position["MTD Rlzd"] ? position["MTD Rlzd"] : 0;
    position["MTD Mark"] = Math.round(position["MTD Mark"] * 1000 * bondDivider) / 1000;
    position["Day Rlzd"] = position["Day Rlzd"] ? position["Day Rlzd"] : 0;
    position["Previous Mark"] = Math.round(position["Previous Mark"] * 1000 * bondDivider) / 1000;

    if (!position["Previous FX"]) {
      position["Previous FX"] = position["FX Rate"];
    }
    position["DV01"] = (position["DV01"] / 1000000) * position["Notional Amount"] * usdRatio;
    position["DV01"] = position["DV01"] || 0;

    position["Day P&L FX"] = (position["FX Rate"] - position["Previous FX"]) * position["Value (BC)"];

    position["MTD P&L FX"] = (position["FX Rate"] - position["MTD FX"]) * position["Value (BC)"];

    if (!position["Day P&L FX"]) {
      position["Day P&L FX"] = 0;
    }
    if (!position["MTD P&L FX"]) {
      position["MTD P&L FX"] = 0;
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

    position["YTD Int. (BC)"] = Math.round(position["YTD Int."] * usdRatio * holdBackRatio);
    position["YTD Int. (USD)"] = position["YTD Int. (BC)"];

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

    position["Maturity"] = position["Maturity"] ? position["Maturity"] : parseBondIdentifier(position["BB Ticker"]).date || 0;

    position["Call Date"] = position["Call Date"] ? position["Call Date"] : "0";

    position["L/S"] = position["Notional Amount"] > 0 && position["Type"] != "CDS" ? "Long" : position["Notional Amount"] == 0 && position["Type"] != "CDS" ? "Rlzd" : "Short";
    position["Duration"] = yearsUntil(position["Call Date"] && position["Call Date"] != "0" && position["BB Ticker"].toLowerCase().includes("perp") ? position["Call Date"] : position["Maturity"], date, position["BB Ticker"]);

    position["Duration Bucket"] = getDurationBucket(position["Duration"]);
    position["Issuer"] = position["Issuer"] == "0" ? "" : position["Issuer"];

    position["Base LTV"] = nomuraRuleMargin(position);
    position["OAS"] = Math.round(position["OAS"] * 100) / 100 || 0;

    position["OAS W Change"] = oasWithChange(position["OAS"])[0];
    position["Spread Change"] = oasWithChange(position["OAS"])[1];
    position["DV01 Dollar Value Impact"] = Math.round(position["OAS W Change"] * position["DV01"]);
    position["DV01 Dollar Value Impact % of Nav"] = Math.round(((position["DV01 Dollar Value Impact"] * position["OAS W Change"]) / fund.nav) * 100) / 100 + " %";
    position["DV01 Dollar Value Impact Limit % of Nav"] = position["Value (BC)"] / fund.nav > 10 ? 2 + " %" : 1.5 + " %";
    position["DV01 Dollar Value Impact Utilization % of Nav"] = Math.round((parsePercentage(position["DV01 Dollar Value Impact % of Nav"]) / parsePercentage(position["DV01 Dollar Value Impact Limit % of Nav"])) * 10000) / 100 + " %";
    position["DV01 Dollar Value Impact Test"] = Math.abs(parsePercentage(position["DV01 Dollar Value Impact Utilization % of Nav"])) < 100 ? "Pass" : "Fail";
    position["DV01 Dollar Value Impact Test Color"] = position["DV01 Dollar Value Impact Test"] == "Pass" ? "#C5E1A5" : "#FFAB91";

    position["Value (BC) % of Nav"] = Math.round((position["Value (BC)"] / fund.nav) * 10000) / 100 + " %";

    position["Value (BC) Limit % of Nav"] = Math.abs(parsePercentage(position["Value (BC) % of Nav"])) > 10 ? 15 + " %" : 10 + " %";
    position["Value (BC) Utilization % of Nav"] = Math.round((parsePercentage(position["Value (BC) % of Nav"]) / parsePercentage(position["Value (BC) Limit % of Nav"])) * 10000) / 100 + " %";

    position["Value (BC) Test"] = Math.abs(parsePercentage(position["Value (BC) Utilization % of Nav"])) < 100 ? "Pass" : "Fail";
    position["Value (BC) Test Color"] = position["Value (BC) Test"] == "Pass" ? "#C5E1A5" : "#FFAB91";

    position["Capital Gain/ Loss since Inception (Live Position)"] = position["Value (BC)"] - position["Cost (BC)"] || 0;
    let shortLongType = position["Value (BC)"] > 0 ? 1 : -1;
    position["% of Capital Gain/ Loss since Inception (Live Position)"] = (Math.round((position["Value (BC)"] / position["Cost (BC)"] - 1) * shortLongType * 10000) / 100 || 0) + " %";
    position["Accrued Int. Since Inception (BC)"] = calculateAccruedSinceInception(position["Interest"], position["Coupon Rate"] / 100, position["Coupon Duration"], position["ISIN"], date) * usdRatio;

    position["Total Gain/ Loss (USD)"] = Math.round(position["Capital Gain/ Loss since Inception (Live Position)"] + position["Accrued Int. Since Inception (BC)"]) || 0;
    position["% of Total Gain/ Loss since Inception (Live Position)"] = position["Cost (BC)"] ? (Math.round(((position["Total Gain/ Loss (USD)"] + position["Cost (BC)"]) / position["Cost (BC)"] - 1) * shortLongType * 10000) / 100 || 0) + " %" : "0 %";

    position["Z Spread"] = Math.round(position["Z Spread"] * 1000000) / 1000000 || 0;
    position["Entry Yield"] = position["Entry Yield"] ? Math.round(position["Entry Yield"] * 100) / 100 + " %" : "0 %";
    position["Coupon Rate"] = position["Coupon Rate"] + " %";
    position["Rate Sensitivity"] = position["Type"] == "UST" ? "" : rateSensitive(position["YTW"], position["Coupon Rate"], position["Duration"]);
    position["MTD Notional"] = position["MTD Notional"] ? position["MTD Notional"] : 0;
    let ratingScore = getStandardRating(position["BBG Composite Rating"] || "NR", position["S&P Bond Rating"] || "NR", position["Moody's Bond Rating"] || "NR", position["Fitch Bond Rating"] || "NR");

    position["Rating Score"] = ratingScore;
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
    position["Sector"] = position["Sector"] ? toTitleCase(position["Sector"]) : "Unspecified";
    position["Country"] = position["Country"] ? position["Country"] : "Unspecified";
    let regionClassInfo = classifyCountry(position["Country"] || "");
    position["Region"] = regionClassInfo.region;
    position["Market Type"] = regionClassInfo.marketType;

    position["CR01"] = isFinite(position["CR01"]) ? position["CR01"] || 0 : 0;

    position["CR01"] = (position["CR01"] / 1000000) * position["Notional Amount"] * usdRatio;

    position["CR01 Dollar Value Impact"] = Math.round(position["OAS W Change"] * position["CR01"]);
    position["CR01 Dollar Value Impact % of Nav"] = Math.round(((position["CR01 Dollar Value Impact"] * position["OAS W Change"]) / fund.nav) * 100) / 100 + " %";
    position["CR01 Dollar Value Impact Limit % of Nav"] = position["Value (BC)"] / fund.nav > 10 ? 2 + " %" : 1.5 + " %";
    position["CR01 Dollar Value Impact Utilization % of Nav"] = Math.round((parsePercentage(position["CR01 Dollar Value Impact % of Nav"]) / parsePercentage(position["CR01 Dollar Value Impact Limit % of Nav"])) * 10000) / 100 + " %";
    position["CR01 Dollar Value Impact Test"] = Math.abs(parsePercentage(position["CR01 Dollar Value Impact Utilization % of Nav"])) < 100 ? "Pass" : "Fail";
    position["CR01 Dollar Value Impact Test Color"] = position["CR01 Dollar Value Impact Test"] == "Pass" ? "#C5E1A5" : "#FFAB91";

    if ((!portfolio[index]["Asset Class"] || portfolio[index]["Asset Class"] == "") && ratingScore) {
      portfolio[index]["Asset Class"] = isRatingHigherThanBBBMinus(ratingScore);
    }
    portfolio[index]["Asset Class"] = portfolio[index]["Asset Class"] == "" ? "Unspecified" : portfolio[index]["Asset Class"];
    position["FX Rate"] = Math.round(position["FX Rate"] * 1000) / 1000;
    position["Pin"] = position["Pin"] ? position["Pin"] : "not_pinned";

    if (position["Type"] == "FX") {
      // console.log(usdRatio);
      position["MTD P&L FX"] = position["MTD P&L (BC)"];
      position["Day P&L FX"] = position["Day P&L (BC)"];

      position["MTD URlzd (BC)"] = 0;
      position["Day URlzd (BC)"] = 0;

      position["MTD URlzd (LC)"] = 0;
      position["Day URlzd (LC)"] = 0;
    }
    if (conditions) {
      let test = checkPosition(position, conditions);
      if (test) {
        mtdpl += position["MTD P&L (BC)"];
        mtdrlzd += position["MTD Rlzd (BC)"];
        mtdurlzd += position["MTD URlzd (BC)"];
        mtdint += position["MTD Int. (BC)"];
        mtdfx += position["MTD P&L FX"];

        dayint += position["Day Int. (BC)"];

        daypl += position["Day P&L (BC)"];
        dayfx += position["Day P&L FX"];

        dayurlzd += position["Day URlzd (BC)"];
        dayrlzd += position["Day Rlzd (BC)"];
        dv01Sum += position["DV01"];
        ytdEstInt += position["365-Day Int. EST"];
        cr01Sum += parseFloat(position["CR01"] || 0);
      } else {
        delete portfolio[index];
      }
    } else {
      mtdpl += position["MTD P&L (BC)"];
      mtdrlzd += position["MTD Rlzd (BC)"];
      mtdurlzd += position["MTD URlzd (BC)"];
      mtdint += position["MTD Int. (BC)"];
      mtdfx += position["MTD P&L FX"];

      dayint += position["Day Int. (BC)"];

      daypl += position["Day P&L (BC)"];
      dayfx += position["Day P&L FX"];

      dayurlzd += position["Day URlzd (BC)"];
      dayrlzd += position["Day Rlzd (BC)"];
      dv01Sum += position["DV01"];
      ytdEstInt += position["365-Day Int. EST"];
      cr01Sum += parseFloat(position["CR01"] || 0);
    }
  }
  let dayplPercentage = Math.round((daypl / fund.nav) * 100000) / 1000;
  let dayFXGross = Math.round((dayfx / fund.nav) * 100000) / 1000;

  let mtdFXGross = Math.round((mtdfx / fund.nav) * 100000) / 1000;
  let numOfDaysUnitlEndOfMonth = daysSinceBeginningOfMonth(date);
  let mtdExpenses = (-(fund.expenses / 10000) * numOfDaysUnitlEndOfMonth.diffDays) / numOfDaysUnitlEndOfMonth.numOfDaysInMonth;

  let mtdExpensesAmount = mtdExpenses * +fund.nav;
  // console.log({ mtdExpensesAmount, mtdExpenses }, numOfDaysUnitlEndOfMonth);
  let mtdplPercentage = mtdpl / fund.nav;
  let shadawYTDNAV = (fund["share price"] - fundDetailsYTD["share price"]) / fundDetailsYTD["share price"];
  let shadawMTDNAV = +fund.nav + (+mtdpl + mtdExpenses * +fund.nav);

  let ytdNet = Math.round((shadawYTDNAV + mtdplPercentage + mtdExpenses) * 100000) / 1000;
  let fundDetails = {
    nav: fund.nav,
    holdbackRatio: fund.holdBackRatio,
    shadawNAV: Math.round(shadawMTDNAV),
    month: fund.month,
    borrowAmount: fund["borrowing amount"],

    mtdplPercentage: padInteger((mtdplPercentage + mtdExpenses) * 100),
    mtdpl: Math.round((mtdpl + mtdExpensesAmount) * 1000) / 1000,
    mtdrlzd: Math.round(mtdrlzd * 1000) / 1000,
    mtdurlzd: Math.round(mtdurlzd * 1000) / 1000,
    mtdint: Math.round(mtdint * 1000) / 1000,
    mtdfx: Math.round(mtdfx * 1000) / 1000,
    mtdintPercentage: Math.round((mtdint / fund.nav) * 100000) / 1000,
    mtdFXGross: mtdFXGross,

    ytdNet: padInteger(ytdNet),
    ytdint: Math.round(ytdinterest * 1000) / 1000,
    ytdintPercentage: Math.round((ytdinterest / fund.nav) * 100000) / 1000,

    dayplPercentage: padInteger(dayplPercentage),
    dayFXGross: dayFXGross,
    dayint: Math.round(dayint * 1000) / 1000,
    dayintPercentage: Math.round((dayint / fund.nav) * 100000) / 1000,
    daypl: Math.round(daypl * 1000) / 1000,
    dayfx: Math.round(dayfx * 1000) / 1000,
    dayurlzd: Math.round(dayurlzd * 1000) / 1000,
    dayrlzd: Math.round(dayrlzd * 1000) / 1000,
    dv01Sum: Math.round(dv01Sum * 1000) / 1000,
    cr01Sum: Math.round(cr01Sum * 1000) / 1000,

    lmv: Math.round(lmv * 1000) / 1000,
    smv: Math.round(smv * 1000) / 1000,
    gmv: Math.round((lmv - smv) * 1000) / 1000,
    nmv: Math.round(nmv * 1000) / 1000,
    lmvOfNav: Math.round(lmv * 10000) / (100 * fund.nav),
    smvOfNav: Math.round(smv * 10000) / (100 * fund.nav),
    gmvOfNav: Math.round((lmv - smv) * 10000) / (100 * fund.nav),
    nmvOfNav: Math.round(nmv * 10000) / (100 * fund.nav),
    ytdEstInt: ytdEstInt,
    ytdEstIntPercentage: Math.round((ytdEstInt / fund.nav) * 100000) / 1000 || 0,
  };
  let updatedPortfolio: PositionGeneralFormat[] | any = portfolio;
  return { portfolio: updatedPortfolio, fundDetails: fundDetails, currencies: currencies };
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
  countryLMVPercentage,
  sectorLMVPercentage,
  strategyLMVPercentage,
  issuerLMVPercentage,
  issuerInformation,
  ratingNAVPercentage,
  ratingGMVPercentage,
  ratingLMVPercentage,
  regionNAVPercentage,
  regionGMVPercentage,
  regionLMVPercentage,
  marketTypeNAVPercentage,
  marketTypeGMVPercentage,
  marketTypeLMVPercentage,
  assetClassNAVPercentage,
  assetClassGMVPercentage,
  assetClassLMVPercentage,
  globalHedgeTable,
}: {
  globalHedgeTable: any;
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
  countryLMVPercentage: any;
  sectorLMVPercentage: any;
  strategyLMVPercentage: any;
  issuerLMVPercentage: any;
  issuerInformation: any;
  ratingNAVPercentage: any;
  ratingGMVPercentage: any;
  ratingLMVPercentage: any;
  regionNAVPercentage: any;
  regionGMVPercentage: any;
  regionLMVPercentage: any;
  marketTypeNAVPercentage: any;
  marketTypeGMVPercentage: any;
  marketTypeLMVPercentage: any;
  assetClassNAVPercentage: any;
  assetClassGMVPercentage: any;
  assetClassLMVPercentage: any;
}) {
  let assetClassOrder = view == "exposure" ? assetClassOrderExposure : assetClassOrderFrontOffice;
  for (let locationCode in groupedByLocation) {
    groupedByLocation[locationCode].order = assignAssetClass(locationCode, groupedByLocation[locationCode].data, assetClassOrder, view);
    if (parseInt(groupedByLocation[locationCode].order) == assetClassOrder.RV) {
      groupedByLocation[locationCode].color = "#FEEBED";
      groupedByLocation[locationCode].groupMacro = "RV";

      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        let duration: any = getDuration(groupedByLocation[locationCode].data[index]["Duration"]);
        let couponRate: any = groupedByLocation[locationCode].data[index]["Coupon Rate"];
        let notional = groupedByLocation[locationCode].data[index]["Notional Amount"];
        let issue: any = groupedByLocation[locationCode].data[index]["BB Ticker"];

        sumTable({ table: rvPairTable, data: groupedByLocation[locationCode].data[index], view: view, param: locationCode, subtotal: false, subtotalParam: "" });
        if (notional < 0 && groupedByLocation[locationCode].data[index]["Type"] == "UST") {
          sumTable({ table: ustTableByCoupon, data: groupedByLocation[locationCode].data[index], view: view, param: couponRate, subtotal: false, subtotalParam: "" });
          sumTable({ table: ustTable, data: groupedByLocation[locationCode].data[index], view: view, param: duration, subtotal: true, subtotalParam: issue });
        }
        groupedByLocation[locationCode].data[index]["Strategy"] = "RV";
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.IG || Math.round(groupedByLocation[locationCode].order) == assetClassOrder.R_S) {
      groupedByLocation[locationCode].color = "#E1BEE7";
      groupedByLocation[locationCode].groupMacro = "IG";

      if (view != "exposure") {
        for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
          sumTable({ table: igTable, data: groupedByLocation[locationCode].data[index], view: view, param: null, subtotal: false, subtotalParam: "" });
        }
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.HY || Math.round(groupedByLocation[locationCode].order) == assetClassOrder.R_IS) {
      groupedByLocation[locationCode].color = "#C5CAE9";
      groupedByLocation[locationCode].groupMacro = "HY";

      if (view != "exposure") {
        for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
          sumTable({ table: hyTable, data: groupedByLocation[locationCode].data[index], view: view, param: null, subtotal: false, subtotalParam: "" });
        }
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.FUT_CURR) {
      groupedByLocation[locationCode].color = "#FFF9C4";
      groupedByLocation[locationCode].groupMacro = "CURR + FUT";

      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        let currency = groupedByLocation[locationCode].data[index]["ISIN"].includes("IB") ? groupedByLocation[locationCode].data[index]["Security Description"] : groupedByLocation[locationCode].data[index]["Currency"];
        if (!currency) {
          currency = "Bonds";
        }

        sumTable({ table: currTable, data: groupedByLocation[locationCode].data[index], view: view, param: currency, subtotal: false, subtotalParam: "" });
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.FUT) {
      groupedByLocation[locationCode].color = "#FFF9C4";
      groupedByLocation[locationCode].groupMacro = "CURR + FUT";

      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        let currency = groupedByLocation[locationCode].data[index]["ISIN"].includes("IB") ? groupedByLocation[locationCode].data[index]["Security Description"] : groupedByLocation[locationCode].data[index]["Currency"];
        if (!currency) {
          currency = "Bonds";
        }

        sumTable({ table: currTable, data: groupedByLocation[locationCode].data[index], view: view, param: currency, subtotal: false, subtotalParam: "" });
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.CDS) {
      groupedByLocation[locationCode].color = "#CE93D8";
      groupedByLocation[locationCode].groupMacro = "CDS";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        sumTable({ table: globalHedgeTable, data: groupedByLocation[locationCode].data[index], view: view, param: "CDS", subtotal: false, subtotalParam: "" });
      }
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {}
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.UST_GLOBAL) {
      groupedByLocation[locationCode].color = "#E8F5E9";
      groupedByLocation[locationCode].groupMacro = "Global Hedge";

      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
        let duration: any = getDuration(groupedByLocation[locationCode].data[index]["Duration"]);
        let couponRate: any = groupedByLocation[locationCode].data[index]["Coupon Rate"];
        let notional = groupedByLocation[locationCode].data[index]["Notional Amount"];
        let issue: any = groupedByLocation[locationCode].data[index]["BB Ticker"];
        if (notional < 0) {
          sumTable({ table: ustTableByCoupon, data: groupedByLocation[locationCode].data[index], view: view, param: couponRate, subtotal: false, subtotalParam: "" });
          sumTable({ table: ustTable, data: groupedByLocation[locationCode].data[index], view: view, param: duration, subtotal: true, subtotalParam: issue });
          sumTable({ table: globalHedgeTable, data: groupedByLocation[locationCode].data[index], view: view, param: "UST", subtotal: false, subtotalParam: "" });
        }
      }
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.Illiquid) {
      groupedByLocation[locationCode].color = "#9FA8DA";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {}
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.undefined) {
      groupedByLocation[locationCode].color = "#E5D1B4";
      for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {}
    } else if (Math.round(groupedByLocation[locationCode].order) == assetClassOrder.RLZD) {
      groupedByLocation[locationCode].groupMacro = "Rlzd";

      groupedByLocation[locationCode].color = "#C5E1A5";
    }

    let groupDayPl = 0,
      groupMTDPl = 0,
      groupDV01Sum = 0,
      groupCR01Sum = 0,
      groupCallDate = null,
      groupMaturity = null,
      groupMTDIntSum = 0,
      groupYTDIntSum = 0,
      groupDayPriceMoveSum = null,
      groupMTDPriceMoveSum = null,
      groupUSDMarketValue = 0,
      groupRating = -99,
      groupNotional = 0,
      groupDayInt = 0,
      groupBBTicker = "",
      groupSpreadTZ,
      groupEntrySpreadTZ;

    groupedByLocation[locationCode]["DV01 Dollar Value Impact"] = 0;
    groupedByLocation[locationCode]["DV01 Dollar Value Impact % of Nav"] = 0;
    groupedByLocation[locationCode]["DV01 Dollar Value Impact Limit % of Nav"] = 0;
    groupedByLocation[locationCode]["DV01 Dollar Value Impact Utilization % of Nav"] = 0;

    groupedByLocation[locationCode]["CR01 Dollar Value Impact"] = 0;
    groupedByLocation[locationCode]["CR01 Dollar Value Impact % of Nav"] = 0;
    groupedByLocation[locationCode]["CR01 Dollar Value Impact Limit % of Nav"] = 0;
    groupedByLocation[locationCode]["CR01 Dollar Value Impact Utilization % of Nav"] = 0;

    for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
      let country = groupedByLocation[locationCode].data[index]["Country"] ? groupedByLocation[locationCode].data[index]["Country"] : "Unspecified";
      let issuer = groupedByLocation[locationCode].data[index]["Issuer"] ? groupedByLocation[locationCode].data[index]["Issuer"] : "Unspecified";
      let sector = groupedByLocation[locationCode].data[index]["Sector"] ? groupedByLocation[locationCode].data[index]["Sector"] : "Unspecified";
      let strategy = groupedByLocation[locationCode].data[index]["Strategy"];
      let bbTicker = groupedByLocation[locationCode].data[index]["BB Ticker"] ? groupedByLocation[locationCode].data[index]["BB Ticker"] : "Unspecified";
      let duration = parseFloat(groupedByLocation[locationCode].data[index]["Duration"]) || 0;
      let dv01 = parseFloat(groupedByLocation[locationCode].data[index]["DV01"]) || 0;
      let cr01 = parseFloat(groupedByLocation[locationCode].data[index]["CR01"]) || 0;

      let dayPriceMove = parseFloat(groupedByLocation[locationCode].data[index]["Day Price Move"]) || 0;

      let mtdPriceMove = parseFloat(groupedByLocation[locationCode].data[index]["MTD Price Move"]) || 0;

      let notional = parseFloat(groupedByLocation[locationCode].data[index]["Notional Amount"]) || 0;
      let dayInt = parseFloat(groupedByLocation[locationCode].data[index]["Day Int. (USD)"]) || 0;
      let ratingScore = groupedByLocation[locationCode].data[index]["Rating Score"];
      let usdMarketValue;
      let dayPl;
      let monthPl;
      let dv01DollarValueImpact = parseFloat(groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact"]);
      let dv01DollarValueOfNav = parseFloat(groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact % of Nav"]);
      let dv01DollarValueLimitOfNav = parseFloat(groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact Limit % of Nav"]);
      let dv01DollarValueLimitUtilization = parseFloat(groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact Utilization % of Nav"]);

      let cr01DollarValueImpact = parseFloat(groupedByLocation[locationCode].data[index]["CR01 Dollar Value Impact"]);
      let cr01DollarValueOfNav = parseFloat(groupedByLocation[locationCode].data[index]["CR01 Dollar Value Impact % of Nav"]);
      let cr01DollarValueLimitOfNav = parseFloat(groupedByLocation[locationCode].data[index]["CR01 Dollar Value Impact Limit % of Nav"]);
      let cr01DollarValueLimitUtilization = parseFloat(groupedByLocation[locationCode].data[index]["CR01 Dollar Value Impact Utilization % of Nav"]);

      let mtdInt = parseFloat(groupedByLocation[locationCode].data[index]["MTD Int. (USD)"]);
      let YTDInt = parseFloat(groupedByLocation[locationCode].data[index]["YTD Int. (USD)"]);
      let maturity = yearsUntil(groupedByLocation[locationCode].data[index]["Maturity"], date, groupedByLocation[locationCode].data[index]["BB Ticker"]);
      let callDate = yearsUntil(groupedByLocation[locationCode].data[index]["Call Date"], date, groupedByLocation[locationCode].data[index]["BB Ticker"]);

      let ytw = parseFloat(groupedByLocation[locationCode].data[index]["YTW"]);
      let entryYtw = parsePercentage(groupedByLocation[locationCode].data[index]["Entry Yield"]);
      let type = groupedByLocation[locationCode].data[index]["Type"];
      let rating = groupedByLocation[locationCode].data[index]["Rating Score"];
      let region = groupedByLocation[locationCode].data[index]["Region"];
      let marketType = groupedByLocation[locationCode].data[index]["Market Type"];
      let assetClass = groupedByLocation[locationCode].data[index]["Asset Class"];

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

      if (usdMarketValue > 0) {
        strategyLMVPercentage[strategy] = strategyLMVPercentage[strategy] ? strategyLMVPercentage[strategy] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        issuerLMVPercentage[issuer] = issuerLMVPercentage[issuer] ? issuerLMVPercentage[issuer] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        countryLMVPercentage[country.toLowerCase()] = countryLMVPercentage[country.toLowerCase()] ? countryLMVPercentage[country.toLowerCase()] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        sectorLMVPercentage[sector.toLowerCase()] = sectorLMVPercentage[sector.toLowerCase()] ? sectorLMVPercentage[sector.toLowerCase()] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        ratingLMVPercentage[rating] = ratingLMVPercentage[rating] ? ratingLMVPercentage[rating] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        regionLMVPercentage[region] = regionLMVPercentage[region] ? regionLMVPercentage[region] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        marketTypeLMVPercentage[marketType] = marketTypeLMVPercentage[marketType] ? marketTypeLMVPercentage[marketType] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        assetClassLMVPercentage[assetClass] = assetClassLMVPercentage[assetClass] ? assetClassLMVPercentage[assetClass] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      }

      strategyNAVPercentage[strategy] = strategyNAVPercentage[strategy] ? strategyNAVPercentage[strategy] + usdMarketValue : usdMarketValue;
      issuerNAVPercentage[issuer] = issuerNAVPercentage[issuer] ? issuerNAVPercentage[issuer] + usdMarketValue : usdMarketValue;
      countryNAVPercentage[country.toLowerCase()] = countryNAVPercentage[country.toLowerCase()] ? countryNAVPercentage[country.toLowerCase()] + usdMarketValue : usdMarketValue;
      sectorNAVPercentage[sector.toLowerCase()] = sectorNAVPercentage[sector.toLowerCase()] ? sectorNAVPercentage[sector.toLowerCase()] + usdMarketValue : usdMarketValue;
      ratingNAVPercentage[rating] = ratingNAVPercentage[rating] ? ratingNAVPercentage[rating] + usdMarketValue : usdMarketValue;
      regionNAVPercentage[region] = regionNAVPercentage[region] ? regionNAVPercentage[region] + usdMarketValue : usdMarketValue;
      marketTypeNAVPercentage[marketType] = marketTypeNAVPercentage[marketType] ? marketTypeNAVPercentage[marketType] + usdMarketValue : usdMarketValue;
      assetClassNAVPercentage[assetClass] = assetClassNAVPercentage[assetClass] ? assetClassNAVPercentage[assetClass] + usdMarketValue : usdMarketValue;

      strategyGMVPercentage[strategy] = strategyGMVPercentage[strategy] ? strategyGMVPercentage[strategy] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      issuerGMVPercentage[issuer] = issuerGMVPercentage[issuer] ? issuerGMVPercentage[issuer] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      countryGMVPercentage[country.toLowerCase()] = countryGMVPercentage[country.toLowerCase()] ? countryGMVPercentage[country.toLowerCase()] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      sectorGMVPercentage[sector.toLowerCase()] = sectorGMVPercentage[sector.toLowerCase()] ? sectorGMVPercentage[sector.toLowerCase()] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      ratingGMVPercentage[rating] = ratingGMVPercentage[rating] ? ratingGMVPercentage[rating] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      regionGMVPercentage[region] = regionGMVPercentage[region] ? regionGMVPercentage[region] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      marketTypeGMVPercentage[marketType] = marketTypeGMVPercentage[marketType] ? marketTypeGMVPercentage[marketType] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      assetClassGMVPercentage[assetClass] = assetClassGMVPercentage[assetClass] ? assetClassGMVPercentage[assetClass] + absoulteUsdMarketValue : absoulteUsdMarketValue;

      issuerInformation[issuer] = issuerInformation[issuer] ? issuerInformation[issuer] : { rating: "", country: "" };
      issuerInformation[issuer].rating = rating;

      if (groupedByLocation[locationCode].data[index]["Country"]) {
        issuerInformation[issuer].country = groupedByLocation[locationCode].data[index]["Country"];
      }

      tickerTable[bbTicker] = "";
      if (usdMarketValue > 0) {
        longShort["Long"].dv01Sum += Math.round(parseFloat(groupedByLocation[locationCode].data[index]["DV01"]) || 0);
        longShort["Long"].intSum += Math.round(parseFloat(groupedByLocation[locationCode].data[index]["Day Int. (BC)"]) || 0);
        longShort["Long"].notionalSum += usdMarketValue;
      } else if (usdMarketValue < 0 || groupedByLocation[locationCode].data[index]["Type"] == "CDS") {
        longShort["Short"].dv01Sum += Math.round(parseFloat(groupedByLocation[locationCode].data[index]["DV01"]) || 0);
        longShort["Short"].intSum += Math.round(parseFloat(groupedByLocation[locationCode].data[index]["Day Int. (BC)"]) || 0);
        longShort["Short"].notionalSum += usdMarketValue;
      }

      if (type == "BND" && notional > 0 && strategy == "RV") {
        if (!groupSpreadTZ) {
          groupSpreadTZ = 0;
        }
        groupSpreadTZ += ytw;
        if (!groupEntrySpreadTZ) {
          groupEntrySpreadTZ = 0;
        }
        groupEntrySpreadTZ += entryYtw;
      } else if ((type == "UST" || notional < 0) && strategy == "RV") {
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
      groupCR01Sum += cr01;

      groupMTDIntSum += mtdInt;

      groupYTDIntSum += YTDInt;

      groupDayPriceMoveSum = groupDayPriceMoveSum && groupDayPriceMoveSum < dayPriceMove ? groupDayPriceMoveSum : dayPriceMove;
      groupMTDPriceMoveSum = groupMTDPriceMoveSum && groupMTDPriceMoveSum < mtdPriceMove ? groupMTDPriceMoveSum : mtdPriceMove;

      groupCallDate = groupCallDate && groupCallDate < callDate ? groupCallDate : callDate;
      groupMaturity = groupMaturity && groupMaturity < maturity ? groupMaturity : maturity;

      groupUSDMarketValue += usdMarketValue;
      groupBBTicker += bbTicker;

      groupRating = groupRating < ratingScore ? ratingScore : groupRating;
      groupNotional += notional;
      groupDayInt += dayInt;

      groupedByLocation[locationCode]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;

      groupedByLocation[locationCode]["DV01 Dollar Value Impact % of Nav"] = dv01DollarValueOfNav;
      groupedByLocation[locationCode]["DV01 Dollar Value Impact Limit % of Nav"] = dv01DollarValueLimitOfNav;
      groupedByLocation[locationCode]["DV01 Dollar Value Impact Utilization % of Nav"] = dv01DollarValueLimitUtilization;

      groupedByLocation[locationCode]["CR01 Dollar Value Impact"] += cr01DollarValueImpact;
      groupedByLocation[locationCode]["CR01 Dollar Value Impact % of Nav"] = cr01DollarValueOfNav;
      groupedByLocation[locationCode]["CR01 Dollar Value Impact Limit % of Nav"] = cr01DollarValueLimitOfNav;
      groupedByLocation[locationCode]["CR01 Dollar Value Impact Utilization % of Nav"] = cr01DollarValueLimitUtilization;

      if (duration < 2) {
        durationSummary["0 To 2"].durationSum += duration;
        durationSummary["0 To 2"].dv01Sum += dv01;
      } else if (duration >= 2 && duration < 5) {
        durationSummary["2 To 5"].durationSum += duration;
        durationSummary["2 To 5"].dv01Sum += dv01;
      } else if (duration >= 5 && duration < 10) {
        durationSummary["5 To 10"].durationSum += duration;
        durationSummary["5 To 10"].dv01Sum += dv01;
      } else if (duration >= 10 && duration < 30) {
        durationSummary["10 To 30"].durationSum += duration;
        durationSummary["10 To 30"].dv01Sum += dv01;
      } else if (duration >= 30) {
        durationSummary["> 30"].durationSum += duration;
        durationSummary["> 30"].dv01Sum += dv01;
      }
      durationSummary["Total"].dv01Sum += dv01;

      let pinned = groupedByLocation[locationCode].data[index]["Pin"];
      if (pinned == "pinned") {
        groupedByLocation[locationCode].order = 0;
        // groupedByLocation[locationCode].color = "#f59542";
      }
    }

    groupedByLocation[locationCode].groupDayPl = groupDayPl;
    groupedByLocation[locationCode].groupDV01Sum = groupDV01Sum;
    groupedByLocation[locationCode].groupCR01Sum = groupCR01Sum;

    groupedByLocation[locationCode].groupMaturity = groupMaturity;

    groupedByLocation[locationCode].groupCallDate = groupCallDate;

    groupedByLocation[locationCode].groupMTDIntSum = groupMTDIntSum;

    groupedByLocation[locationCode].groupYTDIntSum = groupYTDIntSum;

    groupedByLocation[locationCode].groupDayPriceMoveSum = groupDayPriceMoveSum;
    groupedByLocation[locationCode].groupMTDPriceMoveSum = groupMTDPriceMoveSum;

    groupedByLocation[locationCode].groupUSDMarketValue = groupUSDMarketValue;
    groupedByLocation[locationCode].groupBBTicker = groupBBTicker;

    groupedByLocation[locationCode].groupMTDPl = groupMTDPl;
    groupedByLocation[locationCode].groupNotional = groupNotional;
    groupedByLocation[locationCode].groupDayInt = groupDayInt;

    groupedByLocation[locationCode].groupEntrySpreadTZ = groupEntrySpreadTZ;
    groupedByLocation[locationCode].groupSpreadTZ = groupSpreadTZ;
  }
}

export function getMacroStats({
  groupedByLocation,
  view,
  countryNAVPercentage,
  sectorNAVPercentage,
  strategyNAVPercentage,
  issuerNAVPercentage,
  ratingNAVPercentage,
  regionNAVPercentage,
  marketTypeNAVPercentage,
  countryGMVPercentage,
  sectorGMVPercentage,
  strategyGMVPercentage,
  issuerGMVPercentage,
  ratingGMVPercentage,
  regionGMVPercentage,
  marketTypeGMVPercentage,
  countryLMVPercentage,
  sectorLMVPercentage,
  strategyLMVPercentage,
  issuerLMVPercentage,
  ratingLMVPercentage,
  regionLMVPercentage,
  marketTypeLMVPercentage,
  assetClassNAVPercentage,
  assetClassGMVPercentage,
  assetClassLMVPercentage,
}: {
  countryNAVPercentage: any;
  sectorNAVPercentage: any;
  strategyNAVPercentage: any;
  groupedByLocation: any;
  view: "front office" | "back office" | "exposure";
  issuerNAVPercentage: any;
  countryGMVPercentage: any;
  sectorGMVPercentage: any;
  strategyGMVPercentage: any;
  issuerGMVPercentage: any;
  countryLMVPercentage: any;
  sectorLMVPercentage: any;
  strategyLMVPercentage: any;
  issuerLMVPercentage: any;
  ratingNAVPercentage: any;
  ratingGMVPercentage: any;
  ratingLMVPercentage: any;
  regionNAVPercentage: any;
  regionGMVPercentage: any;
  regionLMVPercentage: any;
  marketTypeNAVPercentage: any;
  marketTypeGMVPercentage: any;
  marketTypeLMVPercentage: any;
  assetClassNAVPercentage: any;
  assetClassGMVPercentage: any;
  assetClassLMVPercentage: any;
}) {
  for (let locationCode in groupedByLocation) {
    groupedByLocation[locationCode]["DV01 Dollar Value Impact"] = 0;
    groupedByLocation[locationCode]["DV01 Dollar Value Impact % of Nav"] = 0;
    groupedByLocation[locationCode]["DV01 Dollar Value Impact Limit % of Nav"] = 0;
    groupedByLocation[locationCode]["DV01 Dollar Value Impact Utilization % of Nav"] = 0;

    groupedByLocation[locationCode]["CR01 Dollar Value Impact"] = 0;
    groupedByLocation[locationCode]["CR01 Dollar Value Impact % of Nav"] = 0;
    groupedByLocation[locationCode]["CR01 Dollar Value Impact Limit % of Nav"] = 0;
    groupedByLocation[locationCode]["CR01 Dollar Value Impact Utilization % of Nav"] = 0;

    for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
      let country = groupedByLocation[locationCode].data[index]["Country"] ? groupedByLocation[locationCode].data[index]["Country"] : "Unspecified";
      let issuer = groupedByLocation[locationCode].data[index]["Issuer"] ? groupedByLocation[locationCode].data[index]["Issuer"] : "Unspecified";
      let sector = groupedByLocation[locationCode].data[index]["Sector"] ? groupedByLocation[locationCode].data[index]["Sector"] : "Unspecified";
      let strategy = groupedByLocation[locationCode].data[index]["Strategy"];

      let usdMarketValue;
      let dayPl;
      let monthPl;

      let rating = groupedByLocation[locationCode].data[index]["Rating Score"];
      let region = groupedByLocation[locationCode].data[index]["Region"];
      let marketType = groupedByLocation[locationCode].data[index]["Market Type"];
      let assetClass = groupedByLocation[locationCode].data[index]["Asset Class"];

      usdMarketValue = parseFloat(groupedByLocation[locationCode].data[index]["Value (BC)"]) || 0;
      dayPl = parseFloat(groupedByLocation[locationCode].data[index]["Day P&L (BC)"]);
      monthPl = parseFloat(groupedByLocation[locationCode].data[index]["MTD P&L (BC)"]);

      let absoulteUsdMarketValue = Math.abs(usdMarketValue);

      if (usdMarketValue > 0) {
        strategyLMVPercentage[strategy] = strategyLMVPercentage[strategy] ? strategyLMVPercentage[strategy] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        issuerLMVPercentage[issuer] = issuerLMVPercentage[issuer] ? issuerLMVPercentage[issuer] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        countryLMVPercentage[country.toLowerCase()] = countryLMVPercentage[country.toLowerCase()] ? countryLMVPercentage[country.toLowerCase()] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        sectorLMVPercentage[sector.toLowerCase()] = sectorLMVPercentage[sector.toLowerCase()] ? sectorLMVPercentage[sector.toLowerCase()] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        ratingLMVPercentage[rating] = ratingLMVPercentage[rating] ? ratingLMVPercentage[rating] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        regionLMVPercentage[region] = regionLMVPercentage[region] ? regionLMVPercentage[region] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        marketTypeLMVPercentage[marketType] = marketTypeLMVPercentage[marketType] ? marketTypeLMVPercentage[marketType] + absoulteUsdMarketValue : absoulteUsdMarketValue;
        assetClassLMVPercentage[assetClass] = assetClassLMVPercentage[assetClass] ? assetClassLMVPercentage[assetClass] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      }

      strategyNAVPercentage[strategy] = strategyNAVPercentage[strategy] ? strategyNAVPercentage[strategy] + usdMarketValue : usdMarketValue;
      issuerNAVPercentage[issuer] = issuerNAVPercentage[issuer] ? issuerNAVPercentage[issuer] + usdMarketValue : usdMarketValue;
      countryNAVPercentage[country.toLowerCase()] = countryNAVPercentage[country.toLowerCase()] ? countryNAVPercentage[country.toLowerCase()] + usdMarketValue : usdMarketValue;
      sectorNAVPercentage[sector.toLowerCase()] = sectorNAVPercentage[sector.toLowerCase()] ? sectorNAVPercentage[sector.toLowerCase()] + usdMarketValue : usdMarketValue;
      ratingNAVPercentage[rating] = ratingNAVPercentage[rating] ? ratingNAVPercentage[rating] + usdMarketValue : usdMarketValue;
      regionNAVPercentage[region] = regionNAVPercentage[region] ? regionNAVPercentage[region] + usdMarketValue : usdMarketValue;
      marketTypeNAVPercentage[marketType] = marketTypeNAVPercentage[marketType] ? marketTypeNAVPercentage[marketType] + usdMarketValue : usdMarketValue;
      assetClassNAVPercentage[assetClass] = assetClassNAVPercentage[assetClass] ? assetClassNAVPercentage[assetClass] + absoulteUsdMarketValue : absoulteUsdMarketValue;

      strategyGMVPercentage[strategy] = strategyGMVPercentage[strategy] ? strategyGMVPercentage[strategy] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      issuerGMVPercentage[issuer] = issuerGMVPercentage[issuer] ? issuerGMVPercentage[issuer] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      countryGMVPercentage[country.toLowerCase()] = countryGMVPercentage[country.toLowerCase()] ? countryGMVPercentage[country.toLowerCase()] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      sectorGMVPercentage[sector.toLowerCase()] = sectorGMVPercentage[sector.toLowerCase()] ? sectorGMVPercentage[sector.toLowerCase()] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      ratingGMVPercentage[rating] = ratingGMVPercentage[rating] ? ratingGMVPercentage[rating] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      regionGMVPercentage[region] = regionGMVPercentage[region] ? regionGMVPercentage[region] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      marketTypeGMVPercentage[marketType] = marketTypeGMVPercentage[marketType] ? marketTypeGMVPercentage[marketType] + absoulteUsdMarketValue : absoulteUsdMarketValue;
      assetClassGMVPercentage[assetClass] = assetClassGMVPercentage[assetClass] ? assetClassGMVPercentage[assetClass] + absoulteUsdMarketValue : absoulteUsdMarketValue;
    }
  }
}

export function assignBorderAndCustomSortAggregateGroup({ portfolio, groupedByLocation, sort, sign, view }: { portfolio: any; groupedByLocation: any; sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMTDPl" | "groupDV01Sum" | "groupDayPriceMoveSum" | "groupMTDPriceMoveSum" | "groupBBTicker"; sign: any; view: "front office" | "back office" | "exposure" }) {
  try {
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
      RV: new AggregateRow("RV"),
      IG: new AggregateRow("IG"),
      HY: new AggregateRow("HY"),
      "CURR + FUT": new AggregateRow("CURR + FUT"),
      CDS: new AggregateRow("CDS"),
      "Non-Hedge Bonds": new AggregateRow("Non-Hedge Bonds"),
      "Global Hedge": new AggregateRow("Global Hedge"),
      Rlzd: new AggregateRow("Rlzd"),
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
      if (sort !== "groupBBTicker") {
        locationCodes = Object.entries(groupedByLocation)
          .sort((a: any, b: any) => {
            if (a[1]["groupUSDMarketValue"] === 0) return 1;
            if (b[1]["groupUSDMarketValue"] === 0) return -1;
            return sign === -1 ? a[1][sort] - b[1][sort] : b[1][sort] - a[1][sort];
          })
          .map((entry) => entry[0]);
      } else {
        locationCodes = Object.entries(groupedByLocation)
          .sort((a: any, b: any) => {
            if (a[1]["groupUSDMarketValue"] === 0) return 1;
            if (b[1]["groupUSDMarketValue"] === 0) return -1;

            return sign === -1 ? b[1][sort].localeCompare(a[1][sort]) : a[1][sort].localeCompare(b[1][sort]);
          })
          .map((entry) => entry[0]);
      }
    }
    let rowIndexAdditive = 0;

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
      groupedByLocation[locationCode]["Pin"] = "pinned";
      for (let groupPositionIndex = 0; groupPositionIndex < groupedByLocation[locationCode].data.length; groupPositionIndex++) {
        if (groupedByLocation[locationCode].data[groupPositionIndex]["Notional Amount"] == 0) {
          groupedByLocation[locationCode].data[groupPositionIndex]["Color"] = "#C5E1A5";
          //   //no need for borders when rlzd
          //   // continue;
        } else if (isNotInteger(groupedByLocation[locationCode].data[groupPositionIndex]["Notional Amount"])) {
          groupedByLocation[locationCode].data[groupPositionIndex]["Color"] = "red";
        } else {
          groupedByLocation[locationCode].data[groupPositionIndex]["Color"] = groupedByLocation[locationCode].color;
        }

        let length = groupedByLocation[locationCode].data.length;
        if (groupedByLocation[locationCode].data.length > 1) {
          groupedByLocation[locationCode].data[length - 1]["bottom"] = true;
        }
        let bbticker = groupedByLocation[locationCode].data[groupPositionIndex]["BB Ticker"].toString().split(" ");
        totalTicker += bbticker[0] + " " + (bbticker[1] || "") + (groupPositionIndex < length - 1 ? " + " : "");

        if (groupedByLocation[locationCode]["ISIN"]) {
          groupedByLocation[locationCode]["ISIN"] = (groupedByLocation[locationCode]["ISIN"] || "") + "&" + groupedByLocation[locationCode].data[groupPositionIndex]["ISIN"];
        } else {
          groupedByLocation[locationCode]["ISIN"] = groupedByLocation[locationCode].data[groupPositionIndex]["ISIN"];
        }

        if (groupedByLocation[locationCode]["id"]) {
          groupedByLocation[locationCode]["id"] = (groupedByLocation[locationCode]["id"] || "") + "&" + groupedByLocation[locationCode].data[groupPositionIndex]["id"];
        } else {
          groupedByLocation[locationCode]["id"] = groupedByLocation[locationCode].data[groupPositionIndex]["id"];
        }

        if (groupedByLocation[locationCode].data[groupPositionIndex]["Pin"] == "not_pinned") {
          groupedByLocation[locationCode]["Pin"] = "not_pinned";
        }
        if (groupedByLocation[locationCode].data[groupPositionIndex]["Duration"] < 0) {
          groupedByLocation[locationCode].data[groupPositionIndex]["Color"] = "red";
          groupedByLocation[locationCode].data[groupPositionIndex]["Duration"] = 0;
        }
      }

      let portfolioViewType = view;

      let newObject: any = {};
      if (portfolioViewType == "front office") {
        newObject = {
          // Group: totalTicker,
          "BB Ticker": totalTicker,
          Color: "white",
          Location: locationCode,
          "USD Market Value": groupedByLocation[locationCode].groupUSDMarketValue,
          DV01: groupedByLocation[locationCode].groupDV01Sum,
          CR01: groupedByLocation[locationCode].groupCR01Sum,

          "MTD Int. (USD)": groupedByLocation[locationCode].groupMTDIntSum,

          "YTD Int. (USD)": groupedByLocation[locationCode].groupYTDIntSum,

          "Day Price Move": groupedByLocation[locationCode].groupDayPriceMoveSum,

          "MTD Price Move": groupedByLocation[locationCode].groupMTDPriceMoveSum,

          "Day P&L (USD)": groupedByLocation[locationCode].groupDayPl,
          "MTD P&L (USD)": groupedByLocation[locationCode].groupMTDPl,
          "Notional Amount": groupedByLocation[locationCode].groupNotional,
          "Day Int. (USD)": groupedByLocation[locationCode].groupDayInt,

          ISIN: groupedByLocation[locationCode]["ISIN"],
          Pin: groupedByLocation[locationCode]["Pin"],
          id: groupedByLocation[locationCode]["id"],
        };
        if (groupedByLocation[locationCode].groupSpreadTZ || groupedByLocation[locationCode].groupSpreadTZ == 0) {
          newObject["Current Spread (T)"] = Math.round(groupedByLocation[locationCode].groupSpreadTZ * 100);
        }
        if (groupedByLocation[locationCode].groupEntrySpreadTZ || groupedByLocation[locationCode].groupEntrySpreadTZ == 0) {
          newObject["Entry Spread (T)"] = Math.round(groupedByLocation[locationCode].groupEntrySpreadTZ * 100);
        }

        if (groupedByLocation[locationCode].groupMacro == "RV") {
          if (macro["RV"]["Row Index"] < 0 && groupedByLocation[locationCode].order) {
            macro["RV"]["Row Index"] = portfolio.length + rowIndexAdditive;
            rowIndexAdditive++;
          }
          macro["RV"]["USD Market Value"] += groupedByLocation[locationCode].groupUSDMarketValue;
          macro["RV"]["Notional Amount"] += groupedByLocation[locationCode].groupNotional;
          macro["RV"]["Day Int. (USD)"] += groupedByLocation[locationCode].groupDayInt;

          macro["RV"]["DV01"] += groupedByLocation[locationCode].groupDV01Sum;
          macro["RV"]["CR01"] += groupedByLocation[locationCode].groupCR01Sum;

          macro["RV"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["RV"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["RV"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["RV"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
        } else if (groupedByLocation[locationCode].groupMacro == "IG") {
          if (macro["IG"]["Row Index"] < 0 && groupedByLocation[locationCode].order) {
            macro["IG"]["Row Index"] = portfolio.length + rowIndexAdditive;
            rowIndexAdditive = rowIndexAdditive + 1;
          }
          macro["IG"]["USD Market Value"] += groupedByLocation[locationCode].groupUSDMarketValue;
          macro["IG"]["Notional Amount"] += groupedByLocation[locationCode].groupNotional;
          macro["IG"]["DV01"] += groupedByLocation[locationCode].groupDV01Sum;
          macro["IG"]["CR01"] += groupedByLocation[locationCode].groupCR01Sum;

          macro["IG"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["IG"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["IG"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["IG"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
          macro["IG"]["Day Int. (USD)"] += groupedByLocation[locationCode].groupDayInt;
        } else if (groupedByLocation[locationCode].groupMacro == "HY") {
          if (macro["HY"]["Row Index"] < 0 && groupedByLocation[locationCode].order) {
            macro["HY"]["Row Index"] = portfolio.length + rowIndexAdditive;
            rowIndexAdditive++;
          }
          macro["HY"]["USD Market Value"] += groupedByLocation[locationCode].groupUSDMarketValue;
          macro["HY"]["Notional Amount"] += groupedByLocation[locationCode].groupNotional;
          macro["HY"]["DV01"] += groupedByLocation[locationCode].groupDV01Sum;
          macro["HY"]["CR01"] += groupedByLocation[locationCode].groupCR01Sum;

          macro["HY"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["HY"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["HY"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["HY"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
          macro["HY"]["Day Int. (USD)"] += groupedByLocation[locationCode].groupDayInt;
        } else if (groupedByLocation[locationCode].groupMacro == "CURR + FUT") {
          if (macro["CURR + FUT"]["Row Index"] < 0 && groupedByLocation[locationCode].order) {
            macro["CURR + FUT"]["Row Index"] = portfolio.length + rowIndexAdditive;
            rowIndexAdditive++;
          }
          macro["CURR + FUT"]["USD Market Value"] += groupedByLocation[locationCode].groupUSDMarketValue;
          macro["CURR + FUT"]["Notional Amount"] += groupedByLocation[locationCode].groupNotional;
          macro["CURR + FUT"]["DV01"] += groupedByLocation[locationCode].groupDV01Sum;
          macro["CURR + FUT"]["CR01"] += groupedByLocation[locationCode].groupCR01Sum;

          macro["CURR + FUT"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["CURR + FUT"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["CURR + FUT"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["CURR + FUT"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
          macro["CURR + FUT"]["Day Int. (USD)"] += groupedByLocation[locationCode].groupDayInt;
        } else if (groupedByLocation[locationCode].groupMacro == "CDS") {
          if (macro["CDS"]["Row Index"] < 0 && groupedByLocation[locationCode].order) {
            macro["CDS"]["Row Index"] = portfolio.length + rowIndexAdditive;
            rowIndexAdditive++;
          }
          macro["CDS"]["USD Market Value"] += groupedByLocation[locationCode].groupUSDMarketValue;
          macro["CDS"]["Notional Amount"] += groupedByLocation[locationCode].groupNotional;
          macro["CDS"]["DV01"] += groupedByLocation[locationCode].groupDV01Sum;
          macro["CDS"]["CR01"] += groupedByLocation[locationCode].groupCR01Sum;

          macro["CDS"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["CDS"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["CDS"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["CDS"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
          macro["CDS"]["Day Int. (USD)"] += groupedByLocation[locationCode].groupDayInt;
        } else if (groupedByLocation[locationCode].groupMacro == "Global Hedge") {
          if (macro["Global Hedge"]["Row Index"] < 0 && groupedByLocation[locationCode].order) {
            macro["Global Hedge"]["Row Index"] = portfolio.length + rowIndexAdditive;
            rowIndexAdditive++;
          }
          macro["Global Hedge"]["USD Market Value"] += groupedByLocation[locationCode].groupUSDMarketValue;
          macro["Global Hedge"]["Notional Amount"] += groupedByLocation[locationCode].groupNotional;
          macro["Global Hedge"]["DV01"] += groupedByLocation[locationCode].groupDV01Sum;
          macro["Global Hedge"]["CR01"] += groupedByLocation[locationCode].groupCR01Sum;

          macro["Global Hedge"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["Global Hedge"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["Global Hedge"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["Global Hedge"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
          macro["Global Hedge"]["Day Int. (USD)"] += groupedByLocation[locationCode].groupDayInt;
        } else if (groupedByLocation[locationCode].groupMacro == "Rlzd") {
          if (macro["Rlzd"]["Row Index"] < 0 && groupedByLocation[locationCode].order) {
            macro["Rlzd"]["Row Index"] = portfolio.length + rowIndexAdditive;
            rowIndexAdditive++;
          }
          macro["Rlzd"]["USD Market Value"] += groupedByLocation[locationCode].groupUSDMarketValue;
          macro["Rlzd"]["Notional Amount"] += groupedByLocation[locationCode].groupNotional;
          macro["Rlzd"]["DV01"] += groupedByLocation[locationCode].groupDV01Sum;
          macro["Rlzd"]["CR01"] += groupedByLocation[locationCode].groupCR01Sum;

          macro["Rlzd"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["Rlzd"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["Rlzd"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["Rlzd"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
          macro["Rlzd"]["Day Int. (USD)"] += groupedByLocation[locationCode].groupDayInt;
        }
      } else if (portfolioViewType == "exposure") {
        newObject = {
          Group: locationCode,
          Color: "white",
          Location: locationCode,
          "USD Market Value": groupedByLocation[locationCode].groupUSDMarketValue,
          DV01: groupedByLocation[locationCode].groupDV01Sum,
          CR01: groupedByLocation[locationCode].groupCR01Sum,

          "MTD Int. (USD)": groupedByLocation[locationCode].groupMTDIntSum,

          "YTD Int. (USD)": groupedByLocation[locationCode].groupYTDIntSum,
          "Day P&L (USD)": groupedByLocation[locationCode].groupDayPl,
          "Day Price Move": groupedByLocation[locationCode].groupDayPriceMoveSum,

          "MTD Price Move": groupedByLocation[locationCode].groupMTDPriceMoveSum,

          "MTD P&L (USD)": groupedByLocation[locationCode].groupMTDPl,
          "Notional Amount": groupedByLocation[locationCode].groupNotional,
          "Day Int. (USD)": groupedByLocation[locationCode].groupDayInt,

          ISIN: groupedByLocation[locationCode]["ISIN"],
          Pin: groupedByLocation[locationCode]["Pin"],
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
          macro["Global Hedge"]["CR01"] += groupedByLocation[locationCode].groupCR01Sum;

          macro["Global Hedge"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["Global Hedge"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["Global Hedge"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["Global Hedge"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
          macro["Global Hedge"]["Day Int. (USD)"] += groupedByLocation[locationCode].groupDayInt;
        } else if (locationCode == "Rate Sensitive" || locationCode == "Rate Insensitive") {
          if (!nonHedgeIndex) {
            nonHedgeIndex = portfolio.length + 1;
          }
          macro["Non-Hedge Bonds"]["USD Market Value"] += groupedByLocation[locationCode].groupUSDMarketValue;
          macro["Non-Hedge Bonds"]["Notional Amount"] += groupedByLocation[locationCode].groupNotional;
          macro["Non-Hedge Bonds"]["DV01"] += groupedByLocation[locationCode].groupDV01Sum;
          macro["Non-Hedge Bonds"]["CR01"] += groupedByLocation[locationCode].groupCR01Sum;

          macro["Non-Hedge Bonds"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["Non-Hedge Bonds"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["Non-Hedge Bonds"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["Non-Hedge Bonds"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
          macro["Non-Hedge Bonds"]["Day Int. (USD)"] += groupedByLocation[locationCode].groupDayInt;
        } else {
          if (!rvIndex) {
            rvIndex = portfolio.length + 2;
          }
          macro["RV"]["USD Market Value"] += groupedByLocation[locationCode].groupUSDMarketValue;
          macro["RV"]["Notional Amount"] += groupedByLocation[locationCode].groupNotional;
          macro["RV"]["DV01"] += groupedByLocation[locationCode].groupDV01Sum;
          macro["RV"]["CR01"] += groupedByLocation[locationCode].groupCR01Sum;

          macro["RV"]["MTD Int. (USD)"] += groupedByLocation[locationCode].groupMTDIntSum;
          macro["RV"]["YTD Int. (USD)"] += groupedByLocation[locationCode].groupYTDIntSum;

          macro["RV"]["Day P&L (USD)"] += groupedByLocation[locationCode].groupDayPl;
          macro["RV"]["MTD P&L (USD)"] += groupedByLocation[locationCode].groupMTDPl;
          macro["RV"]["Day Int. (USD)"] += groupedByLocation[locationCode].groupDayInt;
        }
      } else if (view == "back office") {
        newObject = {
          Type: "Total",
          Color: "white",
          Location: locationCode,
          "Value (BC)": groupedByLocation[locationCode].groupUSDMarketValue,
          DV01: groupedByLocation[locationCode].groupDV01Sum,
          CR01: groupedByLocation[locationCode].groupCR01Sum,

          "Day P&L (BC)": groupedByLocation[locationCode].groupDayPl,
          "Day Price Move": groupedByLocation[locationCode].groupDayPriceMoveSum,
          "MTD Int. (BC)": groupedByLocation[locationCode].groupMTDIntSum,

          "YTD Int. (BC)": groupedByLocation[locationCode].groupYTDIntSum,
          "MTD Price Move": groupedByLocation[locationCode].groupMTDPriceMoveSum,

          "MTD P&L (BC)": groupedByLocation[locationCode].groupMTDPl,
          "Notional Amount": groupedByLocation[locationCode].groupNotional,
          "Day Int. (BC)": groupedByLocation[locationCode].groupDayInt,
        };

        if (groupedByLocation[locationCode].groupSpreadTZ || groupedByLocation[locationCode].groupSpreadTZ == 0) {
          newObject["Current Spread (T)"] = Math.round(groupedByLocation[locationCode].groupSpreadTZ * 100);
        }
        if (groupedByLocation[locationCode].groupEntrySpreadTZ || groupedByLocation[locationCode].groupEntrySpreadTZ == 0) {
          newObject["Entry Spread (T)"] = Math.round(groupedByLocation[locationCode].groupEntrySpreadTZ * 100);
        }
      }

      if (groupedByLocation[locationCode].data.length > 1) {
        groupedByLocation[locationCode].data.unshift(newObject);
      }

      portfolio.push(...groupedByLocation[locationCode].data);
    }

    if (view == "exposure") {
      portfolio.splice(macroHedgeIndex, 0, macro["Global Hedge"]);
      portfolio.splice(nonHedgeIndex, 0, macro["Non-Hedge Bonds"]);
      portfolio.splice(rvIndex, 0, macro["RV"]);
    }
    if (view == "front office" && sort == "order") {
      let aggregate: ["RV", "IG", "HY", "CURR + FUT", "CDS", "Global Hedge", "Rlzd"] = ["RV", "IG", "HY", "CURR + FUT", "CDS", "Global Hedge", "Rlzd"];
      for (let index = 0; index < aggregate.length; index++) {
        let row: "RV" | "IG" | "HY" | "CURR + FUT" | "CDS" | "Global Hedge" | "Rlzd" = aggregate[index];
        if (macro[row]["Row Index"] >= 0) {
          portfolio.splice(macro[row]["Row Index"], 0, macro[row]);
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
}

export function groupAndSortByLocationAndTypeDefineTables({
  formattedPortfolio,
  nav,
  sort,
  sign,
  view,
  currencies,
  format,
  sortBy,
  fundDetails,
  date,
}: {
  formattedPortfolio: PositionGeneralFormat[];
  nav: number;
  sort: "order" | "groupUSDMarketValue" | "groupDayPl" | "groupMTDPl" | "groupDV01Sum" | "groupDayPriceMoveSum" | "groupMTDPriceMoveSum" | "groupBBTicker";
  sign: number;
  view: "front office" | "exposure" | "back office";
  currencies: any;
  format: "risk" | "summary";
  sortBy: "pl" | null | "price move";
  fundDetails: any;
  date: "string";
}): Analysis {
  let issuerInformation: any = {};

  let countryNAVPercentage: any = {};
  let sectorNAVPercentage: any = {};
  let strategyNAVPercentage: any = {};
  let issuerNAVPercentage: any = {};
  let ratingNAVPercentage: any = {};
  let regionNAVPercentage: any = {};
  let marketTypeNAVPercentage: any = {};
  let assetClassNAVPercentage: any = {};

  let countryGMVPercentage: any = {};
  let sectorGMVPercentage: any = {};
  let strategyGMVPercentage: any = {};
  let issuerGMVPercentage: any = {};
  let ratingGMVPercentage: any = {};
  let regionGMVPercentage: any = {};
  let marketTypeGMVPercentage: any = {};
  let assetClassGMVPercentage: any = {};

  let countryLMVPercentage: any = {};
  let sectorLMVPercentage: any = {};
  let strategyLMVPercentage: any = {};
  let issuerLMVPercentage: any = {};
  let ratingLMVPercentage: any = {};
  let regionLMVPercentage: any = {};
  let marketTypeLMVPercentage: any = {};
  let assetClassLMVPercentage: any = {};

  let longShort = { Long: { dv01Sum: 0, intSum: 0, notionalSum: 0 }, Short: { dv01Sum: 0, intSum: 0, notionalSum: 0 }, Total: { dv01Sum: 0, intSum: 0, notionalSum: 0 } };

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

  let globalHedgeTable: any = {
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
    issuerInformation: issuerInformation,
    globalHedgeTable: globalHedgeTable,
    countryNAVPercentage: countryNAVPercentage,
    sectorNAVPercentage: sectorNAVPercentage,
    strategyNAVPercentage: strategyNAVPercentage,
    issuerNAVPercentage: issuerNAVPercentage,
    ratingNAVPercentage: ratingNAVPercentage,
    regionNAVPercentage: regionNAVPercentage,
    marketTypeNAVPercentage: marketTypeNAVPercentage,

    countryGMVPercentage: countryGMVPercentage,
    sectorGMVPercentage: sectorGMVPercentage,
    strategyGMVPercentage: strategyGMVPercentage,
    issuerGMVPercentage: issuerGMVPercentage,
    ratingGMVPercentage: ratingGMVPercentage,
    regionGMVPercentage: regionGMVPercentage,
    marketTypeGMVPercentage: marketTypeGMVPercentage,

    countryLMVPercentage: countryLMVPercentage,
    sectorLMVPercentage: sectorLMVPercentage,
    strategyLMVPercentage: strategyLMVPercentage,
    issuerLMVPercentage: issuerLMVPercentage,
    ratingLMVPercentage: ratingLMVPercentage,
    regionLMVPercentage: regionLMVPercentage,
    marketTypeLMVPercentage: marketTypeLMVPercentage,

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
    assetClassNAVPercentage: assetClassNAVPercentage,
    assetClassGMVPercentage: assetClassGMVPercentage,
    assetClassLMVPercentage: assetClassLMVPercentage,
  });

  let portfolio: any = [];
  assignBorderAndCustomSortAggregateGroup({ portfolio: portfolio, groupedByLocation: groupedByLocation, sort: sort, sign: sign, view: view });

  let topWorstPerformaners = getTopWorst(groupedByLocation, sortBy);

  getCountrySectorStrategySum(countryNAVPercentage, sectorNAVPercentage, strategyNAVPercentage, issuerNAVPercentage, ratingNAVPercentage, regionNAVPercentage, marketTypeNAVPercentage, assetClassNAVPercentage, fundDetails.nav);

  getCountrySectorStrategySum(countryGMVPercentage, sectorGMVPercentage, strategyGMVPercentage, issuerGMVPercentage, ratingGMVPercentage, regionGMVPercentage, marketTypeGMVPercentage, assetClassGMVPercentage, fundDetails.nav);

  getCountrySectorStrategySum(countryLMVPercentage, sectorLMVPercentage, strategyLMVPercentage, issuerLMVPercentage, ratingLMVPercentage, regionLMVPercentage, marketTypeLMVPercentage, assetClassLMVPercentage, fundDetails.nav);

  let capacity = adjustMarginMultiplier(portfolio, sectorGMVPercentage, issuerNAVPercentage);

  longShort["Total"].dv01Sum = Math.round(longShort["Long"].dv01Sum + longShort["Short"].dv01Sum);
  longShort["Total"].intSum = Math.round(longShort["Long"].intSum + longShort["Short"].intSum);
  longShort["Total"].notionalSum = Math.round(longShort["Long"].notionalSum + longShort["Short"].notionalSum);

  return {
    portfolio: capacity.portfolio,
    duration: durationSummary,
    issuerInformation: issuerInformation,
    capacity: capacity.capacity,

    countryNAVPercentage: sortObjectBasedOnKey(countryNAVPercentage),
    sectorNAVPercentage: sortObjectBasedOnKey(sectorNAVPercentage),
    strategyNAVPercentage: sortObjectBasedOnKey(strategyNAVPercentage),
    issuerNAVPercentage: sortObjectBasedOnKey(issuerNAVPercentage),
    ratingNAVPercentage: sortObjectBasedOnKey(ratingNAVPercentage),
    regionNAVPercentage: sortObjectBasedOnKey(regionNAVPercentage),
    marketTypeNAVPercentage: sortObjectBasedOnKey(marketTypeNAVPercentage),
    assetClassNAVPercentage: sortObjectBasedOnKey(assetClassNAVPercentage),

    countryGMVPercentage: sortObjectBasedOnKey(countryGMVPercentage),
    sectorGMVPercentage: sortObjectBasedOnKey(sectorGMVPercentage),
    strategyGMVPercentage: sortObjectBasedOnKey(strategyGMVPercentage),
    issuerGMVPercentage: sortObjectBasedOnKey(issuerGMVPercentage),
    ratingGMVPercentage: sortObjectBasedOnKey(ratingGMVPercentage),
    regionGMVPercentage: sortObjectBasedOnKey(regionGMVPercentage),
    marketTypeGMVPercentage: sortObjectBasedOnKey(marketTypeGMVPercentage),
    assetClassGMVPercentage: sortObjectBasedOnKey(assetClassGMVPercentage),

    countryLMVPercentage: sortObjectBasedOnKey(countryLMVPercentage),
    sectorLMVPercentage: sortObjectBasedOnKey(sectorLMVPercentage),
    strategyLMVPercentage: sortObjectBasedOnKey(strategyLMVPercentage),
    issuerLMVPercentage: sortObjectBasedOnKey(issuerLMVPercentage),
    ratingLMVPercentage: sortObjectBasedOnKey(ratingLMVPercentage),
    regionLMVPercentage: sortObjectBasedOnKey(regionLMVPercentage),
    marketTypeLMVPercentage: sortObjectBasedOnKey(marketTypeLMVPercentage),
    assetClassLMVPercentage: sortObjectBasedOnKey(assetClassLMVPercentage),

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
    globalHedgeTable: globalHedgeTable,
  };
}

export function getCountrySectorMacroStatistics({ formattedPortfolio, nav, sort, sign, view, currencies, format, sortBy, fundDetails, date }: { formattedPortfolio: PositionGeneralFormat[]; nav: any; sort: any; sign: number; view: "front office" | "exposure" | "back office"; currencies: any; format: "risk" | "summary"; sortBy: "pl" | null | "price move"; fundDetails: any; date: "string" }) {
  // Group objects by location

  let countryNAVPercentage: any = {};
  let sectorNAVPercentage: any = {};
  let strategyNAVPercentage: any = {};
  let issuerNAVPercentage: any = {};
  let ratingNAVPercentage: any = {};
  let regionNAVPercentage: any = {};
  let marketTypeNAVPercentage: any = {};
  let assetClassNAVPercentage: any = {};

  let countryGMVPercentage: any = {};
  let sectorGMVPercentage: any = {};
  let strategyGMVPercentage: any = {};
  let issuerGMVPercentage: any = {};
  let ratingGMVPercentage: any = {};
  let regionGMVPercentage: any = {};
  let marketTypeGMVPercentage: any = {};
  let assetClassGMVPercentage: any = {};

  let countryLMVPercentage: any = {};
  let sectorLMVPercentage: any = {};
  let strategyLMVPercentage: any = {};
  let issuerLMVPercentage: any = {};
  let ratingLMVPercentage: any = {};
  let regionLMVPercentage: any = {};
  let marketTypeLMVPercentage: any = {};
  let assetClassLMVPercentage: any = {};

  const groupedByLocation = formattedPortfolio.reduce((group: any, item: any) => {
    const { Location } = item;
    let notional = item["Notional Amount"];
    let strategy = item["Strategy"];
    let type = item["Type"];
    let durationBucket = item["Duration Bucket"];
    let rate = item["Rate Sensitivity"];
    let assetClass = item["Asset Class"];
    let currency = item["Currency"];
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

  getMacroStats({
    groupedByLocation: groupedByLocation,
    view: view,
    countryNAVPercentage: countryNAVPercentage,
    sectorNAVPercentage: sectorNAVPercentage,
    strategyNAVPercentage: strategyNAVPercentage,
    issuerNAVPercentage: issuerNAVPercentage,
    ratingNAVPercentage: ratingNAVPercentage,
    regionNAVPercentage: regionNAVPercentage,
    marketTypeNAVPercentage: marketTypeNAVPercentage,
    countryGMVPercentage: countryGMVPercentage,
    sectorGMVPercentage: sectorGMVPercentage,
    strategyGMVPercentage: strategyGMVPercentage,
    issuerGMVPercentage: issuerGMVPercentage,
    ratingGMVPercentage: ratingGMVPercentage,
    regionGMVPercentage: regionGMVPercentage,
    marketTypeGMVPercentage: marketTypeGMVPercentage,
    countryLMVPercentage: countryLMVPercentage,
    sectorLMVPercentage: sectorLMVPercentage,
    strategyLMVPercentage: strategyLMVPercentage,
    issuerLMVPercentage: issuerLMVPercentage,
    ratingLMVPercentage: ratingLMVPercentage,
    regionLMVPercentage: regionLMVPercentage,
    marketTypeLMVPercentage: marketTypeLMVPercentage,
    assetClassNAVPercentage: assetClassNAVPercentage,
    assetClassGMVPercentage: assetClassGMVPercentage,
    assetClassLMVPercentage: assetClassLMVPercentage,
  });
  getCountrySectorStrategySum(countryNAVPercentage, sectorNAVPercentage, strategyNAVPercentage, issuerNAVPercentage, ratingNAVPercentage, regionNAVPercentage, marketTypeNAVPercentage, assetClassNAVPercentage, fundDetails.nav);

  getCountrySectorStrategySum(countryGMVPercentage, sectorGMVPercentage, strategyGMVPercentage, issuerGMVPercentage, ratingGMVPercentage, regionGMVPercentage, marketTypeGMVPercentage, assetClassGMVPercentage, fundDetails.nav);

  getCountrySectorStrategySum(countryLMVPercentage, sectorLMVPercentage, strategyLMVPercentage, issuerLMVPercentage, ratingLMVPercentage, regionLMVPercentage, marketTypeLMVPercentage, assetClassLMVPercentage, fundDetails.nav);

  return {
    countryNAVPercentage: sortObjectBasedOnKey(countryNAVPercentage),
    sectorNAVPercentage: sortObjectBasedOnKey(sectorNAVPercentage),
    strategyNAVPercentage: sortObjectBasedOnKey(strategyNAVPercentage),
    issuerNAVPercentage: sortObjectBasedOnKey(issuerNAVPercentage),
    ratingNAVPercentage: sortObjectBasedOnKey(ratingNAVPercentage),
    regionNAVPercentage: sortObjectBasedOnKey(regionNAVPercentage),
    marketTypeNAVPercentage: sortObjectBasedOnKey(marketTypeNAVPercentage),
    assetClassNAVPercentage: sortObjectBasedOnKey(assetClassNAVPercentage),

    countryGMVPercentage: sortObjectBasedOnKey(countryGMVPercentage),
    sectorGMVPercentage: sortObjectBasedOnKey(sectorGMVPercentage),
    strategyGMVPercentage: sortObjectBasedOnKey(strategyGMVPercentage),
    issuerGMVPercentage: sortObjectBasedOnKey(issuerGMVPercentage),
    ratingGMVPercentage: sortObjectBasedOnKey(ratingGMVPercentage),
    regionGMVPercentage: sortObjectBasedOnKey(regionGMVPercentage),
    marketTypeGMVPercentage: sortObjectBasedOnKey(marketTypeGMVPercentage),
    assetClassGMVPercentage: sortObjectBasedOnKey(assetClassGMVPercentage),

    countryLMVPercentage: sortObjectBasedOnKey(countryLMVPercentage),
    sectorLMVPercentage: sortObjectBasedOnKey(sectorLMVPercentage),
    strategyLMVPercentage: sortObjectBasedOnKey(strategyLMVPercentage),
    issuerLMVPercentage: sortObjectBasedOnKey(issuerLMVPercentage),
    ratingLMVPercentage: sortObjectBasedOnKey(ratingLMVPercentage),
    regionLMVPercentage: sortObjectBasedOnKey(regionLMVPercentage),
    marketTypeLMVPercentage: sortObjectBasedOnKey(marketTypeLMVPercentage),
    assetClassLMVPercentage: sortObjectBasedOnKey(assetClassLMVPercentage),
  };
}

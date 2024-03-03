"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFrontEndRiskTable = exports.formatFrontEndSummaryTable = exports.formatSummaryPosition = exports.calculateMTDCost = exports.calculateRlzd = exports.formatFrontEndTable = exports.formatGeneralTable = void 0;
const common_1 = require("./common");
const portfolioFunctions_1 = require("./portfolioFunctions");
const reports_1 = require("./reports");
function oasWithChange(oas) {
    if (oas < 50) {
        return [30, 30];
    }
    else if (oas >= 50 && oas < 100) {
        return [40, 40];
    }
    else if (oas >= 100 && oas < 150) {
        return [50, 50];
    }
    else if (oas >= 150 && oas < 250) {
        return [75, 75];
    }
    else if (oas >= 250 && oas < 400) {
        return [100, 100];
    }
    else if (oas >= 400) {
        return [parseFloat(oas) * 0.25, "25 % of spread"];
    }
}
function formatGeneralTable(portfolio, date, fund, dates) {
    let currencies = {};
    let formatted = [];
    let dv01Sum = 0;
    let mtdpl = 0, mtdrlzd = 0, mtdurlzd = 0, mtdint = 0, dayint = 0, daypl = 0, dayfx = 0, mtdfx = 0, dayurlzd = 0, dayrlzd = 0, nmv = 0, lmv = 0, smv = 0;
    for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        let originalFace = position["Original Face"] || 1;
        let usdRatio = parseFloat(position["FX Rate"] || position["holdPortfXrate"]) || 1;
        let holdBackRatio = (position["Asset Class"] || position["Rating Class"]) == "Illiquid" ? parseFloat(fund.holdBackRatio) : 1;
        position["Quantity"] = position["Notional Amount"] / originalFace;
        if (!position["BB Ticker"]) {
            position["BB Ticker"] = position["Issue"];
        }
        position["Coupon Rate"] = position["Coupon Rate"] ? position["Coupon Rate"] : (0, portfolioFunctions_1.parseBondIdentifier)(position["BB Ticker"]).rate || 0;
        let bondDivider = position["Type"] == "BND" || position["Type"] == "UST" ? 100 : 1;
        if (!position["Type"]) {
            position["Type"] = position["BB Ticker"].split(" ")[0] == "T" || position["Issuer"] == "US TREASURY N/B" ? "UST" : "BND";
        }
        let currency = position["Currency"];
        if (!position["FX Rate"]) {
            if (currencies[currency]) {
                usdRatio = currencies[currency];
            }
        }
        else {
            if (position["Notional Amount"] != 0) {
                currencies[currency] = usdRatio;
            }
        }
        position["FX Rate"] = usdRatio;
        position["Asset Class"] = position["Asset Class"] ? position["Asset Class"] : position["Rating Class"] ? position["Rating Class"] : "";
        if ((!position["Asset Class"] || position["Asset Class"] == "") && position["BBG Composite Rating"]) {
            position["Asset Class"] = isRatingHigherThanBBBMinus(position["BBG Composite Rating"]);
        }
        if (position["Notional Amount"] < 0) {
            position["Asset Class"] = "Hedge";
        }
        if (position["Type"] == "BND" && position["Strategy"] == "RV") {
            position["Asset Class"] = "IG";
        }
        position["Cost (BC)"] = position["Type"] == "CDS" ? Math.round((position["Average Cost"] * position["Notional Amount"] * usdRatio) / position["Original Face"]) : Math.round(position["Average Cost"] * position["Notional Amount"] * usdRatio);
        position["FX Rate"] = Math.round(position["FX Rate"] * 1000) / 1000;
        position["Value (LC)"] = position["Type"] == "CDS" ? Math.round((position["Notional Amount"] * position["Mid"]) / originalFace) || 0 : Math.round(position["Notional Amount"] * position["Mid"]) || 0;
        position["Value (BC)"] = position["Type"] == "CDS" ? Math.round((position["Notional Amount"] * position["Mid"] * usdRatio) / originalFace) || 0 : Math.round(position["Notional Amount"] * position["Mid"] * usdRatio) || 0;
        if (position["Value (BC)"] > 0) {
            lmv += position["Value (BC)"];
        }
        else {
            smv += position["Value (BC)"];
        }
        nmv += position["Value (BC)"];
        position["Mid"] = Math.round(position["Mid"] * 1000 * bondDivider) / 1000;
        position["Bid"] = Math.round(position["Bid"] * 1000 * bondDivider) / 1000;
        position["Ask"] = Math.round(position["Ask"] * 1000 * bondDivider) / 1000;
        position["Average Cost"] = position["Type"] == "UST" || position["Type"] == "BND" ? Math.round(position["Average Cost"] * 100) : Math.round(position["Average Cost"] * 100) / 100;
        position["YTM"] = (Math.round(position["YTM"] * 100) / 100 || 0) + " %" || "0 %";
        position["CR01"] = "0";
        position["MTD Rlzd"] = position["MTD Rlzd"] ? position["MTD Rlzd"] : 0;
        position["MTD Mark"] = position["Type"] == "UST" || position["Type"] == "BND" ? Math.round(position["MTD Mark"] * 1000) / 10 : Math.round(position["MTD Mark"] * 1000) / 1000;
        position["Day Rlzd"] = position["Day Rlzd"] ? position["Day Rlzd"] : 0;
        position["Previous Mark"] = position["Type"] == "UST" || position["Type"] == "BND" ? Math.round(position["Previous Mark"] * 1000) / 10 : Math.round(position["Previous Mark"] * 1000) / 1000;
        if (!position["Previous FX"]) {
            position["Previous FX"] = position["FX Rate"];
        }
        if (position["BB Ticker"].includes("CDS")) {
            position["Day P&L FX"] = Math.round(((parseFloat(position["FX Rate"]) - parseFloat(position["Previous FX"])) / parseFloat(position["Previous FX"])) * position["Notional Amount"] * holdBackRatio * 1000000) / 1000000 || 0;
            position["MTD P&L FX"] = Math.round(((parseFloat(position["FX Rate"]) - parseFloat(position["MTD FX"] || position["FX Rate"])) / parseFloat(position["MTD FX"] || position["FX Rate"])) * position["Notional Amount"] * holdBackRatio * 1000000) / 1000000 || 0;
        }
        else {
            position["Day P&L FX"] = Math.round(((parseFloat(position["FX Rate"]) - parseFloat(position["Previous FX"])) / parseFloat(position["Previous FX"])) * position["Notional Amount"] * holdBackRatio * 1000000) / 1000000;
            position["MTD P&L FX"] = (Math.round(((parseFloat(position["FX Rate"]) - parseFloat(position["MTD FX"] || position["FX Rate"])) / parseFloat(position["MTD FX"] || position["FX Rate"])) * position["Notional Amount"] * holdBackRatio) * 1000000) / 1000000 || 0;
        }
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
        position["MTD Rlzd (BC)"] = Math.round(position["MTD Rlzd"] * usdRatio * holdBackRatio);
        position["MTD URlzd (BC)"] = Math.round(position["MTD URlzd"] * usdRatio * holdBackRatio);
        position["MTD P&L (BC)"] = Math.round(position["MTD P&L"] * usdRatio * holdBackRatio + position["MTD P&L FX"]);
        // position["MTD Cost (LC)"] = Math.round(position["MTD Cost"] * holdBackRatio * 1000000) / 1000000;
        position["Cost (LC)"] = Math.round(position["Average Cost"] * position["Notional Amount"] * holdBackRatio);
        position["Cost MTD (LC)"] = position["Cost MTD"];
        position["Average Cost"] = Math.round(position["Average Cost"]);
        position["Day Int. (LC)"] = Math.round(position["Day Int."] * holdBackRatio);
        position["Day Rlzd (LC)"] = Math.round(position["Day Rlzd"] * holdBackRatio);
        position["Day URlzd (LC)"] = Math.round(position["Day URlzd"] * holdBackRatio);
        position["Day P&L (LC)"] = Math.round(position["Day P&L"] * holdBackRatio);
        position["Day Int. (BC)"] = Math.round(position["Day Int."] * usdRatio * holdBackRatio);
        position["Day Rlzd (BC)"] = Math.round(position["Day Rlzd"] * usdRatio * holdBackRatio);
        position["Day URlzd (BC)"] = Math.round(position["Day URlzd"] * usdRatio * holdBackRatio);
        position["Day P&L (BC)"] = Math.round(position["Day P&L"] * usdRatio * holdBackRatio + position["Day P&L FX"]);
        position["ISIN"] = position["ISIN"];
        position["Maturity"] = position["Maturity"] ? position["Maturity"] : (0, portfolioFunctions_1.getMaturity)(position["BB Ticker"]) || 0;
        position["Call Date"] = position["Call Date"] ? position["Call Date"] : 0;
        position["L/S"] = position["Notional Amount"] > 0 && position["Type"] != "CDS" ? "Long" : position["Notional Amount"] == 0 && position["Type"] != "CDS" ? "Rlzd" : "Short";
        position["Duration"] = yearsUntil(position["Call Date"] ? position["Call Date"] : position["Maturity"], date);
        position["Coupon Duration"] = position["Coupon Duration"] ? position["Coupon Duration"] : position["Type"] == "UST" ? 365.0 : 360.0;
        position["Issuer"] = position["Issuer"] == "0" ? "" : position["Issuer"];
        position["DV01"] = (position["DV01"] / 1000000) * position["Notional Amount"] * usdRatio;
        position["DV01"] = Math.round(position["DV01"] * 100) / 100 || 0;
        position["OAS"] = (position["OAS"] / 1000000) * position["Notional Amount"] * usdRatio;
        position["OAS"] = Math.round(position["OAS"] * 100) / 100 || 0;
        position["OAS W Change"] = oasWithChange(position["OAS"])[0];
        position["Spread Change"] = oasWithChange(position["OAS"])[1];
        position["DV01 Dollar Value Impact"] = Math.round(position["OAS W Change"] * position["DV01"]);
        position["DV01 Dollar Value Impact % of Nav"] = Math.round(((position["DV01 Dollar Value Impact"] * position["OAS W Change"]) / fund.nav) * 10000) / 100;
        position["DV01 Dollar Value Impact Limit % of Nav"] = position["Value (BC)"] / fund.nav > 10 ? 2 : 1.5;
        position["DV01 Dollar Value Impact Utilization % of Nav"] = Math.round((position["DV01 Dollar Value Impact % of Nav"] / position["DV01 Dollar Value Impact Limit % of Nav"]) * 10000) / 100;
        position["DV01 Dollar Value Impact Test"] = Math.abs(position["DV01 Dollar Value Impact Utilization % of Nav"]) < 100 ? "Pass" : "Fail";
        position["DV01 Dollar Value Impact Color Test"] = position["DV01 Dollar Value Impact Test"] == "Pass" ? "#C5E1A5" : "#FFAB91";
        position["Value (BC) % of Nav"] = Math.round((position["Value (BC)"] / fund.nav) * 10000) / 100;
        position["Value (BC) Limit % of Nav"] = Math.abs(position["Value (BC) % of Nav"]) > 10 ? 15 : 10;
        position["Value (BC) Utilization % of Nav"] = Math.round((position["Value (BC) % of Nav"] / position["Value (BC) Limit % of Nav"]) * 10000) / 100;
        position["Value (BC) Test"] = Math.abs(position["Value (BC) Utilization % of Nav"]) < 100 ? "Pass" : "Fail";
        position["Value (BC) Color Test"] = position["Value (BC) Test"] == "Pass" ? "#C5E1A5" : "#FFAB91";
        position["Capital Gain/ Loss since Inception (Live Position)"] = position["Value (BC)"] - position["Cost (BC)"];
        let shortLongType = position["Value (BC)"] > 0 ? 1 : -1;
        position["% of Capital Gain/ Loss since Inception (Live Position)"] = Math.round((position["Value (BC)"] / position["Cost (BC)"] - 1) * shortLongType * 100) / 100;
        position["Accrued Int. Since Inception"] = (0, reports_1.calculateAccruedSinceInception)(position["Interest"], position["Coupon Rate"] / 100, position["Coupon Duration"]);
        position["Total Gain/ Loss (USD)"] = Math.round(position["Capital Gain/ Loss since Inception (Live Position)"] + position["Accrued Int. Since Inception"]);
        position["% of Total Gain/ Loss since Inception (Live Position)"] = Math.round(((position["Total Gain/ Loss (USD)"] + position["Cost (BC)"]) / position["Cost (BC)"] - 1) * shortLongType * 100) / 100;
        position["Z Spread"] = (position["Z Spread"] / 1000000) * position["Notional Amount"] * usdRatio;
        position["Z Spread"] = Math.round(position["Z Spread"] * 1000000) / 1000000 || 0;
        let latestDateKey;
        latestDateKey = Object.keys(position["Interest"]).sort((a, b) => {
            // Parse the date strings into actual date objects
            const dateA = new Date(a).getTime();
            const dateB = new Date(b).getTime();
            // Compare the dates to sort them
            return dateB - dateA; // This will sort in descending order
        })[0]; // Take the first item after sorting
        const latestDate = latestDateKey ? new Date(latestDateKey) : null;
        position["Last Day Since Realizd"] = position["Notional Amount"] == 0 ? (0, common_1.formatDateWorld)(latestDate) : null;
        mtdpl += position["MTD P&L (BC)"];
        mtdrlzd += position["MTD Rlzd (BC)"];
        mtdurlzd += position["MTD URlzd (BC)"];
        mtdint += position["MTD Int. (BC)"];
        dayint += position["Day Int. (BC)"];
        daypl += position["Day P&L (BC)"];
        dayfx += position["Day P&L FX"];
        mtdfx += position["MTD P&L FX"];
        dayurlzd += position["Day URlzd (BC)"];
        dayrlzd += position["Day Rlzd (BC)"];
        dv01Sum += position["DV01"];
    }
    let monthGross = Math.round((mtdpl / parseFloat(fund.nav)) * 100000) / 1000;
    let dayGross = Math.round((daypl / parseFloat(fund.nav)) * 100000) / 1000;
    let dayFXGross = Math.round((dayfx / parseFloat(fund.nav)) * 100000) / 1000;
    let mtdFXGross = Math.round((mtdfx / parseFloat(fund.nav)) * 100000) / 1000;
    let fundDetails = {
        nav: parseFloat(fund.nav),
        holdbackRatio: parseFloat(fund.holdBackRatio),
        mtdGross: monthGross,
        dayGross: dayGross,
        dayFXGross: dayFXGross,
        mtdFXGross: mtdFXGross,
        mtdpl: Math.round(mtdpl * 1000) / 1000,
        mtdrlzd: Math.round(mtdrlzd * 1000) / 1000,
        mtdurlzd: Math.round(mtdurlzd * 1000) / 1000,
        mtdint: Math.round(mtdint * 1000) / 1000,
        dayint: Math.round(dayint * 1000) / 1000,
        mtdintPercentage: Math.round((mtdint / parseFloat(fund.nav)) * 100000) / 1000,
        dayintPercentage: Math.round((dayint / parseFloat(fund.nav)) * 100000) / 1000,
        daypl: Math.round(daypl * 1000) / 1000,
        dayfx: Math.round(dayfx * 1000) / 1000,
        mtdfx: Math.round(mtdfx * 1000) / 1000,
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
    };
    return { portfolio: portfolio, fundDetails: fundDetails, currencies: currencies };
}
exports.formatGeneralTable = formatGeneralTable;
function formatFrontEndTable(portfolio, date, fund, dates, sort, sign) {
    let formattedPortfolio = formatGeneralTable(portfolio, date, fund, dates);
    let analyzedPortfolio = groupAndSortByLocationAndTypeDefineTables(formattedPortfolio.portfolio, formattedPortfolio.fundDetails.nav, sort, sign, "backOffice", formattedPortfolio.currencies, "summary");
    return { portfolio: analyzedPortfolio.portfolio, fundDetails: formattedPortfolio.fundDetails, analysis: analyzedPortfolio };
}
exports.formatFrontEndTable = formatFrontEndTable;
function yearsUntil(dateString, dateInput) {
    // Parse the date string and create a new Date object
    if (dateString == 0 || dateString == "0") {
        return 0;
    }
    let dateComponents = dateString.split("/");
    dateString = dateComponents[1] + "/" + dateComponents[0] + "/" + dateComponents[2];
    let date = new Date(dateString).getTime();
    // Get the current date
    const now = new Date(dateInput).getTime();
    // Calculate the difference in milliseconds
    const diff = date - now;
    // Convert the difference from milliseconds to years
    let years = diff / (1000 * 60 * 60 * 24 * 365.25);
    // If the difference is negative (i.e., the date is in the future), take the absolute value
    if (years < 0) {
        years = 0;
    }
    // Round to two decimal places and return
    return Math.round(years * 100) / 100;
}
function calculateRlzd(trades, mark, issue) {
    let total = 0;
    for (let index = 0; index < trades.length; index++) {
        let trade = trades[index];
        let price = trade.price;
        let quantity = trade.quantity;
        let rlzdTrade = (price - mark) * quantity;
        total += rlzdTrade;
    }
    return total;
}
exports.calculateRlzd = calculateRlzd;
function calculateMTDCost(trades, mark, issue) {
    let total = 0;
    for (let index = 0; index < trades.length; index++) {
        let trade = trades[index];
        let price = trade.price;
        let quantity = trade.quantity;
        let rlzdTrade = (price - mark) * quantity;
        total += rlzdTrade;
    }
    return total;
}
exports.calculateMTDCost = calculateMTDCost;
function formatMarkDate(date) {
    date = new Date(date);
    let day = date.getDate().toString();
    let month = (date.getMonth() + 1).toString(); // getMonth() is zero-based
    let year = date.getFullYear().toString().substr(-2); // get only the last two digits of the year
    // Ensuring day and month are two digits by adding a leading '0' if necessary
    day = day.length < 2 ? "0" + day : day;
    month = month.length < 2 ? "0" + month : month;
    return `${month}/${day}/${year}`;
}
function formatSummaryPosition(position, fundDetails, dates) {
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
        `Last Mid ${formatMarkDate(dates.today)}`,
        "Spread (Z/T)",
        "YTM",
        "Day P&L (USD)",
        "Duration",
        "DV01",
        "Call Date",
        "BBG / S&P / Moody / Fitch Rating",
        "Day P&L %",
        "MTD P&L (USD)",
        "MTD P&L %",
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
        "Accrued Int. Since Inception",
        "Total Gain/ Loss (USD)",
        "% of Total Gain/ Loss since Inception (Live Position)",
        "Coupon Rate",
        // "Notional Amount",
    ];
    let titlesValues = {
        Type: "Type",
        "L/S": "L/S",
        Strategy: "Strategy",
        "Asset Class": "Asset Class",
        "Call Date": "Call Date",
        Location: "Location",
        "BB Ticker": "BB Ticker",
        "Notional Amount": "Notional Amount",
        Notional: "Notional Amount",
        "USD Market Value": "Value (BC)",
        Maturity: "Maturity",
        "% of NAV": "% of NAV",
        YTM: "YTM",
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
        "Accrued Int. Since Inception": "Accrued Int. Since Inception",
        "Value (BC) Test": "Value (BC) Test",
        "Value (BC) Color Test": "Value (BC) Color Test",
        "Capital Gain/ Loss since Inception (Live Position)": "Capital Gain/ Loss since Inception (Live Position)",
        "% of Capital Gain/ Loss since Inception (Live Position)": "% of Capital Gain/ Loss since Inception (Live Position)",
        "Total Gain/ Loss (USD)": "Total Gain/ Loss (USD)",
        "% of Total Gain/ Loss since Inception (Live Position)": "% of Total Gain/ Loss since Inception (Live Position)",
        "Coupon Rate": "Coupon Rate",
    };
    let twoDigits = [`${formatMarkDate(dates.lastMonth)}`, `${formatMarkDate(dates.yesterday)}`, `Last Mid ${formatMarkDate(dates.today)}`, "Bid", "Ask", "Duration", "Average Cost"];
    // titlesValues[formatMarkDate(dates.lastMonth)] = "MTD Mark";
    // titlesValues[formatMarkDate(dates.yesterday)] = "Previous Mark";
    titlesValues[`Last Mid ${formatMarkDate(dates.today)}`] = "Mid";
    let object = {};
    for (let titleIndex = 0; titleIndex < titles.length; titleIndex++) {
        let title = titles[titleIndex];
        if (isFinite(position[titlesValues[title]]) && position[titlesValues[title]] != null && position[titlesValues[title]] != "") {
            if (!twoDigits.includes(title)) {
                object[title] = Math.round(position[titlesValues[title]]);
            }
            else {
                object[title] = parseFloat(position[titlesValues[title]]).toFixed(2);
            }
        }
        else {
            object[title] = position[titlesValues[title]];
        }
    }
    object["Day P&L %"] = ((object["Day P&L (USD)"] / fundDetails.nav) * 100).toFixed(2) + " %";
    object["MTD P&L %"] = ((object["MTD P&L (USD)"] / fundDetails.nav) * 100).toFixed(2) + " %";
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
    object["Value (BC) % of GMV"] = Math.abs(Math.round((position["Value (BC)"] / fundDetails.gmv) * 10000) / 100);
    object[`BBG / S&P / Moody / Fitch Rating`] = (position["BBG Composite Rating"] || "NR") + " " + (position["S&P Bond Rating"] || "NR") + " " + (position["Moody's Bond Rating"] || "NR") + " " + (position["Fitch Bond Rating"] || "NR") + " ";
    object["Spread (Z/T)"] = position["Z Spread"].toFixed(0);
    return object;
}
exports.formatSummaryPosition = formatSummaryPosition;
function formatFrontEndSummaryTable(portfolio, date, fund, dates, sort, sign) {
    let formattedPortfolio = formatGeneralTable(portfolio, date, fund, dates);
    let formatted = [];
    let test = 0;
    for (let formattedPortfolioIndex = 0; formattedPortfolioIndex < formattedPortfolio.portfolio.length; formattedPortfolioIndex++) {
        let unformattedPosition = formattedPortfolio.portfolio[formattedPortfolioIndex];
        let formattedPosition = formatSummaryPosition(unformattedPosition, formattedPortfolio.fundDetails, dates);
        formatted.push(formattedPosition);
    }
    let analyzedPortfolio = groupAndSortByLocationAndTypeDefineTables(formatted, formattedPortfolio.fundDetails.nav, sort, sign, "frontOffice", formattedPortfolio.currencies, "summary");
    return { portfolio: analyzedPortfolio.portfolio, fundDetails: formattedPortfolio.fundDetails, analysis: analyzedPortfolio };
}
exports.formatFrontEndSummaryTable = formatFrontEndSummaryTable;
function formatFrontEndRiskTable(portfolio, date, fund, dates, sort, sign) {
    let formattedPortfolio = formatGeneralTable(portfolio, date, fund, dates);
    let formatted = [];
    let test = 0;
    for (let formattedPortfolioIndex = 0; formattedPortfolioIndex < formattedPortfolio.portfolio.length; formattedPortfolioIndex++) {
        let unformattedPosition = formattedPortfolio.portfolio[formattedPortfolioIndex];
        let formattedPosition = formatSummaryPosition(unformattedPosition, formattedPortfolio.fundDetails, dates);
        formatted.push(formattedPosition);
    }
    let analyzedPortfolio = groupAndSortByLocationAndTypeDefineTables(formatted, formattedPortfolio.fundDetails.nav, sort, sign, "frontOffice", formattedPortfolio.currencies, "risk");
    return { portfolio: analyzedPortfolio.portfolio, fundDetails: formattedPortfolio.fundDetails, analysis: analyzedPortfolio };
}
exports.formatFrontEndRiskTable = formatFrontEndRiskTable;
function getDuration(duration) {
    duration = parseFloat(duration);
    if (duration < 2) {
        return "0 To 2";
    }
    else if (duration >= 2 && duration < 5) {
        return "2 To 5";
    }
    else if (duration >= 5 && duration < 10) {
        return "5 To 10";
    }
    else if (duration >= 10 && duration < 30) {
        return "10 To 30";
    }
    else if (duration >= 30) {
        return "> 30";
    }
}
function getSectorAssetClass(issue, sector) {
    if (issue.toLocaleLowerCase().includes("perp")) {
        if (sector) {
            if (sector.toLocaleLowerCase().includes("bank")) {
                return "FINS Perps";
            }
            else {
                return "Corps Perps";
            }
        }
        else {
            return "Corps Perps";
        }
    }
    else {
        return "Bonds";
    }
}
function sumTable(table, data, view, param, subtotal = false, subtotalParam = "") {
    let dv01DollarValueImpact = parseFloat(data["DV01 Dollar Value Impact"]);
    let dv01DollarValueOfNav = parseFloat(data["DV01 Dollar Value Impact % of Nav"]);
    let dv01DollarValueLimitOfNav = parseFloat(data["DV01 Dollar Value Impact Limit % of Nav"]);
    let dv01DollarValueLimitUtilization = parseFloat(data["DV01 Dollar Value Impact Utilization % of Nav"]);
    let dv01DollarValueImpactTest = data["DV01 Dollar Value Impact Test"];
    let valueUSDOfNav = parseFloat(data["Value (BC) % of Nav"]);
    let valueUSDOfGmv = data["Value (BC) % of GMV"];
    let valueUSDLimitOfNav = parseFloat(data["Value (BC) Limit % of Nav"]);
    let valueUSDUtilizationOfNav = parseFloat(data["Value (BC) Utilization % of Nav"]);
    let valueUSDOfNavTest = data["Value (BC) Test"];
    let capitalGains = parseFloat(data["Capital Gain/ Loss since Inception (Live Position)"]);
    let capitalGainsPercentage = parseFloat(data["% of Capital Gain/ Loss since Inception (Live Position)"]);
    let accruedInterestSinceInception = parseFloat(data["Accrued Int. Since Inception"]);
    let totalCaptialGains = parseFloat(data["Total Gain/ Loss (USD)"]);
    let totalCaptialGainsPercentage = parseFloat(data["% of Total Gain/ Loss since Inception (Live Position)"]);
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
    let isin = data["ISIN"];
    let strategy = data["Strategy"];
    if (view == "frontOffice") {
        usdMarketValue = parseFloat(data["USD Market Value"]) || 0;
        dayPl = parseFloat(data["Day P&L (USD)"]);
        monthPl = parseFloat(data["MTD P&L (USD)"]);
    }
    else {
        usdMarketValue = parseFloat(data["Value (BC)"]) || 0;
        dayPl = parseFloat(data["Day P&L (BC)"]);
        monthPl = parseFloat(data["MTD P&L (BC)"]);
    }
    table[param + " Aggregated"] = table[param + " Aggregated"]
        ? table[param + " Aggregated"]
        : {
            DV01Sum: 0,
            MTDPL: 0,
            DayPL: 0,
            net: 0,
            gross: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "DV01 Dollar Value Impact Test": 0,
            "Value (BC) Test": 0,
            "DV01 Dollar Value Impact Color Test": 0,
            "Value (BC) Color Test": 0,
            "Notional Amount": 0,
        };
    table[param + " Aggregated"].DV01Sum += dv01;
    table[param + " Aggregated"].MTDPL += monthPl;
    table[param + " Aggregated"].groupUSDMarketValue += usdMarketValue;
    table[param + " Aggregated"].DayPL += dayPl;
    table[param + " Aggregated"].oasSum += oasSum;
    table[param + " Aggregated"].zSpreadSum += zSpreadSum;
    table[param + " Aggregated"].oasWChangeSum += oasWChangeSum;
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
    table[param + " Aggregated"]["Accrued Int. Since Inception"] += accruedInterestSinceInception;
    table[param + " Aggregated"]["Total Gain/ Loss (USD)"] += totalCaptialGains;
    table[param + " Aggregated"]["% of Total Gain/ Loss since Inception (Live Position)"] += totalCaptialGainsPercentage;
    table[param + " Aggregated"]["Notional Amount"] += notional;
    table["Total"] = table["Total"]
        ? table["Total"]
        : {
            DV01Sum: 0,
            MTDPL: 0,
            DayPL: 0,
            net: 0,
            gross: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "DV01 Dollar Value Impact Test": 0,
            "Value (BC) Test": 0,
            "DV01 Dollar Value Impact Color Test": 0,
            "Notional Amount": 0,
            "Value (BC) Color Test": 0,
        };
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
    table["Total"]["Accrued Int. Since Inception"] += accruedInterestSinceInception;
    table["Total"]["Total Gain/ Loss (USD)"] += totalCaptialGains;
    table["Total"]["% of Total Gain/ Loss since Inception (Live Position)"] += totalCaptialGainsPercentage;
    table["Total"]["Notional Amount"] += notional;
    table["Total"].DV01Sum += dv01;
    table["Total"].MTDPL += monthPl;
    table["Total"].DayPL += dayPl;
    table["Total"].groupUSDMarketValue += usdMarketValue;
    table["Total"].oasSum += oasSum;
    table["Total"].zSpreadSum += zSpreadSum;
    table["Total"].oasWChangeSum += oasWChangeSum;
    if (subtotal) {
        table[subtotalParam] = table[subtotalParam]
            ? table[subtotalParam]
            : {
                DV01: 0,
                "MTD P&L (USD)": 0,
                "Day P&L (USD)": 0,
                OAS: 0,
                "Z Spread": 0,
                "OAS W Change": 0,
                "DV01 Dollar Value Impact": 0,
                "DV01 Dollar Value Impact % of Nav": 0,
                "DV01 Dollar Value Impact Limit % of Nav": 0,
                "DV01 Dollar Value Impact Utilization % of Nav": 0,
                "Value (BC) % of Nav": 0,
                "Value (BC) % of GMV": 0,
                "Value (BC) Limit % of Nav": 0,
                "Value (BC) Utilization % of Nav": 0,
                "Capital Gain/ Loss since Inception (Live Position)": 0,
                "% of Capital Gain/ Loss since Inception (Live Position)": 0,
                "Accrued Int. Since Inception": 0,
                "Total Gain/ Loss (USD)": 0,
                "% of Total Gain/ Loss since Inception (Live Position)": 0,
                "Notional Amount": 0,
                "USD Market Value": 0,
                Duration: 0,
            };
        table[subtotalParam][strategy] = table[subtotalParam][strategy]
            ? table[subtotalParam][strategy]
            : {
                DV01: 0,
                "MTD P&L (USD)": 0,
                "Day P&L (USD)": 0,
                OAS: 0,
                "Z Spread": 0,
                "OAS W Change": 0,
                "DV01 Dollar Value Impact": 0,
                "DV01 Dollar Value Impact % of Nav": 0,
                "DV01 Dollar Value Impact Limit % of Nav": 0,
                "DV01 Dollar Value Impact Utilization % of Nav": 0,
                "Value (BC) % of Nav": 0,
                "Value (BC) % of GMV": 0,
                "Value (BC) Limit % of Nav": 0,
                "Value (BC) Utilization % of Nav": 0,
                "Capital Gain/ Loss since Inception (Live Position)": 0,
                "% of Capital Gain/ Loss since Inception (Live Position)": 0,
                "Accrued Int. Since Inception": 0,
                "Total Gain/ Loss (USD)": 0,
                "% of Total Gain/ Loss since Inception (Live Position)": 0,
                "Notional Amount": 0,
                "USD Market Value": 0,
                Duration: 0,
            };
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
        table[subtotalParam]["Accrued Int. Since Inception"] += accruedInterestSinceInception;
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
        table[subtotalParam][strategy]["Accrued Int. Since Inception"] += accruedInterestSinceInception;
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
    }
    else {
        table[param] = table[param] ? table[param] : [];
        table[param].push(data);
    }
}
function assignColorAndSortParamsBasedOnAssetClass(pairHedgeNotional, pairIGNotional, pairHedgeDV01Sum, pairIGDV01Sum, globalHedgeNotional, singleIGNotional, globalHedgeDV01Sum, singleIGDV01Sum, hedgeCurrencyNotional, HYNotional, HYDV01Sum, cdsNotional, countryNAVPercentage, sectorNAVPercentage, strategyNAVPercentage, longShortDV01Sum, durationSummary, groupedByLocation, view, ustTable, igTable, hyTable, currTable, issuerTable, ustTableByCoupon, issuerNAVPercentage, rvPairTable, tickerTable) {
    for (let locationCode in groupedByLocation) {
        groupedByLocation[locationCode].order = sortSummary(locationCode, groupedByLocation[locationCode].data);
        if (groupedByLocation[locationCode].order == 1) {
            groupedByLocation[locationCode].color = "#FEEBED";
            for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
                let duration = getDuration(groupedByLocation[locationCode].data[index]["Duration"]);
                let couponRate = groupedByLocation[locationCode].data[index]["Coupon Rate"] + " %";
                let notional = groupedByLocation[locationCode].data[index]["Notional Amount"];
                let issue = groupedByLocation[locationCode].data[index]["BB Ticker"];
                sumTable(rvPairTable, groupedByLocation[locationCode].data[index], view, locationCode);
                if (notional < 0) {
                    sumTable(ustTableByCoupon, groupedByLocation[locationCode].data[index], view, couponRate);
                    sumTable(ustTable, groupedByLocation[locationCode].data[index], view, duration, true, issue);
                }
            }
        }
        else if (groupedByLocation[locationCode].order == 2) {
            groupedByLocation[locationCode].color = "#E1BEE7";
            for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
                singleIGNotional += groupedByLocation[locationCode].data[index]["Notional Amount"] || 0;
                singleIGDV01Sum += groupedByLocation[locationCode].data[index]["DV01"] || 0;
                sumTable(igTable, groupedByLocation[locationCode].data[index], view, null);
            }
        }
        else if (groupedByLocation[locationCode].order == 3) {
            groupedByLocation[locationCode].color = "#C5CAE9";
            for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
                HYNotional += groupedByLocation[locationCode].data[index]["Notional Amount"] || 0;
                HYDV01Sum += groupedByLocation[locationCode].data[index]["DV01"] || 0;
                sumTable(hyTable, groupedByLocation[locationCode].data[index], view, null);
            }
        }
        else if (groupedByLocation[locationCode].order == 4) {
            groupedByLocation[locationCode].color = "#FFF9C4";
            for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
                hedgeCurrencyNotional += groupedByLocation[locationCode].data[index]["Notional Amount"] || 0;
                let currency = groupedByLocation[locationCode].data[index]["ISIN"].includes("IB") ? groupedByLocation[locationCode].data[index]["Security Description"] : groupedByLocation[locationCode].data[index]["Currency"];
                if (!currency) {
                    currency = "Bonds";
                }
                sumTable(currTable, groupedByLocation[locationCode].data[index], view, currency);
            }
        }
        else if (groupedByLocation[locationCode].order == 5) {
            groupedByLocation[locationCode].color = "#FFF9C4";
            for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
                hedgeCurrencyNotional += groupedByLocation[locationCode].data[index]["Notional Amount"] || 0;
                let currency = groupedByLocation[locationCode].data[index]["ISIN"].includes("IB") ? groupedByLocation[locationCode].data[index]["Security Description"] : groupedByLocation[locationCode].data[index]["Currency"];
                if (!currency) {
                    currency = "Bonds";
                }
                sumTable(currTable, groupedByLocation[locationCode].data[index], view, currency);
            }
        }
        else if (groupedByLocation[locationCode].order == 6) {
            groupedByLocation[locationCode].color = "#FFF9C4";
            for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
                hedgeCurrencyNotional += groupedByLocation[locationCode].data[index]["Notional Amount"] || 0;
                let currency = groupedByLocation[locationCode].data[index]["ISIN"].includes("IB") ? groupedByLocation[locationCode].data[index]["Security Description"] : groupedByLocation[locationCode].data[index]["Currency"];
                if (!currency) {
                    currency = "Bonds";
                }
                sumTable(currTable, groupedByLocation[locationCode].data[index], view, currency);
            }
        }
        else if (groupedByLocation[locationCode].order == 7) {
            groupedByLocation[locationCode].color = "#CE93D8";
            for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
                cdsNotional += groupedByLocation[locationCode].data[index]["Notional Amount"] || 0;
            }
        }
        else if (groupedByLocation[locationCode].order == 8) {
            groupedByLocation[locationCode].color = "#E8F5E9";
            for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
                let duration = getDuration(groupedByLocation[locationCode].data[index]["Duration"]);
                let couponRate = groupedByLocation[locationCode].data[index]["Coupon Rate"] + " %";
                let notional = groupedByLocation[locationCode].data[index]["Notional Amount"];
                let issue = groupedByLocation[locationCode].data[index]["BB Ticker"];
                if (notional < 0) {
                    sumTable(ustTableByCoupon, groupedByLocation[locationCode].data[index], view, couponRate);
                    sumTable(ustTable, groupedByLocation[locationCode].data[index], view, duration, true, issue);
                }
            }
        }
        else if (groupedByLocation[locationCode].order == 9) {
            groupedByLocation[locationCode].color = "#9FA8DA";
            for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) { }
        }
        else if (groupedByLocation[locationCode].order == 10) {
            groupedByLocation[locationCode].color = "#E5D1B4";
            for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) { }
        }
        else if (groupedByLocation[locationCode].order == 11) {
            groupedByLocation[locationCode].color = "#C5E1A5";
        }
        let groupDayPl = 0, groupMonthlyPl = 0, groupDV01Sum = 0, groupUSDMarketValue = 0, groupDuration = 0, groupRating = -99, groupOAS = 0, groupOASWChange = 0, groupZSpread = 0, groupNotional = 0;
        groupedByLocation[locationCode]["DV01 Dollar Value Impact"] = 0;
        groupedByLocation[locationCode]["DV01 Dollar Value Impact % of Nav"] = 0;
        groupedByLocation[locationCode]["DV01 Dollar Value Impact Limit % of Nav"] = 0;
        groupedByLocation[locationCode]["DV01 Dollar Value Impact Utilization % of Nav"] = 0;
        for (let index = 0; index < groupedByLocation[locationCode].data.length; index++) {
            let country = groupedByLocation[locationCode].data[index]["Country"] ? groupedByLocation[locationCode].data[index]["Country"] : "Unspecified";
            let issuer = groupedByLocation[locationCode].data[index]["Issuer"] ? groupedByLocation[locationCode].data[index]["Issuer"] : "Unspecified";
            let bbTicker = groupedByLocation[locationCode].data[index]["BB Ticker"] ? groupedByLocation[locationCode].data[index]["BB Ticker"] : "Unspecified";
            let sector = groupedByLocation[locationCode].data[index]["Sector"] ? groupedByLocation[locationCode].data[index]["Sector"] : "Unspecified";
            let duration = parseFloat(groupedByLocation[locationCode].data[index]["Duration"]) || 0;
            let dv01 = parseFloat(groupedByLocation[locationCode].data[index]["DV01"]) || 0;
            let notional = parseFloat(groupedByLocation[locationCode].data[index]["Notional Amount"]) || 0;
            let strategy = groupedByLocation[locationCode].data[index]["Strategy"];
            let ratingScore = groupedByLocation[locationCode].data[index]["Rating Score"];
            let usdMarketValue;
            let dayPl;
            let monthPl;
            let oasSum = parseFloat(groupedByLocation[locationCode].data[index]["OAS"]);
            let zSpreadSum = parseFloat(groupedByLocation[locationCode].data[index]["Z Spread"]);
            let oasWChangeSum = parseFloat(groupedByLocation[locationCode].data[index]["OAS W Change"]);
            let dv01DollarValueImpact = parseFloat(groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact"]);
            let dv01DollarValueOfNav = parseFloat(groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact % of Nav"]);
            let dv01DollarValueLimitOfNav = parseFloat(groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact Limit % of Nav"]);
            let dv01DollarValueLimitUtilization = parseFloat(groupedByLocation[locationCode].data[index]["DV01 Dollar Value Impact Utilization % of Nav"]);
            if (view == "frontOffice") {
                usdMarketValue = parseFloat(groupedByLocation[locationCode].data[index]["USD Market Value"]) || 0;
                dayPl = parseFloat(groupedByLocation[locationCode].data[index]["Day P&L (USD)"]);
                monthPl = parseFloat(groupedByLocation[locationCode].data[index]["MTD P&L (USD)"]);
            }
            else {
                usdMarketValue = parseFloat(groupedByLocation[locationCode].data[index]["Value (BC)"]) || 0;
                dayPl = parseFloat(groupedByLocation[locationCode].data[index]["Day P&L (BC)"]);
                monthPl = parseFloat(groupedByLocation[locationCode].data[index]["MTD P&L (BC)"]);
            }
            strategyNAVPercentage[strategy] = strategyNAVPercentage[strategy] ? strategyNAVPercentage[strategy] + usdMarketValue : usdMarketValue;
            issuerNAVPercentage[issuer] = issuerNAVPercentage[issuer] ? issuerNAVPercentage[issuer] + usdMarketValue : usdMarketValue;
            tickerTable[bbTicker] = "";
            if (usdMarketValue > 0) {
                countryNAVPercentage[country.toLowerCase()] = countryNAVPercentage[country.toLowerCase()] ? countryNAVPercentage[country.toLowerCase()] + usdMarketValue : usdMarketValue;
                sectorNAVPercentage[sector.toLowerCase()] = sectorNAVPercentage[sector.toLowerCase()] ? sectorNAVPercentage[sector.toLowerCase()] + usdMarketValue : usdMarketValue;
                longShortDV01Sum["Long"] += Math.round(parseFloat(groupedByLocation[locationCode].data[index]["DV01"]) || 0);
            }
            else if (usdMarketValue < 0) {
                longShortDV01Sum["Short"] += Math.round(parseFloat(groupedByLocation[locationCode].data[index]["DV01"]) || 0);
            }
            groupDayPl += dayPl;
            groupMonthlyPl += monthPl;
            groupDV01Sum += dv01;
            groupUSDMarketValue += usdMarketValue;
            groupDuration += duration;
            groupRating = groupRating < ratingScore ? ratingScore : groupRating;
            groupOAS += oasSum;
            groupOASWChange += oasWChangeSum;
            groupZSpread += zSpreadSum;
            groupNotional += notional;
            groupedByLocation[locationCode]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
            groupedByLocation[locationCode]["DV01 Dollar Value Impact % of Nav"] = dv01DollarValueOfNav;
            groupedByLocation[locationCode]["DV01 Dollar Value Impact Limit % of Nav"] = dv01DollarValueLimitOfNav;
            groupedByLocation[locationCode]["DV01 Dollar Value Impact Utilization % of Nav"] = dv01DollarValueLimitUtilization;
            if (duration < 2) {
                durationSummary["0 To 2"].durationSum += duration;
                durationSummary["0 To 2"].dv01Sum += dv01;
                durationSummary["0 To 2"].dv01Sum = Math.round(durationSummary["0 To 2"].dv01Sum * 1);
            }
            else if (duration >= 2 && duration < 5) {
                durationSummary["2 To 5"].durationSum += duration;
                durationSummary["2 To 5"].dv01Sum += dv01;
                durationSummary["2 To 5"].dv01Sum = Math.round(durationSummary["2 To 5"].dv01Sum * 100) / 100;
            }
            else if (duration >= 5 && duration < 10) {
                durationSummary["5 To 10"].durationSum += duration;
                durationSummary["5 To 10"].dv01Sum += dv01;
                durationSummary["5 To 10"].dv01Sum = Math.round(durationSummary["5 To 10"].dv01Sum * 100) / 100;
            }
            else if (duration >= 10 && duration < 30) {
                durationSummary["10 To 30"].durationSum += duration;
                durationSummary["10 To 30"].dv01Sum += dv01;
                durationSummary["10 To 30"].dv01Sum = Math.round(durationSummary["10 To 30"].dv01Sum * 100) / 100;
            }
            else if (duration >= 30) {
                durationSummary["> 30"].durationSum += duration;
                durationSummary["> 30"].dv01Sum += dv01;
                durationSummary["> 30"].dv01Sum = Math.round(durationSummary["> 30"].dv01Sum * 100) / 100;
            }
        }
        groupedByLocation[locationCode].groupDayPl = groupDayPl;
        groupedByLocation[locationCode].groupDV01Sum = groupDV01Sum;
        groupedByLocation[locationCode].groupUSDMarketValue = groupUSDMarketValue;
        groupedByLocation[locationCode].groupMonthlyPl = groupMonthlyPl;
        groupedByLocation[locationCode].groupDuration = groupDuration;
        groupedByLocation[locationCode].groupRating = groupRating;
        groupedByLocation[locationCode].groupOAS = groupOAS;
        groupedByLocation[locationCode].groupOASWChange = groupOASWChange;
        groupedByLocation[locationCode].groupNotional = groupNotional;
        groupedByLocation[locationCode].groupZSpread = groupZSpread;
    }
}
function getTopWorst(groupedByLocation) {
    let entries = Object.entries(groupedByLocation).map(([key, value]) => ({
        key,
        groupDayPl: value.groupDayPl,
        groupMonthlyPl: value.groupMonthlyPl,
        data: value.data,
    }));
    // Step 2: Sort the array based on the `groupPL` property
    entries = entries.filter((object, index) => object["key"] != "Rlzd");
    entries.sort((a, b) => b.groupDayPl - a.groupDayPl);
    // Step 3: Select the top 5 and worst 5 entries
    const top5Day = entries.slice(0, 5);
    let worst5Day = entries.slice(-5).sort((a, b) => a.groupDayPl - b.groupDayPl);
    entries.sort((a, b) => b.groupMonthlyPl - a.groupMonthlyPl);
    // Step 4: Map the selected entries to retrieve their `data` values
    const top5Monthly = entries.slice(0, 5);
    let worst5Monthly = entries.slice(-5);
    worst5Monthly = worst5Monthly.sort((a, b) => a.groupMonthlyPl - b.groupMonthlyPl);
    let topWorstPerformaners = {
        top5Day: top5Day,
        worst5Day: worst5Day,
        top5Monthly: top5Monthly,
        worst5Monthly: worst5Monthly,
    };
    return topWorstPerformaners;
}
function getCountrySectorStrategySum(countryNAVPercentage, sectorNAVPercentage, strategyNAVPercentage, issuerNAVPercentage, nav) {
    let countries = Object.keys(countryNAVPercentage);
    let sectors = Object.keys(sectorNAVPercentage);
    let strategies = Object.keys(strategyNAVPercentage);
    let issuers = Object.keys(issuerNAVPercentage);
    let sumCountryLong = 0, sumStrategy = 0, sumSectorLong = 0, sumIssuer = 0;
    for (let index = 0; index < countries.length; index++) {
        if (countryNAVPercentage[countries[index]]) {
            countryNAVPercentage[toTitleCase(countries[index])] = Math.round((countryNAVPercentage[countries[index]] / nav) * 10000) / 100;
            sumCountryLong += countryNAVPercentage[toTitleCase(countries[index])];
            delete countryNAVPercentage[countries[index]];
        }
        else {
            delete countryNAVPercentage[countries[index]];
        }
    }
    for (let index = 0; index < sectors.length; index++) {
        if (sectorNAVPercentage[sectors[index]]) {
            sectorNAVPercentage[toTitleCase(sectors[index])] = Math.round((sectorNAVPercentage[sectors[index]] / nav) * 10000) / 100;
            sumSectorLong += sectorNAVPercentage[toTitleCase(sectors[index])];
            delete sectorNAVPercentage[sectors[index]];
        }
        else {
            delete sectorNAVPercentage[sectors[index]];
        }
    }
    for (let index = 0; index < strategies.length; index++) {
        if (strategyNAVPercentage[strategies[index]]) {
            strategyNAVPercentage[strategies[index]] = Math.round((strategyNAVPercentage[strategies[index]] / nav) * 10000) / 100;
            sumStrategy += strategyNAVPercentage[strategies[index]];
        }
        else {
            delete strategyNAVPercentage[strategies[index]];
        }
    }
    for (let index = 0; index < issuers.length; index++) {
        if (issuerNAVPercentage[issuers[index]]) {
            issuerNAVPercentage[issuers[index]] = Math.round((issuerNAVPercentage[issuers[index]] / nav) * 10000) / 100;
            sumIssuer += issuerNAVPercentage[issuers[index]];
        }
        else {
            delete issuerNAVPercentage[issuers[index]];
        }
    }
    return {
        sumCountryLong: sumCountryLong,
        sumStrategy: sumStrategy,
        sumSectorLong: sumSectorLong,
        sumIssuer: sumIssuer,
    };
}
function assignBorderAndCustomSortAggregateGroup(portfolio, groupedByLocation, sort, sign) {
    sign = parseFloat(sign);
    if (sort == "order") {
        //because order should be descending
        sign = -1 * sign;
    }
    const locationCodes = Object.entries(groupedByLocation)
        .sort((a, b) => (sign == -1 ? a[1][`${sort}`] - b[1][`${sort}`] : b[1][`${sort}`] - a[1][`${sort}`]))
        .map((entry) => entry[0]);
    for (let index = 0; index < locationCodes.length; index++) {
        let locationCode = locationCodes[index];
        groupedByLocation[locationCode].data.sort((a, b) => {
            // Assuming "L/S" is a number that can be directly compared
            if (a["L/S"] < b["L/S"]) {
                return -1; // a comes first
            }
            else if (a["L/S"] > b["L/S"]) {
                return 1; // b comes first
            }
            return 0; // a and b are equal
        });
        for (let groupPositionIndex = 0; groupPositionIndex < groupedByLocation[locationCode].data.length; groupPositionIndex++) {
            if (groupedByLocation[locationCode].data[groupPositionIndex]["Notional Amount"] == 0) {
                groupedByLocation[locationCode].data[groupPositionIndex]["Color"] = "#C5E1A5";
                //   //no need for borders when rlzd
                //   // continue;
            }
            else {
                groupedByLocation[locationCode].data[groupPositionIndex]["Color"] = groupedByLocation[locationCode].color;
            }
            if (groupedByLocation[locationCode].data.length > 1) {
                let length = groupedByLocation[locationCode].data.length;
                groupedByLocation[locationCode].data[length - 1]["bottom"] = true;
            }
        }
        if (groupedByLocation[locationCode].data.length > 1) {
            let portfolioViewType = groupedByLocation[locationCode].data[groupedByLocation[locationCode].data.length - 1]["_id"] ? "backOffice" : "frontOffice";
            let newObject = {};
            if (portfolioViewType == "frontOffice") {
                newObject = {
                    "L/S": "Total",
                    Color: "white",
                    Location: locationCode,
                    "USD Market Value": groupedByLocation[locationCode].groupUSDMarketValue,
                    DV01: groupedByLocation[locationCode].groupDV01Sum,
                    "Day P&L (USD)": groupedByLocation[locationCode].groupDayPl,
                    "MTD P&L (USD)": groupedByLocation[locationCode].groupMonthlyPl,
                    Duration: groupedByLocation[locationCode].groupDuration,
                    OAS: groupedByLocation[locationCode].groupOAS,
                    "OAS W Change": groupedByLocation[locationCode].groupOASWChange,
                    "Notional Amount": groupedByLocation[locationCode].groupNotional,
                    "Z Spread": groupedByLocation[locationCode].groupZSpread,
                    "Rating Score": groupedByLocation[locationCode].groupRating,
                };
            }
            else {
                newObject = {
                    Type: "Total",
                    Color: "white",
                    Location: locationCode,
                    "Value (BC)": groupedByLocation[locationCode].groupUSDMarketValue,
                    DV01: groupedByLocation[locationCode].groupDV01Sum,
                    "Day P&L (BC)": groupedByLocation[locationCode].groupDayPl,
                    "MTD P&L (BC)": groupedByLocation[locationCode].groupMonthlyPl,
                    Duration: groupedByLocation[locationCode].groupDuration,
                    OAS: groupedByLocation[locationCode].groupOAS,
                    "OAS W Change": groupedByLocation[locationCode].groupOASWChange,
                    "Notional Amount": groupedByLocation[locationCode].groupNotional,
                    "Z Spread": groupedByLocation[locationCode].groupZSpread,
                    "Rating Score": groupedByLocation[locationCode].groupRating,
                };
            }
            groupedByLocation[locationCode].data.unshift(newObject);
        }
        portfolio.push(...groupedByLocation[locationCode].data);
    }
}
function groupAndSortByLocationAndTypeDefineTables(formattedPortfolio, nav, sort, sign, view, currencies, format) {
    // Group objects by location
    let pairHedgeNotional = 0, pairIGNotional = 0, pairHedgeDV01Sum = 0, pairIGDV01Sum = 0, globalHedgeNotional = 0, singleIGNotional = 0, globalHedgeDV01Sum = 0, singleIGDV01Sum = 0, hedgeCurrencyNotional = 0, HYNotional = 0, HYDV01Sum = 0, cdsNotional = 0;
    let countryNAVPercentage = {};
    let sectorNAVPercentage = {};
    let strategyNAVPercentage = {};
    let issuerNAVPercentage = {};
    let longShortDV01Sum = { Long: 0, Short: 0, Total: 0 };
    let durationSummary = {
        "0 To 2": { durationSum: 0, dv01Sum: 0 },
        "2 To 5": { durationSum: 0, dv01Sum: 0 },
        "5 To 10": { durationSum: 0, dv01Sum: 0 },
        "10 To 30": { durationSum: 0, dv01Sum: 0 },
        "> 30": { durationSum: 0, dv01Sum: 0 },
        Total: { durationSum: 0, dv01Sum: 0 },
    };
    let ustTable = {
        "0 To 2": {},
        "0 To 2 Aggregated": {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
        "2 To 5": {},
        "2 To 5 Aggregated": {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
        "5 To 10": {},
        "5 To 10 Aggregated": {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
        "10 To 30": {},
        "10 To 30 Aggregated": {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
        "> 30": {},
        "> 30 Aggregated": {
            DayPl: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
        Total: {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Color Test": "#C5E1A5",
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
    };
    let ustTableByCoupon = {
        Total: {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Color Test": "#C5E1A5",
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
    };
    let igTable = {
        Bonds: [],
        "Bonds Aggregated": {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Color Test": "#C5E1A5",
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
        "FINS Perps": [],
        "FINS Perps Aggregated": {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Test": "Pass",
            "Value (BC) Color Test": "#C5E1A5",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
        "Corps Perps": [],
        "Corps Perps Aggregated": {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Utilization % of Nav": 0,
            "Value (BC) Color Test": "#C5E1A5",
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
        Total: {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Color Test": "#C5E1A5",
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
    };
    let hyTable = {
        Bonds: [],
        "Bonds Aggregated": {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Color Test": "#C5E1A5",
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
        "FINS Perps": [],
        "FINS Perps Aggregated": {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Color Test": "#C5E1A5",
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
        "Corps Perps": [],
        "Corps Perps Aggregated": {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Color Test": "#C5E1A5",
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
        Total: {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Color Test": "#C5E1A5",
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
    };
    let currTable = {
        Total: {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Color Test": "#C5E1A5",
            "Notional Amount": 0,
        },
    };
    let issuerTable = {
        Total: {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Color Test": "#C5E1A5",
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
    };
    let rvPairTable = {
        Total: {
            DayPL: 0,
            MTDPL: 0,
            DV01Sum: 0,
            groupUSDMarketValue: 0,
            oasSum: 0,
            zSpreadSum: 0,
            oasWChangeSum: 0,
            "DV01 Dollar Value Impact": 0,
            "DV01 Dollar Value Impact % of Nav": 0,
            "DV01 Dollar Value Impact Limit % of Nav": 0,
            "DV01 Dollar Value Impact Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Test": "Pass",
            "Value (BC) % of Nav": 0,
            "Value (BC) % of GMV": 0,
            "Value (BC) Limit % of Nav": 0,
            "Value (BC) Utilization % of Nav": 0,
            "DV01 Dollar Value Impact Color Test": "#C5E1A5",
            "Value (BC) Color Test": "#C5E1A5",
            "Value (BC) Test": "Pass",
            "Capital Gain/ Loss since Inception (Live Position)": 0,
            "% of Capital Gain/ Loss since Inception (Live Position)": 0,
            "Accrued Int. Since Inception": 0,
            "Total Gain/ Loss (USD)": 0,
            "% of Total Gain/ Loss since Inception (Live Position)": 0,
            "Notional Amount": 0,
        },
    };
    let tickerTable = {};
    const groupedByLocation = formattedPortfolio.reduce((group, item) => {
        const { Location } = item;
        let notional = item["Notional Amount"];
        let rlzdTimestamp = new Date(item["Last Day Since Realizd"]).getTime();
        if (notional != 0) {
            group[Location] = group[Location] ? group[Location] : { data: [] };
            group[Location].data.push(item);
            return group;
        }
        else {
            group[Location + " Rlzd"] = group[Location + " Rlzd"] ? group[Location + " Rlzd"] : { data: [], "Last Day Since Realizd": 0 };
            if (rlzdTimestamp > group[Location + " Rlzd"]["Last Day Since Realizd"]) {
                group[Location + " Rlzd"]["Last Day Since Realizd"] = rlzdTimestamp;
            }
            group[Location + " Rlzd"].data.push(item);
            return group;
        }
    }, {});
    assignColorAndSortParamsBasedOnAssetClass(pairHedgeNotional, pairIGNotional, pairHedgeDV01Sum, pairIGDV01Sum, globalHedgeNotional, singleIGNotional, globalHedgeDV01Sum, singleIGDV01Sum, hedgeCurrencyNotional, HYNotional, HYDV01Sum, cdsNotional, countryNAVPercentage, sectorNAVPercentage, strategyNAVPercentage, longShortDV01Sum, durationSummary, groupedByLocation, view, ustTable, igTable, hyTable, currTable, issuerTable, ustTableByCoupon, issuerNAVPercentage, rvPairTable, tickerTable);
    let portfolio = [];
    assignBorderAndCustomSortAggregateGroup(portfolio, groupedByLocation, sort, sign);
    // This is your already sorted array of objects
    // Filter out the items with L/S !== 'rlzd'
    // const nonRlzdItems = portfolio.filter((item: any) => item["L/S"] !== "Rlzd"&& item["Location"] !== "Rlzd");
    // Filter out the items with L/S === 'rlzd' and sort them by lastDate
    // const rlzdItems = portfolio
    //   .filter((item: any) => item["Notional Amount"] === 0 && (item["Type"] !== "Total" || item["Location"] == "Rlzd"))
    //   .sort((a: any, b: any) => {
    //     // Assuming lastDate is in a format that can be parsed by the Date constructor
    //     const dateA = new Date(a["Last Day Since Realizd"]).getTime();
    //     const dateB = new Date(b["Last Day Since Realizd"]).getTime();
    //     return dateB - dateA; // Use dateB - dateA for descending order
    //   });
    // Assuming the rest of the array should remain in its original order, recombine the arrays
    let updatedPortfolio = portfolio;
    // if (format == "risk") {
    //   updatedPortfolio = [...nonRlzdItems];
    // } else {
    //   updatedPortfolio = [...nonRlzdItems, ...rlzdItems];
    // }
    let topWorstPerformaners = getTopWorst(groupedByLocation);
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
    let params = getCountrySectorStrategySum(countryNAVPercentage, sectorNAVPercentage, strategyNAVPercentage, issuerNAVPercentage, nav);
    let sumCountryLong = params.sumCountryLong, sumStrategy = params.sumStrategy, sumSectorLong = params.sumSectorLong, sumIssuer = params.sumIssuer;
    countryNAVPercentage["Total"] = Math.round(sumCountryLong * 10) / 10;
    sectorNAVPercentage["Total"] = Math.round(sumSectorLong * 10) / 10;
    strategyNAVPercentage["Total"] = Math.round(sumStrategy * 10) / 10;
    issuerNAVPercentage["Total"] = Math.round(sumIssuer * 10) / 10;
    durationSummary["Total"].dv01Sum = Math.round(durationSummary["0 To 2"].dv01Sum + durationSummary["2 To 5"].dv01Sum + durationSummary["5 To 10"].dv01Sum + durationSummary["10 To 30"].dv01Sum + durationSummary["> 30"].dv01Sum);
    longShortDV01Sum["Total"] = Math.round(longShortDV01Sum["Long"] + longShortDV01Sum["Short"]);
    return {
        portfolio: updatedPortfolio,
        duration: durationSummary,
        countryNAVPercentage: sortObjectBasedOnKey(countryNAVPercentage),
        sectorNAVPercentage: sortObjectBasedOnKey(sectorNAVPercentage),
        strategyNAVPercentage: sortObjectBasedOnKey(strategyNAVPercentage),
        issuerNAVPercentage: sortObjectBasedOnKey(issuerNAVPercentage),
        riskAssessment: riskAssessment,
        topWorstPerformaners: topWorstPerformaners,
        longShortDV01Sum: longShortDV01Sum,
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
function sortSummary(locationCode, group) {
    let assetClassOrder = {
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
    try {
        let rlzd = 0, type = "";
        let unrlzdPositionsNum = group.filter((position) => position["Notional Amount"] != 0).length;
        for (let index = 0; index < group.length; index++) {
            let position = group[index];
            if (position["Notional Amount"] != 0) {
                if (!position["Type"]) {
                    return assetClassOrder.undefined;
                }
                if ((position["Type"].includes("UST") || position["Strategy"] == "RV") && position["Notional Amount"] <= 0 && unrlzdPositionsNum > 1) {
                    return assetClassOrder.UST_HEDGE;
                }
                if (position["Type"].includes("FUT") && position["Notional Amount"] <= 0 && unrlzdPositionsNum > 1) {
                    return assetClassOrder.CURR_HEDGE;
                }
                if (position["Type"].includes("UST") && position["Notional Amount"] <= 0 && unrlzdPositionsNum == 1) {
                    return assetClassOrder.UST_GLOBAL;
                }
                if (position["Type"] == "FUT" && position["Notional Amount"] <= 0) {
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
                    type = "IG";
                }
                if (position["Asset Class"] == "HY" && type != "IG") {
                    type = "HY";
                }
                //if one of them is not rlzd, then its not appliacable
                rlzd = 1;
            }
            else {
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
    }
    catch (error) {
        console.log(error);
        return assetClassOrder.undefined;
    }
}
function sortObjectBasedOnKey(object) {
    return Object.keys(object)
        .sort((a, b) => object[b] - object[a])
        .reduce((acc, key) => ({ ...acc, [key]: object[key] }), {});
}
function toTitleCase(str) {
    return str
        .toLowerCase()
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
function areDatesInSameMonthAndYear(customDate, todaysDate) {
    return new Date(customDate).getMonth() === new Date(todaysDate).getMonth() && new Date(customDate).getFullYear() === new Date(todaysDate).getFullYear();
}
function isRatingHigherThanBBBMinus(rating) {
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
        "BBB-",
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
function bbgRating(rating) {
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
        "BBB-",
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
function moodyRating(rating) {
    const ratings = ["Aaa", "Aa1", "Aa2", "Aa3", "A1", "A2", "A3", "Baa1", "Baa2", "Baa3", "Ba1", "Ba2", "Ba3", "B1", "B2", "B3", "Caa1", "Caa2", "Caa3", "Ca", "C"];
    const index = ratings.indexOf(rating);
    if (index !== -1) {
        return -index;
    }
    return "";
}

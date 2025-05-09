"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFrontEndRiskReport = exports.formatFrontEndTable = void 0;
function formatFrontEndTable(portfolio, date) {
    for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        let originalFace = position["Original Face"] || 1;
        let usdRatio = parseFloat(position["holdPortfXrate"]) || 1;
        position["Cost"] = position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") ? Math.round(position["Average Cost"] * position["Quantity"] * 10000) / (10000 * position["Original Face"]) : Math.round(position["Average Cost"] * position["Quantity"] * 1000000) / 1000000;
        position["Daily Interest Income"] = Math.round(position["Daily Interest Income"] * 1000000) / 1000000;
        position["holdPortfXrate"] = Math.round(position["holdPortfXrate"] * 1000000) / 1000000;
        position["Value"] = position["ISIN"].includes("CDS") || position["ISIN"].includes("ITRX") ? Math.round((position["Quantity"] * position["Mid"] * 10000 * usdRatio) / originalFace) / 10000 : Math.round(position["Quantity"] * position["Mid"] * usdRatio * 10000) / 10000;
        position["Mid"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Mid"] * 1000000) / 1000000 : Math.round(position["Mid"] * 1000000) / 10000;
        position["Bid"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Bid"] * 1000000) / 1000000 : Math.round(position["Bid"] * 1000000) / 10000;
        position["Ask"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Ask"] * 1000000) / 1000000 : Math.round(position["Ask"] * 1000000) / 10000;
        position["Average Cost"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Average Cost"] * 1000000) / 1000000 : Math.round(position["Average Cost"] * 1000000) / 10000;
        position["YTM"] = Math.round(position["YTM"] * 1000000) / 1000000 || 0;
        position["CR01"] = "0";
        position["MTD Mark"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["MTD Mark"] * 1000000) / 1000000 : Math.round(position["MTD Mark"] * 1000000) / 10000;
        position["Previous Mark"] = position["ISIN"].includes("CXP") || position["ISIN"].includes("CDX") || position["ISIN"].includes("ITRX") || position["ISIN"].includes("1393") || position["ISIN"].includes("IB") ? Math.round(position["Previous Mark"] * 1000000) / 1000000 : Math.round(position["Previous Mark"] * 1000000) / 10000;
        position["Monthly Interest Income"] = Math.round(position["Monthly Interest Income"] * 1000000 * usdRatio) / 1000000;
        position["Monthly Capital Gains Rlzd"] = Math.round(position["Monthly Capital Gains Rlzd"] * 1000000 * usdRatio) / 1000000;
        position["Monthly Capital Gains URlzd"] = Math.round(position["Monthly Capital Gains URlzd"] * 1000000 * usdRatio) / 1000000;
        position["Cost MTD Ptf"] = Math.round(position["Cost MTD Ptf"] * 1000000 * usdRatio) / 1000000;
        position["Cost"] = Math.round(position["Cost"] * 1000000 * usdRatio) / 1000000;
        position["Average Cost"] = Math.round(position["Average Cost"] * 1000000) / 1000000;
        position["holdPortfXrate"] = position["holdPortfXrate"] ? position["holdPortfXrate"] : 1;
        if (!position["Previous FX Rate"]) {
            position["Previous FX Rate"] = position["holdPortfXrate"];
        }
        position["MTD FX"] = position["MTD FX"] ? position["MTD FX"] : position["Previous FX Rate"];
        position["Day Int.Income USD"] = position["Daily Interest Income"] * usdRatio;
        position["Daily Interest FX P&L"] = Math.round((position["holdPortfXrate"] - position["Previous FX Rate"]) * 1000000 * position["Daily Interest Income"]) / 1000000;
        position["Notional Total"] = position["Quantity"];
        position["Quantity"] = position["Quantity"] / originalFace;
        position["#"] = index + 1;
        position["ISIN"] = position["ISIN"].length != 12 ? "" : position["ISIN"];
        position["Ptf Day P&L"] = Math.round(position["Ptf Day P&L"] * usdRatio * 1000000) / 1000000;
        // multiply mtd pl with usd since all components are not  multiplied by usd when they are summed
        position["Ptf MTD P&L"] = Math.round(position["Ptf MTD P&L"] * usdRatio * 1000000) / 1000000;
        position["Previous FX Rate"] = Math.round(position["Previous FX Rate"] * 1000000) / 1000000;
        position["Maturity"] = position["Maturity"] ? position["Maturity"] : 0;
        position["Call Date"] = position["Call Date"] ? position["Call Date"] : 0;
        position["Color"] = position["Maturity"] ? (areDatesInSameMonthAndYear(position["Maturity"], date) ? "red" : "") : "";
        position["Holding ID"] = position["_id"];
        position["Duration(Mkt)"] = yearsUntil(position["Maturity"], date);
        position["Security"] = position["Issue"];
        position["Coupon Duration"] = position["Coupon Duration"] ? position["Coupon Duration"] : position["Issue"].split(" ")[0] == "T" || position["Issue"].includes("GOVT") ? 365.0 : 360.0;
        position["Coupon Rate"] = position["Coupon Rate"] ? position["Coupon Rate"] : 0;
        position["Issuer"] = position["Issuer"] == "0" ? "" : position["Issuer"];
        position["DV01"] = (position["DV01"] / 1000000) * position["Notional Total"];
        position["DV01"] = Math.round(position["DV01"] * 1000000) / 1000000 || 0;
        if (position["Issue"].includes("CDS")) {
            position["Day P&L FX"] = Math.round(((parseFloat(position["holdPortfXrate"]) - parseFloat(position["Previous FX Rate"])) / parseFloat(position["Previous FX Rate"])) * position["Quantity"] * 1000000) / 1000000 || 0;
            position["MTD P&L FX"] = Math.round(((parseFloat(position["holdPortfXrate"]) - parseFloat(position["MTD FX"] || position["holdPortfXrate"])) / parseFloat(position["MTD FX"] || position["holdPortfXrate"])) * position["Quantity"] * 1000000) / 1000000 || 0;
        }
        else {
            position["Day P&L FX"] = Math.round(((parseFloat(position["holdPortfXrate"]) - parseFloat(position["Previous FX Rate"])) / parseFloat(position["Previous FX Rate"])) * position["Notional Total"] * 1000000) / 1000000;
            position["MTD P&L FX"] = (Math.round(((parseFloat(position["holdPortfXrate"]) - parseFloat(position["MTD FX"] || position["holdPortfXrate"])) / parseFloat(position["MTD FX"] || position["holdPortfXrate"])) * position["Notional Total"]) * 1000000) / 1000000 || 0;
        }
    }
    return portfolio;
}
exports.formatFrontEndTable = formatFrontEndTable;
function yearsUntil(dateString, dateInput) {
    // Parse the date string and create a new Date object
    // if(dateString == 0 || "0"){
    //   return dateString
    // }
    const date = new Date(dateString).getTime();
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
function areDatesInSameMonthAndYear(customDate, todaysDate) {
    return new Date(customDate).getMonth() === new Date(todaysDate).getMonth() && new Date(customDate).getFullYear() === new Date(todaysDate).getFullYear();
}
function formatFrontEndRiskReport(portfolio, pairPositionIds) {
    let tableTitles = [
        "#",
        "Type",
        "Strategy",
        "Trade Idea Code",
        "Credit Name",
        "BB Ticker",
        "H-Notional",
        "o/r Dv01",
        "o/r Cr01",
        "o/r Price",
        "Pair Strategy",
        "Text10",
        "Accrued $",
        "Rating Name: SP",
        "Curr",
        "Isin",
        "Maturity",
        "CallDate",
        "Notional Total",
        "Duration(Mkt)",
        "Duration(C/P,Mkt)",
        "Implied ZCS",
        "YTM",
        "Dv01 $ (C/P,Mkt) (USD)",
        "Dv01 (USD) (Mkt)",
        "Notional Calc (Mkt)",
        "Cr01 (USD) (Mkt)",
        "Implied CS",
        "Mid",
        "Bid",
        "Ask",
        "Average Cost",
        "MTD P&L",
        "Day P&L",
        "Total P&L",
        "R - Capital Gain/Loss",
        "U - Capital Gain/Loss",
        "Accrued Interest",
        "Cash Dispmnt Accrued Int",
        "Long Security Name",
        "Issue Amt",
        "YC +25",
        "CS +100",
        "MTD Int.Income",
        "MTD Mark",
        "Ptf MTD P&L",
        "Ptf MTD Rlzd",
        "Ptf MTD URlzd",
        "Adjusted OAS",
        "Implied ZCS2",
        "Issuer Name",
        "Ref Bond",
        "Ref Fair",
        "Ref YTM",
        "Ref Spread o/r",
        "AccAdj MTD",
        "$ Fair",
        "FX",
        "Quantity",
        "Q_Sector",
        "Q_Country",
        "$ Full Econ(Mkt)",
    ];
    let tableTitleConversion = {
        "#": "#",
        Type: "Type",
        Strategy: "Group",
        "Trade Idea Code": "Location",
        "Credit Name": "Issuer",
        "BB Ticker": "Issue",
        "H-Notional": "0",
        "o/r Dv01": "0",
        "o/r Cr01": "0",
        "o/r Price": "0",
        "Pair Strategy": "Rating Class",
        "Accrued $": "Monthly Interest Income",
        "Rating Name: SP": "0",
        Curr: "Currency",
        Isin: "ISIN",
        Maturity: "Maturity",
        CallDate: "Call Date",
        "Notional Total": "Notional Total",
        "Duration(Mkt)": "Duration(Mkt)",
        "Duration(C/P,Mkt)": "Modified Duration",
        "Implied ZCS": "0",
        YTM: "YTM",
        "Dv01 $ (C/P,Mkt) (USD)": "DV01",
        "Dv01 (USD) (Mkt)": "DV01",
        "Notional Calc (Mkt)": "0",
        "Cr01 (USD) (Mkt)": "DV01",
        "Implied CS": "0",
        Mid: "Mid",
        Bid: "Bid",
        Ask: "Ask",
        "Average Cost": "Average Cost",
        "MTD P&L": "Ptf MTD P&L",
        "Day P&L": "Ptf Day P&L",
        "Total P&L": "0",
        "R - Capital Gain/Loss": "0",
        "U - Capital Gain/Loss": "0",
        "Accrued Interest": "Monthly Interest Income",
        "Cash Dispmnt Accrued Int": "0",
        "Long Security Name": "Issue",
        "Issue Amt": "Quantity",
        "YC +25": "0",
        "CS +100": "0",
        "MTD Int.Income": "Monthly Interest Income",
        "MTD Mark": "MTD Mark",
        "Ptf MTD P&L": "Ptf MTD P&L",
        "Ptf MTD Rlzd": "Monthly Capital Gains Rlzd",
        "Ptf MTD URlzd": "Monthly Capital Gains URlzd",
        "Adjusted OAS": "0",
        "Implied ZCS2": "0",
        "Issuer Name": "Issuer",
        "Ref Bond": "0",
        "Ref Fair": "0",
        "Ref YTM": "0",
        "Ref Spread o/r": "0",
        "AccAdj MTD": "0",
        "$ Fair": "0",
        FX: "holdPortfXrate",
        Quantity: "Quantity",
        Q_Sector: "Sector",
        Q_Country: "Country",
        "$ Full Econ(Mkt)": "Value",
    };
    let updatedPortfolio = [];
    for (let index = 0; index < portfolio.length; index++) {
        let position = portfolio[index];
        let updatedPosition = {};
        for (let titleIndex = 0; titleIndex < tableTitles.length; titleIndex++) {
            let title = tableTitles[titleIndex];
            updatedPosition[title] = tableTitleConversion[title] == "0" ? "0" : position[tableTitleConversion[title]];
        }
        if (position["Issue"].includes(" IB")) {
            updatedPosition["Acct"] = "NOM_IB";
        }
        else if (!position["Issue"].includes(" IB")) {
            updatedPosition["Acct"] = "NOM_PB";
        }
        if (position["Call Date"] && position["Call Date"] != "0") {
            updatedPosition["Text10"] = "AT1";
        }
        if (position["Issue"].includes("CDS")) {
            updatedPosition["Notional Total"] = -1 * position["Notional Total"];
            updatedPosition["$ Full Econ(Mkt)"] = -1 * position["Notional Total"];
        }
        if (pairPositionIds.includes(position["_id"].toString())) {
            updatedPosition["Pair Strategy"] = "Hedge Pair";
        }
        updatedPortfolio.push(updatedPosition);
    }
    return updatedPortfolio;
}
exports.formatFrontEndRiskReport = formatFrontEndRiskReport;

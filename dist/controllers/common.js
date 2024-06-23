"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dateWithMonthOnly = exports.dateWithNoDay = exports.getCurrentDateTime = exports.generateRandomString = exports.convertBBGEmexDate = exports.convertExcelDateToJSDateTime = exports.convertExcelDateToJSDate = exports.swapMonthDay = exports.formatDateWorld = exports.getYear = exports.isNotNullOrUndefined = exports.getTradeDateYearTradesWithoutTheCentury = exports.getTradeDateYearTrades = exports.formatTradeDate = exports.getCurrentDateVconFormat = exports.verifyTokenFactSheetMember = exports.verifyTokenRiskMember = exports.verifyToken = exports.getTime = exports.formatDateUS = exports.formatDateFile = exports.formatDate = exports.parsePercentage = exports.getDate = exports.getOrdinalSuffix = exports.getCurrentMonthDateRange = exports.generateSignedUrl = exports.bucket = exports.platform = exports.uri = void 0;
const readExcel_1 = require("./operations/readExcel");
require("dotenv").config();
const jwt = require("jsonwebtoken");
exports.uri = "mongodb+srv://" + process.env.MONGODBUSERNAME + ":" + process.env.NEWMONGODBPASSWORD + "@app.ywfxr8w.mongodb.net/?retryWrites=true&w=majority";
exports.platform = "https://admin.triadacapital.com/reset-password?sent=none";
exports.bucket = "https://storage.cloud.google.com/app-backend-414212.appspot.com";
async function generateSignedUrl(fileName) {
    const options = {
        version: "v4",
        action: "read",
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };
    const [url] = await readExcel_1.storage.bucket(process.env.BUCKET).file(fileName).getSignedUrl(options);
    return url;
}
exports.generateSignedUrl = generateSignedUrl;
function getCurrentMonthDateRange() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const formattedFirstDay = `${monthNames[currentMonth]} ${firstDayOfMonth.getDate()}${getOrdinalSuffix(firstDayOfMonth.getDate())} ${currentYear}`;
    const formattedLastDay = `${monthNames[currentMonth]} ${lastDayOfMonth.getDate()}${getOrdinalSuffix(lastDayOfMonth.getDate())} ${currentYear}`;
    return `${formattedFirstDay} - ${formattedLastDay}`;
}
exports.getCurrentMonthDateRange = getCurrentMonthDateRange;
function getOrdinalSuffix(date) {
    const suffixes = ["th", "st", "nd", "rd"];
    const v = date % 100;
    return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
}
exports.getOrdinalSuffix = getOrdinalSuffix;
function getDate(dateInput) {
    let date = new Date();
    if (dateInput) {
        date = new Date(dateInput); // Current date
    }
    const formattedDate = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric", // four-digit year
    });
    return formattedDate;
}
exports.getDate = getDate;
function parsePercentage(str) {
    // Remove the percent sign and any surrounding whitespace, then parse to float
    try {
        return parseFloat(str.toString().replace("%", "").trim());
    }
    catch (error) {
        // console.log(str, "wrong value str%", error);
        return 0;
    }
}
exports.parsePercentage = parsePercentage;
function formatDate(date) {
    date = new Date(date);
    if (!date) {
        return "Not Applicable";
    }
    const formattedDate = date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric", // four-digit year
    });
    return formattedDate;
}
exports.formatDate = formatDate;
function formatDateFile(date) {
    let d = new Date(date), month = "" + (d.getMonth() + 1), day = "" + d.getDate();
    if (month.length < 2)
        month = "0" + month;
    if (day.length < 2)
        day = "0" + day;
    return [month, day].join("-");
}
exports.formatDateFile = formatDateFile;
function formatDateUS(date) {
    let d = new Date(date), month = "" + (d.getMonth() + 1), day = "" + d.getDate(), year = d.getFullYear();
    if (year == 1970) {
        return 0;
    }
    if (month.length < 2)
        month = "0" + month;
    if (day.length < 2)
        day = "0" + day;
    return [month, day, year].join("/");
}
exports.formatDateUS = formatDateUS;
function getTime(input = null) {
    let date = new Date(); // Current date and time
    if (input) {
        date = new Date(input);
    }
    let hours = date.getHours();
    let minutes = date.getMinutes();
    // Convert hours and minutes to strings and pad with zeros if necessary
    hours = hours < 10 ? "0" + hours : "" + hours;
    minutes = minutes < 10 ? "0" + minutes : "" + minutes;
    const time = `${hours}:${minutes}`;
    return time;
}
exports.getTime = getTime;
const verifyToken = (req, res, next) => {
    try {
        const token = req.cookies["triada.admin.cookie"].token;
        if (!token) {
            return res.sendStatus(401);
        }
        const decoded = jwt.verify(token, process.env.SECRET);
        req.accessRole = decoded.accessRole;
        if (decoded.accessRole != "admin") {
            return res.sendStatus(401);
        }
        next();
    }
    catch (error) {
        console.log(error);
        return res.sendStatus(401);
    }
};
exports.verifyToken = verifyToken;
const verifyTokenRiskMember = (req, res, next) => {
    try {
        const token = req.cookies["triada.admin.cookie"].token;
        if (!token) {
            return res.sendStatus(401);
        }
        const decoded = jwt.verify(token, process.env.SECRET);
        req.accessRole = decoded.accessRole;
        if (decoded.accessRole != "member (risk report)" && decoded.accessRole != "admin") {
            return res.sendStatus(401);
        }
        next();
    }
    catch (error) {
        console.log(error);
        return res.sendStatus(401);
    }
};
exports.verifyTokenRiskMember = verifyTokenRiskMember;
const verifyTokenFactSheetMember = (req, res, next) => {
    try {
        const token = req.cookies["triada.admin.cookie"].token;
        if (!token) {
            return res.sendStatus(401);
        }
        const decoded = jwt.verify(token, process.env.SECRET);
        req.accessRole = decoded.accessRole;
        req.shareClass = decoded.shareClass;
        req.email = decoded.email;
        if (decoded.accessRole != "member (risk report)" && decoded.accessRole != "admin" && decoded.accessRole != "member (factsheet report)") {
            return res.sendStatus(401);
        }
        next();
    }
    catch (error) {
        console.log(error);
        return res.sendStatus(401);
    }
};
exports.verifyTokenFactSheetMember = verifyTokenFactSheetMember;
function getCurrentDateVconFormat() {
    // Get current date
    const date = new Date();
    // Get day, month, and year
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based in JavaScript
    const year = date.getFullYear();
    // Format date as dd/mm/yyyy
    return `${day}/${month}/${year}`;
}
exports.getCurrentDateVconFormat = getCurrentDateVconFormat;
function formatTradeDate(date) {
    date = new Date(date);
    const year = date.getFullYear().toString();
    let month = (date.getMonth() + 1).toString();
    let day = date.getDate().toString();
    month = month.length < 2 ? "0" + month : month;
    day = day.length < 2 ? "0" + day : day;
    return `${month}/${day}/${year}`;
}
exports.formatTradeDate = formatTradeDate;
function getTradeDateYearTrades(date) {
    // Parse the month and year from the first date
    let dateComponenets = date.split("/");
    return `${dateComponenets[0]}/${dateComponenets[1]}/${"20" + dateComponenets[2]}`;
}
exports.getTradeDateYearTrades = getTradeDateYearTrades;
function getTradeDateYearTradesWithoutTheCentury(date) {
    // Parse the month and year from the first date
    let dateComponenets = date.split("/");
    return `${dateComponenets[0]}/${dateComponenets[1]}/${dateComponenets[2]}`;
}
exports.getTradeDateYearTradesWithoutTheCentury = getTradeDateYearTradesWithoutTheCentury;
function isNotNullOrUndefined(value) {
    return value !== undefined && value !== null;
}
exports.isNotNullOrUndefined = isNotNullOrUndefined;
function getYear(dateInput) {
    let date = new Date(dateInput);
    const year = date.getFullYear();
    return `${year}`;
}
exports.getYear = getYear;
function formatDateWorld(inputDate) {
    let date = new Date(inputDate);
    let day = `${date.getDate()}`.padStart(2, "0"); // get the day
    let month = `${date.getMonth() + 1}`.padStart(2, "0"); // get the month (months are 0-indexed in JS, so add 1)
    let year = `${date.getFullYear()}`.slice(-2); // get the year and take the last two digits
    return `${day}/${month}/${year}`;
}
exports.formatDateWorld = formatDateWorld;
function swapMonthDay(dateStr) {
    // Split the string into components
    const parts = dateStr.split("/");
    // Check if the input is correct
    if (parts.length === 3 && parts.every((part) => !isNaN(part))) {
        const [day, month, year] = parts;
        // Reassemble the date string in the format "mm/dd/yyyy"
        return `${month}/${day}/${year}`;
    }
    else {
        // If the input is not valid, return an error message
        return "Invalid date format. Please use 'dd/mm/yyyy'.";
    }
}
exports.swapMonthDay = swapMonthDay;
function convertExcelDateToJSDate(serial) {
    if (parseFloat(serial) < 45000) {
        return serial;
    }
    const excelStartDate = new Date(1900, 0, 1);
    const correctSerial = serial - 2; //Excel and JS have different leap year behaviors
    const millisecondsInDay = 24 * 60 * 60 * 1000;
    const jsDate = new Date(excelStartDate.getTime() + correctSerial * millisecondsInDay);
    const year = jsDate.getFullYear();
    const month = jsDate.getMonth() + 1; // JavaScript months start at 0
    const day = jsDate.getDate();
    const formattedMonth = month < 10 ? "0" + month : month;
    const formattedDay = day < 10 ? "0" + day : day;
    return `${formattedMonth}/${formattedDay}/${year}`;
}
exports.convertExcelDateToJSDate = convertExcelDateToJSDate;
function convertExcelDateToJSDateTime(serial) {
    if (parseFloat(serial) < 45000) {
        return serial;
    }
    const excelStartDate = new Date(1900, 0, 1);
    const correctSerial = serial - 2; //Excel and JS have different leap year behaviors
    const millisecondsInDay = 24 * 60 * 60 * 1000;
    const jsDate = new Date(excelStartDate.getTime() + correctSerial * millisecondsInDay);
    const year = jsDate.getFullYear();
    const month = jsDate.getMonth() + 1; // JavaScript months start at 0
    const day = jsDate.getDate();
    const hours = jsDate.getHours();
    const minutes = jsDate.getMinutes();
    const seconds = jsDate.getSeconds();
    const formattedMonth = month < 10 ? "0" + month : month;
    const formattedDay = day < 10 ? "0" + day : day;
    const formattedHours = hours < 10 ? "0" + hours : hours;
    const formattedMinutes = minutes < 10 ? "0" + minutes : minutes;
    const formattedSeconds = seconds < 10 ? "0" + seconds : seconds;
    return `${formattedHours}:${formattedMinutes}`;
}
exports.convertExcelDateToJSDateTime = convertExcelDateToJSDateTime;
function convertBBGEmexDate(date) {
    try {
        let dateComponenets = date.split("/");
        return `${dateComponenets[0]}/${dateComponenets[1]}/20${dateComponenets[2]}`;
    }
    catch (error) {
        return date;
    }
}
exports.convertBBGEmexDate = convertBBGEmexDate;
function generateRandomString(length) {
    let result = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
exports.generateRandomString = generateRandomString;
function getCurrentDateTime() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-11 in JavaScript
    const day = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${month}/${day}/${year} ${hours}:${minutes}`;
}
exports.getCurrentDateTime = getCurrentDateTime;
function dateWithNoDay(input) {
    let dateComponenets = input.split("/");
    return `${dateComponenets[0]}/01/${dateComponenets[1]}`;
}
exports.dateWithNoDay = dateWithNoDay;
function dateWithMonthOnly(input) {
    let dateComponenets = input.split("/");
    return `${dateComponenets[1]}/${dateComponenets[2]}`;
}
exports.dateWithMonthOnly = dateWithMonthOnly;

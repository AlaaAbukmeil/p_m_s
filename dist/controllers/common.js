"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomString = exports.convertBBGEmexDate = exports.convertExcelDateToJSDate = exports.getDateMufg = exports.monthlyRlzdDate = exports.getTradeDateYearTrades = exports.getSettlementDateYearTrades = exports.formatSettleDateVcon = exports.formatTradeDate = exports.getSettlementDateYearNomura = exports.formateDateNomura = exports.getCurrentDateVconFormat = exports.verifyToken = exports.getTime = exports.formatDateReadable = exports.formatDateVconFile = exports.formatDate = exports.getDate = exports.getOrdinalSuffix = exports.getCurrentMonthDateRange = void 0;
const jwt = require('jsonwebtoken');
function getCurrentMonthDateRange() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const monthNames = [
        "January", "February", "March",
        "April", "May", "June", "July",
        "August", "September", "October",
        "November", "December"
    ];
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
    const formattedDate = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric', // four-digit year
    });
    return formattedDate;
}
exports.getDate = getDate;
function formatDate(date) {
    date = new Date(date);
    if (!date) {
        return "Not Applicable";
    }
    const formattedDate = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric', // four-digit year
    });
    return formattedDate;
}
exports.formatDate = formatDate;
function formatDateVconFile(date) {
    let d = new Date(date), month = '' + (d.getMonth() + 1), day = '' + d.getDate();
    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;
    return [month, day].join('-');
}
exports.formatDateVconFile = formatDateVconFile;
function formatDateReadable(date) {
    let d = new Date(date), month = '' + (d.getMonth() + 1), day = '' + d.getDate(), year = d.getFullYear();
    if (year == 1970) {
        return 0;
    }
    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;
    return [month, day, year].join('/');
}
exports.formatDateReadable = formatDateReadable;
function getTime() {
    const date = new Date(); // Current date and time
    let hours = date.getHours();
    let minutes = date.getMinutes();
    // Convert hours and minutes to strings and pad with zeros if necessary
    hours = hours < 10 ? '0' + hours : '' + hours;
    minutes = minutes < 10 ? '0' + minutes : '' + minutes;
    const time = `${hours}:${minutes}`;
    return time;
}
exports.getTime = getTime;
const verifyToken = (req, res, next) => {
    var _a;
    const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.split(' ')[1];
    if (!token) {
        return res.sendStatus(401);
    }
    try {
        const decoded = jwt.verify(token, process.env.SECRET);
        req.userRole = decoded.accessRole;
        next();
    }
    catch (error) {
        return res.sendStatus(401);
    }
};
exports.verifyToken = verifyToken;
function getCurrentDateVconFormat() {
    // Get current date
    const date = new Date();
    // Get day, month, and year
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based in JavaScript
    const year = date.getFullYear();
    // Format date as dd/mm/yyyy
    return `${day}/${month}/${year}`;
}
exports.getCurrentDateVconFormat = getCurrentDateVconFormat;
function formateDateNomura(date) {
    var d = new Date(date), month = '' + (d.getMonth() + 1), day = '' + d.getDate(), year = d.getFullYear();
    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;
    return [year, month, day].join('');
}
exports.formateDateNomura = formateDateNomura;
function getSettlementDateYearNomura(date1, date2) {
    // Parse the month and year from the first date
    // console.log(date1, date2)
    const [month1, day1, year1] = date1.split('/').map(Number);
    // Parse the month from the second date
    const [month2, day2] = date2.split('/').map(Number);
    // If the month of the second date is less than the month of the first date,
    // it means we've crossed into a new year, so increment the year
    const year2 = month2 < month1 ? year1 + 1 : year1;
    // Return the second date with the year appended
    return `${year2}${month2}${day2}`;
}
exports.getSettlementDateYearNomura = getSettlementDateYearNomura;
function formatTradeDate(date) {
    date = new Date(date);
    const year = date.getFullYear().toString().slice(-2);
    let month = (date.getMonth() + 1).toString();
    let day = date.getDate().toString();
    month = month.length < 2 ? '0' + month : month;
    day = day.length < 2 ? '0' + day : day;
    return `${month}/${day}/${year}`;
}
exports.formatTradeDate = formatTradeDate;
function formatSettleDateVcon(date) {
    date = new Date(date);
    const year = date.getFullYear().toString().slice(-2);
    let month = (date.getMonth() + 1).toString();
    let day = date.getDate().toString();
    month = month.length < 2 ? '0' + month : month;
    day = day.length < 2 ? '0' + day : day;
    return `${month}/${day}`;
}
exports.formatSettleDateVcon = formatSettleDateVcon;
function getSettlementDateYearTrades(date1, date2) {
    try {
        // Convert the input strings to Date objects
        let dateObj1 = new Date(date1);
        let dateObj2 = new Date(date2);
        // Check if the dates are valid
        if (isNaN(dateObj1.getTime()) || isNaN(dateObj2.getTime())) {
            throw new Error('Invalid date format. Use mm/dd/yyyy.');
        }
        // If the month of the second date is less than the month of the first date,
        // it means we've crossed into a new year, so increment the year
        if (dateObj2.getMonth() < dateObj1.getMonth()) {
            dateObj2.setFullYear(dateObj2.getFullYear() + 1);
        }
        // Format the date as mm/dd/yyyy
        let year = dateObj2.getFullYear();
        let month = (dateObj2.getMonth() + 1).toString().padStart(2, '0'); // padStart ensures two-digit month
        let day = dateObj2.getDate().toString().padStart(2, '0'); // padStart ensures two-digit day
        // Return the second date with the potentially updated year
        return `${month}/${day}/${year}`;
    }
    catch (error) {
        console.error(error.message);
        return '';
    }
}
exports.getSettlementDateYearTrades = getSettlementDateYearTrades;
function getTradeDateYearTrades(date) {
    // Parse the month and year from the first date
    // console.log(date1, date2)
    let dateComponenets = date.split("/");
    return `${dateComponenets[0]}/${dateComponenets[1]}/${"20" + dateComponenets[2]}`;
}
exports.getTradeDateYearTrades = getTradeDateYearTrades;
function monthlyRlzdDate(dateInput) {
    let date = new Date(dateInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}/${month}`;
}
exports.monthlyRlzdDate = monthlyRlzdDate;
function getDateMufg(inputDate) {
    let date = new Date(inputDate);
    let day = `${date.getDate()}`.padStart(2, '0'); // get the day
    let month = `${date.getMonth() + 1}`.padStart(2, '0'); // get the month (months are 0-indexed in JS, so add 1)
    let year = `${date.getFullYear()}`.slice(-2); // get the year and take the last two digits
    return `${month}/${day}/${year}`;
}
exports.getDateMufg = getDateMufg;
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
    const formattedMonth = month < 10 ? '0' + month : month;
    const formattedDay = day < 10 ? '0' + day : day;
    return `${formattedMonth}/${formattedDay}/${year}`;
}
exports.convertExcelDateToJSDate = convertExcelDateToJSDate;
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
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
exports.generateRandomString = generateRandomString;

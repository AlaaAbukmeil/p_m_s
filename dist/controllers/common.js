"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettlementDateYearNomura = exports.formateDateNomura = exports.getCurrentDateVconFormat = exports.verifyToken = exports.getTime = exports.formatDateVconFile = exports.formatDate = exports.getDate = exports.getOrdinalSuffix = exports.getCurrentMonthDateRange = void 0;
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
function getDate() {
    const date = new Date(); // Current date
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
    const formattedDate = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric', // four-digit year
    });
    return formattedDate;
}
exports.formatDate = formatDate;
function formatDateVconFile(date) {
    var d = new Date(date), month = '' + (d.getMonth() + 1), day = '' + d.getDate(), year = d.getFullYear();
    if (month.length < 2)
        month = '0' + month;
    if (day.length < 2)
        day = '0' + day;
    return [year, month, day].join('-');
}
exports.formatDateVconFile = formatDateVconFile;
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

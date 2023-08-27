"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.getTime = exports.getDate = exports.getOrdinalSuffix = exports.getCurrentMonthDateRange = void 0;
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

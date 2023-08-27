import { Request, Response, NextFunction } from "express"

const jwt = require('jsonwebtoken');

export function getCurrentMonthDateRange(): string {
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

export function getOrdinalSuffix(date: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = date % 100;
  return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
}

export function getDate() {
  const date = new Date(); // Current date

  const formattedDate = date.toLocaleDateString('en-GB', {
    day: '2-digit', // two-digit day
    month: '2-digit', // two-digit month
    year: 'numeric', // four-digit year
  });
  return formattedDate
}
export function getTime() {
  const date = new Date(); // Current date and time

  let hours: any = date.getHours();
  let minutes: any = date.getMinutes();

  // Convert hours and minutes to strings and pad with zeros if necessary
  hours = hours < 10 ? '0' + hours : '' + hours;
  minutes = minutes < 10 ? '0' + minutes : '' + minutes;

  const time = `${hours}:${minutes}`;

  return time
}
export const verifyToken = (req: Request | any, res: Response, next: NextFunction) => {

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.sendStatus(401)
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    req.userRole = decoded.accessRole
    next();
  } catch (error) {
    return res.sendStatus(401)
  }
};
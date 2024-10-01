import { PositionInDB } from "../../../models/portfolio";
import { yearsUntil } from "../../analytics/tools";
import { getPortfolioOnSpecificDate } from "../../reports/portfolios";

export async function cashFlowExpected({ collectionDate }: { collectionDate: string }) {
  try {
    let action = await getPortfolioOnSpecificDate(collectionDate, "true", "portfolio_main");
    let portfolio = action.portfolio;
    let months = {
      1: { redeemption: {}, interest: {}, redeemptionSum: 0, sum: 0 },
      2: { redeemption: {}, interest: {}, redeemptionSum: 0, sum: 0 },
      3: { redeemption: {}, interest: {}, redeemptionSum: 0, sum: 0 },
      4: { redeemption: {}, interest: {}, redeemptionSum: 0, sum: 0 },
      5: { redeemption: {}, interest: {}, redeemptionSum: 0, sum: 0 },
      6: { redeemption: {}, interest: {}, redeemptionSum: 0, sum: 0 },
      7: { redeemption: {}, interest: {}, redeemptionSum: 0, sum: 0 },
      8: { redeemption: {}, interest: {}, redeemptionSum: 0, sum: 0 },
      9: { redeemption: {}, interest: {}, redeemptionSum: 0, sum: 0 },
      10: { redeemption: {}, interest: {}, redeemptionSum: 0, sum: 0 },
      11: { redeemption: {}, interest: {}, redeemptionSum: 0, sum: 0 },
      12: { redeemption: {}, interest: {}, redeemptionSum: 0, sum: 0 },
    };
    let prefixMonth = new Date(collectionDate).getMonth() + 1;
    for (let key in months) {
      let start = (parseInt(key) - 1) / 12;
      let end = parseInt(key) / 12;
      determineCashFlowRedeemption(portfolio, start, end, collectionDate, key, months, prefixMonth);
    }
    let formatted = formatCashFlow(months, prefixMonth, collectionDate);
    return formatDataForExcel(formatted);
  } catch (error: any) {
    console.log({ error });
    return { error: error.toString() };
  }
}
function determineCashFlowRedeemption(portfolio: PositionInDB[], start: number, end: number, collectionDate: string, month: string, months: any, prefixMonth: number) {
  let allMonthsPossible = {};
  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    let duration = yearsUntil(position["Call Date"] && position["Call Date"] != "0" && position["BB Ticker"].toLowerCase().includes("perp") ? position["Call Date"] : position["Maturity"], collectionDate, position["BB Ticker"]);

    if (!portfolio[index]["Type"]) {
      portfolio[index]["Type"] = portfolio[index]["BB Ticker"].split(" ")[0] == "T" || portfolio[index]["Issuer"] == "US TREASURY N/B" ? "UST" : portfolio[index]["ISIN"].includes(" IB") ? "FUT" : "BND";
    }
    if (duration > start && duration < end && (position["Type"] == "BND" || position["Type"] == "UST") && position["Notional Amount"] != 0) {
      months[month].redeemption[position["BB Ticker"]] = (months[month].redeemption[position["BB Ticker"]] || 0) + +position["Notional Amount"];
      months[month].sum += Math.round(position["Notional Amount"]);
      months[month].redeemptionSum += Math.round(position["Notional Amount"]);
    }
    calculateCouponPayments(position, months, month, allMonthsPossible, prefixMonth);
  }
}

function calculateCouponPayments(position: PositionInDB, months: any, month: string, allMonthsPossible: any, prefixMonth: number) {
  const couponFrequency = parseInt(position["Coupon Frequency"]);
  const previousSettleDate = position["Previous Settle Date"];
  const nextSettleDate = position["Next Settle Date"];

  if (!couponFrequency || !previousSettleDate || !nextSettleDate) return;
  let trueMonth = ((parseInt(month) + prefixMonth) % 12).toString();
  const couponMonth = parseInt(previousSettleDate.split("/")[1]); // JavaScript months are 0-indexed
  const couponRate = position["Coupon Rate"] / 100;
  const notionalAmount = position["Notional Amount"];
  const bbTicker = position["BB Ticker"];
  const isin = position["ISIN"];
  if (!allMonthsPossible[isin]) {
    allMonthsPossible[isin] = getAllPossibleMonths(couponMonth, couponFrequency);
  }

  const couponPayment = (couponRate * notionalAmount) / couponFrequency;

  if (allMonthsPossible[isin].includes(trueMonth)) {
    months[month].interest[bbTicker] = months[month].interest[bbTicker] ? months[month].interest[bbTicker] : { previousSettleDate: "", nextSettleDate: "", interest: 0 };
    months[month].interest[bbTicker].interest = (months[month].interest[bbTicker].interest || 0) + couponPayment;
    months[month].interest[bbTicker].previousSettleDate = position["Previous Settle Date"];
    months[month].interest[bbTicker].nextSettleDate = position["Next Settle Date"];
    months[month].sum += couponPayment;
  }
}
function getAllPossibleMonths(startMonth: number, frequency: number): string[] {
  const months: number[] = [];
  const monthsInYear = 12;
  const interval = monthsInYear / frequency;

  // Add months before the start month
  let currentMonth = startMonth;
  while (currentMonth > 0) {
    months.unshift(currentMonth);
    currentMonth -= interval;
  }

  // Add the start month and months after it
  currentMonth = startMonth;
  while (currentMonth <= monthsInYear) {
    if (!months.includes(currentMonth)) {
      months.push(currentMonth);
    }
    currentMonth += interval;
  }

  // Round the months and remove duplicates
  return [...new Set(months.map((month) => Math.round(month)))].sort((a, b) => a - b).map((month) => month.toString());
}

function formatCashFlow(object: { [key: number]: { redeemption: { [key: string]: number }; interest: { [key: string]: { previousSettleDate: string; nextSettleDate: string; interest: number } }; redeemptionSum: number; sum: number } }, prefixMonth: number, date: string) {
  let year = parseInt(date.split("-")[0]);
  let final: any = {};
  for (let month in object) {
    let name = getMonthName(parseInt(month) + prefixMonth, year);
    final[name] = {};

    for (let redeemped in object[month].redeemption) {
      if (object[month].redeemption[redeemped]) {
        final[name][redeemped] = final[name][redeemped] ? final[name][redeemped] : [0, 0];
        final[name][redeemped][0] = object[month].redeemption[redeemped];
      }
    }

    for (let payment in object[month].interest) {
      if (object[month].interest[payment].interest) {
        final[name][payment] = final[name][payment] ? final[name][payment] : [0, 0];
        final[name][payment][1] = object[month].interest[payment].interest;
      }
    }
    let redeemptionSum = Math.round(object[month].redeemptionSum);
    final[name]["Sum"] = [redeemptionSum, Math.round(object[month].sum) - redeemptionSum];
  }
  return final;
}

function getMonthName(month: number, year: number): string {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (month > 12) {
    year++;
    month = month % 12;
  }
  return monthNames[month - 1] + " " + year;
}
function formatDataForExcel(data: {
  [monthYear: string]: {
    [securityName: string]: [number, number];
  };
}): any[] {
  const result: any[] = [];

  // Add header row

  // Iterate through each month/year
  for (const [monthYear, securities] of Object.entries(data)) {
    // Iterate through each security in the month/year
    for (const [securityName, [redemption, interest]] of Object.entries(securities)) {
      const total = redemption + interest;
      console.log({ monthYear });
      result.push({
        "Month Year": monthYear,
        "Security Name": securityName,
        Redemption: redemption,
        Interest: interest,
        Total: total,
      });
    }
  }

  return result;
}

import { PositionBeforeFormatting, PositionInDB } from "../../../models/portfolio";
import { NomuraCashReconcileFileUpload } from "../../../models/reconcile";
import { CentralizedTrade } from "../../../models/trades";
import { convertExcelDateToJSDate, formatDateUS, getTradeDateYearTrades, swapMonthDay } from "../../common";
import { getAverageCost } from "../../reports/tools";
import { getRlzdTrades } from "../../reports/trades";
import { client } from "../../userManagement/auth";
import { parseYYYYMMDDAndReturnMonth } from "../tools";

export function getMtdMarkAndMtdNotional(portfolio: PositionBeforeFormatting[] | any[]) {
  let result: { [key: string]: { mtdNotional: number; mtdMark: number; ticker: string; mtdRlzd: number; currency: string } } = {};
  for (let index = 0; index < portfolio.length; index++) {
    const position = portfolio[index];
    if (!result[position["ISIN"]]) {
      result[position["ISIN"]] = { mtdNotional: 0, mtdMark: 0, ticker: "", mtdRlzd: 0, currency: "" };
    }
    result[position["ISIN"]].mtdNotional += position["MTD Notional"] ? position["MTD Notional"] : 0;
    result[position["ISIN"]].mtdMark = parseFloat(position["MTD Mark"]);
    result[position["ISIN"]].ticker = position["BB Ticker"];
    result[position["ISIN"]].currency = position["Currency"];
    result[position["ISIN"]].mtdRlzd += parseFloat(position["MTD Rlzd"]);
  }
  return result;
}
export function convertCurrencyToUSD(currency: string, rate: number) {
  if (currency == "AUD") {
    return 1 / rate;
  } else if (currency == "EUR") {
    return rate;
  } else if (currency == "GBP") {
    return rate;
  } else if (currency == "SGD") {
    return 1 / rate;
  } else if (currency == "HKD") {
    return 1 / rate;
  } else if (currency == "YEN") {
    return 1 / rate;
  } else {
    return rate;
  }
}

export function getRlzdPNLNomuraProceeds(trades: NomuraCashReconcileFileUpload[], mtdMark: any, mtdAmountInput: any): { documents: any[]; totalRow: { Rlzd: number; "Rlzd P&L Amount": number }; averageCostMTD: any; pnlDayRlzdHistory: { [key: string]: number }; fxRate: number; currency: string } {
  try {
    let documents = trades;

    let multiplier = 100;
    let total = 0;

    let mtdAmount = parseFloat(mtdAmountInput) || 0;
    let accumualteNotional = mtdAmount;
    let averageCost = parseFloat(mtdMark) * 100;
    let pnlDayRlzdHistory: any = {};
    let fxRate = parseFloat(trades[0]["Fx Rate"]);
    let currency = trades[0]["Security Issue CCY"];
    fxRate = convertCurrencyToUSD(currency, fxRate);

    for (let index = 0; index < documents.length; index++) {
      let trade = documents[index];

      //We only check for cds because original face is already factored in ib/vcons.
      let tradeBS = trade["Trade Status"] == "BUY" ? 1 : -1;
      trade["Quantity"] = Math.abs(parseFloat(trade["Quantity"])).toString();
      let newNotional = parseFloat(trade["Quantity"]) * tradeBS;

      if (accumualteNotional + newNotional < accumualteNotional && accumualteNotional > 0) {
        let rlzd = parseFloat(trade["Quantity"]) * (parseFloat(trade["Price"]) / multiplier - averageCost / multiplier);

        total += rlzd;
        accumualteNotional += newNotional;
      } else if (accumualteNotional + newNotional > accumualteNotional && accumualteNotional < 0) {
        let rlzd = parseFloat(trade["Quantity"]) * (averageCost / multiplier - parseFloat(trade["Price"]) / multiplier);

        total += rlzd;
        accumualteNotional += newNotional;
      } else {
        averageCost = getAverageCost(newNotional, accumualteNotional, trade["Price"], averageCost);

        accumualteNotional += newNotional;
      }
    }

    let totalRow: any = {
      Rlzd: "Total",
      "Rlzd P&L Amount": total,
    };
    documents.push(totalRow);
    return { documents: documents, totalRow: totalRow, averageCostMTD: averageCost, pnlDayRlzdHistory: pnlDayRlzdHistory, fxRate: fxRate, currency: currency };
  } catch (error) {
    console.log({ errorTrades: error });
    return { documents: [], totalRow: { Rlzd: 0, "Rlzd P&L Amount": 0 }, averageCostMTD: 0, pnlDayRlzdHistory: {}, fxRate: 1, currency: "" };
  }
}
export function getProcceeds(buySellRecords: NomuraCashReconcileFileUpload[], collectionMonth: number) {
  let result: { [key: string]: NomuraCashReconcileFileUpload[] } = {};
  for (let index = 0; index < buySellRecords.length; index++) {
    let month = parseYYYYMMDDAndReturnMonth(buySellRecords[index]["Trade Date"].toString());
    if (month == collectionMonth) {
      let isin = buySellRecords[index]["Isin"];
      if (!result[isin]) {
        result[isin] = [];
      }
      result[isin].push(buySellRecords[index]);
    }
  }
  return result;
}
export function getPositionAggregated(isin: string, portfolio: PositionInDB[], dateInput: string) {
  let totalSettled = 0;
  let ticker = "";
  let coupon = 0;
  let locations = "";
  let currency = "USD";
  let couponFrequency = "";
  let notional = 0;
  let frequency = 2;
  let previousSettleDate = "";
  let previousSettleDateTimestamp = -Infinity;

  let found = false;
  let note = "";

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    if (position["ISIN"] == isin) {
      found = true;
      if (position["Currency"]) {
        currency = position["Currency"];
      }

      if (position["Coupon Frequency"]) {
        couponFrequency = position["Coupon Frequency"];
      }
      notional += position["Notional Amount"];
      locations += position["Location"] + " ";
      ticker = position["BB Ticker"];
      if (position["Security Description"]) {
        note = position["Security Description"];
      }
      coupon = position["Coupon Rate"] / 100;
      if (position["Coupon Frequency"]) {
        frequency = parseFloat(position["Coupon Frequency"]);
      }
      if (position["Previous Settle Date"]) {
        previousSettleDate = formatDateUS(swapMonthDay(position["Previous Settle Date"]));
        previousSettleDateTimestamp = new Date(previousSettleDate).getTime();
      }
      for (let date in position["Interest"]) {
        let timestamp = new Date(date).getTime();

        if (timestamp < previousSettleDateTimestamp && date != previousSettleDate) {
          totalSettled += position["Interest"][date];
        }
      }
    }
  }
  let couponPayment = totalSettled * coupon * (1 / frequency);
  return { totalSettled, ticker, found, coupon: coupon * 100, frequency, previousSettleDate, couponPayment, note, isin, locations, notional, currency, couponFrequency };
}
export function sumUpCouponPaymentRecords(couponPaymentRecords: NomuraCashReconcileFileUpload[]): { [key: string]: { sum: number; ticker: string; message: string; settleDate: string; tradeDate: string; currency: string } } {
  let result: { [key: string]: { sum: number; ticker: string; message: string; tradeDate: string; settleDate: string; currency: string } } = {};
  for (let index = 0; index < couponPaymentRecords.length; index++) {
    let isin = couponPaymentRecords[index]["Isin"];
    let ticker = couponPaymentRecords[index]["Security Name"];
    let proceeds = parseFloat(couponPaymentRecords[index]["Proceeds"]);
    let payInKindAlert = couponPaymentRecords[index]["Activity Description"];
    let tradeDate = convertNomuraDateToAppTradeDate(couponPaymentRecords[index]["Trade Date"]);
    let settleDate = convertNomuraDateToAppTradeDate(couponPaymentRecords[index]["Settlement Date"]);
    let currency = couponPaymentRecords[index]["Security Issue CCY"];

    if (!result[isin]) {
      result[isin] = { sum: 0, ticker: ticker, message: payInKindAlert.toString().toLocaleLowerCase().includes("in kind") ? "Payment In Kind" : "", settleDate: settleDate, tradeDate: tradeDate, currency };
    }
    result[isin].sum += proceeds;
    result[isin].ticker = ticker;
  }
  return result;
}

export function convertNomuraDateToAppTradeDate(nomuraDate: string): string {
  nomuraDate = nomuraDate.toString();
  const year = parseInt(nomuraDate.slice(0, 4), 10);
  let month: any = parseInt(nomuraDate.slice(4, 6), 10); // Month is zero-based (0 = January)
  let day: any = parseInt(nomuraDate.slice(6, 8), 10);

  if (month < 10) {
    month = "0" + month;
  }
  if (day < 10) {
    day = "0" + day;
  }

  // Create a JavaScript Date object

  // Convert the JavaScript Date to the application's trade date format using the assumed function
  const tradeDate = `${month}/${day}/${year}`;

  return tradeDate;
}

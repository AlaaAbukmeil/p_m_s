import { PositionInDB } from "../../models/portfolio";
import { MufgReconcile, NomuraCashReconcile, NomuraReconcile, NomuraReconcileCash } from "../../models/reconcile";
import { formatDateUS, formatDateWorld } from "../common";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { getPortfolioOnSpecificDate } from "../reports/portfolios";
import { insertEditLogs } from "./logs";
import { readNomuraCashReport } from "./readExcel";
import { formatDateToIso } from "./tools";

export async function reconcileMUFG(MUFGData: MufgReconcile[], portfolio: any) {
  try {
    portfolio = updatePortfolioBasedOnIsin(portfolio);
    let formattedData: any = [];

    for (let index = 0; index < portfolio.length; index++) {
      let positionInPortfolio = portfolio[index];
      let positionInMufg = getPositionInMUFG(MUFGData, positionInPortfolio["BB Ticker"], positionInPortfolio["ISIN"]);
      if (!positionInPortfolio["Type"]) {
        positionInPortfolio["Type"] = positionInPortfolio["BB Ticker"].split(" ")[0] == "T" || positionInPortfolio["Issuer"] == "US TREASURY N/B" ? "UST" : "BND";
      }
      let bondDivider = positionInPortfolio["Type"] == "BND" || positionInPortfolio["Type"] == "UST" ? 100 : 1;

      let portfolioPositionQuantity = positionInPortfolio["ISIN"].includes("IB") ? positionInPortfolio["Notional Amount"] / positionInPortfolio["Original Face"] : positionInPortfolio["Principal"];
      let mufgPositionQuantity = positionInMufg ? parseFloat(positionInMufg["Quantity"]) : 0;
      let portfolioAverageCost = parseFloat(positionInPortfolio["Average Cost"]);
      let mufgAverageCost = positionInMufg ? parseFloat(positionInMufg["LocalCost"]) / mufgPositionQuantity : 0;
      let portfolioPrice = Math.round(positionInPortfolio["Mid"] * 10000 * bondDivider) / 10000;
      portfolioPrice = portfolioPrice ? portfolioPrice : 0;
      let bgnPrice = Math.round(positionInPortfolio["Bloomberg Mid BGN"] * 10000 * bondDivider) / 10000;
      bgnPrice = bgnPrice ? bgnPrice : 0;
      let mufgPrice = positionInMufg ? parseFloat(positionInMufg["Price"]) : 0;

      let formattedRow = {
        "BB Ticker": positionInPortfolio["BB Ticker"],
        ISIN: positionInPortfolio["ISIN"],

        "Principal (app)": portfolioPositionQuantity || 0,
        "Principal (MUFG)": mufgPositionQuantity || 0,
        "Difference Principal": Math.round(portfolioPositionQuantity - mufgPositionQuantity) || 0,

        "Average Cost (app)": portfolioAverageCost || 0,
        "Average Cost (MUFG)": mufgAverageCost || 0,
        "Difference Average Cost": Math.round(portfolioAverageCost - mufgAverageCost) || 0,

        "Price (Broker)": portfolioPrice || 0,
        "Price (MUFG)": mufgPrice || 0,
        "Difference Price (Broker - MUFG)": portfolioPrice - mufgPrice || 0,
        "P&L Difference (Broker - MUFG)": ((portfolioPrice - mufgPrice) / (positionInPortfolio["Type"] == "BND" ? 100 : 1)) * portfolioPositionQuantity,

        "Price (BGN)": bgnPrice || 0,
        "Difference Price (Broker - BGN)": portfolioPrice - bgnPrice || 0,
        "P&L Difference (Broker - BGN)": ((portfolioPrice - bgnPrice) / (positionInPortfolio["Type"] == "BND" ? 100 : 1)) * portfolioPositionQuantity,
      };
      if (!(portfolioPositionQuantity == 0 && mufgPositionQuantity == 0)) {
        formattedData.push(formattedRow);
      }
    }
    return formattedData;
  } catch (error) {
    console.log(error);
    return { error: "unexpected error" };
  }
}

export async function reconcileNomura(data: NomuraReconcile[], portfolio: any) {
  try {
    portfolio = updatePortfolioBasedOnIsin(portfolio);
    let formattedData: any = [];

    let alreadyScanned: any = {};

    for (let index = 0; index < portfolio.length; index++) {
      let positionInPortfolio = portfolio[index];
      let positionInNomura = getPositionInNomura(data, positionInPortfolio["ISIN"]);
      if (!positionInPortfolio["Type"]) {
        positionInPortfolio["Type"] = positionInPortfolio["BB Ticker"].split(" ")[0] == "T" || positionInPortfolio["Issuer"] == "US TREASURY N/B" ? "UST" : "BND";
      }
      let bondDivider = positionInPortfolio["Type"] == "BND" || positionInPortfolio["Type"] == "UST" ? 100 : 1;

      let portfolioPositionQuantity = positionInPortfolio["Notional Amount"];
      let nomuraPositionQuantity = positionInNomura ? parseFloat(positionInNomura["SD Quantity"]) : 0;
      let portfolioPrice = Math.round(positionInPortfolio["Mid"] * 10000 * bondDivider) / 10000;
      portfolioPrice = portfolioPrice ? portfolioPrice : 0;
      let nomuraPrice = positionInNomura ? parseFloat(positionInNomura["Price"]) : 0;

      let formattedRow = {
        "BB Ticker": positionInPortfolio["BB Ticker"],
        ISIN: positionInPortfolio["ISIN"],

        "Notional Amount (app)": portfolioPositionQuantity || 0,
        "Notional Amount (nomura)": nomuraPositionQuantity || 0,
        "Difference Notional Amount": Math.round(portfolioPositionQuantity - nomuraPositionQuantity) || 0,

        "Price (app)": portfolioPrice || 0,
        "Price (nomura)": nomuraPrice || 0,
        "Difference Price": portfolioPrice - nomuraPrice || 0,
      };
      alreadyScanned[positionInPortfolio["ISIN"]] = true;
      formattedData.push(formattedRow);
    }
    for (let index = 0; index < data.length; index++) {
      let positionInNomura = data[index];
      if (!alreadyScanned[positionInNomura["Isin"]] && positionInNomura["Isin"]) {
        let nomuraPositionQuantity = positionInNomura ? parseFloat(positionInNomura["SD Quantity"]) : 0;
        let nomuraPrice = positionInNomura ? parseFloat(positionInNomura["Price"]) : 0;

        let formattedRow = {
          "BB Ticker": positionInNomura["Security Name"],
          ISIN: positionInNomura["Isin"],

          "Notional Amount (app)": 0,
          "Notional Amount (nomura)": nomuraPositionQuantity || 0,
          "Difference Notional Amount": Math.round(nomuraPositionQuantity) || 0,

          "Price (app)": 0,
          "Price (nomura)": nomuraPrice || 0,
          "Difference Price": nomuraPrice,
        };
        formattedData.push(formattedRow);
      }
    }

    return formattedData;
  } catch (error) {
    console.log(error);
    return { error: "unexpected error" };
  }
}

function getPositionInMUFG(mufgData: MufgReconcile[], bbTicker: string, isin: string) {
  for (let index = 0; index < mufgData.length; index++) {
    let row = mufgData[index];
    if (row["Investment"].includes(bbTicker) || row["Investment"].includes(isin)) {
      return row;
    }
  }
  return null;
}

function getPositionInNomura(data: NomuraReconcile[], isin: string) {
  for (let index = 0; index < data.length; index++) {
    let row = data[index];
    if (row["Isin"].includes(isin)) {
      return row;
    }
  }
  return null;
}

export function updatePortfolioBasedOnIsin(portfolio: any) {
  let updatedPortfolio: any = {};
  let aggregatedPortfolio: any = [];

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    let isin = position["ISIN"];
    if (updatedPortfolio[isin]) {
      updatedPortfolio[isin].push(position);
    } else {
      updatedPortfolio[isin] = [position];
    }
  }

  let isins = Object.keys(updatedPortfolio);
  for (let index = 0; index < isins.length; index++) {
    let isin = isins[index];
    let positions = updatedPortfolio[isin];
    let updatedPosition = {
      Principal: 0,
      "Average Cost": 0,
      "Notional Amount": 0,
      "Original Face": positions[0]["Original Face"],
      Mid: positions[0]["Mid"],
      ISIN: isin,
      "BB Ticker": positions[0]["BB Ticker"],
    };

    for (let positionIndex = 0; positionIndex < positions.length; positionIndex++) {
      let data = positions[positionIndex];
      let quantity = data["Principal"];
      let averageCost = data["Average Cost"];
      updatedPosition["Principal"] += quantity;
      updatedPosition["Notional Amount"] += data["Notional Amount"];
      updatedPosition["Average Cost"] += data["Principal"] * averageCost;
    }
    updatedPosition["Average Cost"] /= updatedPosition["Principal"];
    aggregatedPortfolio.push(updatedPosition);
  }

  return aggregatedPortfolio;
}

export async function reconcileNomuraCash({ path, link, collectionDate, start, end }: { path: string; link: string; collectionDate: string; start: number; end: number }) {
  try {
    let data = await readNomuraCashReport(path);

    if (data.error) {
      return data;
    } else {
      let records = data.records;
      let portfolio: PositionInDB[] = [];
      let action = await getPortfolioOnSpecificDate(collectionDate, "true");
      portfolio = action.portfolio;

      let interestRecords: NomuraCashReconcile[] = [];
      let couponPaymentRecords: NomuraCashReconcile[] = [];
      let redeemptionRecords: NomuraCashReconcile[] = [];
      let BuySellRecords: NomuraCashReconcile[] = [];
      for (let index = 0; index < records.length; index++) {
        const record = records[index];
        let type = record["Trade Status"];
        if (type == "Interest") {
          interestRecords.push(record);
        } else if (type == "REC") {
          couponPaymentRecords.push(record);
        } else if (type == "DEL") {
          redeemptionRecords.push(record);
        } else if (type == "BUY" || type == "SELL") {
          BuySellRecords.push(record);
        }
      }

      let fxInterest = getFXInterest(interestRecords);
      let redeemped = checkIfPositionsGotRedeemped(redeemptionRecords, portfolio);
      let finalPortfolioWithPositionsThatWillPay = positionsThatWillPayCoupon({ start, end, portfolio });
      let couponPaymentsNomura = checkIfCouponPaymentsAreSettleted(couponPaymentRecords, finalPortfolioWithPositionsThatWillPay, collectionDate);
      let couponPaymentsApp = checkPositionsThatShouldPayButDoNotExistInNomura(finalPortfolioWithPositionsThatWillPay, couponPaymentsNomura.isinsFound, collectionDate);

      let finalResult = [...fxInterest, ...redeemped, ...couponPaymentsApp, ...couponPaymentsNomura.result];
      return finalResult;
      // let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      // await insertEditLogs([], "Cash Reconcile", dateTime, "", "Link: " + link);
    }
  } catch (error) {
    console.log({ error });
    return { error: "Template does not match" };
  }
}

export function getFXInterest(fxInterestRcords: NomuraCashReconcile[]): NomuraReconcileCash[] {
  let sum = 0;

  for (let index = 0; index < fxInterestRcords.length; index++) {
    const element = fxInterestRcords[index];
    let fxRate = parseFloat(element["Fx Rate"]);
    let proceeds = parseFloat(element["Proceeds"]);
    sum += proceeds * fxRate;
  }
  let object = { ticker: "FX Interest", appSum: 0, nomuraSum: sum, difference: sum, message: "FX Interest", note: "" };

  return [object];
}

export function checkIfPositionsGotRedeemped(redeemptionRecords: NomuraCashReconcile[], portfolio: PositionInDB[]) {
  let result = [];
  for (let index = 0; index < redeemptionRecords.length; index++) {
    let isin = redeemptionRecords[index]["Isin"];
    let ticker = redeemptionRecords[index]["Security Name"];

    let position = portfolio.find((position: PositionInDB, index: number) => position["ISIN"] == isin);
    if (position) {
      if (parseFloat(position["Notional Amount"]) == 0) {
        let object = { ticker, appSum: position["Notional Amount"], nomuraSum: 0, note: "Redeemption", message: "Successful" };

        result.push(object);
      } else {
        let object = { ticker, appSum: position["Notional Amount"], nomuraSum: 0, note: "Redeemption", message: "Position is not redeemped in the app" };
        result.push(object);
      }
    } else {
      let object = { ticker, appSum: 0, nomuraSum: 0, note: "Redeemption", message: "Position can't be found in the app" };
      result.push(object);
    }
  }
  return result;
}

export function sumUpCouponPaymentRecords(couponPaymentRecords: NomuraCashReconcile[]) {
  let result: { [key: string]: { sum: number; ticker: string; message: string; settleDate: string } } = {};
  for (let index = 0; index < couponPaymentRecords.length; index++) {
    let isin = couponPaymentRecords[index]["Isin"];
    let ticker = couponPaymentRecords[index]["Security Name"];
    let proceeds = parseFloat(couponPaymentRecords[index]["Proceeds"]);
    let payInKindAlert = couponPaymentRecords[index]["Activity Description"];
    let settleDate = couponPaymentRecords[index]["Trade Date"];
    if (!result[isin]) {
      result[isin] = { sum: 0, ticker: ticker, message: payInKindAlert.toString().toLocaleLowerCase().includes("in kind") ? "Payment In Kind" : "", settleDate: settleDate };
    }
    result[isin].sum += proceeds;
    result[isin].ticker = ticker;
  }
  return result;
}

export function checkIfCouponPaymentsAreSettleted(couponPaymentRecords: NomuraCashReconcile[], portfolio: PositionInDB[], collectionDate: string): { result: NomuraReconcileCash[]; isinsFound: string[] } {
  let result = [];
  let isinsFound = [];
  let payments = sumUpCouponPaymentRecords(couponPaymentRecords);

  for (let isin in payments) {
    let position = getPositionAggregated(isin, portfolio, collectionDate);
    if (position.found) {
      let appSum = position.couponPayment;
      let nomuraSum = payments[isin].sum;
      let difference = appSum - nomuraSum;
      let message = `Nomura Expected ${position.ticker} to pay ${payments[isin].sum} on ${position.previousSettleDate}, App Expected ${position.ticker} to pay ${position.couponPayment} on ${position.previousSettleDate}`;
      let note = `${payments.payInKindAlert ? "This Position is Pay in Kind" : ""} ${position.note}`;
      let ticker = position.ticker;
      let object = { ticker, appSum, nomuraSum, difference, message, note };
      isinsFound.push(isin);
      result.push(object);
    } else {
      let appSum = 0;
      let nomuraSum = payments[isin].sum;
      let difference = appSum - nomuraSum;
      let message = `Nomura Expected ${payments[isin].ticker} to pay ${payments[isin].sum} on ${payments[isin].settleDate}, App does not see this action`;
      let note = `${payments.payInKindAlert ? "This Position is Pay in Kind" : ""}`;

      let object = { ticker: payments[isin].ticker, appSum, nomuraSum, difference, message, note };
      result.push(object);
    }
  }
  return { result, isinsFound };
}

export function getPositionAggregated(isin: string, portfolio: PositionInDB[], dateInput: string) {
  let totalSettled = 0;
  let ticker = "";
  let coupon = 0;
  let frequency = 2;
  let previousSettleDate = "";
  let found = false;
  let note = "";
  let inputTimestamp = new Date(dateInput).getTime() + 24 * 60 * 60 * 1000;
  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    if (position["ISIN"] == isin) {
      found = true;
      ticker = position["BB Ticker"];
      if (position["Security Description"]) {
        note = position["Security Description"];
      }
      coupon = parseFloat(position["Coupon Rate"]) / 100;
      if (position["Coupon Frequency"]) {
        frequency = parseFloat(position["Coupon Frequency"]);
      }
      if (position["Previous Settle Date"]) {
        previousSettleDate = position["Previous Settle Date"];
      }
      for (let date in position["Interest"]) {
        let timestamp = new Date(date).getTime();
        if (timestamp < inputTimestamp) {
          totalSettled += parseFloat(position["Interest"][date]);
        }
      }
    }
  }
  let couponPayment = totalSettled * coupon * (1 / frequency);
  return { totalSettled, ticker, found, coupon, frequency, previousSettleDate, couponPayment, note };
}

export function positionsThatWillPayCoupon({ start, end, portfolio }: { start: number; end: number; portfolio: PositionInDB[] }): PositionInDB[] {
  let finalPortfolioWithPositionsThatWillPay: PositionInDB[] = [];
  for (let index = 0; index < portfolio.length; index++) {
    const position = portfolio[index];
    let previousSettleDate = position["Previous Settle Date"];
    if (previousSettleDate) {
      let timestamp = formatDateToIso(previousSettleDate).getTime();

      if (timestamp > start && timestamp < end) {
        finalPortfolioWithPositionsThatWillPay.push(position);
      }
    }
  }
  return finalPortfolioWithPositionsThatWillPay;
}

export function checkPositionsThatShouldPayButDoNotExistInNomura(portfolio: PositionInDB[], isinFound: string[], collectionDate: string): NomuraReconcileCash[] {
  let result = [];

  for (let index = 0; index < portfolio.length; index++) {
    const position = portfolio[index];
    if (isinFound.includes(position["ISIN"])) {
    } else {
      let aggregates = getPositionAggregated(position["ISIN"], portfolio, collectionDate);
      let appSum = aggregates.couponPayment;
      let nomuraSum = 0;
      let difference = appSum - nomuraSum;
      let message = `App Expected ${aggregates.ticker} to pay ${aggregates.couponPayment} on ${aggregates.previousSettleDate} but could not find it in nomura`;
      let note = aggregates.note;
      let ticker = aggregates.ticker;
      let object = { ticker, appSum, nomuraSum, difference, message, note };
      result.push(object);
    }
  }
  return result;
}

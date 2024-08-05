import { PositionBeforeFormatting, PositionInDB } from "../../../models/portfolio";
import { MufgReconcileUpload, NomuraCashReconcileFileUpload, NomuraPositonReconcileUpload, NomuraReconcileCashOutput, NomuraReconcileCashOutputCoupon, NomuraReconcileCashOutputRedeemption } from "../../../models/reconcile";
import { getAllDatesSinceLastMonthLastDay, getDateTimeInMongoDBCollectionFormat } from "../../reports/common";
import { getMTDParams, getPortfolioOnSpecificDate } from "../../reports/portfolios";
import { getEarliestCollectionName, parseBondIdentifierNomura } from "../../reports/tools";
import { getHistoricalPortfolio } from "../positions";
import { readNomuraCashReport } from "../readExcel";
import { formatDateToIso, parseYYYYMMDDAndReturnMonth } from "../tools";
import { convertNomuraDateToAppTradeDate, findTrade, getMTDRlzd, getMtdMarkAndMtdNotional, getPositionAggregated, getProcceeds, getRlzdPNLNomuraProceeds, sumUpCouponPaymentRecords, switchCorrectedTrades } from "./tools";

export async function reconcileMUFG(MUFGData: MufgReconcileUpload[], portfolioInput: PositionInDB[]) {
  try {
    let portfolio = updatePortfolioBasedOnIsin(portfolioInput);
    let formattedData: any = [];

    for (let index = 0; index < portfolio.length; index++) {
      let positionInPortfolio = portfolio[index];

      let positionInMufg = getPositionInMUFG(MUFGData, positionInPortfolio["BB Ticker"], positionInPortfolio["ISIN"]);

      if (!positionInPortfolio["Type"]) {
        positionInPortfolio["Type"] = positionInPortfolio["BB Ticker"].split(" ")[0] == "T" ? "UST" : "BND";
      }
      let bondDivider = positionInPortfolio["Type"] == "BND" || positionInPortfolio["Type"] == "UST" ? 100 : 1;

      let portfolioPositionQuantity = positionInPortfolio["ISIN"].includes("IB") ? parseFloat(positionInPortfolio["Notional Amount"]) / parseFloat(positionInPortfolio["Original Face"]) : parseFloat(positionInPortfolio["Principal"]);
      let mufgPositionQuantity = positionInMufg ? parseFloat(positionInMufg["Quantity"]) : 0;
      let portfolioAverageCost = parseFloat(positionInPortfolio["Average Cost"]);
      let mufgAverageCost = positionInMufg ? parseFloat(positionInMufg["LocalCost"]) / mufgPositionQuantity : 0;
      let portfolioPrice = Math.round(parseFloat(positionInPortfolio["Mid"]) * 10000 * bondDivider) / 10000;
      portfolioPrice = portfolioPrice ? portfolioPrice : 0;
      let bgnPrice = Math.round(parseFloat(positionInPortfolio["Bloomberg Mid BGN"]) * 10000) / 10000;
      bgnPrice = bgnPrice ? bgnPrice : 0;
      let mufgPrice = positionInMufg ? parseFloat(positionInMufg["Price"]) : 0;

      let pnlBrokerMufg = mufgPrice ? ((portfolioPrice - mufgPrice) / (positionInPortfolio["Type"] == "BND" ? 100 : 1)) * portfolioPositionQuantity : 0;
      let pnlBrokerBgn = bgnPrice ? Math.round(((portfolioPrice - bgnPrice) / (positionInPortfolio["Type"] == "BND" ? 100 : 1)) * portfolioPositionQuantity) : 0;

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
        "P&L Difference (Broker - MUFG)": positionInPortfolio["Type"] == "CDS" || positionInPortfolio["Type"] == "FX" || positionInPortfolio["Type"] == "EQT" ? 0 : pnlBrokerMufg,
        "Price (BGN)": bgnPrice || 0,
        "Difference Price (Broker - BGN)": portfolioPrice - bgnPrice || 0,
        "P&L Difference (Broker - BGN)": positionInPortfolio["Type"] == "CDS" || positionInPortfolio["Type"] == "FX" || positionInPortfolio["Type"] == "EQT" ? 0 : pnlBrokerBgn,
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

export async function reconcileNomura(data: NomuraPositonReconcileUpload[], portfolio: any) {
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

function getPositionInMUFG(mufgData: MufgReconcileUpload[], bbTicker: string, isin: string) {
  for (let index = 0; index < mufgData.length; index++) {
    let row = mufgData[index];
    if (row["Investment"].includes(bbTicker) || row["Investment"].includes(isin)) {
      return row;
    }
  }
  return null;
}

function getPositionInNomura(data: NomuraPositonReconcileUpload[], isin: string) {
  for (let index = 0; index < data.length; index++) {
    let row = data[index];
    if (row["Isin"].includes(isin)) {
      return row;
    }
  }
  return null;
}

export function updatePortfolioBasedOnIsin(portfolio: PositionInDB[]): {
  Principal: string;
  "Average Cost": string;
  "Notional Amount": string;
  "Original Face": string;
  Mid: string;
  ISIN: string;
  "BB Ticker": string;
  "Bloomberg Mid BGN": string;
  Type: string;
}[] {
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
      "Bloomberg Mid BGN": positions[0]["Bloomberg Mid BGN"],
      Type: positions[0]["Type"],
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

      let interestRecords: NomuraCashReconcileFileUpload[] = [];
      let couponPaymentRecords: NomuraCashReconcileFileUpload[] = [];
      let redeemptionRecords: NomuraCashReconcileFileUpload[] = [];
      let buySellRecords: NomuraCashReconcileFileUpload[] = [];
      let buySellCorrectRecords: NomuraCashReconcileFileUpload[] = [];

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
          buySellRecords.push(record);
        } else if (type == "BUY / Correct" || type == "SELL / Correct") {
          buySellCorrectRecords.push(record);
        }
      }
      switchCorrectedTrades(buySellRecords, buySellCorrectRecords);
      let fxInterest = getFXInterest(interestRecords);
      let redeemped = checkIfPositionsGotRedeemped(redeemptionRecords, portfolio);

      let finalPortfolioWithPositionsThatWillPay = positionsThatWillPayCoupon({ start, end, portfolio });

      let couponPaymentsNomura = checkIfCouponPaymentsAreSettleted(couponPaymentRecords, finalPortfolioWithPositionsThatWillPay, collectionDate);

      let couponPaymentsApp = checkPositionsThatShouldPayButDoNotExistInNomura(finalPortfolioWithPositionsThatWillPay, couponPaymentsNomura.isinsFound, collectionDate);

      let tradesCheck = await checkNomuraTradesWithVcon(buySellRecords);

      return { fxInterest, redeemped, couponPayments: [...couponPaymentsApp, ...couponPaymentsNomura.result], tradesCheck, error: null };
    }
  } catch (error: any) {
    console.log({ error });
    return { error: error.toString(), finalResult: [], tradesCheck: [] };
  }
}

export function getFXInterest(fxInterestRcords: NomuraCashReconcileFileUpload[]): NomuraReconcileCashOutput[] {
  let sum = 0;

  for (let index = 0; index < fxInterestRcords.length; index++) {
    const element = fxInterestRcords[index];
    let fxRate = parseFloat(element["Fx Rate"]);
    let proceeds = parseFloat(element["Proceeds"]);
    sum += proceeds * fxRate;
  }
  let object = { Ticker: "FX Interest", "App Sum": 0, "Nomura Sum": sum, Difference: sum, Message: "FX Interest", Note: "" };

  return [object];
}

export function checkIfPositionsGotRedeemped(redeemptionRecords: NomuraCashReconcileFileUpload[], portfolio: PositionInDB[]): NomuraReconcileCashOutputRedeemption[] {
  let result = [];
  for (let index = 0; index < redeemptionRecords.length; index++) {
    let isin = redeemptionRecords[index]["Isin"];
    let ticker = redeemptionRecords[index]["Security Name"];

    let position = portfolio.find((position: PositionInDB, index: number) => position["ISIN"] == isin);
    if (position) {
      if (parseFloat(position["Notional Amount"]) == 0) {
        let object = {
          Ticker: ticker,
          ISIN: position["ISIN"],
          Location: position["Location"],
          Currency: position["Currency"],
          "Notional Amount Triada": parseFloat(position["Notional Amount"]),
          Difference: 0,
          Result: "Successful",
        };
        result.push(object);
      } else {
        let object = {
          Ticker: ticker,
          ISIN: position["ISIN"],
          Location: position["Location"],
          Currency: position["Currency"],
          "Notional Amount Triada": parseFloat(position["Notional Amount"]),
          Difference: 0,
          Result: "Position is not redeemped in the app",
        };
        result.push(object);
      }
    } else {
      let object = {
        Ticker: ticker,
        ISIN: redeemptionRecords[index]["Isin"],
        Location: "",
        Currency: redeemptionRecords[index]["Security Issue CCY"],
        "Notional Amount Triada": 0,
        Difference: 0,
        Result: "Position can't be found in the app",
      };
      result.push(object);
    }
  }
  return result;
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

export function checkIfCouponPaymentsAreSettleted(couponPaymentRecords: NomuraCashReconcileFileUpload[], portfolio: PositionInDB[], collectionDate: string): { result: NomuraReconcileCashOutputCoupon[]; isinsFound: string[] } {
  let result = [];
  let isinsFound: any = new Set();
  let payments = sumUpCouponPaymentRecords(couponPaymentRecords);

  for (let isin in payments) {
    let position = getPositionAggregated(isin, portfolio, collectionDate);
    if (position.found) {
      let appSum = position.couponPayment;
      let nomuraSum = payments[isin].sum;
      let difference = appSum - nomuraSum;
      let message = `Nomura Expected ${position.ticker} to pay ${payments[isin].sum} on ${payments[isin].settleDate}, App Expected ${position.ticker} to pay ${position.couponPayment} on ${position.previousSettleDate}`;
      let note = `${payments.payInKindAlert ? "This Position is Pay in Kind" : ""} ${position.note}`;
      let ticker = position.ticker;

      let object = {
        Ticker: ticker,
        ISIN: position.isin,
        Location: position.locations,
        Currency: position.currency,
        "Coupon Frequency": position.couponFrequency,
        "Settle Date BBG": position.previousSettleDate,
        "Coupon Rate": position.coupon,
        "Notional Amount Triada": position.notional,
        "Nomura Cash Coupon Trade Date": payments[isin].tradeDate,
        "Nomura Cash Coupon Settlement Date": payments[isin].settleDate,
        "Nomura Cash Coupon Settlement Amount “REC”": nomuraSum,
        "Triada Expected Cash Payment Amount": appSum,
        Difference: difference,
        Result: difference == 0 ? "SUCCESS" : message + " && " + note,
      };

      isinsFound.add(isin);
      result.push(object);
    } else {
      let appSum = 0;
      let nomuraSum = payments[isin].sum;
      let difference = appSum - nomuraSum;
      let message = `Nomura Expected ${payments[isin].ticker} to pay ${payments[isin].sum} on ${payments[isin].settleDate}, App does not see this action`;
      let note = `${payments.payInKindAlert ? "This Position is Pay in Kind" : ""}`;

      let object = {
        Ticker: payments[isin].ticker,
        ISIN: isin,
        Location: "",
        Currency: payments[isin].currency,

        "Coupon Frequency": "",
        "Settle Date BBG": "",
        "Coupon Rate": parseBondIdentifierNomura(payments[isin].ticker),
        "Notional Amount Triada": 0,
        "Nomura Cash Coupon Trade Date": payments[isin].tradeDate,
        "Nomura Cash Coupon Settlement Date": payments[isin].settleDate,
        "Nomura Cash Coupon Settlement Amount “REC”": nomuraSum,
        "Triada Expected Cash Payment Amount": appSum,
        Difference: difference,
        Result: difference == 0 ? "SUCCESS" : message + " && " + note,
      };

      result.push(object);
    }
  }
  return { result, isinsFound: [...isinsFound] };
}

export function checkPositionsThatShouldPayButDoNotExistInNomura(portfolio: PositionInDB[], isinFound: string[], collectionDate: string): NomuraReconcileCashOutputCoupon[] {
  let result = [];
  let isinMapped: string[] = [];
  for (let index = 0; index < portfolio.length; index++) {
    const position = portfolio[index];
    if (isinFound.includes(position["ISIN"]) || isinMapped.includes(position["ISIN"])) {
    } else {
      let aggregates = getPositionAggregated(position["ISIN"].trim(), portfolio, collectionDate);

      if (aggregates.couponPayment) {
        let appSum = aggregates.couponPayment;
        let nomuraSum = 0;
        let difference = appSum - nomuraSum;
        let message = `App Expected ${aggregates.ticker} to pay ${aggregates.couponPayment} on ${aggregates.previousSettleDate} but could not find it in nomura`;
        let note = aggregates.note;
        let ticker = aggregates.ticker;
        let object = {
          Ticker: ticker,
          ISIN: aggregates.isin,
          Location: aggregates.locations,
          Currency: aggregates.currency,
          "Coupon Frequency": aggregates.couponFrequency,
          "Settle Date BBG": aggregates.previousSettleDate,
          "Coupon Rate": aggregates.coupon,
          "Notional Amount Triada": aggregates.notional,
          "Nomura Cash Coupon Trade Date": "",
          "Nomura Cash Coupon Settlement Date": "",
          "Nomura Cash Coupon Settlement Amount “REC”": nomuraSum,
          "Triada Expected Cash Payment Amount": appSum,
          Difference: difference,
          Result: difference == 0 ? "SUCCESS" : message + " && " + note,
        };

        result.push(object);
        isinMapped.push(position["ISIN"]);
      }
    }
  }
  return result;
}

export function calculateNomuraMTDRlzdPNL(portfolio: PositionBeforeFormatting[] | PositionInDB[], buySellProceeds: NomuraCashReconcileFileUpload[], collectionMonth: number): NomuraReconcileCashOutput[] {
  let result = [];
  let positionsWithMTDInfo = getMtdMarkAndMtdNotional(portfolio);
  let trades = getProcceeds(buySellProceeds, collectionMonth);

  for (let isin in trades) {
    let position = positionsWithMTDInfo[isin];
    let pnl = getRlzdPNLNomuraProceeds(trades[isin], position.mtdMark, position.mtdNotional);
    let appSum = position.mtdRlzd;
    let nomuraSum = pnl.totalRow["Rlzd P&L Amount"]; //opposite because nomura looks at from cash in/out pov
    let difference = Math.round(appSum - nomuraSum);
    let message = `This position's currency is ${pnl.currency}, proceeds are calculated at Base Currency. Nomura's FX Rate is ${trades[isin][0]["Security Issue CCY"]} ${trades[isin][0]["Fx Rate"]}`;
    let note = pnl.currency;
    let object = { Ticker: position.ticker, "App Sum": appSum, "Nomura Sum": nomuraSum, Difference: difference, Message: message, Note: note };
    result.push(object);
  }
  return result;
}

async function checkNomuraTradesWithVcon(nomuraTrades: NomuraCashReconcileFileUpload[]) {
  let results: { Ticker: string; "Trade Date App": string; "Settle Date App": string; "Notional Amount App": number; "Notional Amount Nomura": number; "App Price": number; "Nomura Price": number; Result: string }[] = [];
  for (let index = 0; index < nomuraTrades.length; index++) {
    let trade = nomuraTrades[index];
    let triadaId = trade["Client Trade Ref"];
    let tradesApp = await findTrade("vcons", triadaId);
    if (tradesApp.length) {
      let tradeApp = tradesApp[0];
      let ticker = tradeApp["BB Ticker"];
      let result = "";

      let tradeDateApp = tradeApp["Trade Date"];
      let tradeDateNomura = convertNomuraDateToAppTradeDate(trade["Trade Date"].toString());

      if (tradeDateApp != tradeDateNomura) {
        result += `App Trade Date is ${tradeDateApp}, Nomura Trade Date is ${tradeDateNomura}/ `;
      }

      let settleDateApp = tradeApp["Settle Date"];
      let settleDateNomura = convertNomuraDateToAppTradeDate(trade["Settlement Date"].toString());

      if (settleDateApp != settleDateNomura) {
        result += `App Settle Date is ${settleDateApp}, Nomura Settle Date is ${settleDateNomura}/ `;
      }

      let notionalAmountApp = parseFloat(tradeApp["Notional Amount"]);
      let notionalAmountNomura = Math.abs(parseFloat(trade["Quantity"]));

      if (notionalAmountApp != notionalAmountNomura) {
        result += `App Notional Amount is ${notionalAmountApp}, Nomura Notional Amount is ${notionalAmountNomura}/ `;
      }

      let priceApp = parseFloat(tradeApp["Price"]);
      let priceNomura = parseFloat(trade["Price"]);

      if (priceApp != priceNomura) {
        result += `App Price is ${priceApp}, Nomura Price is ${priceNomura}/ `;
      }

      let settlementApp = parseFloat(tradeApp["Settlement Amount"]);
      let settlementNomura = Math.abs(parseFloat(trade["Proceeds"]));

      if (settlementApp != settlementNomura) {
        result += `App Settlement Amount is ${settlementApp}, Nomura Settlement Amount is ${settlementNomura}/ `;
      }

      let principalApp = parseFloat(tradeApp["Principal"]);
      let principalNomura = Math.abs(parseFloat(trade["Principle Amount"]));

      if (principalApp != principalNomura) {
        result += `App Principal Amount is ${principalApp}, Nomura Principal Amount is ${principalNomura}/ `;
      }

      let accruedApp = parseFloat(tradeApp["Accrued Interest"].toString().replace(/,/g, "")) || 0;
      let accruedNomura = Math.abs(parseFloat(trade["Interest"]));

      if (accruedApp != accruedNomura) {
        result += `App Accrued Interest is ${accruedApp}, Nomura Accrued Interest is ${accruedNomura}/ `;
      }

      let object = {
        "Triada Trade Id": triadaId,
        Ticker: ticker,
        Location: tradeApp["Location"],

        "Trade Date App": tradeDateApp,
        "Settle Date App": settleDateApp,

        "Notional Amount App": notionalAmountApp,
        "Notional Amount Nomura": notionalAmountNomura,

        "App Price": priceApp,
        "Nomura Price": priceNomura,

        "App Settlement": settlementApp,
        "Nomura Settlement": settlementNomura,

        "App Principal": principalApp,
        "Nomura Principal": principalNomura,

        "App Accrued Interest": accruedApp,
        "Nomura Accrued Interest": accruedNomura,

        Result: settlementApp != settlementNomura ? result : "",
      };
      results.push(object);
    }
  }
  return results;
}

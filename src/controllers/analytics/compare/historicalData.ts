import { formatDateRlzdDaily, getAllDatesSinceLastMonthLastDay, getLastDayOfMonth, monthlyRlzdDate } from "../../reports/common";
import { calculateRlzd } from "../../reports/portfolios";
import { parseBondIdentifier } from "../../reports/tools";
import { getRlzdTrades } from "../../reports/trades";
import { client } from "../../userManagement/auth";

export async function getCollectionsInRange(start: any, end: any): Promise<any> {
  const database = client.db("portfolios");

  const cursor = database.listCollections();
  const collections = await cursor.toArray();
  let finalCollections: any = {};
  let finalCollectionsArray: any = [];

  for (let index = 0; index < collections.length; index++) {
    const element = collections[index];
    let name = element.name.split("-");
    let date = new Date(name[2] + "/" + name[3].split(" ")[0] + "/" + name[1]).getTime();
    if (date >= start && date <= end) {
      finalCollections[date] = element.name;
    }
  }
  let keys = Object.keys(finalCollections).sort((a: any, b: any) => a - b);
  for (let index = 0; index < keys.length; index++) {
    const element = keys[index];
    finalCollectionsArray.push(finalCollections[element]);
  }

  return finalCollectionsArray;
}

export async function getAllCollections(list: any) {
  const database = client.db("portfolios");
  let portfolios: any = {};
  let averageCostMTD: any = {};
  for (let index = 0; index < list.length; index++) {
    const element = list[index];
    let name = element.split("-");

    let date = name[2] + "/" + name[3].split(" ")[0] + "/" + name[1] + " 23:59";

    let documents = await database.collection(`${element}`).find().toArray();
    let thisMonth = monthlyRlzdDate(element);

    documents = documents.filter((position: any) => {
      if (position["Notional Amount"] == 0) {
        let monthsTrades = Object.keys(position["MTD Rlzd"] || {});
        for (let index = 0; index < monthsTrades.length; index++) {
          monthsTrades[index] = monthlyRlzdDate(monthsTrades[index]);
        }
        if (monthsTrades.includes(thisMonth)) {
          return position;
        } else {
        }
      } else {
        return position;
      }
    });

    getDayIntAndPrincipal(documents, new Date(date));
    averageCostMTD[date] = averageCostMTD[date] ? averageCostMTD[date] : {};
    await getAverageCostMTD(documents, date, averageCostMTD[date]);
    portfolios[element] = documents;
  }
  return portfolios;
}

export function getDayPNLData(list: any, portfolios: any) {
  let pnlData: any = {};

  for (let index = 1; index < list.length; index++) {
    let portfolioToday = portfolios[list[index]];
    let portfolioYesterday = portfolios[list[index - 1]];
    let name = list[index].split("-");
    let date = new Date(name[2] + "/" + name[3].split(" ")[0] + "/" + name[1]).getTime();
    let dayPnl = getPNL(portfolioToday, portfolioYesterday, date);

    pnlData[list[index]] = dayPnl;
  }
  return pnlData;
}

function getPNL(portfolio: any, reference: any, date: any) {
  let pnl = { URLZD: 0, RLZD: 0, Int: 0, FX: 0, PNL: 0 };
  let thisDay = formatDateRlzdDaily(date);

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    let isin = position["ISIN"];

    for (let j = 0; j < reference.length; j++) {
      if (reference[j]["ISIN"] == isin) {
        let originalFace = position["Type"] == "CDS" ? position["Original Face"] : 1;
        let fxRate = position["FX Rate"] || 1;
        let lastFxRate = reference[j]["FX Rate"] || 1;

        let valueInUsd = position["Principal"] * position["Mid"] * fxRate;
        let dayPnlUrlzd: any = (((position["Mid"] - reference[j]["Mid"]) * position["Notional Amount"]) / originalFace) * fxRate;
        let dayPnlRlzd: any = position["Day Rlzd"] ? (position["Day Rlzd"][thisDay] ? calculateRlzd(position["Day Rlzd"][thisDay], position["Average Cost MTD"], position["BB Ticker"], position["Asset Class"]) || 0 : 0) : 0;
        if (thisDay == "01/07/2024") {
          console.log(position["BB Ticker"], position["Day Rlzd"], thisDay);
        }
        let dayPnlInt: any = position["Day Int."] * fxRate;
        let dayPnlFX: any = ((parseFloat(fxRate) - parseFloat(lastFxRate)) / originalFace) * valueInUsd || 0;
        if (position["Type"] == "FX") {
          let temp = dayPnlUrlzd;
          dayPnlUrlzd = 0;
          dayPnlFX += temp;
        }

        let dayPnl = dayPnlUrlzd + dayPnlRlzd + dayPnlInt + dayPnlFX;

        // console.log({ dayPnl, dayPnlRlzd, dayPnlInt, dayPnlFX, fxRate, lastFxRate, valueInUsd }, position["BB Ticker"], position["Location"]);
        pnl.URLZD += parseFloat(dayPnlUrlzd) || 0;
        pnl.RLZD += parseFloat(dayPnlRlzd) || 0;
        pnl.Int += parseFloat(dayPnlInt) || 0;
        pnl.FX += parseFloat(dayPnlFX) || 0;
        pnl.PNL += parseFloat(dayPnl) || 0;

        break;
      }
    }
  }
  return pnl;
}

function getDayIntAndPrincipal(portfolio: any, date: any) {
  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    portfolio[index]["Principal"] = 0;
    let quantityGeneratingInterest = position["Notional Amount"];
    let interestInfo = position["Interest"] || {};

    let settlementDates = Object.keys(interestInfo);
    for (let indexSettlementDate = 0; indexSettlementDate < settlementDates.length; indexSettlementDate++) {
      let settlementDate = settlementDates[indexSettlementDate];
      let settlementDateTimestamp = new Date(settlementDate).getTime();
      portfolio[index]["Principal"] += interestInfo[settlementDate];
      portfolio[index]["Interest"][settlementDate + " Total"] = portfolio[index]["Principal"];
      if (settlementDateTimestamp >= new Date(date).getTime()) {
        quantityGeneratingInterest -= interestInfo[settlementDate];
      } else {
      }
    }
    let couponDaysYear = portfolio[index]["Coupon Duration"] || 360;
    portfolio[index]["Coupon Rate"] = portfolio[index]["Coupon Rate"] ? portfolio[index]["Coupon Rate"] : parseBondIdentifier(portfolio[index]["BB Ticker"]).rate || 0;
    portfolio[index]["Day Int."] = (parseFloat(quantityGeneratingInterest) * (portfolio[index]["Coupon Rate"] / 100.0)) / couponDaysYear;

    if (!portfolio[index]["Day Int."]) {
      portfolio[index]["Day Int."] = 0;
    }
  }
  return;
}

export async function getAverageCostMTD(portfolio: any, date: any, averageCostMTD: any) {
  for (let index = 0; index < portfolio.length; index++) {
    let tradeType = "vcons";
    try {
      let identifier = portfolio[index]["ISIN"];
      let typeCheck = portfolio[index]["Type"] || "";
      if (identifier.includes("IB")) {
        tradeType = "ib";
      } else if (identifier.includes("1393")) {
        tradeType = "emsx";
      } else if (typeCheck.includes("CDS")) {
        tradeType = "gs";
      } else if (typeCheck.includes("FX")) {
        tradeType = "fx";
      }

      let multiplier = tradeType == "vcons" ? 100 : 1;
      //   if (!averageCostMTD[identifier + " " + portfolio[index]["Location"]]) {
      let trades = await getRlzdTrades(`${tradeType}`, identifier, portfolio[index]["Location"], date, portfolio[index]["MTD Mark"] * multiplier, portfolio[index]["MTD Notional"]);

      portfolio[index]["Average Cost MTD"] = trades.averageCostMTD / multiplier;
      //     averageCostMTD[identifier + " " + portfolio[index]["Location"]] = portfolio[index]["Average Cost MTD"];
      //   } else {
      //     portfolio[index]["Average Cost MTD"] = averageCostMTD[identifier + " " + portfolio[index]["Location"]];
      //   }
    } catch (error) {
      console.log(error);
    }
  }

  return;
}

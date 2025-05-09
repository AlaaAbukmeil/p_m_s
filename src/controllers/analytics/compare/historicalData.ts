import { parse } from "path";
import { AnalyticsSample } from "../../../models/analytics";
import { formatDateRlzdDaily, getAllDatesSinceLastMonthLastDay, getDateTimeInMongoDBCollectionFormat, getLastDayOfMonth, monthlyRlzdDate } from "../../reports/common";
import { calculateRlzd } from "../../reports/portfolios";
import { getAllCollectionNames, parseBondIdentifier } from "../../reports/tools";
import { getRlzdTrades } from "../../reports/trades";
import { analyticsPool } from "../../operations/psql/operation";

export async function getCollectionsInRange(start: any, end: any, portfolioId: string): Promise<any> {
  let collections = await getAllCollectionNames(portfolioId);
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

export function breakdown(portfolio: any, fundDetails: any, name: any) {
  let analytics: any = {
    country: {},
    sector: {},
    assetClass: {},
    strategy: {},
    issuer: {},
    rating: {},
    region: {},
    marketType: {},
    portfolio: {},
    positions: {},
    isinNames: {},
  };

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    let type = position["Type"];
    if (type !== "Total") {
      let country = position["Country"];
      let sector = position["Sector"];
      let assetClass = position["Asset Class"];
      let strategy = position["Strategy"];
      let issuer = position["Issuer"];
      let rating = position["Rating Score"];
      let region = position["Region"];
      let marketType = position["Market Type"];
      let usdValue = Math.abs(position["Value (BC)"]);
      let isin = position["ISIN"];
      let bbTicker = position["BB Ticker"];
      analytics.isinNames[isin] = { "BB Ticker": bbTicker, Currency: position["Currency"], ISIN: isin, CUSIP: position["CUSIP"] };

      let dayUnrlzd = parseFloat(position["Day URlzd (BC)"]);
      let dayRlzd = parseFloat(position["Day Rlzd (BC)"]);
      let dayInt = parseFloat(position["Day Int. (BC)"]);
      let dayFx = parseFloat(position["Day P&L FX"]);
      let dayPNL = parseFloat(position["Day P&L (BC)"]);

      let mtdUnrlzd = parseFloat(position["MTD URlzd (BC)"]);
      let mtdRlzd = parseFloat(position["MTD Rlzd (BC)"]);
      let mtdInt = parseFloat(position["MTD Int. (BC)"]);
      let mtdFx = parseFloat(position["MTD P&L FX"]);
      let mtdPNL = parseFloat(position["MTD P&L (BC)"]);

      sumParameter(analytics.country, { dayUnrlzd, dayRlzd, dayInt, dayFx, dayPNL, mtdUnrlzd, mtdRlzd, mtdInt, mtdFx, mtdPNL, nav: fundDetails.nav, usdValue }, country);
      sumParameter(analytics.sector, { dayUnrlzd, dayRlzd, dayInt, dayFx, dayPNL, mtdUnrlzd, mtdRlzd, mtdInt, mtdFx, mtdPNL, nav: fundDetails.nav, usdValue }, sector);
      sumParameter(analytics.assetClass, { dayUnrlzd, dayRlzd, dayInt, dayFx, dayPNL, mtdUnrlzd, mtdRlzd, mtdInt, mtdFx, mtdPNL, nav: fundDetails.nav, usdValue }, assetClass);
      sumParameter(analytics.strategy, { dayUnrlzd, dayRlzd, dayInt, dayFx, dayPNL, mtdUnrlzd, mtdRlzd, mtdInt, mtdFx, mtdPNL, nav: fundDetails.nav, usdValue }, strategy);
      sumParameter(analytics.issuer, { dayUnrlzd, dayRlzd, dayInt, dayFx, dayPNL, mtdUnrlzd, mtdRlzd, mtdInt, mtdFx, mtdPNL, nav: fundDetails.nav, usdValue }, issuer);
      sumParameter(analytics.rating, { dayUnrlzd, dayRlzd, dayInt, dayFx, dayPNL, mtdUnrlzd, mtdRlzd, mtdInt, mtdFx, mtdPNL, nav: fundDetails.nav, usdValue }, rating);
      sumParameter(analytics.region, { dayUnrlzd, dayRlzd, dayInt, dayFx, dayPNL, mtdUnrlzd, mtdRlzd, mtdInt, mtdFx, mtdPNL, nav: fundDetails.nav, usdValue }, region);
      sumParameter(analytics.marketType, { dayUnrlzd, dayRlzd, dayInt, dayFx, dayPNL, mtdUnrlzd, mtdRlzd, mtdInt, mtdFx, mtdPNL, nav: fundDetails.nav, usdValue }, marketType);
      sumParameter(analytics.positions, { dayUnrlzd, dayRlzd, dayInt, dayFx, dayPNL, mtdUnrlzd, mtdRlzd, mtdInt, mtdFx, mtdPNL, nav: fundDetails.nav, usdValue }, isin);
      sumParameter(analytics.portfolio, { dayUnrlzd, dayRlzd, dayInt, dayFx, dayPNL, mtdUnrlzd, mtdRlzd, mtdInt, mtdFx, mtdPNL, nav: fundDetails.nav, usdValue }, "portfolio");
    }
  }
  return analytics;
}

function sumParameter(analytics: AnalyticsSample | any, { dayUnrlzd, dayRlzd, dayInt, dayFx, dayPNL, mtdUnrlzd, mtdRlzd, mtdInt, mtdFx, mtdPNL, nav }: any, param: any) {
  if (!analytics[param]) {
    analytics[param] = {};
  }

  analytics[param].dayUnrlzd = (analytics[param].dayUnrlzd || 0) + dayUnrlzd;
  analytics[param].dayRlzd = (analytics[param].dayRlzd || 0) + dayRlzd;
  analytics[param].dayInt = (analytics[param].dayInt || 0) + dayInt;
  analytics[param].dayFx = (analytics[param].dayFx || 0) + dayFx;
  analytics[param].dayPNL = (analytics[param].dayPNL || 0) + dayPNL;

  analytics[param].mtdUnrlzd = (analytics[param].mtdUnrlzd || 0) + mtdUnrlzd;
  analytics[param].mtdRlzd = (analytics[param].mtdRlzd || 0) + mtdRlzd;
  analytics[param].mtdInt = (analytics[param].mtdInt || 0) + mtdInt;
  analytics[param].mtdFx = (analytics[param].mtdFx || 0) + mtdFx;
  analytics[param].mtdPNL = (analytics[param].mtdPNL || 0) + mtdPNL;

  analytics[param].dayUnrlzdOfNAV = (analytics[param].dayUnrlzdOfNAV || 0) + dayUnrlzd / nav;
  analytics[param].dayRlzdOfNAV = (analytics[param].dayRlzdOfNAV || 0) + dayRlzd / nav;
  analytics[param].dayIntOfNAV = (analytics[param].dayIntOfNAV || 0) + dayInt / nav;
  analytics[param].dayFxOfNAV = (analytics[param].dayFxOfNAV || 0) + dayFx / nav;
  analytics[param].dayPNLOfNAV = (analytics[param].dayPNLOfNAV || 0) + dayPNL / nav;

  analytics[param].mtdUnrlzdOfNAV = (analytics[param].mtdUnrlzdOfNAV || 0) + mtdUnrlzd / nav;
  analytics[param].mtdRlzdOfNAV = (analytics[param].mtdRlzdOfNAV || 0) + mtdRlzd / nav;
  analytics[param].mtdIntOfNAV = (analytics[param].mtdIntOfNAV || 0) + mtdInt / nav;
  analytics[param].mtdFxOfNAV = (analytics[param].mtdFxOfNAV || 0) + mtdFx / nav;
  analytics[param].mtdPNLOfNAV = (analytics[param].mtdPNLOfNAV || 0) + mtdPNL / nav;
}

export async function updateAnalytics(analytics: any, name: string, portfolioId: string): Promise<void> {
  const client = await analyticsPool.connect();
  try {
    const query = `
      INSERT INTO public.analytics (name, data, portfolio_id, timestamp)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name, portfolio_id)
      DO UPDATE SET 
        data = $2,
        timestamp = $4;
    `;
    const values = [name, JSON.stringify(analytics), portfolioId, analytics.timestamp];

    await client.query(query, values);
  } catch (error: any) {
    console.log({ errorUpdateAnalytics: error });
  } finally {
    client.release();
  }
}

export async function getAnalytics(from: number, to: number, portfolioId: string): Promise<any[]> {
  const client = await analyticsPool.connect();
  try {
    const query = `
      SELECT *
      FROM public.analytics
      WHERE timestamp >= $1 AND timestamp <= $2 AND portfolio_id = $3
      ORDER BY timestamp ASC;
    `;
    const values = [from, to, portfolioId];

    const result = await client.query(query, values);
    return result.rows;
  } catch (error: any) {
    console.log({ getAnalytics: error });
    return [];
  } finally {
    client.release();
  }
}

export function extractAnalytics(analytics: any, conditions: any, notOperation = "false", type = "pnl") {
  let final: any = {};
  let strategies: any = new Set();
  let countries: any = new Set();
  let sectors: any = new Set();
  let assetClass: any = new Set();
  let issuers: any = new Set();
  let ratings: any = new Set();
  let regions: any = new Set();
  let marketTypes: any = new Set();
  let isinNames: any = [];
  let isinInformation: any = [];

  for (let index = 0; index < analytics.length; index++) {
    let document = analytics[index].data;
    let name = analytics[index].name;
    Object.keys(document.strategy).forEach((key) => strategies.add(key));
    Object.keys(document.country).forEach((key) => countries.add(key));
    Object.keys(document.sector).forEach((key) => sectors.add(key));
    Object.keys(document.assetClass).forEach((key) => assetClass.add(key));
    Object.keys(document.issuer).forEach((key) => issuers.add(key));
    Object.keys(document.rating).forEach((key) => ratings.add(key));
    Object.keys(document.region).forEach((key) => regions.add(key));
    Object.keys(document.marketType).forEach((key) => marketTypes.add(key));
    Object.keys(document.isinNames).forEach((key) => isinNames.push({ value: key, label: document.isinNames[key]["ISIN"] }));
    Object.keys(document.isinNames).forEach((key) => isinInformation.push(document.isinNames[key]));

    let data: any = {};
    if (notOperation == "false") {
      if (type == "pnl") {
        checkAnalyticsConditions(document, conditions, data, name);
      } else if (type == "percentage") {
        checkAnalyticsConditionsOfNAV(document, conditions, data, name);
      }
    } else {
      if (type == "pnl") {
        let tempData = {};
        checkAnalyticsConditions(document, { portfolio: "portfolio" }, data, name);
        checkAnalyticsConditions(document, conditions, tempData, name);
        substractParams(data, tempData);
      } else if (type == "percentage") {
        let tempData = {};

        checkAnalyticsConditionsOfNAV(document, { portfolio: "portfolio" }, data, name);
        checkAnalyticsConditionsOfNAV(document, conditions, tempData, name);
        substractParams(data, tempData);
      }
    }
    data.mtdExpensesAmount = document.mtdExpensesAmount;
    final[name] = data;
  }
  strategies = Array.from(strategies).sort();
  countries = Array.from(countries).sort();
  sectors = Array.from(sectors).sort();
  assetClass = Array.from(assetClass).sort();
  issuers = Array.from(issuers).sort();
  ratings = Array.from(ratings).sort();
  regions = Array.from(regions).sort();
  marketTypes = Array.from(marketTypes).sort();
  isinNames = isinNames.sort((a: any, b: any) => a.label - b.label);

  return { final, strategies, countries, sectors, assetClass, issuers, ratings, regions, marketTypes, isinNames, isinInformation };
}

function checkAnalyticsConditions(portfolio: any, conditions: any, data: any, name: any) {
  for (let param in conditions) {
    let values = conditions[param].split("@");

    for (let index = 0; index < values.length; index++) {
      if (values[index] != "") {
        portfolio[param][values[index]] = portfolio[param][values[index]]
          ? portfolio[param][values[index]]
          : {
              dayUnrlzd: 0,
              dayRlzd: 0,
              dayInt: 0,
              dayFx: 0,
              dayPNL: 0,
              mtdUnrlzd: 0,
              mtdRlzd: 0,
              mtdInt: 0,
              mtdFx: 0,
              mtdPNL: 0,
            };
        data.dayUnrlzd = (data.dayUnrlzd || 0) + portfolio[param][values[index]].dayUnrlzd;
        data.dayRlzd = (data.dayRlzd || 0) + portfolio[param][values[index]].dayRlzd;
        data.dayInt = (data.dayInt || 0) + portfolio[param][values[index]].dayInt;
        data.dayFx = (data.dayFx || 0) + portfolio[param][values[index]].dayFx;
        data.dayPNL = (data.dayPNL || 0) + portfolio[param][values[index]].dayPNL;

        data.mtdUnrlzd = (data.mtdUnrlzd || 0) + portfolio[param][values[index]].mtdUnrlzd;
        data.mtdRlzd = (data.mtdRlzd || 0) + portfolio[param][values[index]].mtdRlzd;
        data.mtdInt = (data.mtdInt || 0) + portfolio[param][values[index]].mtdInt;
        data.mtdFx = (data.mtdFx || 0) + portfolio[param][values[index]].mtdFx;
        data.mtdPNL = (data.mtdPNL || 0) + portfolio[param][values[index]].mtdPNL;
      }
    }
  }
}

function checkAnalyticsConditionsOfNAV(portfolio: any, conditions: any, data: any, name: any) {
  for (let param in conditions) {
    let values = conditions[param].split("@");

    for (let index = 0; index < values.length; index++) {
      if (values[index] != "") {
        portfolio[param][values[index]] = portfolio[param][values[index]]
          ? portfolio[param][values[index]]
          : {
              dayUnrlzdOfNAV: 0,
              dayRlzdOfNAV: 0,
              dayIntOfNAV: 0,
              dayFxOfNAV: 0,
              dayPNLOfNAV: 0,
              mtdUnrlzdOfNAV: 0,
              mtdRlzdOfNAV: 0,
              mtdIntOfNAV: 0,
              mtdFxOfNAV: 0,
              mtdPNLOfNAV: 0,
            };

        data.dayUnrlzd = (data.dayUnrlzd || 0) + portfolio[param][values[index]].dayUnrlzdOfNAV;
        data.dayRlzd = (data.dayRlzd || 0) + portfolio[param][values[index]].dayRlzdOfNAV;
        data.dayInt = (data.dayInt || 0) + portfolio[param][values[index]].dayIntOfNAV;
        data.dayFx = (data.dayFx || 0) + portfolio[param][values[index]].dayFxOfNAV;
        data.dayPNL = (data.dayPNL || 0) + portfolio[param][values[index]].dayPNLOfNAV;

        data.mtdUnrlzd = (data.mtdUnrlzd || 0) + portfolio[param][values[index]].mtdUnrlzdOfNAV;
        data.mtdRlzd = (data.mtdRlzd || 0) + portfolio[param][values[index]].mtdRlzdOfNAV;
        data.mtdInt = (data.mtdInt || 0) + portfolio[param][values[index]].mtdIntOfNAV;
        data.mtdFx = (data.mtdFx || 0) + portfolio[param][values[index]].mtdFxOfNAV;
        data.mtdPNL = (data.mtdPNL || 0) + portfolio[param][values[index]].mtdPNLOfNAV;
      }
    }
  }

  data.dayUnrlzd = data.dayUnrlzd * 100;
  data.dayRlzd = data.dayRlzd * 100;
  data.dayInt = data.dayInt * 100;
  data.dayFx = data.dayFx * 100;
  data.dayPNL = data.dayPNL * 100;

  data.mtdUnrlzd = data.mtdUnrlzd * 100;
  data.mtdRlzd = data.mtdRlzd * 100;
  data.mtdInt = data.mtdInt * 100;
  data.mtdFx = data.mtdFx * 100;
  data.mtdPNL = data.mtdPNL * 100;
}

function substractParams(object: any, reference: any) {
  for (let param in object) {
    object[param] = object[param] - reference[param];
  }
}

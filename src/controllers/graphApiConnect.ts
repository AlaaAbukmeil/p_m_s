require("dotenv").config();

import { renderVcon, renderFx } from "./excelFormat";
import { convertExcelDateToJSDate, getTime, getTradeDateYearTrades } from "./common";
import { mergeSort } from "./reports/common";
import { getPortfolio } from "./reports/positions";
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const FormData = require("form-data");

export async function getGraphToken() {
  try {
    let form = new FormData();
    form.append("grant_type", "client_credentials");
    form.append("client_id", process.env.GRAPH_CLIENT_ID);
    form.append("scope", "https://graph.microsoft.com/.default");
    form.append("client_secret", process.env.GRAPH_CLIENT_SECRET);
    let url = `https://login.microsoftonline.com/cb7b2398-24e7-4982-ba78-31f3ad6aee9f/oauth2/v2.0/token`;
    let action = await axios.post(url, form);
    return action.data["access_token"];
  } catch (error) {
    return error;
  }
}

export function getSecurityInPortfolioWithoutLocationForVcon(portfolio: any, identifier: string) {
  let object = "";
  for (let index = 0; index < portfolio.length; index++) {
    let issue = portfolio[index];
    if (issue["ISIN"].includes(identifier) && identifier) {
      if (issue["ISIN"] != "") {
        object += issue["Location"] + " ";
      }
    } else if (issue["BB Ticker"]) {
      if (issue["BB Ticker"] != "" && issue["BB Ticker"] == identifier) {
        object += issue["Location"] + " ";
      }
    }
  }
  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return object;
}

function format_date_ISO(date: string) {
  return new Date(date).toISOString();
}

export async function getVcons(token: string, start_time: any, end_time: any, trades: any) {
  let portfolio = await getPortfolio();
  try {
    let url = `https://graph.microsoft.com/v1.0/users/vcons@triadacapital.com/messages?$filter=contains(subject,'New BB') and receivedDateTime ge ${format_date_ISO(start_time)} and receivedDateTime le ${format_date_ISO(end_time)}&$top=1000000`;
    let action = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    let vcons = action.data.value;

    let object = [];

    let id;
  
    for (let index = 0; index < vcons.length; index++) {
      let tradeTime = getTime((new Date(vcons[index]["receivedDateTime"]).toISOString()));
      let vcon = vcons[index].body.content;
     
      vcon = renderVcon(vcon);
      let identifier = vcon["ISIN"];
      vcon["BB Ticker"] = vcon["Issue"];
      vcon["Entry Time"] = tradeTime
      vcon["Notional Amount"] = vcon["Quantity"]
      let securityInPortfolioLocation = getSecurityInPortfolioWithoutLocationForVcon(portfolio, identifier);
      let location = securityInPortfolioLocation.trim();
      let trade_status = "new";
      let triadaId = trades.find(function (trade: any) {
        return trade["Seq No"] == vcon["Seq No"] && trade["ISIN"] == vcon["ISIN"];
      });

      // console.log(vcon["Issue"], vcon["Seq No"],triadaId)

      if (triadaId) {
        continue;
      }
      vcon["Location"] = location;

      vcon["Trade App Status"] = trade_status;
      object.push(vcon);
    }
    object = mergeSort(object);
    for (let customIndex = 0; customIndex < object.length; customIndex++) {
      let trade = object[customIndex];
      if (!trade["Triada Trade Id"]) {
        id = uuidv4();
        trade["Triada Trade Id"] = id;
      }
    }
    return object;
  } catch (error) {
    return error;
  }
}

export async function getFxTrades(token: string, start_time: string, end_time: string, trades: any) {
  try {
    let url = `https://graph.microsoft.com/v1.0/users/vcons@triadacapital.com/messages?$filter=contains(subject,'Fill Alert') and receivedDateTime ge ${format_date_ISO(start_time)} and receivedDateTime le ${format_date_ISO(end_time)}&$top=1000000`;
    let action = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    let fxTrades = action.data.value;

    let object = [];
    let count = trades.length + 1;
    let id;
    for (let index = 0; index < fxTrades.length; index++) {
      let fxTrade = fxTrades[index].body.content;
      fxTrade = renderFx(fxTrade);
      if (Object.keys(fxTrade).length) {
        object.push(fxTrade);
      }
    }
    return object;
  } catch (error) {
    return error;
  }
}

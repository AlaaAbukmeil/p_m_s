require("dotenv").config();

import { bucketPublic, getTime } from "../common";
import { getPortfolio } from "../operations/positions";
import { getDateTimeInMongoDBCollectionFormat, mergeSort } from "../reports/common";
import { renderVcon, renderFx } from "./excelFormat";
import { Vcon } from "../../models/trades";
import { insertEditLogs } from "../operations/logs";
const pdf = require("pdf-parse");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

export async function getGraphToken(): Promise<string> {
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
    console.log(error);
    return "access denied";
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

function format_date_ISO(date: string): string {
  return new Date(date).toISOString();
}
function getMonthAbbreviation(date: string) {
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthIndex = new Date(date).getMonth();
  return monthNames[monthIndex].toLowerCase();
}

export async function getVcons(token: string, start_time: any, end_time: any, trades: any): Promise<Vcon[]> {
  let portfolio = await getPortfolio();
  try {
    let url = `https://graph.microsoft.com/v1.0/users/vcons@triadacapital.com/messages?$filter=contains(subject,'New BB') and receivedDateTime ge ${format_date_ISO(start_time)} and receivedDateTime le ${format_date_ISO(end_time)}&$top=1000000`;
    let action = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    let vcons = action.data.value;

    let object: Vcon[] = [];

    let id;

    for (let index = 0; index < vcons.length; index++) {
      let tradeTime = getTime(new Date(vcons[index]["receivedDateTime"]).toISOString());
      let content = vcons[index].body.content;
      let vcon: Vcon = renderVcon(content);

      let identifier = vcon["ISIN"];
      vcon["BB Ticker"] = vcon["Issue"];
      vcon["Entry Time"] = tradeTime;
      vcon["Notional Amount"] = vcon["Quantity"];
      let securityInPortfolioLocation = getSecurityInPortfolioWithoutLocationForVcon(portfolio, identifier);
      let location = securityInPortfolioLocation.trim();
      let trade_status = "new";
      let triadaId = trades.find(function (trade: any) {
        return trade["Seq No"] == vcon["Seq No"] && (trade["ISIN"] == vcon["ISIN"] || trade["BB Ticker"] == vcon["BB Ticker"]);

      });

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
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "Get Vcons", "controllers/eblot/graphApiConnect.ts");

    return [];
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
    for (let index = 0; index < fxTrades.length; index++) {
      let fxTrade = fxTrades[index].body.content;
      fxTrade = renderFx(fxTrade);
      if (Object.keys(fxTrade).length) {
        object.push(fxTrade);
      }
    }
    return object;
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getFxTrades", "controllers/eblot/graphApiConnect.ts");

    return [];
  }
}

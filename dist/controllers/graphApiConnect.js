"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFxTrades = exports.getVcons = exports.getSecurityInPortfolioWithoutLocationForVcon = exports.getGraphToken = void 0;
require("dotenv").config();
const excelFormat_1 = require("./excelFormat");
const common_1 = require("./common");
const common_2 = require("./reports/common");
const positions_1 = require("./reports/positions");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");
const FormData = require("form-data");
async function getGraphToken() {
    try {
        let form = new FormData();
        form.append("grant_type", "client_credentials");
        form.append("client_id", process.env.GRAPH_CLIENT_ID);
        form.append("scope", "https://graph.microsoft.com/.default");
        form.append("client_secret", process.env.GRAPH_CLIENT_SECRET);
        let url = `https://login.microsoftonline.com/cb7b2398-24e7-4982-ba78-31f3ad6aee9f/oauth2/v2.0/token`;
        let action = await axios.post(url, form);
        return action.data["access_token"];
    }
    catch (error) {
        return error;
    }
}
exports.getGraphToken = getGraphToken;
function getSecurityInPortfolioWithoutLocationForVcon(portfolio, identifier) {
    let object = "";
    for (let index = 0; index < portfolio.length; index++) {
        let issue = portfolio[index];
        if (issue["ISIN"].includes(identifier) && identifier) {
            if (issue["ISIN"] != "") {
                object += issue["Location"] + " ";
            }
        }
        else if (issue["BB Ticker"]) {
            if (issue["BB Ticker"] != "" && issue["BB Ticker"] == identifier) {
                object += issue["Location"] + " ";
            }
        }
    }
    // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
    return object;
}
exports.getSecurityInPortfolioWithoutLocationForVcon = getSecurityInPortfolioWithoutLocationForVcon;
function format_date_ISO(date) {
    return new Date(date).toISOString();
}
async function getVcons(token, start_time, end_time, trades) {
    let portfolio = await (0, positions_1.getPortfolio)();
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
            let tradeTime = (0, common_1.getTime)((new Date(vcons[index]["receivedDateTime"]).toISOString()));
            let vcon = vcons[index].body.content;
            vcon = (0, excelFormat_1.renderVcon)(vcon);
            let identifier = vcon["ISIN"];
            vcon["BB Ticker"] = vcon["Issue"];
            vcon["Entry Time"] = tradeTime;
            vcon["Notional Amount"] = vcon["Quantity"];
            let securityInPortfolioLocation = getSecurityInPortfolioWithoutLocationForVcon(portfolio, identifier);
            let location = securityInPortfolioLocation.trim();
            let trade_status = "new";
            let triadaId = trades.find(function (trade) {
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
        object = (0, common_2.mergeSort)(object);
        for (let customIndex = 0; customIndex < object.length; customIndex++) {
            let trade = object[customIndex];
            if (!trade["Triada Trade Id"]) {
                id = uuidv4();
                trade["Triada Trade Id"] = id;
            }
        }
        return object;
    }
    catch (error) {
        return error;
    }
}
exports.getVcons = getVcons;
async function getFxTrades(token, start_time, end_time, trades) {
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
            fxTrade = (0, excelFormat_1.renderFx)(fxTrade);
            if (Object.keys(fxTrade).length) {
                object.push(fxTrade);
            }
        }
        return object;
    }
    catch (error) {
        return error;
    }
}
exports.getFxTrades = getFxTrades;

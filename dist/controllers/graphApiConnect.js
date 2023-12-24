"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFxTrades = exports.getVcons = exports.getSecurityInPortfolioWithoutLocation = exports.getGraphToken = void 0;
require("dotenv").config();
const axios = require("axios");
const FormData = require("form-data");
const excelFormat_1 = require("./excelFormat");
const reports_1 = require("./reports");
const portfolioFunctions_1 = require("./portfolioFunctions");
const common_1 = require("./common");
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
function getSecurityInPortfolioWithoutLocation(portfolio, identifier) {
    let object = "";
    for (let index = 0; index < portfolio.length; index++) {
        let issue = portfolio[index];
        if (issue["ISIN"].includes(identifier) || issue["Issue"].includes(identifier)) {
            if (issue["ISIN"] != "") {
                object += issue["Location"] + " ";
            }
        }
        else if (identifier == issue["BB Ticker"]) {
            if (issue["BB Ticker"] != "") {
                object += issue["Location"] + " ";
            }
        }
    }
    // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
    return object;
}
exports.getSecurityInPortfolioWithoutLocation = getSecurityInPortfolioWithoutLocation;
function format_date_ISO(date) {
    return new Date(date).toISOString();
}
async function getVcons(token, start_time, end_time, trades) {
    let portfolio = await (0, reports_1.getPortfolio)();
    try {
        // console.log(object)
        let url = `https://graph.microsoft.com/v1.0/users/vcons@triadacapital.com/messages?$filter=contains(subject,'New BB') and receivedDateTime ge ${format_date_ISO(start_time)} and receivedDateTime le ${format_date_ISO(end_time)}&$top=1000000`;
        let action = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        let vcons = action.data.value;
        // console.log(url)
        let object = [];
        let count = trades.length + 1;
        let id;
        for (let index = 0; index < vcons.length; index++) {
            let vcon = vcons[index].body.content;
            vcon = (0, excelFormat_1.renderVcon)(vcon);
            let identifier = vcon["ISIN"];
            let securityInPortfolioLocation = getSecurityInPortfolioWithoutLocation(portfolio, identifier);
            let location = securityInPortfolioLocation.trim();
            let trade_status = "new";
            let triadaId = trades.find(function (trade) {
                return trade["Seq No"] === vcon["Seq No"];
            });
            console.log(triadaId, vcon["Issue"]);
            if (triadaId) {
                id = triadaId["Triada Trade Id"];
                location = triadaId["Location"];
                trade_status = "uploaded_to_app";
                vcon["Triada Trade Id"] = id;
            }
            vcon["Location"] = location;
            vcon["Trade App Status"] = trade_status;
            object.push(vcon);
        }
        object = (0, portfolioFunctions_1.mergeSort)(object);
        for (let customIndex = 0; customIndex < object.length; customIndex++) {
            let trade = object[customIndex];
            if (!trade["Triada Trade Id"]) {
                let tradeDate = (0, common_1.getTradeDateYearTrades)((0, common_1.convertExcelDateToJSDate)(trade["Trade Date"]));
                id = `Triada-BBB-${tradeDate}-${count}`;
                trade["Triada Trade Id"] = id;
                count++;
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
    // let portfolio = await getPortfolio()
    try {
        // console.log(object)
        let url = `https://graph.microsoft.com/v1.0/users/vcons@triadacapital.com/messages?$filter=contains(subject,'Fill Alert') and receivedDateTime ge ${format_date_ISO(start_time)} and receivedDateTime le ${format_date_ISO(end_time)}&$top=1000000`;
        let action = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        let fxTrades = action.data.value;
        // console.log(url)
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

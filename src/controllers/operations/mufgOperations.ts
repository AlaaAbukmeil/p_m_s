import { MufgTrade } from "../../models/mufg";
import { readFxTrades } from "./readExcel";



export function formatMufg(trades: any, start: string, end: string): MufgTrade[] {
  let startTimestamp = new Date(start).getTime();
  let endTimestamp = new Date(end).getTime();
  trades = trades.filter((trade: any, index: any) => new Date(trade["Trade Date"]).getTime() > startTimestamp && new Date(trade["Trade Date"]).getTime() < endTimestamp);
  let mufgTrades = [];
  for (let index = 0; index < trades.length; index++) {
    let trade = trades[index];
    let originalFace = trade["Trade Type"] == "ib" ? trade["Original Face"] : 1;
    let obj: any = {};
    obj["File_Type"] = "ExchSec";
    obj["Fund"] = "90104";
    obj["Transaction_Event"] = "N";
    obj["Transaction_Type"] = trade["B/S"];
    obj["Security_ID_ISIN"] = trade["Trade Type"] == "vcon" ? trade["ISIN"] : "";
    obj["Security_ID_CUSIP"] = trade["Trade Type"] == "vcon" ? trade["Cusip"] : "";
    obj["Security_ID_SEDOL"] = "";
    obj["Security_ID_Bloomberg"] = trade["BB Ticker"];
    obj["Security_ID_Reuters"] = "";
    obj["Security_ID_UGC"] = "";
    obj["Security_Description"] = trade["BB Ticker"];
    obj["Trade_ID_Client"] = trade["Triada Trade Id"];
    obj["Quantity"] = trade["Trade Type"] == "emsx" ? trade["Settlement Amount"] : trade["Trade Type"] == "ib" ? Math.abs(trade["Notional Amount"]) / originalFace : Math.abs(trade["Notional Amount"]);
    obj["Original_Face"] = trade["Trade Type"] == "ib" ? originalFace : "100";
    obj["Price"] = trade["Price"];
    obj["Accrued_Interest"] = trade["Accrued Interest"] || 0;
    obj["Net_Money_Settlement"] = Math.abs(parseFloat(trade["Settlement Amount"]));
    obj["Currency_Settlement"] = trade["Currency"];
    obj["Currency_Investment"] = "";
    obj["Trade_Date"] = trade["Trade Date"];
    obj["Settle_Date"] = trade["Settle Date"];
    obj["Expiration_Date"] = "";
    obj["Strike"] = "";
    obj["Put_Call"] = "";
    obj["Custodian_Account_Client"] = trade["Trade Type"] == "ib" ? "IB_PB" : "NOM_PB";
    obj["Custodian_Account_UGC"] = trade["Trade Type"] == "ib" ? "90104-INBR-INT" : "90104-NOMB-INTL";
    obj["Broker_Client"] = "";
    obj["Broker_UGC"] = "";
    obj["Fund_Structure"] = "";
    obj["Strategy_Client"] = "";
    obj["Strategy_UGC"] = "";
    obj["Comments"] = "";
    obj["Order Commission"] = Math.abs(trade["Comm/Fee"]) || 0;
    obj["Trader_Client"] = "";
    obj["Trader_UGC"] = "";
    obj["Manager_Client"] = "";
    obj["Manager_UGC"] = "";
    obj["Analyst_Client"] = "";
    obj["Analyst_UGC"] = "";
    obj["Industry_Client"] = "";
    obj["Industry_UGC"] = "";
    obj["Underlying_ISIN"] = "";
    obj["Underlying_CUSIP"] = "";
    obj["Underlying_Sedol"] = "";
    obj["Underlying_BBG"] = "";
    obj["Underlying_RIC"] = "";
    obj["Trade_Expense_1_Net"] = "";
    obj["Trade_Expense_1_Type"] = "";
    obj["Trade_Expense_2_Net"] = "";
    obj["Trade_Expense_2_Type"] = "";
    obj["Trade_Expense_3_Net"] = "";
    obj["Trade_Expense_3_Type"] = "";
    obj["Commission_NetTrade"] = "";
    obj["CFD_Flag"] = "0";
    obj["Security_Country"] = "";
    obj["Closing_Lot_ID"] = "";
    obj["Secondary_Client_Trade_ID"] = "";
    obj["Net_Money_Trade"] = "";
    obj["Is_Factor"] = "";
    obj["Underlying_UGC"] = "";
    obj["Underlying_Desc"] = "";
    obj["Underlying_Country"] = "";
    obj["Location"] = trade["Location"].toUpperCase();
    mufgTrades.push(obj);
  }
  return mufgTrades;
}

export async function formatFxMufg(files: any, tradesCount: number) {
  let fxData = [];
  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    let file = files[fileIndex];
    if (file["fieldname"] == "fx") {
      fxData = await readFxTrades(file["filename"]);
    }
  }

  let mufg = [];
  let counter = tradesCount;

  for (let index = 0; index < fxData.length; index++) {
    let object: any = {};
    let trade = fxData[index];

    object["File_Type"] = "Spot FX";
    object["Fund"] = "90104";
    object["Transaction_Event"] = "N";
    object["Trade_ID_Client"] = `Triada-NFX-${trade["Trade Date"]}-${counter}`;
    object["Buy Currency"] = trade["Buy Currency"];
    object["Buy Amount"] = trade["Buy Amount"];
    object["Sell Currency"] = trade["Sell Currency"];
    object["Sell Amount"] = trade["Sell Amount"];
    object["Trade_Date"] = trade["Trade Date"];
    object["Settlement_Date"] = trade["Settle Date"];
    object["Spot_Date"] = "";
    object["Custodian_Account_Client"] = "NOM_PB";
    object["Custodian_Account_UGC"] = "90104-NOMB-INTL";
    object["Counterparty_Client"] = "";
    object["Counterparty_UGC"] = "";
    object["Fund_Structure"] = "";
    object["Strategy_Client"] = "";
    object["Strategy_UGC"] = "";
    object["Comments"] = "";
    object["Trader_Client"] = "";
    object["Trader_UGC"] = "";
    object["Manager_Client"] = "";
    object["Manager_UGC"] = "";
    object["Analyst_Client"] = "";
    object["Analyst_UGC"] = "";
    mufg.push(object);
    counter++;
  }

  return mufg;
}

export async function formatFxTradesToMufg(data: any) {
  let mufg: any = [];
  let counter = 1;
  for (let index = 0; index < data.length; index++) {
    let obj: any = {};
    let trade = data[index];
    obj = {
      File_Type: "Spot FX",
      Fund: "90104",
      Transaction_Event: "N",
      Trade_ID_Client: "",
      "Buy Currency": "",
      "Buy Amount": "",
      "Sell Currency": "",
      "Sell Amount": "",
      Trade_Date: "",
      Settlement_Date: "",
      Spot_Date: "",
      Custodian_Account_Client: "",
      Custodian_Account_UGC: "",
      Counterparty_Client: "",
      Counterparty_UGC: "",
      Fund_Structure: "",
      Strategy_Client: "",
      Strategy_UGC: "",
      Comments: "",
      Trader_Client: "",
      Trader_UGC: "",
      Manager_Client: "",
      Manager_UGC: "",
      Analyst_Client: "",
      Analyst_UGC: "",
      Conversion: "",
      Month: "",
      Date: "",
      "Trade Date Conversion": "",
      "Settlement Date Conversion": "",
    };
  }

  return mufg;
}



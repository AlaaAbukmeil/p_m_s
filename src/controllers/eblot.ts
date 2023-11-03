import { readBBGBlot, readIB, readBBE } from "./mufgOperations";
import { getDateMufg, convertExcelDateToJSDate, convertBBGEmexDate } from "./common";
import { settlementDatePassed, uploadToGCloudBucket } from "./portfolioFunctions";
import { getTradeDateYearTrades } from "./common";
import { getSettlementDateYear } from "./portfolioFunctions";


export async function formatTriadaBlot(files: any) {

    let bbbData = [], ibData = [], bbeData = [];
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
        let file = files[fileIndex];
        if (file["fieldname"] == "BBB") {
            bbbData = await readBBGBlot(file["filename"])
        } else if (file["fieldname"] == "IB") {
            ibData = await readIB(file["filename"])
        } else if (file["fieldname"] == "BBE") {
            bbeData = await readBBE(file["filename"])
        }

    }
    let blot = []
    let counter = 1
    for (let index = 0; index < bbbData.length; index++) {
        let obj: any = {}
        let trade = bbbData[index];
        if (trade["Status"] == "Accepted") {
            let settlementDate = getSettlementDateYear(convertExcelDateToJSDate(trade["Trade Date"]), convertExcelDateToJSDate(trade["Settle Date"]))
            obj["Location"] = trade["Location"]
            obj["Date"] = getTradeDateYearTrades(convertExcelDateToJSDate(trade["Trade Date"]))
            obj["Time"] = trade["Entry Time"].split(" ")[1] + ":00"
            obj["B/S"] = trade["Buy/Sell"]
            obj["Bond/CDS"] = trade["Issue"]
            obj["Price"] = trade["Price (Decimal)"]
            obj["Notionol Amount"] = parseFloat(trade["Quantity"].replace(/,/g, ''))
            obj["Trader"] = "JM"
            obj["Counter Party"] = trade["Broker Code"]
            obj["Settlement Date"] = getTradeDateYearTrades(settlementDate)
            obj["Settlement Amount"] = parseFloat(trade["Net"].replace(/,/g, ''))
            blot.push(obj)
            counter++
        }
    }

    for (let index2 = 0; index2 < ibData.length; index2++) {

        let trade = ibData[index2];
        if (trade["Header"] == "Data") {
            let obj: any = {}
            let originalFace = trade["Symbol"].includes("6") ? 125000 : 50
            obj["Location"] = trade["Location"]
            obj["Date"] = getTradeDateYearTrades(getDateMufg(convertExcelDateToJSDate(trade["Date/Time"])))
            obj["Time"] = new Date(trade["Date/Time"]).getHours() + ":00"
            obj["B/S"] = parseFloat(trade["Quantity"]) > 0 ? "B" : "S"
            obj["Bond/CDS"] = trade["Symbol"] + "Index"
            obj["Price"] = trade["C. Price"]
            obj["Notionol Amount"] = parseFloat(trade["Quantity"])
            obj["Trader"] = "JM"
            obj["Counter Party"] = "IB"
            obj["Settlement Date"] = getTradeDateYearTrades(getDateMufg(convertExcelDateToJSDate(trade["Date/Time"])))
            obj["Settlement Amount"] = (Math.abs(parseFloat(trade["Quantity"])) * originalFace * parseFloat(trade["C. Price"]))
            blot.push(obj)
            counter++
        }
    }

    for (let index3 = 0; index3 < bbeData.length; index3++) {
        let obj: any = {}
        let trade = bbeData[index3];
        let originalFace = 1
        obj["Location"] = ""
        obj["Date"] = convertBBGEmexDate(convertExcelDateToJSDate(trade["Create Time (As of)"]))
        obj["Time"] =""
        obj["B/S"] = trade["Side"] == "Sell" ? "S" : "B"
        obj["Bond/CDS"] = trade["Security"]
        obj["Price"] = trade["LmtPr"]
        obj["Notionol Amount"] = parseFloat(trade["FillQty"])
        obj["Trader"] = "JM"
        obj["Counter Party"] = "EMSX"
        obj["Settlement Date"] = convertBBGEmexDate(convertExcelDateToJSDate(trade["Create Time (As of)"]))
        obj["Settlement Amount"] = parseFloat(trade["FillQty"]) * trade["LmtPr"] * originalFace
        blot.push(obj)
        counter++
    }

    return blot
}


import util from "util";
import { getPortfolio } from "./reports";
import { insertTradesInPortfolio } from "./reports";
const fs = require("fs");
const writeFile = util.promisify(fs.writeFile);

export async function appendLogs(positions: any) {
  for (let obj of positions) {
    let trades = obj["MTD Rlzd"].map((trade: any) => JSON.stringify(trade)).join("\n");
    let logs = `Issue: ${obj["Issue"]} \n\n ${trades}\n\n`;

    await writeFile("trades-logs.txt", logs, { flag: "a" });
  }
}
let changes: any = {
  "LLOYDS 4 ⅜ 04/05/34 EMTN": [{ price: 0.9948999999999999, quantity: -1000000 }],

  "DBR 0 ¼ 02/15/29": [{ price: 0.91983, quantity: 1000000 }],

  "STANDARD CHARTERED BANK 6.0% Perpr Regs": [{ price: 0.985, quantity: 200000 }],

  "SOCGEN 10 PERP REGS": [{ price: 1.0515, quantity: 500000 }],
  "HSBC 8.0% PERP Corp": [{ price: 1.0301, quantity: 300000 }],

  "CFLD Cayman 2.5% 31-Jan-2031 RegS (NB1)": [{ price: 0.025, quantity: 4491000 }],

  "BNP PARIBAS SA 8.5% Perp": [
    { price: 1.03375, quantity: 500000 },
    { price: 1.036, quantity: 500000 },
  ],

  "BNP Paribas 6.625% PerpectualRegS": [{ price: 0.9952, quantity: 300000 }],

  "BHRAIN 7 ¾ 04/18/35 REGS": [{ price: 1.03125, quantity: 1000000 }],

  "Bangkok Bank Public Co Ltd 5.5% 21-Sep-2033 RegS": [{ price: 1.0214, quantity: 1000000 }],
  "U.S. GOVT -TREASURY DEPT 3.875% 15-Aug-2033": [{ price: 0.99296875, quantity: 960000 }],

  "ESH4 IB": [{ price: 4787.5, quantity: 50 }],

  "1393 HK": [{ price: 0.143, quantity: 200000 }],
};

export async function editMTDRlzd() {
    let portfolio = await getPortfolio();
    let positionIssues = Object.keys(changes)
    let positionChanged = 0
    for (let index = 0; index < portfolio.length; index++) {
        if(positionIssues.includes(portfolio[index]["Issue"])){
            portfolio[index]["MTD Rlzd"] = changes[portfolio[index]["Issue"]]
            positionChanged ++
        }
    }
    await insertTradesInPortfolio(portfolio)
    

    return 


}

import util from "util";
import {  uri } from "./common";
import { getPortfolioOnSpecificDate } from "./operations/operations";
import { monthlyRlzdDate } from "./reports/common";
import { getPortfolio, insertTradesInPortfolio, insertTradesInPortfolioAtASpecificDate } from "./operations/positions";
const fs = require("fs");
const writeFile = util.promisify(fs.writeFile);



export async function appendLogs(positions: any) {
  for (let obj of positions) {
    // Create a new object with only the _id and Day Rlzd properties
    const logEntry = {
      _id: obj._id,
      "Day Rlzd": obj["Day Rlzd"],
    };

    // Convert the log entry to a string
    let logs = `${JSON.stringify(logEntry)}\n\n,`;

    // Append the log entry to the file
    await writeFile("trades-logs.txt", logs, { flag: "a" });
  }
}
let changes: any = {
  "6594fabed36b5469e8326efe": {
    "MTD Rlzd": {
      "2024/01": [
        { price: 0.91983, quantity: 1000000 },
        { price: 0.9134099999999999, quantity: -1000000 },
      ],
    },
  },
};





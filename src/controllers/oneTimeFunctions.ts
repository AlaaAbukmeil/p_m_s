import util from "util";
import { getPortfolio, insertTradesInPortfolioAtASpecificDate } from "./reports";
import { monthlyRlzdDate, uri } from "./common";
import { insertTradesInPortfolio } from "./reports";
import { getPortfolioOnSpecificDate } from "./operations";
const fs = require("fs");
const writeFile = util.promisify(fs.writeFile);
const { MongoClient, ServerApiVersion } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
let month = monthlyRlzdDate(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000).toString());

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

export async function editMTDRlzd(collectionDate: string) {
 
  let action: any = await getPortfolioOnSpecificDate(collectionDate);
  let portfolio = action[0];
  collectionDate = action[1];
  let positionChanged = 0;
  for (let index = 0; index < portfolio.length; index++) {
    if (changes[portfolio[index]["_id"]]) {
      portfolio[index]["MTD Rlzd"] = changes[portfolio[index]["_id"]]["MTD Rlzd"];

      positionChanged++;
    }
  }
  console.log(collectionDate);
  await insertTradesInPortfolioAtASpecificDate(portfolio, `portfolio-${collectionDate}`);

  return;
}
export async function editDayRlzd(collectionDate: string) {
  let action: any = await getPortfolioOnSpecificDate(collectionDate);
  let portfolio = action[0];
  collectionDate = action[1];

  let positionChanged = 0;
  for (let index = 0; index < portfolio.length; index++) {
    if (changes[portfolio[index]["_id"]]) {
      portfolio[index]["Day Rlzd"] = {};
      portfolio[index]["Day Rlzd"] = changes[portfolio[index]["_id"]]["Day Rlzd"];
      positionChanged++;
    }
  }
  console.log(collectionDate);
  await insertTradesInPortfolioAtASpecificDate(portfolio, `portfolio-${collectionDate}`);

  return;
}

export async function changeMTDRlzd() {
  let portfolio = await getPortfolio();
  for (let index = 0; index < portfolio.length; index++) {
    if (portfolio[index]["MTD Rlzd"]) {
      let object = portfolio[index]["MTD Rlzd"];
      portfolio[index]["MTD Rlzd"] = {};
      portfolio[index]["MTD Rlzd"][monthlyRlzdDate(new Date().toString())] = object;
    }
  }
  await insertTradesInPortfolio(portfolio);

  return;
}


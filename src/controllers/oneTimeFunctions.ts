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
  "6594fabed36b5469e8326efd": { "Day Rlzd": { "02/01/2024": [{ price: 0.9948999999999999, quantity: -1000000 }] } },

  "6594fabed36b5469e8326efe": { "Day Rlzd": { "02/01/2024": [], "03/01/2024": [{ price: 0.91983, quantity: 1000000 }] } },

  "656445e4940f329586a6774d": { "Day Rlzd": { "03/01/2024": [] } },

  "65647960d76b3f9988ec67e1": { "Day Rlzd": { "03/01/2024": [{ price: 1.0515, quantity: 500000 }] } },

  "656445e4940f329586a67735": { "Day Rlzd": { "03/01/2024": [] } },

  "656445e4940f329586a6772a": { "Day Rlzd": { "03/01/2024": [] } },

  "656445e4940f329586a67725": { "Day Rlzd": { "03/01/2024": [{ price: 1.03375, quantity: 500000 }] } },

  "656445e4940f329586a67724": { "Day Rlzd": { "03/01/2024": [] } },

  "65681c2a30e5ed81bc615f63": { "Day Rlzd": { "03/01/2024": [{ price: 1.03125, quantity: 1000000 }] } },

  "656445e4940f329586a6771e": { "Day Rlzd": { "03/01/2024": [{ price: 1.0214, quantity: 1000000 }] } },

  "656445e4940f329586a6775d": { "Day Rlzd": { "03/01/2024": [{ price: 0.99296875, quantity: -960000 }] } },

  "656445e4940f329586a6773a": { "Day Rlzd": { "03/01/2024": [] } },

  "65647960d76b3f9988ec67ef": { "Day Rlzd": { "03/01/2024": [] } },

  "656445e4940f329586a6774a": { "Day Rlzd": { "04/01/2024": [] } },

  "656445e4940f329586a67758": { "Day Rlzd": { "04/01/2024": [] } },

  "6597cd955b6fc6ab3c573032": { "Day Rlzd": { "04/01/2024": [] } },

  "656445e4940f329586a67747": { "Day Rlzd": { "05/01/2024": [] } },

  "6597cd955b6fc6ab3c573033": { "Day Rlzd": { "05/01/2024": [] } },

  "659d226d20b9fc53ce17e85a": {
    "Day Rlzd": {
      "08/01/2024": [],
      "09/01/2024": [
        { price: 1.0385546875, quantity: -860000 },
        { price: 1.0385546875, quantity: -1000000 },
      ],
    },
  },

  "659d226d20b9fc53ce17e85b": { "Day Rlzd": { "08/01/2024": [], "09/01/2024": [{ price: 0.996, quantity: 1000000 }] } },

  "659d226d20b9fc53ce17e85c": { "Day Rlzd": { "08/01/2024": [], "09/01/2024": [{ price: 1.01, quantity: 250000 }] } },

  "659d226d20b9fc53ce17e85d": { "Day Rlzd": { "08/01/2024": [], "09/01/2024": [{ price: 0.99193, quantity: 2000000 }] } },

  "659d226d20b9fc53ce17e85e": {
    "Day Rlzd": {
      "09/01/2024": [
        { price: 1, quantity: -2000000 },
        { price: 1.0005, quantity: -1500000 },
      ],
    },
  },

  "659d226d20b9fc53ce17e85f": { "Day Rlzd": { "09/01/2024": [{ price: 1, quantity: -2000000 }] } },

  "659e298a99e3772783f6a4e6": { "Day Rlzd": { "09/01/2024": [], "11/01/2024": [{ price: 1.01375, quantity: 500000 }] } },

  "659e298a99e3772783f6a4e7": { "Day Rlzd": { "09/01/2024": [], "10/01/2024": [{ price: 1.0006300000000001, quantity: 1000000 }] } },

  "659e298a99e3772783f6a4e8": { "Day Rlzd": { "09/01/2024": [] } },

  "659e298a99e3772783f6a4e9": { "Day Rlzd": { "09/01/2024": [], "10/01/2024": [{ price: 1.0105, quantity: 1000000 }] } },

  "659e298a99e3772783f6a4ea": { "Day Rlzd": { "10/01/2024": [{ price: 0.9903125, quantity: -1060000 }] } },

  "659e298a99e3772783f6a4eb": { "Day Rlzd": { "10/01/2024": [], "16/01/2024": [{ price: 0.7475, quantity: 500000 }] } },

  "659fcb3df54cb5616904558f": { "Day Rlzd": { "10/01/2024": [], "11/01/2024": [{ price: 0.990546875, quantity: -194000 }] } },

  "659fcb3df54cb56169045590": { "Day Rlzd": { "10/01/2024": [], "11/01/2024": [{ price: 1.0125, quantity: 500000 }] } },

  "659fcb3df54cb56169045591": { "Day Rlzd": { "10/01/2024": [] } },

  "659fcb3df54cb56169045592": { "Day Rlzd": { "10/01/2024": [], "11/01/2024": [{ price: 1.00299, quantity: 200000 }] } },

  "659fcb3df54cb56169045593": { "Day Rlzd": { "10/01/2024": [] } },

  "65647960d76b3f9988ec67f8": { "Day Rlzd": { "11/01/2024": [] } },

  "65a0f215809ea6d6a8578312": { "Day Rlzd": { "11/01/2024": [{ price: 0.9968, quantity: 1000000 }] } },

  "65a0f215809ea6d6a8578313": { "Day Rlzd": { "11/01/2024": [] } },

  "65a628b73a7e854ad9737986": { "Day Rlzd": { "15/01/2024": [], "16/01/2024": [{ price: 0.99786, quantity: -920000 }] } },

  "65a628b73a7e854ad9737987": { "Day Rlzd": { "15/01/2024": [] } },

  "65a628b73a7e854ad9737988": { "Day Rlzd": { "15/01/2024": [], "16/01/2024": [{ price: 0.99921, quantity: 400000 }] } },

  "65a628b73a7e854ad9737989": { "Day Rlzd": { "15/01/2024": [], "16/01/2024": [{ price: 0.9968899999999999, quantity: 1000000 }] } },

  "65a628b73a7e854ad973798a": { "Day Rlzd": { "15/01/2024": [], "16/01/2024": [{ price: 1.00052, quantity: 1000000 }] } },

  "65a628b73a7e854ad973798b": { "Day Rlzd": { "16/01/2024": [{ price: 0.7757999999999999, quantity: -404000 }] } },

  "65a68f84b0a385a6c7f1ae47": { "Day Rlzd": { "16/01/2024": [{ price: 1, quantity: -1000000 }] } },

  "65a79a699fb5f79822e3ba0e": {
    "Day Rlzd": {
      "16/01/2024": [],
      "17/01/2024": [
        { price: 0.9915625, quantity: -980000 },
        { price: 0.9915625, quantity: -980000 },
        { price: 0.991328125, quantity: -980000 },
      ],
    },
  },

  "65a79a699fb5f79822e3ba0f": {
    "Day Rlzd": {
      "16/01/2024": [],
      "17/01/2024": [
        { price: 0.9993500000000001, quantity: 1000000 },
        { price: 1, quantity: 1000000 },
        { price: 1, quantity: 1000000 },
      ],
    },
  },
  "65a79a699fb5f79822e3ba10": { "Day Rlzd": { "16/01/2024": [], "17/01/2024": [{ price: 0.99722, quantity: 1000000 }] } },

  "65a79a699fb5f79822e3ba11": { "Day Rlzd": { "16/01/2024": [], "17/01/2024": [{ price: 1.001, quantity: 1000000 }] } },

  "65a79a699fb5f79822e3ba12": {
    "Day Rlzd": {
      "17/01/2024": [
        { price: 1.0004296875, quantity: -1480000 },
        { price: 1.000625, quantity: -1480000 },
      ],
    },
  },

  "6572ec0db4a7516beed3dddb": { "Day Rlzd": { "02/01/2024": [], "05/01/2024": [{ price: 4734, quantity: 50 }], "10/01/2024": [{ price: 4821, quantity: 50 }] } },

  "6569c298aa2c673a5a76eee3": { "Day Rlzd": { "05/01/2024": [], "11/01/2024": [{ price: 112.328125, quantity: 2000 }] } },

  "65a0f215809ea6d6a8578314": { "Day Rlzd": { "11/01/2024": [] } },

  "65647960d76b3f9988ec67db": {
    "Day Rlzd": {
      "02/01/2024": [{ price: 0.143, quantity: 200000 }],
      "03/01/2024": [{ price: 0.136, quantity: 196000 }],
      "04/01/2024": [{ price: 0.138, quantity: 200000 }],
      "05/01/2024": [{ price: 0.132, quantity: 10000 }],
      "08/01/2024": [
        { price: 0.142, quantity: 200000 },
        { price: 0.135, quantity: 200000 },
      ],
      "12/01/2024": [
        { price: 0.11, quantity: 200000 },
        { price: 0.118, quantity: 0 },
      ],
      "17/01/2024": [{ price: 0.101, quantity: 200000 }],
    },
  },
};

export async function editMTDRlzd() {
  let portfolio = await getPortfolio();
  let positionIssues = Object.keys(changes);
  let positionChanged = 0;
  for (let index = 0; index < portfolio.length; index++) {
    if (positionIssues.includes(portfolio[index]["Issue"]) && changes[portfolio[index]["Issue"]].location == portfolio[index]["Location"]) {
      portfolio[index]["MTD Rlzd"] = {};
      portfolio[index]["MTD Rlzd"][month] = changes[portfolio[index]["Issue"]].data;

      positionChanged++;
    }
  }
  // await insertTradesInPortfolioAtASpecificDate(portfolio);

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
  // await insertTradesInPortfolioAtASpecificDate(portfolio, `portfolio-${collectionDate}`);

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

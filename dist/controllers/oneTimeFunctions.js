"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendLogs = void 0;
const util_1 = __importDefault(require("util"));
const fs = require("fs");
const writeFile = util_1.default.promisify(fs.writeFile);
async function appendLogs(positions) {
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
exports.appendLogs = appendLogs;
let changes = {
    "6594fabed36b5469e8326efe": {
        "MTD Rlzd": {
            "2024/01": [
                { price: 0.91983, quantity: 1000000 },
                { price: 0.9134099999999999, quantity: -1000000 },
            ],
        },
    },
};

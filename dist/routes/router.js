"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
const common_1 = require("../controllers/common");
const reports_1 = require("../controllers/reports");
const portfolioFunctions_1 = require("../controllers/portfolioFunctions");
const excelFormat_1 = require("../controllers/excelFormat");
const graphApiConnect_1 = require("../controllers/graphApiConnect");
const mufgOperations_1 = require("../controllers/mufgOperations");
const operations_1 = require("../controllers/operations");
const eblot_1 = require("../controllers/eblot");
const util_1 = __importDefault(require("util"));
const fs = require("fs");
const writeFile = util_1.default.promisify(fs.writeFile);
require("dotenv").config();
const readLastLines = require("read-last-lines");
const path = require("path");
const multerGoogleStorage = require("multer-google-storage");
const multer = require("multer");
const uploadBeforeExcel = multer({
    storage: multerGoogleStorage.storageEngine({
        autoRetry: true,
        bucket: process.env.BUCKET,
        projectId: process.env.PROJECTID,
        keyFilename: process.env.KEYPATHFILE,
        filename: (req, file, cb) => {
            cb(false, `/v2/${(0, common_1.generateRandomString)(6)}_${file.originalname.replace(/[!@#$%^&*(),?":{}|<>/\[\]\\;'\-=+`~ ]/g, "_")}`);
        },
    }),
});
const router = (0, express_1.Router)();
router.get("/auth", uploadBeforeExcel.any(), common_1.verifyToken, async (req, res, next) => {
    res.sendStatus(200);
});
router.get("/trades-logs", common_1.verifyToken, async (req, res) => {
    try {
        const filePath = path.resolve("trades-logs.txt");
        const lastLines = await readLastLines.read(filePath, 4000);
        res.send(lastLines);
    }
    catch (error) {
        res.status(500).send("An error occurred while reading the file.");
    }
});
router.get("/prices-logs", common_1.verifyToken, async (req, res) => {
    try {
        const filePath = path.resolve("prices-logs.txt");
        const lastLines = await readLastLines.read(filePath);
        res.send(lastLines);
    }
    catch (error) {
        res.status(500).send("An error occurred while reading the file.");
    }
});
router.get("/portfolio", common_1.verifyToken, async (req, res, next) => {
    try {
        let date = req.query.date;
        if (date.includes("NaN")) {
            date = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
        }
        let sort = req.query.sort || "order";
        let sign = req.query.sign || 1;
        let report = await (0, reports_1.getHistoricalPortfolioWithAnalytics)(date, sort, sign);
        if (report.error) {
            res.send({ error: report.error });
        }
        else {
            res.send(report);
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: error.toString() });
    }
});
router.get("/summary-portfolio", async (req, res, next) => {
    try {
        let date = req.query.date;
        let sort = req.query.sort || "order";
        let sign = req.query.sign || 1;
        if (date.includes("NaN")) {
            date = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
        }
        date = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date(date)).split(" ")[0] + " 23:59";
        let report = await (0, reports_1.getHistoricalSummaryPortfolioWithAnalytics)(date, sort, sign);
        if (report.error) {
            res.send({ error: report.error });
        }
        else {
            res.send(report);
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: error.toString() });
    }
});
router.get("/performers-portfolio", async (req, res, next) => {
    try {
        let date = req.query.date;
        let conditions = req.query || {};
        let sort = req.query.sort || "order";
        let sign = req.query.sign || 1;
        if (date.includes("NaN")) {
            date = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
        }
        date = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date(date)).split(" ")[0] + " 23:59";
        let report = await (0, reports_1.getHistoricalSummaryPortfolioWithAnalytics)(date, sort, sign, conditions);
        if (report.error) {
            res.send({ error: report.error });
        }
        else {
            res.send(report);
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: error.toString() });
    }
});
router.get("/risk-report", async (req, res, next) => {
    try {
        let date = req.query.date;
        let sort = req.query.sort || "order";
        let sign = req.query.sign || 1;
        if (date.includes("NaN")) {
            date = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date());
        }
        date = (0, portfolioFunctions_1.getDateTimeInMongoDBCollectionFormat)(new Date(date)).split(" ")[0] + " 23:59";
        let report = await (0, reports_1.getHistoricalSummaryPortfolioWithAnalytics)(date, sort, sign);
        res.send(report);
    }
    catch (error) {
        console.log(error);
        res.send({ error: error.toString() });
    }
});
router.get("/trades", common_1.verifyToken, async (req, res) => {
    try {
        const tradeType = req.query.tradeType;
        let trades = await (0, reports_1.getTrades)(`${tradeType}`);
        res.send(trades);
    }
    catch (error) {
        res.status(500).send("An error occurred while reading the file.");
    }
});
router.get("/edit-logs", common_1.verifyToken, async (req, res) => {
    try {
        const editLogsType = req.query.logsType;
        let editLogs = await (0, operations_1.getEditLogs)(`${editLogsType}`);
        res.send(editLogs);
    }
    catch (error) {
        res.status(500).send("An error occurred while reading the file.");
    }
});
router.get("/all-trades", common_1.verifyToken, async (req, res) => {
    try {
        let from = req.query.from;
        let to = req.query.to;
        let start = new Date(from).getTime() - 2 * 24 * 60 * 60 * 1000;
        let end = new Date(to).getTime() + 2 * 24 * 60 * 60 * 1000;
        let token = await (0, graphApiConnect_1.getGraphToken)();
        let trades = await (0, eblot_1.getAllTrades)(start, end);
        trades.filter((trade, index) => new Date(trade["Trade Date"]).getTime() > start && new Date(trade["Trade Date"]).getTime() < end);
        let vconTrades = await (0, excelFormat_1.getTriadaTrades)("vcons", start, end);
        let vcons = await (0, graphApiConnect_1.getVcons)(token, start + 2 * 24 * 60 * 60 * 1000, end - 2 * 24 * 60 * 60 * 1000, vconTrades);
        vcons = vcons.filter((trade, index) => trade["Trade App Status"] != "uploaded_to_app");
        let action = await (0, excelFormat_1.formatCentralizedRawFiles)({}, vcons, [], [], []);
        // action = action.filter((trade: any, index: any) => trade["Trade App Status"] != "uploaded_to_app");
        let allTrades = action.concat(trades).sort((a, b) => new Date(b["Trade Date"]).getTime() - new Date(a["Trade Date"]).getTime());
        res.send({ trades: allTrades });
    }
    catch (error) {
        console.log(error);
        res.status(500).send("An error occurred while reading the file.");
    }
});
router.get("/previous-collections", common_1.verifyToken, async (req, res) => {
    try {
        let previousCollections = await (0, operations_1.getCollectionDays)();
        res.send(previousCollections);
    }
    catch (error) {
        res.status(500).send("An error occurred while reading the file.");
    }
});
router.get("/fund-details", common_1.verifyToken, async (req, res) => {
    try {
        const date = req.query.date;
        let thisMonth = (0, common_1.monthlyRlzdDate)(date);
        let fundDetails = await (0, operations_1.getAllFundDetails)(thisMonth);
        res.send(fundDetails);
    }
    catch (error) {
        res.status(500).send("An error occurred while reading the file.");
    }
});
router.post("/login", uploadBeforeExcel.any(), async (req, res, next) => {
    let data = req.body;
    let email = data.email;
    let password = data.password;
    let user = await (0, auth_1.checkIfUserExists)(email, password);
    let cookie = {
        maxAge: 3 * 24 * 60 * 60 * 1000,
        httpOnly: process.env.PRODUCTION === "production",
        secure: process.env.PRODUCTION === "production",
        sameSite: "lax",
    };
    res.cookie("triada.admin.cookie", user, cookie);
    res.send({ status: 200 });
});
router.post("/sign-up", async (req, res, next) => {
    let data = req.body;
    let email = data.email;
    let password = data.password;
    let verificationCode = data.verificationCode;
    let result = await (0, auth_1.registerUser)(email, password, verificationCode);
    res.send(result);
});
router.post("/send-reset-code", async (req, res, next) => {
    let data = req.body;
    console.log(data, "x");
    console.log(data.email);
    let result = await (0, auth_1.sendResetPasswordRequest)(data.email);
    console.log(result);
    res.send(result);
});
router.post("/reset-password", async (req, res, next) => {
    let data = req.body;
    let result = await (0, auth_1.resetPassword)(data.email, data.code, data.password);
    res.send(result);
});
router.post("/ib-excel", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        const fileName = req.files[0].filename;
        const path = common_1.bucket + fileName;
        // to be modified
        let beforeMonth = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
        let now = new Date().getTime() + 5 * 24 * 60 * 60 * 1000;
        let trades = await (0, excelFormat_1.getTriadaTrades)("ib", beforeMonth, now);
        let data = await (0, portfolioFunctions_1.readIBRawExcel)(path);
        let portfolio = await (0, reports_1.getPortfolio)();
        let action = (0, excelFormat_1.formatIbTrades)(data, trades, portfolio);
        // console.log(action)
        if (!action) {
            res.send({ error: action });
        }
        else {
            let ib = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(action, "ib_formatted", "ib");
            let downloadEBlotName = common_1.bucket + ib;
            res.send(downloadEBlotName);
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: "File Template is not correct" });
    }
});
router.post("/mufg-excel", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    let data = req.body;
    let pathName = "mufg_" + (0, common_1.formatDateFile)(data.timestamp_start) + "_" + (0, common_1.formatDateFile)(data.timestamp_end) + "_";
    let trades = await (0, mufgOperations_1.tradesTriada)();
    let array = await (0, mufgOperations_1.formatMufg)(trades, data.timestamp_start, data.timestamp_end);
    if (array.length == 0) {
        res.send({ error: "No Trades" });
    }
    else {
        let mufgTrades = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(array, pathName, "mufg");
        let downloadEBlotName = common_1.bucket + mufgTrades;
        res.send(downloadEBlotName);
    }
});
router.post("/mufg-fx", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    let tradesCount = req.body.tradesCount;
    let action = await (0, mufgOperations_1.formatFxMufg)(req.files, tradesCount);
    let url = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(action, "fx_mufg_formatted", "mufg_fx");
    url = common_1.bucket + url;
    res.send(url);
});
router.post("/centralized-blotter", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let data = req.body;
        let token = await (0, graphApiConnect_1.getGraphToken)();
        // to be modified
        let start = new Date(data.timestamp_start).getTime() - 5 * 24 * 60 * 60 * 1000;
        let end = new Date(data.timestamp_end).getTime() + 5 * 24 * 60 * 60 * 1000;
        let vconTrades = await (0, excelFormat_1.getTriadaTrades)("vcons", start, end);
        let vcons = await (0, graphApiConnect_1.getVcons)(token, data.timestamp_start, data.timestamp_end, vconTrades);
        let ibTrades = await (0, excelFormat_1.getTriadaTrades)("ib", start, end);
        let emsxTrades = await (0, excelFormat_1.getTriadaTrades)("emsx", start, end);
        let action = await (0, excelFormat_1.formatCentralizedRawFiles)(req.files, vcons, vconTrades, ibTrades, emsxTrades);
        if (action.error) {
            res.send({ error: action.error });
        }
        else {
            if (action.length > 0) {
                console.log(action[0]);
                let url = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(action, "centralized_blot", "centralized_blot");
                url = common_1.bucket + url;
                res.send(url);
            }
            else {
                res.send({ error: "no trades" });
            }
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: error });
    }
});
router.post("/emsx-excel", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let files = req.files;
        const fileName = req.files[0].filename;
        const path = common_1.bucket + fileName;
        //to be modified
        let beforeMonth = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
        let now = new Date().getTime() + 5 * 24 * 60 * 60 * 1000;
        let trades = await (0, excelFormat_1.getTriadaTrades)("emsx", beforeMonth, now);
        let data = await (0, excelFormat_1.readEmsxRawExcel)(path);
        let portfolio = await (0, reports_1.getPortfolio)();
        let action = (0, excelFormat_1.formatEmsxTrades)(data, trades, portfolio);
        if (!action) {
            res.send({ error: action });
        }
        else {
            let emsx = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(action, "emsx_formated", "emsx");
            let downloadEBlotName = common_1.bucket + emsx;
            res.send(downloadEBlotName);
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: "File Template is not correct" });
    }
});
router.post("/fx-excel", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    let data = req.body;
    let pathName = "fx_" + (0, common_1.formatDateFile)(data.timestamp_start) + "_" + (0, common_1.formatDateFile)(data.timestamp_end) + "_";
    let token = await (0, graphApiConnect_1.getGraphToken)();
    let array = await (0, graphApiConnect_1.getFxTrades)(token, data.timestamp_start, data.timestamp_end, []);
    if (array.length == 0) {
        res.send({ error: "No Trades" });
    }
    else {
        let fxTrades = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(array, pathName, "fx");
        let downloadEBlotName = common_1.bucket + fxTrades;
        res.send(downloadEBlotName);
    }
});
router.post("/upload-trades", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let files = req.files;
        const fileName = files[0].filename;
        const path = common_1.bucket + fileName;
        let action = await (0, reports_1.updatePositionPortfolio)(path);
        console.log(action);
        if (action === null || action === void 0 ? void 0 : action.error) {
            res.send({ error: action.error });
        }
        else {
            res.send(action);
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: "File Template is not correct" });
    }
});
router.post("/edit-position", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let action = await (0, reports_1.editPosition)(req.body, req.body.date);
        res.sendStatus(200);
    }
    catch (error) {
        console.log(error);
        res.send({ error: "Template is not correct" });
    }
});
router.post("/edit-trade", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let action = await (0, operations_1.editTrade)(req.body, req.body.tradeType);
        if (action.error) {
            res.send({ error: action.error });
        }
        else {
            res.send({ error: action.error });
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: "Template is not correct" });
    }
});
router.post("/delete-trade", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let data = req.body;
        let tradeType = req.body.tradeType;
        console.log(data, "test delete");
        let action = await (0, operations_1.deleteTrade)(tradeType, data["_id"], data["BB Ticker"], data["Location"]);
        if (action.error) {
            res.send({ error: action.error, status: 404 });
        }
        else {
            res.send({ message: "success", status: 200 });
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: "Unexpected Error" });
    }
});
router.post("/delete-position", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let data = JSON.parse(req.body.data);
        let date = req.body.date;
        console.log(data["_id"]);
        let action = await (0, operations_1.deletePosition)(data, date);
        console.log(action);
        if (action.error) {
            res.send({ error: action.error, status: 404 });
        }
        else {
            res.send({ message: "success", status: 200 });
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: "Unexpected Error" });
    }
});
router.post("/update-prices", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        const fileName = req.files[0].filename;
        const path = common_1.bucket + fileName;
        let action = await (0, reports_1.updatePricesPortfolio)(path);
        if (action === null || action === void 0 ? void 0 : action.error) {
            res.send({ error: action.error });
        }
        else {
            res.sendStatus(200);
        }
    }
    catch (error) {
        res.send({ error: "File Template is not correct" });
    }
});
router.post("/bulk-edit", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        const fileName = req.files[0].filename;
        const path = common_1.bucket + fileName;
        let action = await (0, operations_1.editPositionPortfolio)(path);
        console.log(action);
        if (action === null || action === void 0 ? void 0 : action.error) {
            res.send({ error: action.error });
        }
        else {
            res.sendStatus(200);
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: "File Template is not correct" });
    }
});
router.post("/update-previous-prices", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let collectionDate = req.body.collectionDate;
        let collectionType = req.body.collectionType;
        const fileName = req.files[0].filename;
        const path = common_1.bucket + fileName;
        let data = collectionType == "MUFG" ? await (0, operations_1.readMUFGPrices)(path) : await (0, portfolioFunctions_1.readPricingSheet)(path);
        let action = collectionType == "MUFG" ? await (0, operations_1.updatePreviousPricesPortfolioMUFG)(data, collectionDate, path) : await (0, operations_1.updatePreviousPricesPortfolioBloomberg)(data, collectionDate, path);
        if (action === null || action === void 0 ? void 0 : action.error) {
            res.send({ error: action.error });
        }
        else {
            res.sendStatus(200);
        }
        // console.log(action);
    }
    catch (error) {
        res.send({ error: "fatal error" });
    }
});
router.post("/check-mufg", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let collectionDate = req.body.collectionDate;
        let files = req.files[0];
        let portfolio = await (0, operations_1.getPortfolioOnSpecificDate)(collectionDate);
        let data = [];
        if (files) {
            const fileName = req.files[0].filename;
            const path = common_1.bucket + fileName;
            data = await (0, operations_1.readMUFGEndOfMonthFile)(path);
        }
        let action = await (0, mufgOperations_1.checkMUFGEndOfMonthWithPortfolio)(data, portfolio[0]);
        if (action === null || action === void 0 ? void 0 : action.error) {
            res.send({ error: action.error });
        }
        else {
            let link = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(action, `mufg_check_${collectionDate}`, "mufg_check");
            let downloadEBlotName = common_1.bucket + link;
            res.send(downloadEBlotName);
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: error.toString() });
    }
});
router.post("/edit-fund", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        console.log(req.body, "before");
        let action = await (0, operations_1.editFund)(req.body);
        res.sendStatus(200);
    }
    catch (error) {
        console.log(error);
        res.send({ error: "Template is not correct" });
    }
});
router.post("/delete-fund", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        console.log(req.body, "before");
        let action = await (0, operations_1.deleteFund)(req.body);
        res.sendStatus(200);
    }
    catch (error) {
        console.log(error);
        res.send({ error: "Template is not correct" });
    }
});
router.post("/add-fund", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        console.log(req.body, "before");
        let action = await (0, operations_1.addFund)(req.body);
        if (action.error) {
            res.send({ error: action.error });
        }
        else {
            res.sendStatus(200);
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: "Template is not correct" });
    }
});
router.post("/recalculate-position", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let data = req.body;
        let tradeType = data.tradeType;
        let isin = data["ISIN"];
        let location = data["Location"];
        let date = data.date;
        let trades = await (0, operations_1.getAllTradesForSpecificPosition)(tradeType, isin, location, date);
        console.log(tradeType, isin, location, date, trades);
        if (trades.length) {
            let action = await (0, operations_1.readCalculatePosition)(trades, date, isin, location);
            console.log(action);
            res.sendStatus(200);
        }
        else {
            res.send({ error: "no trades" });
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: error });
    }
});
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
const common_1 = require("../controllers/common");
const reports_1 = require("../controllers/reports");
const portfolioFunctions_1 = require("../controllers/portfolioFunctions");
const tsImagineOperations_1 = require("../controllers/tsImagineOperations");
const excelFormat_1 = require("../controllers/excelFormat");
const graphApiConnect_1 = require("../controllers/graphApiConnect");
const mufgOperations_1 = require("../controllers/mufgOperations");
const operations_1 = require("../controllers/operations");
const oneTimeFunctions_1 = require("../controllers/oneTimeFunctions");
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
router.get("/auth", common_1.verifyToken, async (req, res, next) => {
    res.sendStatus(200);
});
router.get("/portfolio", common_1.verifyToken, async (req, res, next) => {
    try {
        const date = req.query.date;
        let report = await (0, reports_1.getHistoricalPortfolioWithAnalytics)(date);
        res.send(report);
    }
    catch (error) {
        res.send({ error: error.toString() });
    }
});
router.get("/summary-portfolio", async (req, res, next) => {
    try {
        const date = req.query.date;
        let report = await (0, reports_1.getHistoricalSummaryPortfolioWithAnalytics)(date);
        res.send(report);
    }
    catch (error) {
        console.log(error);
        res.send({ error: error.toString() });
    }
});
router.get("/risk-report", common_1.verifyToken, async (req, res, next) => {
    const date = req.query.date;
    let report = await (0, reports_1.getHistoricalRiskReportWithAnalytics)(date);
    res.send(report);
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
        console.log(fundDetails);
        res.send(fundDetails);
    }
    catch (error) {
        res.status(500).send("An error occurred while reading the file.");
    }
});
router.post("/login", async (req, res, next) => {
    let data = req.body;
    let email = data.email;
    let password = data.password;
    let user = await (0, auth_1.checkIfUserExists)(email, password);
    res.send(user);
});
router.post("/signUp", async (req, res, next) => {
    let data = req.body;
    let email = data.email;
    let password = data.password;
    let verificationCode = data.verificationCode;
    let result = await (0, auth_1.registerUser)(email, password, verificationCode);
    res.send(result);
});
router.post("/elec-blot", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
    const trader = req.body.trader;
    const startegy = req.body.startegy;
    let arr = await (0, portfolioFunctions_1.bloombergToTriada)(path, trader, startegy); // array
    if (arr.error) {
        res.send(arr.error);
    }
    else {
        let eBlotName = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(arr, "test"); //
        let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + eBlotName;
        res.send(downloadEBlotName);
    }
});
router.post("/upload-trades", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let files = req.files;
        const fileName = req.files[0].filename;
        const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
        let action = await (0, reports_1.updatePositionPortfolio)(path); //updatePositionPortfolio
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
router.post("/update-prices", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        const fileName = req.files[0].filename;
        const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
        let action = await (0, reports_1.updatePricesPortfolio)(path);
        console.log(action);
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
router.post("/check-isin", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
    let action = await (0, tsImagineOperations_1.checkIfSecurityExist)(path);
    if (action === null || action === void 0 ? void 0 : action.error) {
        res.send({ error: action.error });
    }
    else {
        res.send(action);
    }
});
router.post("/nomura-excel", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    let data = req.body;
    let pathName = (0, common_1.formatDateVconFile)(data.timestamp_start) + "_" + (0, common_1.formatDateVconFile)(data.timestamp_end) + "_";
    let token = await (0, graphApiConnect_1.getGraphToken)();
    //to be modified
    let trades = await (0, excelFormat_1.getTriadaTrades)("vcons");
    let array = await (0, graphApiConnect_1.getVcons)(token, data.timestamp_start, data.timestamp_end, trades[0], trades[1]);
    if (array.length == 0) {
        res.send({ error: "No Trades" });
    }
    else {
        let vcons = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(array, pathName);
        let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + vcons;
        res.send(downloadEBlotName);
    }
});
router.post("/vcon-excel", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    let data = req.body;
    let pathName = "vcon_" + (0, common_1.formatDateVconFile)(data.timestamp_start) + "_" + (0, common_1.formatDateVconFile)(data.timestamp_end) + "_";
    let token = await (0, graphApiConnect_1.getGraphToken)();
    let trades = await (0, excelFormat_1.getTriadaTrades)("vcons");
    let array = await (0, graphApiConnect_1.getVcons)(token, data.timestamp_start, data.timestamp_end, trades[0], trades[1]);
    if (array.length == 0) {
        res.send({ error: "No Trades" });
    }
    else {
        let vcons = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(array, pathName);
        let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + vcons;
        res.send(downloadEBlotName);
    }
});
router.post("/ib-excel", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let files = req.files;
        const fileName = req.files[0].filename;
        const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
        // to be modified
        let trades = await (0, excelFormat_1.getTriadaTrades)("ib");
        let data = await (0, portfolioFunctions_1.readIBRawExcel)(path);
        let portfolio = await (0, reports_1.getPortfolio)();
        let action = (0, excelFormat_1.formatIbTrades)(data, trades[0], portfolio, trades[1]);
        // console.log(action)
        if (!action) {
            res.send({ error: action });
        }
        else {
            let ib = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(action, "ib_formatted");
            let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + ib;
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
    let pathName = "mufg_" + (0, common_1.formatDateVconFile)(data.timestamp_start) + "_" + (0, common_1.formatDateVconFile)(data.timestamp_end) + "_";
    let trades = await (0, mufgOperations_1.tradesTriada)();
    let array = await (0, mufgOperations_1.formatMufg)(trades, data.timestamp_start, data.timestamp_end);
    if (array.length == 0) {
        res.send({ error: "No Trades" });
    }
    else {
        let mufgTrades = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(array, pathName);
        let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + mufgTrades;
        res.send(downloadEBlotName);
    }
});
router.post("/mufg-fx", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    let tradesCount = req.body.tradesCount;
    let action = await (0, mufgOperations_1.formatFxMufg)(req.files, tradesCount);
    let url = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(action, "fx_mufg_formatted");
    url = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + url;
    res.send(url);
});
router.post("/centralized-blotter", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let data = req.body;
        let token = await (0, graphApiConnect_1.getGraphToken)();
        // to be modified
        let vconTrades = await (0, excelFormat_1.getTriadaTrades)("vcons", new Date(data.timestamp_start).getTime() - 2 * 24 * 60 * 60 * 1000, new Date(data.timestamp_end).getTime() + 2 * 24 * 60 * 60 * 1000);
        let vcons = await (0, graphApiConnect_1.getVcons)(token, data.timestamp_start, data.timestamp_end, vconTrades[0], vconTrades[1]);
        let ibTrades = await (0, excelFormat_1.getTriadaTrades)("ib", new Date(data.timestamp_start).getTime(), new Date(data.timestamp_end).getTime());
        let emsxTrades = await (0, excelFormat_1.getTriadaTrades)("emsx", new Date(data.timestamp_start).getTime(), new Date(data.timestamp_end).getTime());
        let action = await (0, excelFormat_1.formatCentralizedRawFiles)(req.files, vcons, vconTrades[0], ibTrades[0], emsxTrades[0]);
        if (action.error) {
            res.send({ error: action.error });
        }
        else {
            if (action.length > 0) {
                let url = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(action, "centralized_blot");
                url = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + url;
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
router.post("/bulk-edit", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        const fileName = req.files[0].filename;
        const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
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
router.post("/emsx-excel", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let files = req.files;
        const fileName = req.files[0].filename;
        const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
        //to be modified
        let trades = await (0, excelFormat_1.getTriadaTrades)("emsx");
        console.log(trades[0]);
        let data = await (0, excelFormat_1.readEmsxRawExcel)(path);
        let portfolio = await (0, reports_1.getPortfolio)();
        let action = (0, excelFormat_1.formatEmsxTrades)(data, trades[0], portfolio, trades[1]);
        if (!action) {
            res.send({ error: action });
        }
        else {
            let emsx = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(action, "emsx_formated");
            let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + emsx;
            res.send(downloadEBlotName);
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: "File Template is not correct" });
    }
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
router.post("/edit-position", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let action = await (0, reports_1.editPosition)(req.body);
        res.sendStatus(200);
    }
    catch (error) {
        console.log(error);
        res.send({ error: "Template is not correct" });
    }
});
router.post("/fx-excel", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    let data = req.body;
    let pathName = "fx_" + (0, common_1.formatDateVconFile)(data.timestamp_start) + "_" + (0, common_1.formatDateVconFile)(data.timestamp_end) + "_";
    let token = await (0, graphApiConnect_1.getGraphToken)();
    // let trades = await getTriadaTrades("fx");
    let array = await (0, graphApiConnect_1.getFxTrades)(token, data.timestamp_start, data.timestamp_end, []);
    if (array.length == 0) {
        res.send({ error: "No Trades" });
    }
    else {
        let fxTrades = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(array, pathName);
        let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + fxTrades;
        res.send(downloadEBlotName);
    }
});
router.post("/update-previous-prices", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    try {
        let collectionDate = req.body.collectionDate;
        let collectionType = req.body.collectionType;
        const fileName = req.files[0].filename;
        const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
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
            const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
            data = await (0, operations_1.readMUFGEndOfMonthFile)(path);
        }
        let action = await (0, operations_1.checkMUFGEndOfMonthWithPortfolio)(data, portfolio[0]);
        if (action === null || action === void 0 ? void 0 : action.error) {
            res.send({ error: action.error });
        }
        else {
            let link = await (0, excelFormat_1.uploadArrayAndReturnFilePath)(action, `mufg_check_${collectionDate}`);
            let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + link;
            res.send(downloadEBlotName);
        }
    }
    catch (error) {
        console.log(error);
        res.send({ error: "File Template is not correct" });
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
router.post("/one-time", uploadBeforeExcel.any(), async (req, res, next) => {
    let test = await (0, oneTimeFunctions_1.editMTDRlzd)();
    // let test = getDateTimeInMongoDBCollectionFormat(new Date(new Date().getTime() - 10.9 * 24 * 60 * 60 * 1000));
    res.sendStatus(200);
});
exports.default = router;

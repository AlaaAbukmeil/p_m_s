"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
const common_1 = require("../controllers/common");
const portfolioOperations_1 = require("../controllers/portfolioOperations");
const portfolioFunctions_1 = require("../controllers/portfolioFunctions");
const tsImagineOperations_1 = require("../controllers/tsImagineOperations");
const vconOperation_1 = require("../controllers/vconOperation");
const graphApiConnect_1 = require("../controllers/graphApiConnect");
require("dotenv").config();
const readLastLines = require('read-last-lines');
const path = require('path');
const xlsx = require("xlsx");
const axios = require("axios");
const multerGoogleStorage = require("multer-google-storage");
const multer = require('multer');
const uploadBeforeExcel = multer({
    storage: multerGoogleStorage.storageEngine({
        autoRetry: true,
        bucket: process.env.BUCKET,
        projectId: process.env.PROJECTID,
        keyFilename: process.env.KEYPATHFILE,
        filename: (req, file, cb) => {
            cb(false, `/before-excel/${Date.now()}_${file.originalname}`);
        }
    })
});
const router = (0, express_1.Router)();
router.get("/auth", common_1.verifyToken, async (req, res, next) => {
    res.sendStatus(200);
});
router.get("/portfolio", common_1.verifyToken, async (req, res, next) => {
    const date = req.query.date;
    let report = (date == "current") ? await (0, portfolioOperations_1.getPortfolioWithAnalytics)() : await (0, portfolioOperations_1.getHistoricalPortfolioWithAnalytics)(date);
    res.send(report);
});
router.get('/trades-logs', common_1.verifyToken, async (req, res) => {
    try {
        const filePath = path.resolve('trades-logs.txt');
        const lastLines = await readLastLines.read(filePath, 500);
        res.send(lastLines);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while reading the file.');
    }
});
router.get('/prices-logs', common_1.verifyToken, async (req, res) => {
    try {
        const filePath = path.resolve('prices-logs.txt');
        const lastLines = await readLastLines.read(filePath, 500);
        res.send(lastLines);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while reading the file.');
    }
});
router.get('/trades', common_1.verifyToken, async (req, res) => {
    try {
        let trades = await (0, portfolioOperations_1.getTrades)();
        // console.log(trades)
        res.send(trades);
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).send('An error occurred while reading the file.');
    }
});
router.post("/login", async (req, res, next) => {
    let data = req.body;
    let username = data.username;
    let password = data.password;
    let user = await (0, auth_1.checkIfUserExists)(username, password);
    res.send(user);
});
router.post("/signUp", async (req, res, next) => {
    let data = req.body;
    let username = data.username;
    let password = data.password;
    let verificationCode = data.verificationCode;
    let result = await (0, auth_1.registerUser)(username, password, verificationCode);
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
        let eBlotName = await (0, portfolioFunctions_1.uploadTriadaAndReturnFilePath)(arr); // 
        let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + eBlotName;
        res.send(downloadEBlotName);
    }
});
router.post("/upload-trades", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
    try {
        let action = await (0, portfolioOperations_1.updatePositionPortfolio)(path); //updatePositionPortfolio
        res.send(action);
    }
    catch (error) {
        res.send({ "error": error });
    }
});
router.post("/update-prices", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
    // console.log(date)
    let action = await (0, portfolioOperations_1.updatePricesPortfolio)(path);
    console.log(action);
    if (action === null || action === void 0 ? void 0 : action.error) {
        res.send({ "error": action.error });
    }
    else {
        res.sendStatus(200);
    }
});
router.post("/check-isin", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
    let action = await (0, tsImagineOperations_1.checkIfSecurityExist)(path);
    // console.log(action)
    if (action === null || action === void 0 ? void 0 : action.error) {
        res.send({ "error": action.error });
    }
    else {
        res.send(action);
    }
});
router.post("/vcon-excel-nomura", uploadBeforeExcel.any(), async (req, res, next) => {
    let data = req.body;
    let pathName = (0, common_1.formatDateVconFile)(data.timestamp_start) + "xxxx" + (0, common_1.formatDateVconFile)(data.timestamp_end);
    // console.log(pathName)
    //let array: any = []//await readEmails(data.timestamp_start, data.timestamp_end)
    let token = await (0, graphApiConnect_1.getGraphToken)();
    let array = await (0, graphApiConnect_1.getVcons)(token, data.timestamp_start, data.timestamp_end);
    let arrayFormatedNomura = (0, vconOperation_1.formatNomuraEBlot)(array);
    // console.log(array)
    // console.log(array)
    if (array.length == 0) {
        res.send({ error: "No Trades" });
    }
    else {
        let vcons = await (0, vconOperation_1.uploadVconAndReturnFilePath)(arrayFormatedNomura, pathName);
        let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + vcons;
        // console.log(array)
        res.send(downloadEBlotName);
    }
});
router.post("/vcon-excel", uploadBeforeExcel.any(), async (req, res, next) => {
    let data = req.body;
    let pathName = (0, common_1.formatDateVconFile)(data.timestamp_start) + "xxxx" + (0, common_1.formatDateVconFile)(data.timestamp_end);
    // console.log(pathName)
    //let array: any = []//await readEmails(data.timestamp_start, data.timestamp_end)
    let token = await (0, graphApiConnect_1.getGraphToken)();
    let array = await (0, graphApiConnect_1.getVcons)(token, data.timestamp_start, data.timestamp_end);
    // console.log(array)
    if (array.length == 0) {
        res.send({ error: "No Trades" });
    }
    else {
        let vcons = await (0, vconOperation_1.uploadVconAndReturnFilePath)(array, pathName);
        let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + vcons;
        // console.log(array)
        res.send(downloadEBlotName);
    }
});
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
const common_1 = require("../controllers/common");
const standardOperations_1 = require("../controllers/standardOperations");
require("dotenv").config();
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
router.post("/signUp", async (req, res, next) => {
    let data = req.body;
    let username = data.username;
    let password = data.password;
    let verificationCode = data.verificationCode;
    let result = await (0, auth_1.registerUser)(username, password, verificationCode);
    res.send(result);
});
router.get("/report", common_1.verifyToken, async (req, res, next) => {
    let report = await (0, standardOperations_1.getReport)();
    res.send(report);
});
router.post("/login", async (req, res, next) => {
    let data = req.body;
    let username = data.username;
    let password = data.password;
    let user = await (0, auth_1.checkIfUserExists)(username, password);
    res.send(user);
});
router.post("/elec-blot", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
    const trader = req.body.trader;
    const startegy = req.body.startegy;
    let arr = await (0, standardOperations_1.readBloombergSheet)(path, trader, startegy);
    if (arr.error) {
        res.send(arr.error);
    }
    else {
        let eBlotName = await (0, standardOperations_1.generateImagineEBlot)(arr);
        let downloadEBlotName = "https://storage.googleapis.com/capital-trade-396911.appspot.com/" + eBlotName;
        res.send(downloadEBlotName);
    }
});
router.post("/update-internal-db", common_1.verifyToken, uploadBeforeExcel.any(), async (req, res, next) => {
    const fileName = req.files[0].filename;
    const path = "https://storage.googleapis.com/capital-trade-396911.appspot.com" + fileName;
    let action = await (0, standardOperations_1.readTriadaEBlot)(path);
    if (action === null || action === void 0 ? void 0 : action.error) {
        res.send(action.error);
    }
    else {
        res.sendStatus(200);
    }
});
exports.default = router;

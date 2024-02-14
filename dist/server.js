"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//jshint esversion:6
const router_1 = __importDefault(require("./routes/router"));
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const path = require("path");
const rateLimit = require("express-rate-limit");
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    standardHeaders: true,
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
const cors = require("cors");
const corsOptions = {
    origin: ["http://localhost:3000", "http://localhost:3001", "https://admin.triadacapital.com"],
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, "/public")));
app.use(bodyParser.urlencoded({
    extended: false,
}));
app.use(bodyParser.json());
app.use("/api/web/", router_1.default);
app.use(apiLimiter);
const PORT = process.env.PORT || 8080;
app.listen(PORT, function () { });

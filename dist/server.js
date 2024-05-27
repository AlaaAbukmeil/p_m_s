"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
//jshint esversion:6
const auth_1 = __importDefault(require("./routes/auth"));
const formatter_1 = __importDefault(require("./routes/formatter"));
const reports_1 = __importDefault(require("./routes/reports/reports"));
const positions_1 = __importDefault(require("./routes/operations/positions"));
const trades_1 = __importDefault(require("./routes/operations/trades"));
const reconcile_1 = __importDefault(require("./routes/reconcile"));
const fund_1 = __importDefault(require("./routes/operations/fund"));
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const path = require("path");
const rateLimit = require("express-rate-limit");
const cookieParser = require('cookie-parser');
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    standardHeaders: true,
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
const cors = require("cors");
app.use(cookieParser());
const corsOptions = {
    origin: ["http://localhost:3000", "http://localhost:3001", "https://admin.triadacapital.com"],
    credentials: true,
    optionSuccessStatus: 200,
};
app.use(express.json());
app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, "/public")));
app.use(bodyParser.urlencoded({
    extended: false,
}));
app.use(bodyParser.json());
app.use("/api/web/", reports_1.default);
app.use("/api/web/", auth_1.default);
app.use("/api/web/", formatter_1.default);
app.use("/api/web/", reconcile_1.default);
app.use("/api/web/", trades_1.default);
app.use("/api/web/", positions_1.default);
app.use("/api/web/", fund_1.default);
app.use(apiLimiter);
const PORT = process.env.PORT || 8080;
app.listen(PORT, function () { });

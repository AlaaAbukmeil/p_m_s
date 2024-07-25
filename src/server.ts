//jshint esversion:6
import authRouter from "./routes/auth";
import formatterRouter from "./routes/formatter";
import router from "./routes/reports/reports";
import positionsRouter from "./routes/operations/positions";
import tradesRouter from "./routes/operations/trades";
import reconcileRouter from "./routes/operations/reconcile";
import fundRouter from "./routes/operations/fund";
import factSheetRouter from "./routes/operations/factSheet";
import linksRouter from "./routes/operations/links";
import analyticsRouter from "./routes/analytics/compare";
import logRouter from "./routes/automation/logs";
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const path = require("path");

const rateLimit = require("express-rate-limit");
const cookieParser = require("cookie-parser");
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const cors = require("cors");

app.use(cookieParser());

const corsOptions = {
  origin: ["http://localhost:3000", "http://localhost:3001", "https://admin.triadacapital.com", "https://eblot.triadacapital.com"],
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};
// app.use(bodyParser.json({ limit: '50mb' }));
// app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);

app.use(cors(corsOptions));

app.use(express.static(path.join(__dirname, "/public")));

app.use("/api/web/", router);
app.use("/api/web/", authRouter);
app.use("/api/web/", formatterRouter);
app.use("/api/web/", reconcileRouter);
app.use("/api/web/", tradesRouter);
app.use("/api/web/", positionsRouter);
app.use("/api/web/", fundRouter);
app.use("/api/web/", factSheetRouter);
app.use("/api/web/", linksRouter);
app.use("/api/web/", analyticsRouter);
app.use("/api/web/", logRouter);

app.use(apiLimiter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, function () {});

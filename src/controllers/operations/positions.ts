import { convertExcelDateToJSDate, formatDateUS, formatDateWorld, getDate, getTradeDateYearTrades } from "../common";
import { findTrade, insertTradesData } from "../reports/trades";
import { getDateTimeInMongoDBCollectionFormat, monthlyRlzdDate } from "../reports/common";
import { findTradeRecord, formatUpdatedPositions, getAllCollectionNames, getAverageCost, getCollectionName, getEarliestCollectionName, parseBondIdentifier } from "../reports/tools";
import { PinnedPosition } from "../../models/position";
import { CentralizedTrade } from "../../models/trades";
import { modifyTradesDueToRecalculate, updateMatchedVcons } from "./trades";
import { insertEditLogs } from "./logs";
import { swapMonthDay } from "../common";
import { PositionBeforeFormatting, PositionInDB, PositionInSQLDB } from "../../models/portfolio";
import { indexPool, pinnedPool, portfolioPool } from "./psql/operation";
import { CentralizedTradeInDB } from "../../models/trades";
import { getSQLIndexFormat } from "./tools";
import { insertNewIndex } from "./indexing";
import { convertCentralizedToTradesSQL, formatPositionsApp, formatPositionsTOSQL } from "../db/convert";
const ObjectId = require("mongodb").ObjectId;
const { v4: uuidv4 } = require("uuid");

export async function getPortfolio(portfolioId: string, date = null): Promise<PositionInDB[]> {
  try {
    let day = getDateTimeInMongoDBCollectionFormat(new Date(new Date(date ? date : new Date()).getTime() - 0 * 24 * 60 * 60 * 1000));
    let latestCollectionTodayDate = day.split(" ")[0] + " 23:59";
    let allCollectionNames = await getAllCollectionNames(portfolioId);
    let earliestCollectionName = getEarliestCollectionName(latestCollectionTodayDate, allCollectionNames);

    console.log(earliestCollectionName.predecessorDate, "get portfolio date");
    let documents: PositionBeforeFormatting[] = await getHistoricalPortfolio(earliestCollectionName.predecessorDate, portfolioId, true);

    return documents;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getPortfolio", "controllers/operations/positions.ts");
    return [];
  }
}

export async function getHistoricalPortfolio(date: string, portfolioId: string = "portfolio_main", sort = false): Promise<PositionBeforeFormatting[]> {
  const client = await portfolioPool.connect();
  try {
    let name = date.split("-");
    let nameInDB = name[1] + "/" + name[2].split(" ")[0] + "/" + name[0];
    let fullName = nameInDB.replace(/-/g, "_").replace(/\//g, "_");
    let query = `
      SELECT *
      FROM public.${portfolioId}_${fullName}
    `;

    // if (sort) {
    query += `ORDER BY bb_ticker`;
    // }
    const result = await client.query(query, []);
    let formatted: any = formatPositionsApp(result.rows);
    return formatted;
  } catch (error: any) {
    console.log({ error });
    const dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getHistoricalPortfolio", "controllers/operations/positions.ts");

    return [];
  } finally {
    client.release();
  }
}

export function getSecurityInPortfolio(portfolio: any, identifier: string, location: string) {
  let document = 404;
  if (identifier == "" || !identifier) {
    return document;
  }
  for (let index = 0; index < portfolio.length; index++) {
    let issue = portfolio[index];
    if ((identifier.includes(issue["ISIN"]) || identifier.includes(issue["BB Ticker"])) && issue["Location"].trim() == location.trim()) {
      if (issue["ISIN"] != "") {
        document = issue;
      }
    } else if (identifier.includes(issue["BB Ticker"]) && issue["Location"].trim() == location.trim()) {
      if (issue["BB Ticker"] != "") {
        document = issue;
      }
    } else if (identifier == new ObjectId(issue["_id"])) {
      document = issue;
    }
  }
  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return document;
}

export function returnPositionProgress(positions: any, identifier: any, location: any) {
  let updateingPosition;
  for (let index = 0; index < positions.length; index++) {
    let position = positions[index];
    if (position["ISIN"])
      if ((position["ISIN"] == identifier || position["BB Ticker"] == identifier) && position["Location"] == location) {
        updateingPosition = position;
      }
  }
  return updateingPosition;
}

export function updateExisitingPosition(positions: any, identifier: any, location: any, updatedPosition: any) {
  for (let index = 0; index < positions.length; index++) {
    let position = positions[index];
    if ((position["ISIN"] == identifier || position["BB Ticker"] == identifier) && position["Location"] == location) {
      positions[index] = updatedPosition;
    }
  }
  return positions;
}

export async function updatePositionPortfolio(
  trades: {
    vconTrades: CentralizedTrade[];
    ibTrades: CentralizedTrade[];
    emsxTrades: CentralizedTrade[];
    gsTrades: CentralizedTrade[];
    allTrades: CentralizedTrade[];
  },
  link: string,
  portfolioId: string
) {
  try {
    let data = trades.allTrades;

    let positions: PositionInDB[] = [];
    let portfolio = await getPortfolio(portfolioId);
    let triadaIds: string[] = [];

    try {
      updatePositionsBasedOnTrade(data, portfolio, triadaIds, positions, false);
      let updatedPortfolio = formatUpdatedPositions(positions, portfolio, "Last Upload Trade");
      let action1 = await insertTradesData(convertCentralizedToTradesSQL(trades.vconTrades), "vcons");
      try {
        await updateMatchedVcons(trades.vconTrades);
      } catch (error) {
        console.log({ UploadTrade: error });
      }
      let action2 = await insertTradesData(convertCentralizedToTradesSQL(trades.ibTrades), "ib");
      let action3 = await insertTradesData(convertCentralizedToTradesSQL(trades.emsxTrades), "emsx");
      let action4 = await insertTradesData(convertCentralizedToTradesSQL(trades.gsTrades), "cds_gs");

      let insertion = await insertPositionsInPortfolio(updatedPortfolio.updatedPortfolio, portfolioId);
      let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      await insertEditLogs([positions], "upload_trades", dateTime, "Num of updated/created positions: " + Object.keys(positions).length, "Link: " + link);

      return insertion;
    } catch (error: any) {
      console.log(error);
      let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      await insertEditLogs([errorMessage.toString()], "errors", dateTime, "insertPositionsInPortfolio", "controllers/operations/positions.ts 1");

      return { error: error.toString() };
    }
  } catch (error: any) {
    console.log(error);

    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    await insertEditLogs([errorMessage.toString()], "errors", dateTime, "insertPositionsInPortfolio", "controllers/operations/positions.ts 2");
    return { error: error.toString() };
  }
}

export async function insertPositionsInPortfolio(positions: PositionBeforeFormatting[], portfolioId: string, snapShotInput = "") {
  const client = await portfolioPool.connect();
  try {
    let formattedPositions = formatPositionsTOSQL(positions);
    let day = getDateTimeInMongoDBCollectionFormat(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000));

    let checkCollectionDay = await getCollectionName(day, portfolioId);
    if (checkCollectionDay) {
      day = checkCollectionDay;
    } else if (!checkCollectionDay && !snapShotInput) {
      //insert in index
      day = "portfolio-" + day;
      await insertNewIndex(portfolioId, day);
    }
    let snapShot = snapShotInput || getSQLIndexFormat(day, portfolioId);
    await client.query("BEGIN");

    const createTableQuery = `
          CREATE TABLE IF NOT EXISTS "${snapShot}" PARTITION OF ${portfolioId}
          FOR VALUES IN ('${snapShot}');
      `;
    await client.query(createTableQuery);
    await client.query("COMMIT");

    for (const element of formattedPositions) {
      const query = `
      WITH updated AS (
        UPDATE public.${snapShot}
        SET
          id = $1,
          portfolio_id = $2,
          portfolio_snapshot_time = $3,
          cusip = $6,
          bloomberg_id = $7,
          bid = $8,
          mid = $9,
          ask = $10,
          bloomberg_mid_bgn = $11,
          notional_amount = $12,
          average_cost = $13,
          bb_ticker = $14,
          cr01 = $15,
          dv01 = $16,
          broker = $17,
          call_date = $18,
          country = $19,
          coupon_rate = $20,
          currency = $21,
          entry_price = $22,
          entry_yield = $23,
          fx_rate = $24,
          fitch_bond_rating = $25,
          fitch_outlook = $26,
          interest = $27,
          issuer = $28,
          last_price_update = $29,
          last_upload_trade = $30,
          maturity = $31,
          moddys_outlook = $32,
          moodys_bond_rating = $33,
          moodys_outlook = $34,
          bbg_composite_rating = $35,
          sp_bond_rating = $36,
          sp_outlook = $37,
          oas = $38,
          original_face = $39,
          sector = $40,
          strategy = $41,
          ytm = $42,
          ytw = $43,
          z_spread = $44,
          notes = $45,
          coupon_duration = $46,
          asset_class = $47,
          pin = $48,
          issuers_country = $49,
          coupon_frequency = $50,
          previous_settle_date = $51,
          next_settle_date = $52,
          cost_mtd = $53,
          security_description = $54,
          type = $55
        WHERE isin = $5 AND location = $4
        RETURNING *
      )
      INSERT INTO public.${snapShot} (
        id, portfolio_id, portfolio_snapshot_time, location, isin, cusip, bloomberg_id,
        bid, mid, ask, bloomberg_mid_bgn, notional_amount, average_cost, bb_ticker,
        cr01, dv01, broker, call_date, country, coupon_rate, currency, entry_price,
        entry_yield, fx_rate, fitch_bond_rating, fitch_outlook, interest, issuer,
        last_price_update, last_upload_trade, maturity, moddys_outlook, moodys_bond_rating,
        moodys_outlook, bbg_composite_rating, sp_bond_rating, sp_outlook, oas, original_face,
        sector, strategy, ytm, ytw, z_spread, notes, coupon_duration, asset_class, pin,
        issuers_country, coupon_frequency, previous_settle_date, next_settle_date, cost_mtd,
        security_description, type
      )
      SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
             $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
             $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55
      WHERE NOT EXISTS (
        SELECT 1 FROM updated
      );
    `;

      let idTest = uuidv4();
      await client.query(query, [
        idTest,
        portfolioId,
        snapShot,
        element.location,
        element.isin,
        element.cusip,
        element.bloomberg_id,
        element.bid,
        element.mid,
        element.ask,
        element.bloomberg_mid_bgn,
        element.notional_amount,
        element.average_cost,
        element.bb_ticker,
        element.cr01,
        element.dv01,
        element.broker,
        element.call_date,
        element.country,
        element.coupon_rate,
        element.currency,
        JSON.stringify(element.entry_price),
        element.entry_yield,
        element.fx_rate,
        element.fitch_bond_rating,
        element.fitch_outlook,
        JSON.stringify(element.interest),
        element.issuer,
        element.last_price_update,
        element.last_upload_trade,
        element.maturity,
        element.moddys_outlook,
        element.moodys_bond_rating,
        element.moodys_outlook,
        element.bbg_composite_rating,
        element.sp_bond_rating,
        element.sp_outlook,
        element.oas,
        element.original_face,
        element.sector,
        element.strategy,
        element.ytm,
        element.ytw,
        element.z_spread,
        element.notes,
        element.coupon_duration,
        element.asset_class,
        element.pin,
        element.issuers_country,
        element.coupon_frequency,
        element.previous_settle_date,
        element.next_settle_date,
        JSON.stringify(element.cost_mtd),
        element.security_description,
        element.type,
      ]);
    }
    await client.query("COMMIT");

    return;
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    if (!errorMessage.toString().includes("Batch cannot be empty")) {
      await insertEditLogs([errorMessage], "errors", dateTime, "insertPositionsInPortfolio", "controllers/operations/positions.ts 3");
    }

    return [];
  } finally {
    client.release();
  }
}

export async function editPosition(editedPosition: any, date: string, portfolioId: string) {
  try {
    let allCollectionNames = await getAllCollectionNames(portfolioId);

    let earliestPortfolioName = getEarliestCollectionName(date, allCollectionNames);

    console.log(earliestPortfolioName.predecessorDate, "get edit portfolio");

    let portfolio: PositionBeforeFormatting[] = await getHistoricalPortfolio(earliestPortfolioName.predecessorDate, portfolioId, true);

    delete editedPosition["Quantity"];
    delete editedPosition["date"];

    let positionInPortfolio: any = {};

    let editedPositionTitles = Object.keys(editedPosition);

    let id = editedPosition["id"];
    let unEditableParams = [
      "id",
      "Value",
      "Duration",
      "Base LTV",
      "MTD Notional",
      "LTV",
      "MTD Notional",
      "MTD Mark",
      "Previous Mark",
      "Entry Price",

      "Day P&L (BC)",
      "MTD Rlzd (BC)",
      "MTD URlzd (BC)",
      "MTD Int.Income (BC)",
      "MTD P&L (BC)",
      "Cost (LC)",
      "Day Accrual",

      "Day Price Move",
      "Value (BC)",
      "Value (LC)",
      "MTD Int. (BC)",
      "Day URlzd (BC)",
      "Day Rlzd (BC)",
      "Day Int. (LC)",
      "Day Accrual (LC)",
      "Cost MTD (LC)",
      "Quantity",
      "Day Int. (BC)",

      "Borrow Capacity",
      "Margin",
      "Day P&L FX",
      "MTD P&L FX",
      "S&P Bond Rating",
      "MTD FX",
      "Day URlzd",

      "Day P&L (LC)",
      "MTD Rlzd (LC)",
      "MTD URlzd (LC)",
      "MTD Int.Income (LC)",
      "MTD P&L (LC)",
      "Previous FX",
      "Day Rlzd",
      "Spread Change",
      "OAS W Change",
      "Last Day Since Realizd",
      "Day Rlzd (LC)",
      "Day URlzd (LC)",
      "MTD Int. (LC)",
      "Currency)	Day Int. (LC)",
      "YTD P&L (LC)",
      "YTD Int. (LC)",

      "YTD URlzd (BC)",
      "YTD Int. (BC)",
      "YTD FX",
      "Total Gain/ Loss (USD)",

      "Accrued Int. Since Inception (BC)",
      "Notes",
      "MTD Price Move",
      "Average Cost MTD",
      "3-Day Price Move",
      "1-Day Spread Change",
      "Market Type",
      "Region",
      "Principal",
      "Average Cost MTD",
      "3-Day Price Move",
      "Market Type",
      "Principal",
      "Event Type",
      "Edit Note",
      "Factor Date (if any)",
      "Bloomberg Mid BGN",
      "MTD Int.",
    ];
    // these keys are made up by the function frontend table, it reverts keys to original keys

    let positionIndex = null;
    for (let index = 0; index < portfolio.length; index++) {
      let position = portfolio[index];
      if (position["id"].toString() == id) {
        positionInPortfolio = position;
        positionIndex = index;
      }
    }
    if (!positionIndex && positionIndex != 0) {
      return { error: "Fatal Error" };
    }
    let changes = [];
    for (let indexTitle = 0; indexTitle < editedPositionTitles.length; indexTitle++) {
      let title = editedPositionTitles[indexTitle];
      if (Array.isArray(editedPosition[title])) {
        editedPosition[title] == "";
      }
    }
    for (let indexTitle = 0; indexTitle < editedPositionTitles.length; indexTitle++) {
      let title = editedPositionTitles[indexTitle];
      if (!unEditableParams.includes(title) && editedPosition[title] != "") {
        if (title == "Notional Amount") {
          if (editedPosition["Event Type"] == "sink_factor") {
            let sinkFactorDate = formatDateUS(new Date(editedPosition["Factor Date (if any)"]));

            positionInPortfolio["Interest"] = positionInPortfolio["Interest"] ? positionInPortfolio["Interest"] : {};
            positionInPortfolio["Interest"][sinkFactorDate] = parseFloat(editedPosition[title]);

            changes.push(`Notional Amount Changed from ${positionInPortfolio["Notional Amount"]} to ${editedPosition[title]} on ${sinkFactorDate} (sink factor)`);
          } else if (editedPosition["Event Type"] == "pay_in_kind") {
            let payInKindFactorDate = formatDateUS(new Date(editedPosition["Factor Date (if any)"]));

            positionInPortfolio["Interest"] = positionInPortfolio["Interest"] ? positionInPortfolio["Interest"] : {};
            positionInPortfolio["Interest"][payInKindFactorDate] = parseFloat(editedPosition[title]) - parseFloat(positionInPortfolio["Notional Amount"]);

            changes.push(`Notional Amount Changed from ${positionInPortfolio["Notional Amount"]} to ${editedPosition[title]} on ${payInKindFactorDate}`);
            positionInPortfolio["Notional Amount"] = parseFloat(editedPosition[title]);
          } else if (editedPosition["Event Type"] == "edit_position") {
            let factorDate = formatDateUS(new Date(editedPosition["Factor Date (if any)"]));

            positionInPortfolio["Interest"] = positionInPortfolio["Interest"] ? positionInPortfolio["Interest"] : {};
            positionInPortfolio["Interest"][factorDate] = parseFloat(editedPosition[title]);

            changes.push(`Notional Amount Changed from ${positionInPortfolio["Notional Amount"]} to ${editedPosition[title]} on ${factorDate}`);
          } else if (editedPosition["Event Type"] == "redemption") {
            let factorDate = formatDateUS(new Date(editedPosition["Factor Date (if any)"]));
            positionInPortfolio["Interest"] = positionInPortfolio["Interest"] ? positionInPortfolio["Interest"] : {};
            positionInPortfolio["Interest"][factorDate] = parseFloat(editedPosition[title]) - parseFloat(positionInPortfolio["Notional Amount"]);

            changes.push(`Notional Amount Redeemped at˝ ${positionInPortfolio["Notional Amount"]} on ${factorDate}`);
            positionInPortfolio["Notional Amount"] = 0;
          } else {
            changes.push(`Notional Amount changed from ${positionInPortfolio["Notional Amount"]} to ${editedPosition[title]}`);
            positionInPortfolio["Notional Amount"] = parseFloat(editedPosition[title]);
          }
        } else if ((title == "Mid" || title == "Ask" || title == "Bid" || title == "Average Cost" || title == "Entry Price") && editedPosition[title] != "") {
          if (!positionInPortfolio["Type"]) {
            positionInPortfolio["Type"] = positionInPortfolio["BB Ticker"].split(" ")[0] == "T" || positionInPortfolio["Issuer"] == "US TREASURY N/B" ? "UST" : "BND";
          }

          if (positionInPortfolio["Type"] == "BND" || positionInPortfolio["Type"] == "UST") {
            positionInPortfolio[title] = parseFloat(editedPosition[title]) / 100;
          } else {
            positionInPortfolio[title] = parseFloat(editedPosition[title]);
          }
        } else {
          changes.push(`${title} changed from ${positionInPortfolio[title] || "''"} to ${editedPosition[title]}`);

          positionInPortfolio[title] = editedPosition[title];
        }
      }
    }
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    await insertEditLogs(changes, editedPosition["Event Type"], dateTime, editedPosition["Edit Note"], positionInPortfolio["BB Ticker"] + " " + positionInPortfolio["Location"]);
    let snapShotName = getSQLIndexFormat(`portfolio-${earliestPortfolioName.predecessorDate}`, portfolioId);
    let action = await insertPositionsInPortfolio([positionInPortfolio], portfolioId, snapShotName);
    console.log({ positionInPortfolio, editedPosition });
    if (action) {
      return { status: 200 };
    } else {
      return { error: "fatal error" };
    }
  } catch (error: any) {
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    return { error: errorMessage };
  }
}

export async function pinPosition(position: PinnedPosition) {
  try {
    if (position.ISIN) {
      let positions = position.ISIN.split("&");
      let positionsId = position.id.split("&");

      for (let index = 0; index < positions.length; index++) {
        const element = positions[index];
        let pinnedPosition = {
          ISIN: element,
          Location: position["Location"],
          id: positionsId[index],
          Pin: position["Pin"],
        };
        await editPosition(pinnedPosition, position["Date"] + " 23:50", position["portfolio_id"]);
      }
    }
    return { status: 200, message: "Position inserted successfully." };
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "pinPosition", "controllers/operations/positions.ts");

    return { error: errorMessage };
  }
}

export async function getPinnedPositions() {
  const client = await pinnedPool.connect();
  try {
    let selectQuery = `
        SELECT * FROM public.pinned_positions;
        `;

    const res = await client.query(selectQuery, []);
    return res.rows;
  } catch (error: any) {
    console.log(error);
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getPinnedPositions", "controllers/operations/positions.ts");

    return [];
  } finally {
    client.release();
  }
}

export async function readCalculatePosition(data: CentralizedTrade[], date: string, isin: any, location: any, tradeType: "vcons" | "ib" | "emsx" | "written_blotter" | "cds_gs", portfolioId: string) {
  try {
    let positions: any = [];
    let allCollectionNames = await getAllCollectionNames(portfolioId);

    let earliestPortfolioName = getEarliestCollectionName(date, allCollectionNames);

    let portfolio: PositionBeforeFormatting[] = await getHistoricalPortfolio(earliestPortfolioName.predecessorDate, portfolioId, true);

    let triadaIds: any = [];

    updatePositionsBasedOnTrade(data, portfolio, triadaIds, positions, true);

    let updatedPortfolio = formatUpdatedPositions(positions, portfolio, "Last Upload Trade");

    try {
      let snapShotName = getSQLIndexFormat(`portfolio-${earliestPortfolioName.predecessorDate}`, portfolioId);
      let insertion = await insertPositionsInPortfolio(updatedPortfolio.updatedPortfolio, portfolioId, snapShotName);
      let modifyTradesAction = await modifyTradesDueToRecalculate(data, tradeType);
      let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      await insertEditLogs([], "recalculate_position", dateTime, "", data[0]["BB Ticker"] + " " + data[0]["Location"]);
      return insertion;
    } catch (error) {
      let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      console.log(error);
      let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

      await insertEditLogs([errorMessage], "errors", dateTime, "readCalculatePosition", "controllers/operations/portfolio.ts");

      return { error: error };
    }
  } catch (error) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    await insertEditLogs([errorMessage], "errors", dateTime, "readCalculatePosition", "controllers/operations/portfolio.ts");

    return { error: error };
  }
}

export async function insertFXPosition(position: any, date: any, portfolioId: string) {
  console.log(date, new Date(date), position);
  let today = swapMonthDay(date);
  let fxPositions: any = {
    Type: "FX",
    "Notional Amount": position["Notional Amount"],
    "BB Ticker": position["Code"],
    ISIN: position["Code"],
    Strategy: parseInt(position["Notional Amount"]) < 0 ? "Hedge" : "VI",
    "Asset Class": "Cash",
    Location: position["Location"],
    Interest: {},
  };
  fxPositions.Interest[today] = position["Notional Amount"];

  let day = getDateTimeInMongoDBCollectionFormat(new Date(today));
  let allCollectionNames = await getAllCollectionNames(portfolioId);

  let checkCollectionDay = getEarliestCollectionName(day, allCollectionNames);
  if (checkCollectionDay) {
    day = checkCollectionDay.predecessorDate;
  }

  // Create an array of updateOne operations
  const client = await portfolioPool();
  try {
    let formattedPositions = formatPositionsTOSQL([fxPositions]);
    let day = getDateTimeInMongoDBCollectionFormat(new Date(new Date().getTime() - 0 * 24 * 60 * 60 * 1000));

    let checkCollectionDay = await getCollectionName(day, portfolioId);
    if (checkCollectionDay) {
      day = checkCollectionDay;
    } else {
      //insert in index
    }
    let snapShot = getSQLIndexFormat(day, portfolioId);
    await client.query("BEGIN");

    const createTableQuery = `
          CREATE TABLE IF NOT EXISTS "${day}" PARTITION OF ${portfolioId}
          FOR VALUES IN ('${snapShot}');
      `;
    await client.query(createTableQuery);
    await client.query("COMMIT");

    for (const element of formattedPositions) {
      const insertQuery = `
      INSERT INTO public.positions (
        id, portfolio_id, portfolio_snapshot_time, location, isin, cusip, bloomberg_id,
        bid, mid, ask, bloomberg_mid_bgn, notional_amount, average_cost, bb_ticker,
        cr01, dv01, broker, call_date, country, coupon_rate, currency, entry_price,
        entry_yield, fx_rate, fitch_bond_rating, fitch_outlook, interest, issuer,
        last_price_update, last_upload_trade, maturity, moddys_outlook, moodys_bond_rating,
        moodys_outlook, bbg_composite_rating, sp_bond_rating, sp_outlook, oas, original_face,
        sector, strategy, ytm, ytw, z_spread, notes, coupon_duration, asset_class, pin,
        issuers_country, coupon_frequency, previous_settle_date, next_settle_date, cost_mtd,
        security_description, type
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38,
        $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54, $55
      )
      ON CONFLICT (bb_ticker, location)
      DO UPDATE SET
        id = EXCLUDED.id,
        portfolio_id = EXCLUDED.portfolio_id,
        portfolio_snapshot_time = EXCLUDED.portfolio_snapshot_time,
        isin = EXCLUDED.isin,
        cusip = EXCLUDED.cusip,
        bloomberg_id = EXCLUDED.bloomberg_id,
        bid = EXCLUDED.bid,
        mid = EXCLUDED.mid,
        ask = EXCLUDED.ask,
        bloomberg_mid_bgn = EXCLUDED.bloomberg_mid_bgn,
        notional_amount = EXCLUDED.notional_amount,
        average_cost = EXCLUDED.average_cost,
        cr01 = EXCLUDED.cr01,
        dv01 = EXCLUDED.dv01,
        broker = EXCLUDED.broker,
        call_date = EXCLUDED.call_date,
        country = EXCLUDED.country,
        coupon_rate = EXCLUDED.coupon_rate,
        currency = EXCLUDED.currency,
        entry_price = EXCLUDED.entry_price,
        entry_yield = EXCLUDED.entry_yield,
        fx_rate = EXCLUDED.fx_rate,
        fitch_bond_rating = EXCLUDED.fitch_bond_rating,
        fitch_outlook = EXCLUDED.fitch_outlook,
        interest = EXCLUDED.interest,
        issuer = EXCLUDED.issuer,
        last_price_update = EXCLUDED.last_price_update,
        last_upload_trade = EXCLUDED.last_upload_trade,
        maturity = EXCLUDED.maturity,
        moddys_outlook = EXCLUDED.moddys_outlook,
        moodys_bond_rating = EXCLUDED.moodys_bond_rating,
        moodys_outlook = EXCLUDED.moodys_outlook,
        bbg_composite_rating = EXCLUDED.bbg_composite_rating,
        sp_bond_rating = EXCLUDED.sp_bond_rating,
        sp_outlook = EXCLUDED.sp_outlook,
        oas = EXCLUDED.oas,
        original_face = EXCLUDED.original_face,
        sector = EXCLUDED.sector,
        strategy = EXCLUDED.strategy,
        ytm = EXCLUDED.ytm,
        ytw = EXCLUDED.ytw,
        z_spread = EXCLUDED.z_spread,
        notes = EXCLUDED.notes,
        coupon_duration = EXCLUDED.coupon_duration,
        asset_class = EXCLUDED.asset_class,
        pin = EXCLUDED.pin,
        issuers_country = EXCLUDED.issuers_country,
        coupon_frequency = EXCLUDED.coupon_frequency,
        previous_settle_date = EXCLUDED.previous_settle_date,
        next_settle_date = EXCLUDED.next_settle_date,
        cost_mtd = EXCLUDED.cost_mtd,
        security_description = EXCLUDED.security_description,
        type = EXCLUDED.type;
    `;

      let idTest = uuidv4();
      await client.query(insertQuery, [
        idTest,
        portfolioId,
        snapShot,
        element.location,
        element.isin,
        element.cusip,
        element.bloomberg_id,
        element.bid,
        element.mid,
        element.ask,
        element.bloomberg_mid_bgn,
        element.notional_amount,
        element.average_cost,
        element.bb_ticker,
        element.cr01,
        element.dv01,
        element.broker,
        element.call_date,
        element.country,
        element.coupon_rate,
        element.currency,
        JSON.stringify(element.entry_price),
        element.entry_yield,
        element.fx_rate,
        element.fitch_bond_rating,
        element.fitch_outlook,
        JSON.stringify(element.interest),
        element.issuer,
        element.last_price_update,
        element.last_upload_trade,
        element.maturity,
        element.moddys_outlook,
        element.moodys_bond_rating,
        element.moodys_outlook,
        element.bbg_composite_rating,
        element.sp_bond_rating,
        element.sp_outlook,
        element.oas,
        element.original_face,
        element.sector,
        element.strategy,
        element.ytm,
        element.ytw,
        element.z_spread,
        element.notes,
        element.coupon_duration,
        element.asset_class,
        element.pin,
        element.issuers_country,
        element.coupon_frequency,
        element.previous_settle_date,
        element.next_settle_date,
        JSON.stringify(element.cost_mtd),
        element.security_description,
        element.type,
      ]);
    }
    await client.query("COMMIT");

    return;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    if (!errorMessage.toString().includes("Batch cannot be empty")) {
      await insertEditLogs([errorMessage], "errors", dateTime, "insertFXPosition", "controllers/operations/positions.ts");
    }
    return [];
  } finally {
    client.release();
  }
}

export async function deletePosition(data: any, dateInput: any, portfolioId: string): Promise<any> {
  const client = await portfolioPool.connect();
  try {
    const query = `
      DELETE FROM public.${portfolioId}
      WHERE id = $1;
    `;

    const result = await client.query(query, [data["id"]]);

    if (result.rowCount === 0) {
      return { error: `Position does not exist!` };
    } else {
      let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
      await insertEditLogs([], "delete_position", dateTime, "Delete Position", data["BB Ticker"] + " " + data["Location"]);

      console.log("deleted");
      return { error: null };
    }
  } catch (error: any) {
    console.error(`An error occurred while deleting the trade: ${error}`);
    const dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    await insertEditLogs([error], "errors", dateTime, "deletePosition", `controllers/operations/positions.ts`);
    return { error: error.toString() };
  } finally {
    client.release();
  }
}
export function updatePositionsBasedOnTrade(data: CentralizedTrade[], portfolio: PositionInDB[], triadaIds: string[], positions: PositionInDB[], reset: boolean) {
  for (let index = 0; index < data.length; index++) {
    let row = data[index];
    row["BB Ticker"] = row["BB Ticker"];
    let originalFace = row["Original Face"];
    let identifier = row["ISIN"] !== "" ? row["ISIN"].trim() : row["BB Ticker"].trim();
    let location = row["Location"].trim();
    let securityInPortfolio: any = reset ? 404 : getSecurityInPortfolio(portfolio, identifier, location);
    let object: any = {};
    if (securityInPortfolio !== 404) {
      object = securityInPortfolio;
      object["Notional Amount"] = parseFloat(object["Notional Amount"]);
    }

    let couponDaysYear = row["BB Ticker"].split(" ")[0] == "T" || row["BB Ticker"].includes("U.S") ? 365.0 : 360.0;
    let previousQuantity = 0;
    let operation = row["B/S"] == "B" && row["Trade Type"] != "cds_gs" ? 1 : -1;
    let divider = row["Trade Type"].includes("vcon") ? 100 : 1;

    let currentPrice: any = row["Price"] / divider;
    let currentQuantity: any = parseFloat(row["Notional Amount"].toString().replace(/,/g, "")) * operation;

    let currentPrincipal: any = parseFloat(row["Principal"].toString().replace(/,/g, ""));

    let currency = row["Currency"];
    let bondCouponMaturity: any = parseBondIdentifier(row["BB Ticker"]);

    let tradeExistsAlready = triadaIds.includes(row["Triada Trade Id"]);

    let updatingPosition = returnPositionProgress(positions, identifier, location);
    console.log("returnPositionProgress", { positionQuantity: updatingPosition ? updatingPosition["Notional Amount"] : object["Notional Amount"], tradeQuantatity: currentQuantity, identifier, location });
    let tradeDate: any = new Date(row["Trade Date"]);
    let thisMonth = monthlyRlzdDate(tradeDate);

    let rlzdOperation = -1;
    if (updatingPosition) {
      let accumlatedQuantityState = updatingPosition["Notional Amount"] > 0 ? 1 : -1;

      if (operation == -1 * accumlatedQuantityState && updatingPosition["Notional Amount"] != 0) {
        rlzdOperation = 1;
      }
    } else {
      let accumlatedQuantityState = previousQuantity > 0 ? 1 : -1;
      if (operation == -1 * accumlatedQuantityState && previousQuantity) {
        rlzdOperation = 1;
      }
    }

    if (!tradeExistsAlready && identifier !== "") {
      triadaIds.push(row["Triada Trade Id"]);
      if (!updatingPosition && securityInPortfolio == 404) {
        let settlementDate = row["Settle Date"];

        object["Location"] = row["Location"].trim();
        object["Last Modified Date"] = new Date();

        object["Entry Yield"] = row["Yield"] || 0;
        object["Mid"] = currentPrice;

        object["BB Ticker"] = row["BB Ticker"];

        object["ISIN"] = row["ISIN"].trim();
        object["CUSIP"] = row["Cuisp"].trim() || "";
        object["Notional Amount"] = currentQuantity;

        object["Currency"] = currency;
        object["Average Cost"] = currentPrice;

        object["Coupon Rate"] = bondCouponMaturity.rate || 0;
        object["Maturity"] = bondCouponMaturity.date || 0;
        object["Interest"] = {};
        object["Interest"][settlementDate] = object["Interest"][settlementDate] ? object["Interest"][settlementDate] + currentQuantity : currentQuantity;

        object["Cost MTD"] = {};

        object["Cost MTD"][thisMonth] = operation == 1 ? parseFloat(currentPrincipal) : 0;
        object["Original Face"] = originalFace;

        if (!object["Entry Price"]) {
          object["Entry Price"] = {};
        }

        if (rlzdOperation == -1) {
          object["Entry Price"][thisMonth] = currentPrice;
        }
        object["Last Individual Upload Trade"] = new Date();
        let tradeRecord = null;
        if (!tradeRecord) {
          tradeRecord = findTradeRecord(data, row["Triada Trade Id"]);
          if (tradeRecord != null && tradeRecord != undefined) {
            data[tradeRecord]["Updated Notional"] = object["Notional Amount"];
          }
        }

        positions.push(object);
      } else if (updatingPosition) {
        let settlementDate = row["Settle Date"];
        object["Location"] = row["Location"].trim();
        object["Last Modified Date"] = new Date();
        object["BB Ticker"] = row["BB Ticker"];
        object["Mid"] = currentPrice;

        object["ISIN"] = row["ISIN"];
        object["Currency"] = currency;
        object["Notional Amount"] = currentQuantity + updatingPosition["Notional Amount"];

        object["Average Cost"] = rlzdOperation == -1 ? getAverageCost(currentQuantity, updatingPosition["Notional Amount"], currentPrice, parseFloat(updatingPosition["Average Cost"])) : updatingPosition["Average Cost"];
        // this is reversed because the quantity is negated

        object["Cost MTD"] = updatingPosition["Cost MTD"];
        if (!object["Cost MTD"]) {
          object["Cost MTD"][thisMonth] = 0;
        }

        object["Cost MTD"][thisMonth] += operation == 1 ? currentPrincipal : 0;

        object["Coupon Rate"] = bondCouponMaturity.rate || 0;
        object["Maturity"] = bondCouponMaturity.date || 0;
        object["Interest"] = updatingPosition["Interest"];
        object["Interest"][settlementDate] = object["Interest"][settlementDate] ? object["Interest"][settlementDate] + currentQuantity : currentQuantity;
        object["Original Face"] = originalFace;
        object["Entry Price"] = updatingPosition["Entry Price"];
        object["Coupon Duration"] = object["Coupon Rate"] ? couponDaysYear : "";
        if (rlzdOperation == -1) {
          object["Entry Price"][thisMonth] = currentPrice;
        }

        object["Last Individual Upload Trade"] = new Date();
        let tradeRecord = null;
        if (!tradeRecord) {
          tradeRecord = findTradeRecord(data, row["Triada Trade Id"]);
          if (tradeRecord != null && tradeRecord != undefined) {
            data[tradeRecord]["Updated Notional"] = object["Notional Amount"];
          }
        }
        positions = updateExisitingPosition(positions, identifier, location, object);
      } else if (securityInPortfolio != 404 && !updatingPosition) {
        let settlementDate = row["Settle Date"];
        object["Location"] = row["Location"].trim();
        object["Last Modified Date"] = new Date();
        object["BB Ticker"] = row["BB Ticker"];

        object["ISIN"] = row["ISIN"];
        object["Currency"] = currency;
        object["Notional Amount"] += currentQuantity;

        object["Average Cost"] = rlzdOperation == -1 ? getAverageCost(currentQuantity, object["Notional Amount"], currentPrice, parseFloat(object["Average Cost"])) : object["Average Cost"];
        // this is reversed because the quantity is negated

        if (!object["Cost MTD"]) {
          object["Cost MTD"][thisMonth] = 0;
        }

        object["Cost MTD"][thisMonth] = operation == 1 ? parseFloat(object["Cost MTD"][thisMonth]) + currentPrincipal : 0;

        object["Coupon Rate"] = bondCouponMaturity.rate || 0;
        object["Maturity"] = bondCouponMaturity.date || 0;
        object["Interest"][settlementDate] = object["Interest"][settlementDate] ? parseFloat(object["Interest"][settlementDate]) + currentQuantity : currentQuantity;
        object["Original Face"] = originalFace;
        object["Coupon Duration"] = object["Coupon Rate"] ? couponDaysYear : "";
        if (rlzdOperation == -1) {
          object["Entry Price"][thisMonth] = currentPrice;
        }

        object["Last Individual Upload Trade"] = new Date();
        let tradeRecord = null;
        if (!tradeRecord) {
          tradeRecord = findTradeRecord(data, row["Triada Trade Id"]);
          if (tradeRecord != null && tradeRecord != undefined) {
            data[tradeRecord]["Updated Notional"] = object["Notional Amount"];
          }
        }
        positions.push(object);
      }
    }
  }
}

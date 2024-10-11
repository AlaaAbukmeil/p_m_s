import { FactSheetFundDataInDB } from "../../models/factSheet";
import { FactSheetBenchMarkDataInDB } from "../../models/factSheet";
import { InvestorTrades } from "../../models/investorTrades";
import { insertEditLogs } from "../operations/logs";
import { factsheetPool, investorTradesPool } from "../operations/psql/operation";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";

export async function getInvestorsTrades() {
  const client = await investorTradesPool.connect();
  try {
    const query = `
        SELECT *
        FROM public.trades;
      `;

    const { rows } = await client.query(query, []);

    return rows;
  } catch (error) {
    console.log({ error });
    // Handle any errors that occurred during the operation
    console.error("An error occurred while retrieving data from MongoDB:", error);
  }
}
export async function getInvestorTrade(tradeId: string) {
  const client = await investorTradesPool.connect();
  try {
    const query = `
        SELECT *
        FROM public.trades
        WHERE id_trade = $1;
      `;

    const { rows } = await client.query(query, [tradeId]);

    return rows[0];
  } catch (error) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.error(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "getInvestorTrade", "controllers/userManagement/investorsTrades.ts");

    // Handle any errors that occurred during the operation
    console.error("An error occurred while retrieving data from MongoDB:", error);
  } finally {
    client.release();
  }
}
export async function editInvestorTrade(editedTrade: any) {
  try {
    let tradeInfo: any = await getInvestorTrade(editedTrade["id_trade"]);
    let centralizedBlotKeys: any = [
      "investor_name",
      "sub_class_description",

      "id_trade_type",
      "capital",
      "cash_rounded_capital",
      "cash_rounded_settlement_amount",
      "cash_rounded_receivable_payable_amount",
      "purchased_perf_fee_factor",
      "cost_of_inv_red_proceeds",
      "billing_code",
      "trade_type_name",
      "trade_sub_type_name",
      "units",
      "sign",
      "total_fees",
      "valuation_date",
      "trade_date",
      "order_trade_date",
      "valuation",
      "gav_pre_fees",
      "ask",
      "bid",
      "total_perf_fee_factor",
      "valuation_precision",
      "units_precision",
      "units_description",
      "trade_settlement_amount",
      "method",
      "class_currency",
      "trade_type_order",
      "trade_estimate",
      "admin_client_mantra_id",
      "portfolio_mantra_id",
      "legal_entity_mantra_id",
      "legal_entity_description",
      "class_mantra_id",
      "class_description",
      "sub_class_mantra_id",
      "nominee_mantra_id",
      "investor_mantra_id",
      "investor_description",
      "units_on_int_reports",
    ];
    if (tradeInfo) {
      let changes = 0;
      let changesText = [];
      for (let index = 0; index < centralizedBlotKeys.length; index++) {
        let key = centralizedBlotKeys[index];
        if (editedTrade[key] != "" && editedTrade[key]) {
          changesText.push(`${key} changed from ${tradeInfo[key]} to ${editedTrade[key]} `);
          tradeInfo[key] = editedTrade[key];

          changes++;
        }
      }
      if (!changes) {
        return { error: "The trade is still the same." };
      }
      const query = `
  UPDATE public.trades
  SET 
    id_trade_type = $1, capital = $2, cash_rounded_capital = $3,
    cash_rounded_settlement_amount = $4, cash_rounded_receivable_payable_amount = $5,
    purchased_perf_fee_factor = $6, cost_of_inv_red_proceeds = $7, billing_code = $8,
    trade_type_name = $9, trade_sub_type_name = $10, units = $11, sign = $12,
    total_fees = $13, valuation_date = $14, trade_date = $15, order_trade_date = $16,
    valuation = $17, gav_pre_fees = $18, ask = $19, bid = $20, total_perf_fee_factor = $21,
    valuation_precision = $22, units_precision = $23, units_description = $24,
    trade_settlement_amount = $25, id_order = $26, method = $27, class_currency = $28,
    trade_type_order = $29, trade_estimate = $30, admin_client_mantra_id = $31,
    portfolio_mantra_id = $32, legal_entity_mantra_id = $33, legal_entity_description = $34,
    class_mantra_id = $35, class_description = $36, sub_class_mantra_id = $37,
    sub_class_description = $38, nominee_mantra_id = $39, investor_mantra_id = $40,
    investor_description = $41, investor_name = $42, units_on_int_reports = $43
  WHERE id_trade = $44;
`;

      const values = [
        tradeInfo.id_trade_type,
        tradeInfo.capital,
        tradeInfo.cash_rounded_capital,
        tradeInfo.cash_rounded_settlement_amount,
        tradeInfo.cash_rounded_receivable_payable_amount,
        tradeInfo.purchased_perf_fee_factor,
        tradeInfo.cost_of_inv_red_proceeds,
        tradeInfo.billing_code,
        tradeInfo.trade_type_name,
        tradeInfo.trade_sub_type_name,
        tradeInfo.units,
        tradeInfo.sign,
        tradeInfo.total_fees,
        tradeInfo.valuation_date,
        tradeInfo.trade_date,
        tradeInfo.order_trade_date,
        tradeInfo.valuation,
        tradeInfo.gav_pre_fees,
        tradeInfo.ask,
        tradeInfo.bid,
        tradeInfo.total_perf_fee_factor,
        tradeInfo.valuation_precision,
        tradeInfo.units_precision,
        tradeInfo.units_description,
        tradeInfo.trade_settlement_amount,
        tradeInfo.id_order,
        tradeInfo.method,
        tradeInfo.class_currency,
        tradeInfo.trade_type_order,
        tradeInfo.trade_estimate,
        tradeInfo.admin_client_mantra_id,
        tradeInfo.portfolio_mantra_id,
        tradeInfo.legal_entity_mantra_id,
        tradeInfo.legal_entity_description,
        tradeInfo.class_mantra_id,
        tradeInfo.class_description,
        tradeInfo.sub_class_mantra_id,
        tradeInfo.sub_class_description,
        tradeInfo.nominee_mantra_id,
        tradeInfo.investor_mantra_id,
        tradeInfo.investor_description,
        tradeInfo.investor_name,
        tradeInfo.units_on_int_reports,
        tradeInfo.id_trade,
      ];

      const client = await investorTradesPool.connect();

      try {
        const res = await client.query(query, values);
        if (res.rowCount > 0) {
          return { error: null };
        } else {
          return { error: "unexpected error, please contact Triada team" };
        }
      } catch (error: any) {
        let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
        console.error(error);
        let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

        await insertEditLogs([errorMessage], "errors", dateTime, "editTrade", "controllers/userManagement/editInvestorTrade.ts");
        return { error: error.toString() };
      } finally {
        client.release();
      }
    } else {
      return { error: "Trade does not exist, please referesh the page!" };
    }
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.error(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "errors", dateTime, "edit_trade", "controllers/operations/trades.ts");
    console.log(error);
    return { error: error };
  }
}
export async function deleteInvestorsTrade(tradeId: string) {
  const client = await investorTradesPool.connect();
  try {
    const query = `
        DELETE FROM public.trades
        WHERE id_trade = $1;
      `;

    const result = await client.query(query, [tradeId]);

    if (result.rowCount === 0) {
      return { error: `Trade does not exist!` };
    } else {
      console.log("deleted");
      return { error: null };
    }
  } catch (error: any) {
    console.error(`An error occurred while deleting the trade: ${error}`);
    const dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    await insertEditLogs([error], "errors", dateTime, "deleteInvestorsTrade", `${tradeId}`);
    return { error: error.toString() };
  } finally {
    client.release();
  }
}

export function calculateCumulativeRealizedPnLByClass(
  trades: InvestorTrades[],
  data_main: { [key: string]: FactSheetFundDataInDB },
  data_master: { [key: string]: FactSheetFundDataInDB },
  last_date: string
): {
  [className: string]: {
    rlzdpnl: { [date: string]: number };
    finalUnits: number;
    unrlzd: number;
    rlzd: number;
  };
} {
  const result: {
    [className: string]: {
      rlzdpnl: { [date: string]: number };
      unrlzdpnl: { [date: string]: number };
      finalUnits: number;
      unrlzd: number;
      rlzd: number;
    };
  } = {};
  const classPnL: { [className: string]: number } = {};
  const classPosition: { [className: string]: number } = {};
  const classAverageCost: { [className: string]: number } = {};

  // Generate monthly checkpoints from June 2015 until now
  const startDate = new Date(2014, 5, 1); // June 2015
  const endDate = new Date(); // Current date
  const monthlyCheckpoints = generateMonthlyCheckpoints(startDate, endDate);

  // Sort trades by date
  trades.sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

  // Initialize result for each class
  trades.forEach((trade) => {
    const { class_mantra_id: className } = trade;
    if (!result[className]) {
      result[className] = { rlzdpnl: {}, finalUnits: 0, unrlzd: 0, rlzd: 0, unrlzdpnl: {} };
      classPnL[className] = 0;
      classPosition[className] = 0;
      classAverageCost[className] = 0;
    }
  });

  // Initialize PnL for all checkpoints
  Object.keys(result).forEach((className) => {
    monthlyCheckpoints.forEach((checkpoint) => {
      result[className].rlzdpnl[formatDate(checkpoint)] = 0;
      result[className].unrlzdpnl[formatDate(checkpoint)] = 0;
    });
  });

  // Process trades
  monthlyCheckpoints.forEach((checkpoint, index) => {
    const nextCheckpoint = monthlyCheckpoints[index + 1] || new Date(3000, 0, 1); // Far future date

    const tradesInPeriod = trades.filter((trade) => {
      const tradeDate = new Date(trade.trade_date);
      return tradeDate >= checkpoint && tradeDate < nextCheckpoint;
    });

    tradesInPeriod.forEach((trade) => {
      const amount = parseInt(trade.units);
      const price = parseFloat(trade.valuation);
      const sign = parseInt(trade.sign);
      const { class_mantra_id: className } = trade;

      if (sign > 0) {
        // Buy
        classPosition[className] += amount;
        classAverageCost[className] = (classAverageCost[className] * (classPosition[className] - amount) + price * amount) / classPosition[className];
      } else {
        // Sell
        const realizedPnL = amount * (price - classAverageCost[className]);
        classPnL[className] += realizedPnL;
        result[className].rlzd += realizedPnL;
        classPosition[className] -= amount;
      }
      console.log({ className, amount, sign, id: trade.id_trade });
      result[className].finalUnits += amount * sign;
    });

    // Update PnL for this checkpoint
    Object.keys(result).forEach((className) => {
      let shareClassKey = className.includes(" M ") ? className.split(" ")[2].toString().toLowerCase() : className.split(" ")[1].toString().toLowerCase();
      let referenceData = className.includes(" M ") ? data_master : data_main;
      let additional = className.includes(" M ") ? "m" : "";
      result[className].rlzdpnl[formatDate(checkpoint)] = Number(classPnL[className].toFixed(2));
      if (referenceData[formatDate(checkpoint)]) {
        result[className].unrlzdpnl[formatDate(checkpoint)] = classPosition[className] * (referenceData[formatDate(checkpoint)].data[additional + shareClassKey] - Number(classAverageCost[className].toFixed(2)));
      }
    });
  });

  // Calculate unrealized PnL
  for (let shareClass in result) {
    let units = result[shareClass].finalUnits;
    let shareClassKey = shareClass.includes(" M ") ? shareClass.split(" ")[2].toString().toLowerCase() : shareClass.split(" ")[1].toString().toLowerCase();

    let referenceData = shareClass.includes(" M ") ? data_master : data_main;
    let additional = shareClass.includes(" M ") ? "m" : "";
    console.log({ shareclass: additional + shareClassKey, data: referenceData[last_date].data[additional + shareClassKey], classAverageCost });
    result[shareClass].unrlzd = units * (referenceData[last_date].data[additional + shareClassKey] - classAverageCost[shareClass]);
  }

  return result;
}

function generateMonthlyCheckpoints(start: Date, end: Date): Date[] {
  const checkpoints: Date[] = [];
  let current = new Date(start);
  while (current <= end) {
    checkpoints.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return checkpoints;
}

function formatDate(date: Date): string {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  const year = date.getFullYear();
  return `${month.toString().padStart(2, "0")}/${year}`;
}
export async function getMostRecentFactSheetData(collectionName: any) {
  // Connect to MongoDB
  const client = await factsheetPool.connect();
  let psqlFactSheetDBNames: any = {
    "LEGATRUU Index": "bbg_global_aggregate",
    "EMUSTRUU Index": "bbg_em_aggregate",
    "BEUCTRUU Index": "bbg_em_asia",
    "BEUYTRUU Index": "bbg_em_asia_hy",
    "LG30TRUU Index": "bbg_global_hy",
    "FIDITBD LX Equity": "fidelity_global_bond",
    "PIMGLBA ID Equity": "pimco_global_bond",
    "3 Month Treasury": "3_month_treasury",
    Triada: "triada_main",
    "Triada Master": "triada_master",
    "BEBGTRUU Index": "bbg_em_global_hy",
  };
  try {
    const query = `
        SELECT *
        FROM public.factsheet_${psqlFactSheetDBNames[collectionName]}
        WHERE timestamp = (SELECT MAX(timestamp) FROM factsheet_triada_main);
      `;

    const result = await client.query(query, []);
    const report = result.rows[0];
    return report;
  } catch (error) {
    console.error("Failed in bulk operation:", error, collectionName);
  } finally {
    client.release();
  }
}

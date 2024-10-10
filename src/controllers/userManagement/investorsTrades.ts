import { insertEditLogs } from "../operations/logs";
import { investorTradesPool } from "../operations/psql/operation";
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

      const values =  [
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
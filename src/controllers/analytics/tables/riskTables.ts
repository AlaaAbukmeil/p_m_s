import { parsePercentage } from "../../common";
import { AggregatedData, getSectorAssetClass } from "../tools";

export function sumTable({ table, data, view, param, subtotal, subtotalParam }: { table: any; data: any; view: "front office" | "back office" | "exposure"; param: any; subtotal: boolean; subtotalParam: string }) {
    try {
      let dv01DollarValueImpact = parseFloat(data["DV01 Dollar Value Impact"]);
  
      let dv01DollarValueOfNav = parsePercentage(data["DV01 Dollar Value Impact % of Nav"]);
      let dv01DollarValueLimitOfNav = parsePercentage(data["DV01 Dollar Value Impact Limit % of Nav"]);
      let dv01DollarValueLimitUtilization = parsePercentage(data["DV01 Dollar Value Impact Utilization % of Nav"]);
  
      let dv01DollarValueImpactTest = data["DV01 Dollar Value Impact Test"];
      let valueUSDOfNav = parsePercentage(data["Value (BC) % of Nav"]);
      //gmv only for front office
      let valueUSDOfGmv = 0;
      if (view == "front office" || view == "exposure") {
        valueUSDOfGmv = parsePercentage(data["Value (BC) % of GMV"]) || 0;
      }
      let valueUSDLimitOfNav = parsePercentage(data["Value (BC) Limit % of Nav"]);
  
      let valueUSDUtilizationOfNav = parsePercentage(data["Value (BC) Utilization % of Nav"]);
      let valueUSDOfNavTest = data["Value (BC) Test"];
      let capitalGains = parseFloat(data["Capital Gain/ Loss since Inception (Live Position)"]);
      let capitalGainsPercentage = parsePercentage(data["% of Capital Gain/ Loss since Inception (Live Position)"]);
  
      let accruedInterestSinceInception = parseFloat(data["Accrued Int. Since Inception (BC)"]);
      let totalCaptialGains = parseFloat(data["Total Gain/ Loss (USD)"]);
      let totalCaptialGainsPercentage = parsePercentage(data["% of Total Gain/ Loss since Inception (Live Position)"]);
  
      param = param ? param : getSectorAssetClass(data["BB Ticker"], data["Sector"]);
  
      let dayPl;
      let monthPl;
      let usdMarketValue;
      let duration = parseFloat(data["Duration"]);
      let oasSum = parseFloat(data["OAS"]);
      let zSpreadSum = parseFloat(data["Z Spread"]);
      let oasWChangeSum = parseFloat(data["OAS W Change"]);
      let dv01 = parseFloat(data["DV01"]) || 0;
      let notional = parseFloat(data["Notional Amount"]);
      let delta = parsePercentage(data["Day Price Move"]);
      let mtdDelta = parsePercentage(data["MTD Price Move"]);
      let strategy = data["Strategy"];
      let location = data["Location"];
  
      if (view == "front office" || view == "exposure") {
        usdMarketValue = parseFloat(data["USD Market Value"]) || 0;
        dayPl = parseFloat(data["Day P&L (USD)"]);
        monthPl = parseFloat(data["MTD P&L (USD)"]);
      } else {
        usdMarketValue = parseFloat(data["Value (BC)"]) || 0;
        dayPl = parseFloat(data["Day P&L (BC)"]);
        monthPl = parseFloat(data["MTD P&L (BC)"]);
      }
      table[param + " Aggregated"] = table[param + " Aggregated"] ? table[param + " Aggregated"] : new AggregatedData();
      table[param + " Aggregated"].Location = location;
      table[param + " Aggregated"]["DV01"] += dv01;
      table[param + " Aggregated"]["MTD P&L (USD)"] += monthPl;
      table[param + " Aggregated"]["USD Market Value"] += usdMarketValue;
      table[param + " Aggregated"]["Day P&L (USD)"] += dayPl;
      table[param + " Aggregated"]["OAS"] += oasSum;
      table[param + " Aggregated"]["Z Spread"] += zSpreadSum;
      table[param + " Aggregated"]["OAS W Change"] += oasWChangeSum;
  
      table[param + " Aggregated"]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
      table[param + " Aggregated"]["DV01 Dollar Value Impact % of Nav"] += dv01DollarValueOfNav;
      table[param + " Aggregated"]["DV01 Dollar Value Impact Limit % of Nav"] += dv01DollarValueLimitOfNav;
      table[param + " Aggregated"]["DV01 Dollar Value Impact Utilization % of Nav"] += dv01DollarValueLimitUtilization;
  
      if (dv01DollarValueImpactTest == "Fail") {
        table[param + " Aggregated"]["DV01 Dollar Value Impact Test"] = "Fail";
        table[param + " Aggregated"]["DV01 Dollar Value Impact Color Test"] = "#FFAB91"; // : "#FFAB91";
      }
  
      table[param + " Aggregated"]["Value (BC) % of Nav"] += Math.round(valueUSDOfNav * 100) / 100;
      table[param + " Aggregated"]["Value (BC) % of GMV"] += Math.round(valueUSDOfGmv * 100) / 100;
      table[param + " Aggregated"]["Value (BC) Limit % of Nav"] += valueUSDLimitOfNav;
  
      table[param + " Aggregated"]["Value (BC) Utilization % of Nav"] += valueUSDUtilizationOfNav;
      if (valueUSDOfNavTest == "Fail") {
        table[param + " Aggregated"]["Value (BC) Test"] = "Fail";
        table[param + " Aggregated"]["Value (BC) Color Test"] = "#FFAB91";
      }
      table[param + " Aggregated"]["Capital Gain/ Loss since Inception (Live Position)"] += capitalGains;
      table[param + " Aggregated"]["% of Capital Gain/ Loss since Inception (Live Position)"] += capitalGainsPercentage;
  
      table[param + " Aggregated"]["Accrued Int. Since Inception (BC)"] += accruedInterestSinceInception;
      table[param + " Aggregated"]["Total Gain/ Loss (USD)"] += totalCaptialGains;
      table[param + " Aggregated"]["% of Total Gain/ Loss since Inception (Live Position)"] += totalCaptialGainsPercentage;
      table[param + " Aggregated"]["Notional Amount"] += notional;
      table[param + " Aggregated"]["Day Price Move"] += delta;
      table[param + " Aggregated"]["MTD Price Move"] += mtdDelta;
  
      table["Total"] = table["Total"] ? table["Total"] : new AggregatedData();
      table["Total"]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
      table["Total"]["DV01 Dollar Value Impact % of Nav"] += dv01DollarValueOfNav;
      table["Total"]["DV01 Dollar Value Impact Limit % of Nav"] += dv01DollarValueLimitOfNav;
      table["Total"]["DV01 Dollar Value Impact Utilization % of Nav"] += dv01DollarValueLimitUtilization;
  
      if (dv01DollarValueImpactTest == "Fail") {
        table["Total"]["DV01 Dollar Value Impact Test"] = "Fail";
        table["Total"]["DV01 Dollar Value Impact Color Test"] = "#FFAB91"; // : "#FFAB91";
      }
  
      table["Total"]["Value (BC) % of Nav"] += valueUSDOfNav;
      table["Total"]["Value (BC) % of GMV"] += valueUSDOfGmv;
      table["Total"]["Value (BC) Limit % of Nav"] += valueUSDLimitOfNav;
  
      table["Total"]["Value (BC) Utilization % of Nav"] += valueUSDUtilizationOfNav;
      if (valueUSDOfNavTest == "Fail") {
        table["Total"]["Value (BC) Test"] = "Fail";
        table["Total"]["Value (BC) Color Test"] = "#FFAB91";
      }
      table["Total"]["Capital Gain/ Loss since Inception (Live Position)"] += capitalGains;
      table["Total"]["% of Capital Gain/ Loss since Inception (Live Position)"] += capitalGainsPercentage;
  
      table["Total"]["Accrued Int. Since Inception (BC)"] += accruedInterestSinceInception;
      table["Total"]["Total Gain/ Loss (USD)"] += totalCaptialGains;
      table["Total"]["% of Total Gain/ Loss since Inception (Live Position)"] += totalCaptialGainsPercentage;
      table["Total"]["Notional Amount"] += notional;
  
      table["Total"]["DV01"] += dv01;
      table["Total"]["MTD P&L (USD)"] += monthPl;
      table["Total"]["Day P&L (USD)"] += dayPl;
      table["Total"]["USD Market Value"] += usdMarketValue;
      table["Total"]["OAS"] += oasSum;
      table["Total"]["Z Spread"] += zSpreadSum;
      table["Total"]["OAS"] += oasWChangeSum;
      table["Total"]["Day Price Move"] += delta;
      table["Total"]["MTD Price Move"] += mtdDelta;
  
      if (subtotal) {
        table[subtotalParam] = table[subtotalParam] ? table[subtotalParam] : new AggregatedData();
  
        table[subtotalParam][strategy] = table[subtotalParam][strategy] ? table[subtotalParam][strategy] : new AggregatedData();
        table[subtotalParam]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
  
        table[subtotalParam]["DV01 Dollar Value Impact % of Nav"] += Math.round(dv01DollarValueOfNav * 100) / 100 || 0;
        table[subtotalParam]["DV01 Dollar Value Impact Limit % of Nav"] += dv01DollarValueLimitOfNav;
        table[subtotalParam]["DV01 Dollar Value Impact Utilization % of Nav"] += dv01DollarValueLimitUtilization;
  
        table[subtotalParam]["Value (BC) % of Nav"] += Math.round(valueUSDOfNav * 100) / 100 || 0;
        table[subtotalParam]["Value (BC) % of GMV"] += Math.round(valueUSDOfGmv * 100) / 100 || 0;
        table[subtotalParam]["Value (BC) Limit % of Nav"] += valueUSDLimitOfNav;
  
        table[subtotalParam]["Value (BC) Utilization % of Nav"] += valueUSDUtilizationOfNav;
  
        table[subtotalParam]["Capital Gain/ Loss since Inception (Live Position)"] += capitalGains;
        table[subtotalParam]["% of Capital Gain/ Loss since Inception (Live Position)"] += Math.round(capitalGainsPercentage * 100) / 100 || 0;
  
        table[subtotalParam]["Accrued Int. Since Inception (BC)"] += accruedInterestSinceInception;
        table[subtotalParam]["Total Gain/ Loss (USD)"] += totalCaptialGains;
        table[subtotalParam]["% of Total Gain/ Loss since Inception (Live Position)"] += Math.round(totalCaptialGainsPercentage * 100) / 100 || 0;
        table[subtotalParam]["Notional Amount"] += notional;
        table[subtotalParam]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
        table[subtotalParam]["USD Market Value"] += usdMarketValue;
        table[subtotalParam]["Duration"] = duration;
  
        table[subtotalParam]["DV01"] += dv01;
        table[subtotalParam]["MTD P&L (USD)"] += monthPl;
        table[subtotalParam]["Day P&L (USD)"] += dayPl;
        table[subtotalParam]["USD Market Value"] += usdMarketValue;
        table[subtotalParam]["OAS"] += oasSum;
        table[subtotalParam]["Z Spread"] += zSpreadSum;
        table[subtotalParam]["OAS W Change"] += oasWChangeSum;
        table[subtotalParam]["L/S"] = subtotalParam;
  
        ///
        table[subtotalParam][strategy]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
        table[subtotalParam][strategy]["DV01 Dollar Value Impact % of Nav"] += dv01DollarValueOfNav;
        table[subtotalParam][strategy]["DV01 Dollar Value Impact Limit % of Nav"] += dv01DollarValueLimitOfNav;
        table[subtotalParam][strategy]["DV01 Dollar Value Impact Utilization % of Nav"] += dv01DollarValueLimitUtilization;
  
        table[subtotalParam][strategy]["Value (BC) % of Nav"] += Math.round(valueUSDOfNav * 100) / 100 || 0;
        table[subtotalParam][strategy]["Value (BC) % of GMV"] += Math.round(valueUSDOfGmv * 100) / 100 || 0;
        table[subtotalParam][strategy]["Value (BC) Limit % of Nav"] += valueUSDLimitOfNav;
  
        table[subtotalParam][strategy]["Value (BC) Utilization % of Nav"] += valueUSDUtilizationOfNav;
  
        table[subtotalParam][strategy]["Capital Gain/ Loss since Inception (Live Position)"] += capitalGains;
        table[subtotalParam][strategy]["% of Capital Gain/ Loss since Inception (Live Position)"] += Math.round(capitalGainsPercentage * 100) / 100 || 0;
  
        table[subtotalParam][strategy]["Accrued Int. Since Inception (BC)"] += accruedInterestSinceInception;
        table[subtotalParam][strategy]["Total Gain/ Loss (USD)"] += totalCaptialGains;
        table[subtotalParam][strategy]["% of Total Gain/ Loss since Inception (Live Position)"] += Math.round(totalCaptialGainsPercentage * 100) / 100 || 0;
        table[subtotalParam][strategy]["Notional Amount"] += notional;
        table[subtotalParam][strategy]["DV01 Dollar Value Impact"] += dv01DollarValueImpact;
        table[subtotalParam][strategy]["USD Market Value"] += usdMarketValue;
        table[subtotalParam][strategy]["Duration"] = duration;
  
        table[subtotalParam][strategy]["DV01"] += dv01;
        table[subtotalParam][strategy]["MTD P&L (USD)"] += monthPl;
        table[subtotalParam][strategy]["Day P&L (USD)"] += dayPl;
        table[subtotalParam][strategy]["USD Market Value"] += usdMarketValue;
        table[subtotalParam][strategy]["OAS"] += oasSum;
        table[subtotalParam][strategy]["Z Spread"] += zSpreadSum;
        table[subtotalParam][strategy]["OAS W Change"] += oasWChangeSum;
        table[subtotalParam][strategy]["L/S"] = strategy;
  
        table[param] = table[param] ? table[param] : {};
        table[param][subtotalParam] = table[param][subtotalParam] ? table[param][subtotalParam] : {};
        table[param][subtotalParam][strategy] = table[param][subtotalParam][strategy] ? table[param][subtotalParam][strategy] : [];
        table[param][subtotalParam][strategy].push(data);
      } else {
        table[param] = table[param] ? table[param] : [];
        table[param].push(data);
      }
    } catch (error) {
      console.log(error);
    }
  }
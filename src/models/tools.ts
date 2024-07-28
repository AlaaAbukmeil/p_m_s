export interface NavBreakdown {
  [key: string]: {
    notional: number;
    percentage: number;
  };
}
export interface AggregatedData {
  "Day P&L (USD)": number;
  "MTD P&L (USD)": number;
  "DV01": number;
  "CR01": number;

  "USD Market Value": number;
  "OAS": number;
  "Z Spread": number;
  "OAS W Change": number;
  "DV01 Dollar Value Impact": number;
  "DV01 Dollar Value Impact % of Nav": number;
  "DV01 Dollar Value Impact Limit % of Nav": number;
  "DV01 Dollar Value Impact Utilization % of Nav": number;
  "DV01 Dollar Value Impact Test": string;

  "CR01 Dollar Value Impact": number;
  "CR01 Dollar Value Impact % of Nav": number;
  "CR01 Dollar Value Impact Limit % of Nav": number;
  "CR01 Dollar Value Impact Utilization % of Nav": number;
  "CR01 Dollar Value Impact Test": string;

  "Value (BC) % of Nav": number;
  "Value (BC) % of GMV": number;
  "Value (BC) Limit % of Nav": number;

  "Value (BC) Utilization % of Nav": number;

  "Value (BC) Test": string;
  "Capital Gain/ Loss since Inception (Live Position)": number;
  "% of Capital Gain/ Loss since Inception (Live Position)": number;
  "Accrued Int. Since Inception (BC)": number;
  "Total Gain/ Loss (USD)": number;
  "% of Total Gain/ Loss since Inception (Live Position)": number;
  "Notional Amount": number;
}

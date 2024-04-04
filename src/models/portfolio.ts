import { ObjectId } from "mongodb";

export interface RlzdTrades {
  price: number;
  quantity: number;
}

export interface FundDetails {
  _id: ObjectId;
  month: string;
  nav: string;
  holdBackRatio: string;
}

export interface PositionBeforeFormatting {
  _id: ObjectId;
  Location: string;
  ISIN: string;
  Ask: number;
  "Average Cost": number;
  "BB Ticker": string;
  "BBG Composite Rating": string;
  Bid: number;
  "Bloomberg ID": string;
  Broker: string;
  CUSIP: string;
  "Call Date": string;
  "Cost MTD Ptf": Record<string, number>;
  Country: string;
  "Coupon Rate": number;
  Currency: string;
  DV01: number;
  "Day Rlzd": number;
  "Day Rlzd K G/L": Record<string, number>;
  "Edit Note": string;
  "Entry Price": number;
  "Entry Yield": any;
  "Event Type": string;
  "FX Rate": any;
  "Fitch Bond Rating": string;
  "Fitch Outlook": string;
  Group: string;
  Interest: Record<string, number>;
  Issue: string;
  Issuer: string;
  "Last Individual Upload Trade": Date;
  "Last Modified Date": Date;
  "Last Price Update": Date;
  "Last Upload Trade": Date;
  "Last edit operation": Date;
  "Last recalculate trades": Date;
  "MTD Rlzd": number;
  Maturity: string;
  Mid: number;
  "Moddy's Outlook": string | null;
  "Modified Duration": number;
  "Monthly Capital Gains Rlzd": Record<string, number>;
  "Moody's Bond Rating": string;
  "Moody's Outlook": string;
  Net: number;
  "Notional Amount": number;
  OAS: number;
  "Original Face": number;
  Quantity: number;
  "S&P Bond Rating": string;
  "S&P Outlook": string;
  Sector: string;
  Strategy: string;
  Type: string;
  YTM: number;
  YTW: number;
  "Year Rlzd": Record<string, Array<any>>;
  "Z Spread": number;
  date: Date;
  "Previous FX": any;
  "Previous Mark": number;
  Notes: string;
  "MTD Mark": number;
  "MTD FX": number;
  "YTD Mark": number;
  "YTD FX": number;
  "MTD URlzd": number;
  "MTD Int.": number;
  "Day URlzd": number;
  "Day Int.": number;
  "YTD URlzd": number;
  "Coupon Duration": number;
  "YTD Int.": number;
  "YTD Rlzd": number;
  "MTD Rlzd DC": Record<string, Array<any>>;
  "Cost MTD": number;
  "Day P&L": number;
  "MTD P&L": number;
  "YTD P&L": number;
  holdPortfXrate: string;
  "Rating Class": string;
  "Asset Class": string;
  "YTD Rate": any;
  Delta: string;
  "MTD Delta": string;
  Gamma: string;
}

export interface PositionGeneralFormat extends PositionBeforeFormatting {
  "Cost (BC)": number;
  "Value (LC)": number;
  "Value (BC)": number;
  YTM: any;
  YTW: any;
  "Day P&L FX": number;
  "MTD P&L FX": number;
  "YTD P&L FX": number;
  "MTD Int. (LC)": number;
  "MTD Rlzd (LC)": number;
  "MTD URlzd (LC)": number;
  "MTD P&L (LC)": number;
  "MTD Int. (BC)": number;
  "MTD Rlzd (BC)": number;
  "MTD URlzd (BC)": number;
  "MTD P&L (BC)": number;
  "YTD Int. (LC)": number;
  "YTD Rlzd (LC)": number;
  "YTD URlzd (LC)": number;
  "YTD P&L (LC)": number;
  "YTD Int. (BC)": number;
  "YTD Rlzd (BC)": number;
  "YTD URlzd (BC)": number;
  "YTD P&L (BC)": number;
  "Cost MTD (LC)": number;
  "Day Int. (LC)": number;
  "Day Rlzd (LC)": number;
  "Day URlzd (LC)": number;
  "Day P&L (LC)": number;
  "Day Int. (BC)": number;
  "Day Rlzd (BC)": number;
  "Day URlzd (BC)": number;
  "Day P&L (BC)": number;
  "L/S": string;
  Duration: string;
  "USD Market Value": string;
  Margin: string;
  "OAS W Change": number;
  "Spread Change": string;
  "DV01 Dollar Value Impact": number;
  "DV01 Dollar Value Impact % of Nav": string;
  "DV01 Dollar Value Impact Limit % of Nav": string;
  "DV01 Dollar Value Impact Utilization % of Nav": string;
  "DV01 Dollar Value Impact Color Test": string;
  "Borrow Capacity": number;
  "Value (BC) % of Nav": string;

  "Value (BC) Limit % of Nav": string;
  "Value (BC) Utilization % of Nav": string;

  "Value (BC) Test": string;
  "Value (BC) Color Test": string;
  "DV01 Dollar Value Impact Test": string;
  "Capital Gain/ Loss since Inception (Live Position)": number;
  "% of Capital Gain/ Loss since Inception (Live Position)": string;
  "Accrued Int. Since Inception (BC)": number;

  "Total Gain/ Loss (USD)": number;
  "% of Total Gain/ Loss since Inception (Live Position)": string;
  "Cost (LC)": number;
  "Coupon Rate": any;
  "Last Day Since Realizd": string | null;
  "Base Margin": string;
}

export interface FundMTD {
  nav: number;
  holdbackRatio: number;
  mtdGross: number;
  mtdpl: number;
  mtdrlzd: number;
  mtdurlzd: number;
  mtdint: number;
  mtdfx: number;
  mtdintPercentage: number;
  mtdFXGross: number;

  ytdGross: number;
  ytdpl: number;
  ytdrlzd: number;
  ytdurlzd: number;
  ytdint: number;
  ytdfx: number;
  ytdintPercentage: number;
  ytdFXGross: number;

  dayGross: number;
  dayFXGross: number;
  dayint: number;
  dayintPercentage: number;
  daypl: number;
  dayfx: number;
  dayurlzd: number;
  dayrlzd: number;
  dv01Sum: number;
  lmv: number;
  smv: number;
  gmv: number;
  nmv: number;
  lmvOfNav: number;
  smvOfNav: number;
  gmvOfNav: number;
  nmvOfNav: number;
}

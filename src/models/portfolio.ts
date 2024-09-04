import { ObjectId } from "mongodb";
import { NavBreakdown } from "./tools";
import { AggregatedData } from "../controllers/analytics/tools";

export interface RlzdTrades {
  price: string;
  quantity: string;
}

export interface FundDetails {
  month: string;
  nav: number;
  expenses: number;
  holdBackRatio: number;
  "borrowing amount": number;
  "share price": number;
}

export interface FundDetailsInDB {
  id: string;
  portfolio_id: string;
  share_price: number;
  borrowing_amount: number;
  month: string;
  nav: number;
  expenses: number;

  holdback_ratio: number;
  timestamp: number;
}

export interface PositionInDB {
  portfolio_id: string;
  portfolio_snapshot_time: string;
  id: string;
  Type: string;
  Location: string;
  ISIN: string;
  CUSIP: string;
  "Bloomberg ID": string;

  Bid: number;
  Mid: number;
  Ask: number;
  "Bloomberg Mid BGN": number;

  "Notional Amount": number;

  "Average Cost": number;

  "BB Ticker": string;

  CR01: number;
  DV01: number;

  Broker: string;
  "Call Date": string;
  Country: string;
  "Coupon Rate": number;
  Currency: string;
  "Entry Price": { [key: string]: number };
  "Entry Yield": number;
  "FX Rate": number;
  "Fitch Bond Rating": string;
  "Fitch Outlook": string;
  Interest: { [key: string]: number };
  Issuer: string;
  "Last Price Update": number;
  "Last Upload Trade": number;
  Maturity: string;

  "Moddy's Outlook": string;
  "Moody's Bond Rating": string;
  "Moody's Outlook": string;
  "BBG Composite Rating": string;
  "S&P Bond Rating": string;
  "S&P Outlook": string;

  OAS: number;
  "Original Face": number;

  Sector: string;
  Strategy: string;

  YTM: number;
  YTW: number;

  "Z Spread": number;

  Notes: string;
  "Coupon Duration": number;
  "Asset Class": string;

  Pin: string;

  "Issuer's Country": string;
  "Coupon Frequency": string;
  "Previous Settle Date": string;
  "Next Settle Date": string;
  "Cost MTD": { [key: string]: number };

  "Security Description": string;
}

// TypeScript interface for the transformed data structure
export interface PositionInSQLDB {
  id: string;
  type: string;
  portfolio_id: string;
  portfolio_snapshot_time: string;
  location: string;
  isin: string;
  cusip: string;
  bloomberg_id: string;
  bid: number;
  mid: number;
  ask: number;
  bloomberg_mid_bgn: number;
  notional_amount: number;
  average_cost: number;
  bb_ticker: string;
  cr01: number;
  dv01: number;
  broker: string;
  call_date: string;
  country: string;
  coupon_rate: number;
  currency: string;
  entry_price: { [key: string]: number }; // JSON string of object
  entry_yield: number;
  fx_rate: number;
  fitch_bond_rating: string;
  fitch_outlook: string;
  interest: { [key: string]: number }; // JSON string of object
  issuer: string;
  last_price_update: number; // ISO string of Date
  last_upload_trade: number; // ISO string of Date
  maturity: string;
  moddys_outlook: string;
  moodys_bond_rating: string;
  moodys_outlook: string;
  bbg_composite_rating: string;
  sp_bond_rating: string;
  sp_outlook: string;
  oas: number;
  original_face: number;
  sector: string;
  strategy: string;
  ytm: number;
  ytw: number;
  z_spread: number;
  notes: string;
  coupon_duration: number;
  asset_class: string;
  pin: string;
  issuers_country: string;
  coupon_frequency: string;
  previous_settle_date: string;
  next_settle_date: string;
  cost_mtd: { [key: string]: number }; // JSON string of object
  security_description: string;
}

export interface PositionBeforeFormatting extends PositionInDB {
  "Day Price Move": number;
  "3-Day Price Move": number;
  Type: string;
  "Previous Mark": number;
  "Previous FX": number;
}

export interface PositionGeneralFormat extends PositionBeforeFormatting {
  "Cost (BC)": string;
  "Value (LC)": string;
  "Value (BC)": string;
  YTM: any;
  YTW: any;
  "Day P&L FX": string;
  "MTD P&L FX": string;
  "YTD P&L FX": string;
  "MTD Int. (LC)": string;
  "MTD Rlzd (LC)": string;
  "MTD URlzd (LC)": string;
  "MTD P&L (LC)": string;
  "MTD Int. (BC)": string;
  "MTD Rlzd (BC)": string;
  "MTD URlzd (BC)": string;
  "MTD P&L (BC)": string;
  "YTD Int. (LC)": string;
  "YTD Rlzd (LC)": string;
  "YTD URlzd (LC)": string;
  "YTD P&L (LC)": string;
  "YTD Int. (BC)": string;
  "YTD Rlzd (BC)": string;
  "YTD URlzd (BC)": string;
  "YTD P&L (BC)": string;
  "Cost MTD (LC)": string;
  "Day Int. (LC)": string;
  "Day Rlzd (LC)": string;
  "Day URlzd (LC)": string;
  "Day P&L (LC)": string;
  "Day Int. (BC)": string;
  "Day Rlzd (BC)": string;
  "Day URlzd (BC)": string;
  "Day P&L (BC)": string;
  "L/S": string;
  Duration: string;
  "USD Market Value": string;
  LTV: string;
  "OAS W Change": string;
  "Spread Change": string;
  "DV01 Dollar Value Impact": string;
  "DV01 Dollar Value Impact % of Nav": string;
  "DV01 Dollar Value Impact Limit % of Nav": string;
  "DV01 Dollar Value Impact Utilization % of Nav": string;
  "DV01 Dollar Value Impact Test Color": string;
  "Borrow Capacity": number;
  "Value (BC) % of Nav": string;

  "Value (BC) Limit % of Nav": string;
  "Value (BC) Utilization % of Nav": string;

  "Value (BC) Test": string;
  "Value (BC) Test Color": string;
  "DV01 Dollar Value Impact Test": string;
  "Capital Gain/ Loss since Inception (Live Position)": string;
  "% of Capital Gain/ Loss since Inception (Live Position)": string;
  "Accrued Int. Since Inception (BC)": string;

  "Total Gain/ Loss (USD)": string;
  "% of Total Gain/ Loss since Inception (Live Position)": string;
  "Cost (LC)": string;
  "Coupon Rate": any;
  "Last Day Since Realizd": string | null;
  "Base LTV": string;
  "Duration Bucket": "0 To 2" | "2 To 5" | "5 To 10" | "10 To 30" | "> 30";
}

export interface FundMTD {
  nav: number;
  holdbackRatio: number;
  mtdplPercentage: string;
  mtdpl: number;
  mtdrlzd: number;
  mtdurlzd: number;
  mtdint: number;
  mtdfx: number;
  mtdintPercentage: number;
  mtdFXGross: number;

  ytdNet: number;
  ytdint: number;
  ytdintPercentage: number;

  dayplPercentage: number;
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
export interface FundExposureOnlyMTD {
  nav: number;

  lmv: number;
  smv: number;
  gmv: number;
  nmv: number;
}

export interface FinalPositionBackOffice {
  Issuer: string;
  "Issuer's Country": string;
  "Last Price Update": string; // ISO 8601 date string
  "Last Upload Trade": string; // ISO 8601 date string
  "MTD Rlzd": number;
  Maturity: number;
  Mid: number;
  "Moody's Bond Rating": string;
  "Moody's Outlook": string;
  Net: number;
  "Notional Amount": number;
  OAS: number;
  "Original Face": number;
  "S&P Bond Rating": string;
  "S&P Outlook": string;
  Sector: string;
  YTM: string;
  YTW: string;
  "Z Spread": number;
  Notes: string;
  "Coupon Duration": number;
  "YTD Int.": number;
  "Previous FX": number;
  "Previous Mark": number;
  Type: string;
  Strategy: string;
  "Asset Class": string;
  "Day Price Move": number;
  "3-Day Price Move": number;
  "MTD Mark": number;
  "Average Cost MTD": number;
  "MTD URlzd": number;
  "MTD Price Move": number;
  "MTD Int.": number;
  Principal: number;
  "Day URlzd": number;
  "Day Int.": number;
  "30-Day Int. EST": number;
  "365-Day Int. EST": number;
  "Day P&L": number;
  "MTD P&L": number;
  "YTD P&L": number;
  Pin: string;
  Quantity: number;
  "Cost (BC)": number;
  "Value (LC)": number;
  "Value (BC)": number;
  "USD Market Value": number;
  "Day P&L FX": number;
  "MTD P&L FX": number;
  "MTD FX": number;
  "MTD Int. (LC)": number;
  "MTD Rlzd (LC)": number;
  "MTD URlzd (LC)": number;
  "MTD P&L (LC)": number;
  "MTD Int. (BC)": number;
  "MTD Int. (USD)": number;
  "MTD Rlzd (BC)": number;
  "MTD URlzd (BC)": number;
  "MTD P&L (BC)": number;
  "YTD Int. (LC)": number;
  "YTD Int. (BC)": number;
  "YTD Int. (USD)": number;
  "Cost (LC)": number;
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
  Duration: number;
  "Duration Bucket": string;
  "Base LTV": string;
  "OAS W Change": number;
  "Spread Change": number;
  "DV01 Dollar Value Impact": number;
  "DV01 Dollar Value Impact % of Nav": string;
  "DV01 Dollar Value Impact Limit % of Nav": string;
  "DV01 Dollar Value Impact Utilization % of Nav": string;
  "DV01 Dollar Value Impact Test": string;
  "DV01 Dollar Value Impact Test Color": string;
  "Value (BC) % of Nav": string;
  "Value (BC) Limit % of Nav": string;
  "Value (BC) Utilization % of Nav": string;
  "Value (BC) Test": string;
  "Value (BC) Test Color": string;
  "Capital Gain/ Loss since Inception (Live Position)": number;
  "% of Capital Gain/ Loss since Inception (Live Position)": string;
  "Accrued Int. Since Inception (BC)": number;
  "Total Gain/ Loss (USD)": number;
  "% of Total Gain/ Loss since Inception (Live Position)": string;
  "Rate Sensitivity": string;
  "MTD Notional": number;
  "Rating Score": string;
  "Last Day Since Realizd": string | null;
  Region: string;
  "Market Type": string;
  "CR01 Dollar Value Impact": number;
  "CR01 Dollar Value Impact % of Nav": string;
  "CR01 Dollar Value Impact Limit % of Nav": string;
  "CR01 Dollar Value Impact Utilization % of Nav": string;
  "CR01 Dollar Value Impact Test": string;
  "CR01 Dollar Value Impact Test Color": string;
  Color: string;
  LTV: string;
  "Borrow Capacity": number;
}

export interface Capacity {
  amount: number;
  amountHY: number;
  amountIG: number;
}

export interface Analysis {
  portfolio: FinalPositionBackOffice[];
  duration: { "0 To 2": { durationSum: number; dv01Sum: number }; "2 To 5": { durationSum: number; dv01Sum: number }; "5 To 10": { durationSum: number; dv01Sum: number }; "10 To 30": { durationSum: number; dv01Sum: number }; "> 30": { durationSum: number; dv01Sum: number }; Total: { durationSum: number; dv01Sum: number } };

  issuerInformation: {
    [key: string]: { rating: string; country: string };
  };
  capacity: Capacity;

  countryNAVPercentage: NavBreakdown;
  sectorNAVPercentage: NavBreakdown;
  strategyNAVPercentage: NavBreakdown;
  issuerNAVPercentage: NavBreakdown;
  ratingNAVPercentage: NavBreakdown;
  regionNAVPercentage: NavBreakdown;
  marketTypeNAVPercentage: NavBreakdown;
  assetClassNAVPercentage: NavBreakdown;

  countryGMVPercentage: NavBreakdown;
  sectorGMVPercentage: NavBreakdown;
  strategyGMVPercentage: NavBreakdown;
  issuerGMVPercentage: NavBreakdown;
  ratingGMVPercentage: NavBreakdown;
  regionGMVPercentage: NavBreakdown;
  marketTypeGMVPercentage: NavBreakdown;
  assetClassGMVPercentage: NavBreakdown;

  countryLMVPercentage: NavBreakdown;
  sectorLMVPercentage: NavBreakdown;
  strategyLMVPercentage: NavBreakdown;
  issuerLMVPercentage: NavBreakdown;
  ratingLMVPercentage: NavBreakdown;
  regionLMVPercentage: NavBreakdown;
  marketTypeLMVPercentage: NavBreakdown;
  assetClassLMVPercentage: NavBreakdown;

  topWorstPerformaners: {
    top5Day: any;
    worst5Day: any;
    top5MTD: any;
    worst5MTD: any;
  };

  longShort: { Long: { dv01Sum: number; intSum: number }; Short: { dv01Sum: number; intSum: number }; Total: { dv01Sum: number; intSum: number } };
  ustTable: {
    "0 To 2": { [key: string]: AggregatedData };
    "0 To 2 Aggregated": AggregatedData;
    "2 To 5": { [key: string]: AggregatedData };
    "2 To 5 Aggregated": AggregatedData;
    "5 To 10": { [key: string]: AggregatedData };
    "5 To 10 Aggregated": AggregatedData;
    "10 To 30": { [key: string]: AggregatedData };
    "10 To 30 Aggregated": AggregatedData;
    "> 30": { [key: string]: AggregatedData };
    "> 30 Aggregated": AggregatedData;
    Total: AggregatedData;
  };
  igTable: { Bonds: FinalPositionBackOffice[]; "Bonds Aggregated": AggregatedData; "FINS Perps": FinalPositionBackOffice[]; "FINS Perps Aggregated": AggregatedData; "Corps Perps": FinalPositionBackOffice[]; "Corps Perps Aggregated": AggregatedData; Total: AggregatedData };
  hyTable: { Bonds: FinalPositionBackOffice[]; "Bonds Aggregated": AggregatedData; "FINS Perps": FinalPositionBackOffice[]; "FINS Perps Aggregated": AggregatedData; "Corps Perps": FinalPositionBackOffice[]; "Corps Perps Aggregated": AggregatedData; Total: AggregatedData };

  currTable: {
    [key: string]: AggregatedData;
    Total: AggregatedData;
  };
  issuerTable: {
    [key: string]: AggregatedData;
    Total: AggregatedData;
  };
  rvPairTable: {
    [key: string]: AggregatedData;
    Total: AggregatedData;
  };
  currencies: {
    [key: string]: AggregatedData;
    Total: AggregatedData;
  };
  ustTableByCoupon: {
    [key: string]: AggregatedData;
    Total: AggregatedData;
  };
  tickerTable: { [key: string]: "" };
  globalHedgeTable: {
    [key: string]: AggregatedData;
    Total: AggregatedData;
  };
}

export interface Indexing {
  portfolio_id: string;
  portfolio_document_ids: { timestamp: number; name: string }[];
}

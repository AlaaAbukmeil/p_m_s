import { ObjectId } from "mongodb";
import { NavBreakdown } from "./tools";
import { AggregatedData } from "../controllers/analytics/tools";

export interface RlzdTrades {
  price: string;
  quantity: string;
}

export interface FundDetails {
  _id: ObjectId;
  month: string;
  nav: string;
  holdBackRatio: string;
  "3 month treasury rate": string;
}

export interface PositionInDB {
  _id: ObjectId;
  Location: string;
  ISIN: string;
  Ask: string;
  "Average Cost": string;
  "BB Ticker": string;
  "BBG Composite Rating": string;
  Bid: string;
  "Bloomberg ID": string;
  Broker: string;
  CUSIP: string;
  "Call Date": string;
  Country: string;
  "Coupon Rate": string;
  Currency: string;
  DV01: string;
  "Entry Price": any;
  "Entry Yield": any;
  "FX Rate": any;
  "Fitch Bond Rating": string;
  "Fitch Outlook": string;
  Group: string;
  Interest: { [key: string]: string };
  Issue: string;
  Issuer: string;
  "Last Individual Upload Trade": Date;
  "Last Modified Date": Date;
  "Last Price Update": Date;
  "Last Upload Trade": Date;
  "Last edit operation": Date;
  "Last recalculate trades": Date;
  "MTD Rlzd": string;
  Maturity: string;
  Mid: string;
  "Moddy's Outlook": string | null;
  "Modified Duration": string;
  "Monthly Capital Gains Rlzd": Record<string, string>;
  "Moody's Bond Rating": string;
  "Moody's Outlook": string;
  Net: string;
  "Notional Amount": string;
  OAS: string;
  "Original Face": string;
  Quantity: string;
  "S&P Bond Rating": string;
  "S&P Outlook": string;
  Sector: string;
  Strategy: string;
  Type: string;
  YTM: string;
  YTW: string;
  "Z Spread": string;
  "Previous FX": any;
  "Previous Mark": string;
  Notes: string;
  "MTD Mark": string;
  "MTD FX": string;
  "YTD FX": string;
  "MTD URlzd": string;
  "MTD Int.": string;
  "Day URlzd": string;
  "Day Int.": string;
  "YTD URlzd": string;
  "Coupon Duration": string;
  "YTD Int.": string;
  "YTD Rlzd": string;
  "MTD Rlzd DC": Record<string, Array<any>>;
  "Cost MTD": any;
  "Day P&L": string;
  "MTD P&L": string;
  "YTD P&L": string;
  holdPortfXrate: string;
  "Rating Class": string;
  "Asset Class": string;
  Pin: string;
  CR01: string;
  "Issuer's Country": string;
  "Coupon Frequency": string;
  "Previous Settle Date": string;
  "Next Settle Date": string;
  "Security Description": string;
  "Bloomberg Mid BGN": number;
}

export interface PositionBeforeFormatting extends PositionInDB {
  _id: ObjectId;
  Location: string;
  ISIN: string;
  Ask: string;
  "Average Cost": string;
  "BB Ticker": string;
  "BBG Composite Rating": string;
  Bid: string;
  "Bloomberg ID": string;
  Broker: string;
  CUSIP: string;
  "Call Date": string;
  Country: string;
  "Coupon Rate": string;
  Currency: string;
  DV01: string;
  "Day Rlzd": string;
  "Day Rlzd K G/L": Record<string, string>;
  "Edit Note": string;
  "Entry Price": any;
  "Entry Yield": any;
  "Event Type": string;
  "FX Rate": any;
  "Fitch Bond Rating": string;
  "Fitch Outlook": string;
  Group: string;
  Interest: Record<string, string>;
  Issue: string;
  Issuer: string;
  "Last Individual Upload Trade": Date;
  "Last Modified Date": Date;
  "Last Price Update": Date;
  "Last Upload Trade": Date;
  "Last edit operation": Date;
  "Last recalculate trades": Date;
  "MTD Rlzd": string;
  Maturity: string;
  Mid: string;
  "Moddy's Outlook": string | null;
  "Modified Duration": string;
  "Monthly Capital Gains Rlzd": Record<string, string>;
  "Moody's Bond Rating": string;
  "Moody's Outlook": string;
  Net: string;
  "Notional Amount": string;
  OAS: string;
  "Original Face": string;
  Quantity: string;
  "S&P Bond Rating": string;
  "S&P Outlook": string;
  Sector: string;
  Strategy: string;
  Type: string;
  YTM: string;
  YTW: string;
  "Year Rlzd": Record<string, Array<any>>;
  "Z Spread": string;
  date: Date;
  "Previous FX": any;
  "Previous Mark": string;
  Notes: string;
  "MTD Mark": string;
  "MTD FX": string;
  "YTD FX": string;
  "MTD URlzd": string;
  "MTD Int.": string;
  "Day URlzd": string;
  "Day Int.": string;
  "YTD URlzd": string;
  "Coupon Duration": string;
  "YTD Int.": string;
  "YTD Rlzd": string;
  "MTD Rlzd DC": Record<string, Array<any>>;
  "Cost MTD": any;
  "Day P&L": string;
  "MTD P&L": string;
  "YTD P&L": string;
  holdPortfXrate: string;
  "Rating Class": string;
  "Asset Class": string;
  "YTD Rate": any;
  "Day Price Move": number;
  "MTD Price Move": string;
  Pin: string;
  "3-Day Price Move": number;
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
  "3 month treasury rate": string;
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
  "Last Individual Upload Trade": string; // ISO 8601 date string
  "Last Modified Date": string; // ISO 8601 date string
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
}

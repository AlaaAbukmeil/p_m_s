import { ObjectId } from "mongodb";

export interface Position {
  _id: ObjectId;
  Location: string;
  ISIN: string;
  Ask: number;
  "Asset Class": string;
  "Average Cost": number;
  Duration: string;
  "BB Ticker": string;
  "BBG Composite Rating": string;
  Bid: number;
  "Bloomberg ID": string;
  Broker: string;
  CUSIP: string;
  "Call Date": string;
  Country: string;
  "Coupon Duration": number;
  "Coupon Rate": number;
  Currency: string;
  DV01: number;
  "Daily P&L Rlzd": number;
  "Day Rlzd K G/L": Record<string, unknown>; // Assuming this is an object with dynamic keys and unknown value types
  "Entry Price": Record<string, number>; // Assuming this is an object with month as keys and number as values
  "FX Rate": number;
  "Fitch Bond Rating": string;
  "Fitch Outlook": string;
  Group: string;
  Interest: Record<string, number>; // Assuming this is an object with date as keys and number as values
  Issue: string;
  Issuer: string;
  "Last Price Update": Date;
  "Last Upload Trade": Date;
  "Last recalculate trades": Date;
  Maturity: string;
  Mid: number;
  "Moddy's Outlook": string | null;
  "Modified Duration": number;
  "Monthly Capital Gains Rlzd": Record<string, number>; // Assuming this is an object with month as keys and number as values
  "Moody's Bond Rating": string;
  "Moody's Outlook": string;
  Net: number;
  "Notional Amount": any;
  OAS: number;
  "Original Face": number;
  Quantity: number;
  "Rating Class": string;
  "S&P Bond Rating": string;
  "S&P Outlook": string;
  Sector: string;
  Strategy: string;
  Type: string;
  YTM: number;
  YTW: number;
  "Z Spread": number;
  holdPortfXrate: number;
  "MTD Rlzd DC": Record<string, number>;
  "MTD Rlzd": Record<string, number>;

  Pin: "pinned" | "not_pinned";
  "Security Description": string;
}

export interface PinnedPosition {
  isin: string;
  location: string;
  pinned: "pinned" | "not_pinned";
  id: string;
  portfolio_id: string;
  ticker: string;
}

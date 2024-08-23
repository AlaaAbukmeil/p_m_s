export interface InformationInDB {
  bb_ticker: string;
  isin: string;
  cusip: string | null;
  currency: string;
  type: "New Issues" | "Position";
  issue_price: string | null;

  trade_date: string | null;
  settle_date: string | null;
  email_id: string | null;

  reoffer_price: string | null;

  treasury_and_spread: string | null;
  timestamp: number | null;
}

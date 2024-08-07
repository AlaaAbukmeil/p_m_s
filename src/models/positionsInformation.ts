export interface PositionTickers {
  bb_ticker: string;
  isin: string;
  cusip: string | null;
  currency: string;
  type: string | "New Issue" | "Position";
}

export interface InformationInDB {
  bb_ticker: string;
  isin: string;
  cusip: string | null;
  currency: string;
  type: string | "New Issue" | "Position";
  
  issue_price: string;

  trade_date: string;
  settle_date: string;
  email_id: string;

  reoffer_price: string;

  treasury_and_spread: string | null;
}

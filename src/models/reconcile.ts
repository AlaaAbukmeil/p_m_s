export interface MufgReconcileUpload {
  Sort1: string;
  Sort2: string;
  Sort3: string;
  Quantity: string;
  Investment: string;
  Description: string;
  CCY: string;
  LocalCost: string;
  BaseCost: string;
  Price: string;
  FXRate: string;
  LocalValue: string;
  BaseValue: string;
  UnrealizedMktGainLoss: string;
  UnrealizedFXGainLoss: string;
  TotalUnrealizedGainLoss: string;
}

export interface NomuraPositonReconcileUpload {
  "Account ID": string;
  "Account Name": string;
  "Long/Short Indicator": string;
  Cusip: string;
  "Quick Code": string;
  Sedol: string;
  Isin: string;
  Symbol: string;
  "Security Name": string;
  "Security Issue CCY": string;
  "Base CCY": string;
  "US Margin Ind": string;
  "TD Quantity": string;
  "SD Quantity": string;
  Price: string;
  "TD Market Value Local": string;
  "SD Market Value Local": string;
  "TD Market Value Base": string;
  "SD Market Value Base": string;
  "Quantity Subject to Right of Use/Stock Loan": string;
  "FX Rate": string;
  "Last Activity Date": string;
  "Business Date": string;
  "Run Date": string;
  "Run Time": string;
  "OTC DerivativeType": string;
  Ticker: string;
  "Ric Code": string;
  "Preferred ID": string;
  "Pricing Factor": string;
  "Price Type": string;
  "Product Type": string;
  "Expiration Date": string;
  "Option Contract Type": string;
  "Td Accrued Interest": string;
  "Sd Accrued Interest": string;
  "Clean Price": string;
  "Asset Class": string;
  "Stock Loan Financed Positions Base Ccy": string;
  "Stock Loan Financed Positions (USD)": string;
}

export interface NomuraCashReconcileFileUpload {
  "Account ID": string;
  "Account Name": string;
  "Balance Type": string;
  "Client Trade Ref": string;
  "Client ShapeTrade Ref": string;
  "Trade Status": string;
  "Trade Date": string;
  "Settlement Date": string;
  "Entry Date": string;
  "Post Date": string;
  "Transaction Type": string;
  Cusip: string;
  "Quick Code": string;
  Sedol: string;
  Isin: string;
  Symbol: string;
  "Security Name": string;
  "Security Issue CCY": string;
  "Broker Code": string;
  Quantity: string;
  Price: string;
  "Commission Type": string;
  Commission: string;
  "Broker Fee": string;
  Tax: string;
  Interest: string;
  Proceeds: string;
  "Proceeds CCY": string;
  "Option Contract Type": string;
  "Activity Description": string;
  "Client Broker Trade ID": string;
  RR: string;
  SMS: string;
  "Tax Type": string;
  "Execution Type": string;
  "Nomura Trade Ref": string;
  "Trade Ref": string;
  "Journal Code": string;
  "Business Date": string;
  "Run Date": string;
  "Run Time": string;
  "OTC Derivative Type": string;
  Ticker: string;
  "Ric Code": string;
  "Regulatory Fee": string;
  "Regulatory Fee Name": string;
  "Preferred ID": string;
  "Broker Long Name": string;
  "Principle Amount": string;
  "Ticket Charge": string;
  "Account Type": string;
  "CCY Base": string;
  "Fx Rate": string;
  "Activity Type": string;
  "Base Proceeds": string;
  Version: string;
  "All In Price": string;
  "Base Commission": string;
  "Base Broker Fee": string;
  "Base Tax Levy": string;
  "Base Interest": string;
  "Base Reg Fee": string;
  "Base SMS": string;
  "Base Principle Amount": string;
  "Base Ticket Chg": string;
  Market: string;
  "SEC Fee": string;
  "ORF Fee": string;
  "Expiration Date": string;
  "Result Of Option": string;
}

export interface NomuraReconcileCashOutput {
  Ticker: string;
  "App Sum": number;
  "Nomura Sum": number;
  Difference: number;
  Message: string;
  Note: string;
}

export interface NomuraReconcileCashOutputCoupon {
  Ticker: string;
  ISIN: string;
  Location: string;
  Currency: string;
  "Coupon Frequency": string;
  "Settle Date BBG": string;
  "Coupon Rate": number;
  "Notional Amount Triada": number;
  "Nomura Cash Coupon Settlement Amount “REC”": number;
  "Nomura Cash Coupon Trade Date": string;
  "Nomura Cash Coupon Settlement Date": string;
  "Triada Expected Cash Payment Amount": number;
  Difference: number;

  Result: string;
}
export interface NomuraReconcileCashOutputRedeemption {
  Ticker: string;
  ISIN: string;
  Location: string;
  Currency: string;
  "Notional Amount Triada": number;
  Difference: number;

  Result: string;
}
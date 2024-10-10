export function changeHubspotContactCompanyToSqlForm(array: any) {
  return array.map((obj: any) => {
    return {
      annual_revenue: obj["Annual Revenue"],
      city: obj["City"],
      company_domain_name: obj["Company Domain Name"],
      company_name: obj["Company name"],
      country_region: obj["Country/Region"],
      description: obj["Description"],
      linkedin_bio: obj["LinkedIn Bio"],
      linkedin_company_page: obj["LinkedIn Company Page"],
      number_of_employees: obj["Number of Employees"],
      phone_number: obj["Phone Number"],
      postal_code: obj["Postal Code"],
      state_region: obj["State/Region"],
      street_address: obj["Street Address"],
      time_zone: obj["Time Zone"],
      website_url: obj["Website URL"],
      contact_with_primary_company: obj["Contact with Primary Company"],
      associated_contact: obj["Associated Contact"],
    };
  });
}
export function changeHubspotContactPeopleToSqlForm(array: any) {
  return array.map((obj: any) => {
    return {
      first_name: obj["First Name"],
      last_name: obj["Last Name"],
      city: obj["City"],
      company_name: obj["Company Name"],
      country: obj["Country/Region"],
      description: obj["Description"],
      email: obj["Email"],
      job_title: obj["Job Title"],
      phone_number: obj["Phone Number"],
      website_url: obj["Website URL"],
      associated_company: obj["Associated Company"],
      associated_note: obj["Associated Note"],
    };
  });
}
export function convertToSqlKeys(array: any[]): any[] {
  const keyMap: { [key: string]: string } = {
    'Capital': 'capital',
    'idtradetype': 'id_trade_type',
    'CashRoundedCapital': 'cash_rounded_capital',
    'CashRoundedSettlementAmount': 'cash_rounded_settlement_amount',
    'CashRoundedReceivablePayableAmount': 'cash_rounded_receivable_payable_amount',
    'PurchasedPerfFeeFactor': 'purchased_perf_fee_factor',
    'CostOfInvRedProceeds': 'cost_of_inv_red_proceeds',
    'BillingCode': 'billing_code',
    'IdTrade': 'id_trade',
    'TradeTypeName': 'trade_type_name',
    'TradeSubTypeName': 'trade_sub_type_name',
    'Units': 'units',
    'Sign': 'sign',
    'TotalFees': 'total_fees',
    'ValuationDate': 'valuation_date',
    'TradeDate': 'trade_date',
    'OrderTradeDate': 'order_trade_date',
    'Valuation': 'valuation',
    'GavPreFees': 'gav_pre_fees',
    'Ask': 'ask',
    'Bid': 'bid',
    'TotalPerfFeeFactor': 'total_perf_fee_factor',
    'ValuationPrecision': 'valuation_precision',
    'UnitsPrecision': 'units_precision',
    'UnitsDescription': 'units_description',
    'TradeSettlementAmount': 'trade_settlement_amount',
    'IdOrder': 'id_order',
    'Method': 'method',
    'ClassCurrency': 'class_currency',
    'TradeTypeOrder': 'trade_type_order',
    'TradeEstimate': 'trade_estimate',
    'AdminClientMantraId': 'admin_client_mantra_id',
    'PortfolioMantraId': 'portfolio_mantra_id',
    'LegalEntityMantraId': 'legal_entity_mantra_id',
    'LegalEntityDescription': 'legal_entity_description',
    'ClassMantraId': 'class_mantra_id',
    'ClassDescription': 'class_description',
    'SubClassMantraId': 'sub_class_mantra_id',
    'SubClassDescription': 'sub_class_description',
    'NomineeMantraId': 'nominee_mantra_id',
    'InvestorMantraId': 'investor_mantra_id',
    'InvestorDescription': 'investor_description',
    'InvestorName': 'investor_name',
    'UnitsOnIntReports': 'units_on_int_reports'
  };

  return array.map((obj: any) => {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const sqlKey = keyMap[key] || key.toLowerCase();
        newObj[sqlKey] = obj[key];
      }
    }
    return newObj;
  });
}
export function removeNullBytes(obj: any): any {
  const cleanObj: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      cleanObj[key] = value.replace(/\x00/g, '');
    } else {
      cleanObj[key] = value;
    }
  }
  return cleanObj;
}
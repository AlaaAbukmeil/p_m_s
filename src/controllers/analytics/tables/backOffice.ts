import { PositionBeforeFormatting } from "../../../models/portfolio";
import { formatGeneralTable, groupAndSortByLocationAndTypeDefineTables } from "./formatter";

export function formatBackOfficeTable(portfolio: PositionBeforeFormatting[], date: any, fund: any, dates: any, sort: any, sign: number, conditions: any, fundDetailsYTD: any, sortBy: "pl" | null | "delta" | "gamma") {
  let formattedPortfolio = formatGeneralTable({ portfolio: portfolio, date: date, fund: fund, dates: dates, conditions: conditions, fundDetailsYTD: fundDetailsYTD });

  let analyzedPortfolio = groupAndSortByLocationAndTypeDefineTables({ formattedPortfolio: formattedPortfolio.portfolio, nav: formattedPortfolio.fundDetails.nav, sort: sort, sign: sign, view: "backOffice", currencies: formattedPortfolio.currencies, format: "summary", sortBy: sortBy, fundDetails: formattedPortfolio.fundDetails });
  return { portfolio: analyzedPortfolio.portfolio, fundDetails: formattedPortfolio.fundDetails, analysis: analyzedPortfolio };
}

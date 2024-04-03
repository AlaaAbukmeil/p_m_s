import { PositionBeforeFormatting } from "../../../models/portfolio";
import { formatGeneralTable, groupAndSortByLocationAndTypeDefineTables } from "./formatter";

export function formatBackOfficeTable(portfolio: PositionBeforeFormatting[], date: any, fund: any, dates: any, sort: any, sign: number, conditions: any, fundDetailsYTD: any, sortBy: "pl" | null | "delta" | "gamma") {
  let formattedPortfolio = formatGeneralTable(portfolio, date, fund, dates, conditions, fundDetailsYTD);
  let analyzedPortfolio = groupAndSortByLocationAndTypeDefineTables(formattedPortfolio.portfolio, formattedPortfolio.fundDetails.nav, sort, sign, "backOffice", formattedPortfolio.currencies, "summary", sortBy);

  return { portfolio: analyzedPortfolio.portfolio, fundDetails: formattedPortfolio.fundDetails, analysis: analyzedPortfolio };
}

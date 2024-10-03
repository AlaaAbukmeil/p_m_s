import { FundDetails, FundDetailsInDB, FundExposureOnlyMTD, PositionBeforeFormatting } from "../../../models/portfolio";
import { formatGeneralTable, getCountrySectorMacroStatistics, groupAndSortByLocationAndTypeDefineTables } from "./formatter";

export function formatBackOfficeTable({ portfolio, date, fund, dates, sort, sign, conditions, fundDetailsYTD, sortBy, ytdinterest }: { portfolio: PositionBeforeFormatting[]; date: any; fund: any; dates: any; sort: any; sign: number; conditions: any; fundDetailsYTD: FundDetails; sortBy: "pl" | null | "price move"; ytdinterest: any }) {
  let formattedPortfolio = formatGeneralTable({ portfolio: portfolio, date: date, fund: fund, dates: dates, conditions: conditions, fundDetailsYTD: fundDetailsYTD, ytdinterest });

  let analyzedPortfolio = groupAndSortByLocationAndTypeDefineTables({ formattedPortfolio: formattedPortfolio.portfolio, nav: formattedPortfolio.fundDetails.nav, sort: sort, sign: sign, view: "back office", currencies: formattedPortfolio.currencies, format: "summary", sortBy: sortBy, fundDetails: formattedPortfolio.fundDetails, date: date, filterCondition: false });
  return { portfolio: analyzedPortfolio.portfolio, fundDetails: formattedPortfolio.fundDetails, analysis: analyzedPortfolio, mtdExpensesAmount: formattedPortfolio.mtdExpensesAmount };
}

export function formatFactSheetStatsTable({ portfolio, date, fund, dates, sort, sign, conditions, fundDetailsYTD, sortBy, ytdinterest }: { portfolio: PositionBeforeFormatting[]; date: any; fund: any; dates: any; sort: any; sign: number; conditions: any; fundDetailsYTD: FundDetails; sortBy: "pl" | null | "price move"; ytdinterest: any }) {
  let formattedPortfolio = formatGeneralTable({ portfolio: portfolio, date: date, fund: fund, dates: dates, conditions: conditions, fundDetailsYTD: fundDetailsYTD, ytdinterest });
  let fundDetails = formattedPortfolio.fundDetails;
  let formattedFundDetails = {
    nav: fundDetails["nav"],
    lmv: fundDetails["lmv"] / fundDetails["nav"],
    smv: fundDetails["smv"] / fundDetails["nav"],

    gmv: fundDetails["gmv"] / fundDetails["nav"],
    nmv: fundDetails["nmv"] / fundDetails["nav"],
  };
  let analyzedPortfolio = getCountrySectorMacroStatistics({ formattedPortfolio: formattedPortfolio.portfolio, nav: formattedPortfolio.fundDetails.nav, sort: sort, sign: sign, view: "back office", currencies: formattedPortfolio.currencies, format: "summary", sortBy: sortBy, fundDetails: formattedPortfolio.fundDetails, date: date });
  return { fundDetails: formattedFundDetails, analysis: analyzedPortfolio, mtdExpensesAmount: formattedPortfolio.mtdExpensesAmount };
}

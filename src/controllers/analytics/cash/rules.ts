import { Capacity, FinalPositionBackOffice, PositionGeneralFormat } from "../../../models/portfolio";
import { Position } from "../../../models/position";
import { parsePercentage } from "../../common";
import { parseStringWithNoSpecialCharacters, toTitleCase } from "../tools";

export function nomuraRuleMargin(position: PositionGeneralFormat) {
  try {
    let sector = parseStringWithNoSpecialCharacters(position["Sector"]);
    let country = parseStringWithNoSpecialCharacters(position["Country"]);
    let spread = parseFloat(position["OAS"]);
    let type = position["Type"];
    let maturity = parseFloat(position["Duration"]);
    let assetClass = position["Asset Class"];
    let baseMargin = 100;
    let developedCountries = ["australia", "belgium", "canada", "france", "germany", "japan", "netherlands", "switzerland", "unitedkingdom", "britain", "unitedstates"];
    if (type == "BND" || type == "UST") {
      if (sector == "Sovereign" && assetClass != "Illiquid") {
        if (developedCountries.includes(country)) {
          if (maturity <= 1) {
            baseMargin = 0.75;
          } else if (maturity > 1 && maturity <= 3) {
            baseMargin = 1.75;
          } else if (maturity > 3 && maturity <= 5) {
            baseMargin = 2.75;
          } else if (maturity > 5 && maturity <= 7) {
            baseMargin = 3.5;
          } else if (maturity > 7 && maturity <= 10) {
            baseMargin = 5;
          } else if (maturity > 10 && maturity <= 15) {
            baseMargin = 7;
          } else if (maturity > 15 && maturity <= 20) {
            baseMargin = 8.5;
          } else if (maturity > 20) {
            baseMargin = 14;
          }
        }
      } else if (assetClass != "Illiquid") {
        if (spread < 100) {
          if (maturity <= 1.5) {
            baseMargin = 7;
          } else if (maturity > 1.5 && maturity <= 5) {
            baseMargin = 7;
          } else if (maturity > 5 && maturity <= 10) {
            baseMargin = 9;
          } else if (maturity > 10 && maturity <= 20) {
            baseMargin = 14;
          } else if (maturity > 20 && maturity <= 30) {
            baseMargin = 20;
          } else if (maturity > 30) {
            baseMargin = 22;
          }
        } else if (spread > 100 && spread < 200) {
          if (maturity <= 1.5) {
            baseMargin = 7;
          } else if (maturity > 1.5 && maturity <= 5) {
            baseMargin = 8;
          } else if (maturity > 5 && maturity <= 10) {
            baseMargin = 13;
          } else if (maturity > 10 && maturity <= 20) {
            baseMargin = 21;
          } else if (maturity > 20 && maturity <= 30) {
            baseMargin = 26;
          } else if (maturity > 30) {
            baseMargin = 30;
          }
        } else if (spread > 200 && spread < 300) {
          if (maturity <= 1.5) {
            baseMargin = 7;
          } else if (maturity > 1.5 && maturity <= 5) {
            baseMargin = 11;
          } else if (maturity > 5 && maturity <= 10) {
            baseMargin = 16;
          } else if (maturity > 10 && maturity <= 20) {
            baseMargin = 25;
          } else if (maturity > 20 && maturity <= 30) {
            baseMargin = 31;
          } else if (maturity > 30) {
            baseMargin = 35;
          }
        } else if (spread > 300 && spread < 400) {
          if (maturity <= 5) {
            baseMargin = 13;
          } else if (maturity > 5 && maturity <= 10) {
            baseMargin = 20;
          } else if (maturity > 10 && maturity <= 20) {
            baseMargin = 29;
          } else if (maturity > 20 && maturity <= 30) {
            baseMargin = 35;
          } else if (maturity > 30) {
            baseMargin = 39;
          }
        } else if (spread > 400 && spread < 500) {
          if (maturity <= 5) {
            baseMargin = 16;
          } else if (maturity > 5 && maturity <= 10) {
            baseMargin = 23;
          } else if (maturity > 10 && maturity <= 20) {
            baseMargin = 33;
          } else if (maturity > 20 && maturity <= 30) {
            baseMargin = 37;
          } else if (maturity > 30) {
            baseMargin = 43;
          }
        } else if (spread > 500 && spread < 700) {
          if (maturity <= 5) {
            baseMargin = 20;
          } else if (maturity > 5 && maturity <= 10) {
            baseMargin = 28;
          } else if (maturity > 10 && maturity <= 20) {
            baseMargin = 37;
          } else if (maturity > 20 && maturity <= 30) {
            baseMargin = 40;
          } else if (maturity > 30) {
            baseMargin = 46;
          }
        } else if (spread > 700 && spread < 1000) {
          if (maturity <= 5) {
            baseMargin = 25;
          } else if (maturity > 5 && maturity <= 10) {
            baseMargin = 33;
          } else if (maturity > 10 && maturity <= 20) {
            baseMargin = 40;
          } else if (maturity > 20) {
            baseMargin = 47;
          }
        } else if (spread > 1000 && spread < 1500) {
          if (maturity <= 5) {
            baseMargin = 36;
          } else if (maturity > 5 && maturity <= 10) {
            baseMargin = 44;
          } else if (maturity > 10 && maturity <= 20) {
            baseMargin = 52;
          } else if (maturity > 20) {
            baseMargin = 59;
          }
        } else if (spread > 1500 && spread < 2000) {
          if (maturity <= 5) {
            baseMargin = 44;
          } else if (maturity > 5 && maturity <= 10) {
            baseMargin = 52;
          } else if (maturity > 10 && maturity <= 20) {
            baseMargin = 59;
          } else if (maturity > 20) {
            baseMargin = 67;
          }
        } else {
          baseMargin = 100;
        }
      } else {
        baseMargin = 100;
      }
    } else {
      baseMargin = 100;
    }

    return Math.round(baseMargin) + " %";
  } catch (error: any) {
    console.log(error);
    return "100 %";
  }
}

export function adjustMarginMultiplier(portfolio: PositionGeneralFormat[], sectorGMVPercentage: any, issuerGMVPercentage: any): { portfolio: FinalPositionBackOffice[]; capacity: Capacity } {
  let capacity = {
    amount: 0,
    amountHY: 0,
    amountIG: 0,
    amountHedge: 0,
  };
  let finalPorfolio: any = [...portfolio];

  for (let index = 0; index < portfolio.length; index++) {
    try {
      let position = portfolio[index];
      let positionBaseMargin = parsePercentage(position["Base LTV"]) / 100;
      let positionUSDValue = Math.abs(parseFloat(position["USD Market Value"]));
      let issuerMultiplier = 1;
      let sectorMultiplier = 1;
      let assetClass = position["Asset Class"];
      if (portfolio[index]["ISIN"]) {
        portfolio[index]["LTV"] = "0 %";
        portfolio[index]["Borrow Capacity"] = 0;
      }

      let issuer = position["Issuer"];
      let sector = position["Sector"];
      if (sector && sector != "") {
        sector = toTitleCase(position["Sector"]);

        let portfolioGMVPercentageOfSector = sectorGMVPercentage[sector]["percentage"];
        if (portfolioGMVPercentageOfSector >= 30 && portfolioGMVPercentageOfSector < 50) {
          sectorMultiplier = 1.25;
        } else if (portfolioGMVPercentageOfSector >= 50) {
          sectorMultiplier = 1.5;
        }
      }
      if (issuer && issuer != "") {
        let portfolioGMVPercentageOfIssuer = issuerGMVPercentage[issuer]["percentage"];
        if (portfolioGMVPercentageOfIssuer >= 10 && portfolioGMVPercentageOfIssuer < 20) {
          issuerMultiplier = 1.25;
        } else if (portfolioGMVPercentageOfIssuer >= 20 && portfolioGMVPercentageOfIssuer < 35) {
          issuerMultiplier = 1.65;
        } else if (portfolioGMVPercentageOfIssuer >= 35 && portfolioGMVPercentageOfIssuer < 50) {
          issuerMultiplier = 2.1;
        } else if (portfolioGMVPercentageOfIssuer >= 50 && portfolioGMVPercentageOfIssuer < 70) {
          issuerMultiplier = 2.75;
        } else if (portfolioGMVPercentageOfIssuer >= 70) {
          issuerMultiplier = 3;
        }
      }
      let positionMargin = 1 - positionBaseMargin * issuerMultiplier * sectorMultiplier;
      positionMargin = positionMargin < 0 ? 0 : positionMargin;
      let amountCapacity = positionMargin * positionUSDValue;
      if (amountCapacity && (position["L/S"] == "Long" || position["L/S"] == "Short" || position["L/S"] == "")) {
        capacity.amount += amountCapacity;
        if (assetClass == "IG") {
          capacity.amountIG += amountCapacity;
        } else if (assetClass == "HY") {
          capacity.amountHY += amountCapacity;
        } else if (assetClass == "Hedge") {
          capacity.amountHedge += amountCapacity;
        }
        portfolio[index]["Base LTV"] = 100 - parsePercentage(position["Base LTV"]) + " %";

        portfolio[index]["LTV"] = Math.round((positionMargin || 0) * 100) + " %" || "0 %";
        portfolio[index]["Borrow Capacity"] = amountCapacity || 0;
      }
      capacity.amount = Math.round(capacity.amount);
      capacity.amountHY = Math.round(capacity.amountHY);
      capacity.amountIG = Math.round(capacity.amountIG);

      capacity.amountHedge = Math.round(capacity.amountHedge);
    } catch (error: any) {}
  }

  return { portfolio: finalPorfolio, capacity: capacity };
}

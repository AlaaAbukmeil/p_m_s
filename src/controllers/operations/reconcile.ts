import { MufgReconcile, NomuraReconcile } from "../../models/reconcile";

export async function reconcileMUFG(MUFGData: MufgReconcile[], portfolio: any) {
  try {
    portfolio = updatePortfolioBasedOnIsin(portfolio);
    let formattedData: any = [];

    for (let index = 0; index < portfolio.length; index++) {
      let positionInPortfolio = portfolio[index];
      let positionInMufg = getPositionInMUFG(MUFGData, positionInPortfolio["BB Ticker"], positionInPortfolio["ISIN"]);
      if (!positionInPortfolio["Type"]) {
        positionInPortfolio["Type"] = positionInPortfolio["BB Ticker"].split(" ")[0] == "T" || positionInPortfolio["Issuer"] == "US TREASURY N/B" ? "UST" : "BND";
      }
      let bondDivider = positionInPortfolio["Type"] == "BND" || positionInPortfolio["Type"] == "UST" ? 100 : 1;

      let portfolioPositionQuantity = positionInPortfolio["ISIN"].includes("IB") ? positionInPortfolio["Notional Amount"] / positionInPortfolio["Original Face"] : positionInPortfolio["Principal"];
      let mufgPositionQuantity = positionInMufg ? parseFloat(positionInMufg["Quantity"]) : 0;
      let portfolioAverageCost = parseFloat(positionInPortfolio["Average Cost"]);
      let mufgAverageCost = positionInMufg ? parseFloat(positionInMufg["LocalCost"]) / mufgPositionQuantity : 0;
      let portfolioPrice = Math.round(positionInPortfolio["Mid"] * 10000 * bondDivider) / 10000;
      portfolioPrice = portfolioPrice ? portfolioPrice : 0;
      let mufgPrice = positionInMufg ? parseFloat(positionInMufg["Price"]) : 0;

      let formattedRow = {
        "BB Ticker": positionInPortfolio["BB Ticker"],
        ISIN: positionInPortfolio["ISIN"],

        "Principal (app)": portfolioPositionQuantity || 0,
        "Principal (mufg)": mufgPositionQuantity || 0,
        "Difference Principal": Math.round(portfolioPositionQuantity - mufgPositionQuantity) || 0,

        "Average Cost (app)": portfolioAverageCost || 0,
        "Average Cost (mufg)": mufgAverageCost || 0,
        "Difference Average Cost": Math.round(portfolioAverageCost - mufgAverageCost) || 0,

        "Price (app)": portfolioPrice || 0,
        "Price (mufg)": mufgPrice || 0,
        "Difference Price": portfolioPrice - mufgPrice || 0,
      };
      formattedData.push(formattedRow);
    }
    return formattedData;
  } catch (error) {
    console.log(error);
    return { error: "unexpected error" };
  }
}

export async function reconcileNomura(data: NomuraReconcile[], portfolio: any) {
  try {
    portfolio = updatePortfolioBasedOnIsin(portfolio);
    let formattedData: any = [];

    let alreadyScanned: any = {};

    for (let index = 0; index < portfolio.length; index++) {
      let positionInPortfolio = portfolio[index];
      let positionInNomura = getPositionInNomura(data, positionInPortfolio["ISIN"]);
      if (!positionInPortfolio["Type"]) {
        positionInPortfolio["Type"] = positionInPortfolio["BB Ticker"].split(" ")[0] == "T" || positionInPortfolio["Issuer"] == "US TREASURY N/B" ? "UST" : "BND";
      }
      let bondDivider = positionInPortfolio["Type"] == "BND" || positionInPortfolio["Type"] == "UST" ? 100 : 1;

      let portfolioPositionQuantity = positionInPortfolio["Notional Amount"];
      let nomuraPositionQuantity = positionInNomura ? parseFloat(positionInNomura["SD Quantity"]) : 0;
      let portfolioPrice = Math.round(positionInPortfolio["Mid"] * 10000 * bondDivider) / 10000;
      portfolioPrice = portfolioPrice ? portfolioPrice : 0;
      let nomuraPrice = positionInNomura ? parseFloat(positionInNomura["Price"]) : 0;

      let formattedRow = {
        "BB Ticker": positionInPortfolio["BB Ticker"],
        ISIN: positionInPortfolio["ISIN"],

        "Notional Amount (app)": portfolioPositionQuantity || 0,
        "Notional Amount (nomura)": nomuraPositionQuantity || 0,
        "Difference Notional Amount": Math.round(portfolioPositionQuantity - nomuraPositionQuantity) || 0,

        "Price (app)": portfolioPrice || 0,
        "Price (nomura)": nomuraPrice || 0,
        "Difference Price": portfolioPrice - nomuraPrice || 0,
      };
      alreadyScanned[positionInPortfolio["ISIN"]] = true;
      formattedData.push(formattedRow);
    }
    for (let index = 0; index < data.length; index++) {
      let positionInNomura = data[index];
      if (!alreadyScanned[positionInNomura["Isin"]] && positionInNomura["Isin"]) {
        let nomuraPositionQuantity = positionInNomura ? parseFloat(positionInNomura["SD Quantity"]) : 0;
        let nomuraPrice = positionInNomura ? parseFloat(positionInNomura["Price"]) : 0;

        let formattedRow = {
          "BB Ticker": positionInNomura["Security Name"],
          ISIN: positionInNomura["Isin"],

          "Notional Amount (app)": 0,
          "Notional Amount (nomura)": nomuraPositionQuantity || 0,
          "Difference Notional Amount": Math.round(nomuraPositionQuantity) || 0,

          "Price (app)": 0,
          "Price (nomura)": nomuraPrice || 0,
          "Difference Price": nomuraPrice,
        };
        formattedData.push(formattedRow);
      }
    }

    return formattedData;
  } catch (error) {
    console.log(error);
    return { error: "unexpected error" };
  }
}

function getPositionInMUFG(mufgData: MufgReconcile[], bbTicker: string, isin: string) {
  for (let index = 0; index < mufgData.length; index++) {
    let row = mufgData[index];
    if (row["Investment"].includes(bbTicker) || row["Investment"].includes(isin)) {
      return row;
    }
  }
  return null;
}

function getPositionInNomura(data: NomuraReconcile[], isin: string) {
  for (let index = 0; index < data.length; index++) {
    let row = data[index];
    if (row["Isin"].includes(isin)) {
      return row;
    }
  }
  return null;
}
export function updatePortfolioBasedOnIsin(portfolio: any) {
  let updatedPortfolio: any = {};
  let aggregatedPortfolio: any = [];

  for (let index = 0; index < portfolio.length; index++) {
    let position = portfolio[index];
    let isin = position["ISIN"];
    if (updatedPortfolio[isin]) {
      updatedPortfolio[isin].push(position);
    } else {
      updatedPortfolio[isin] = [position];
    }
  }

  let isins = Object.keys(updatedPortfolio);
  for (let index = 0; index < isins.length; index++) {
    let isin = isins[index];
    let positions = updatedPortfolio[isin];
    let updatedPosition = {
      "Principal": 0,
      "Average Cost": 0,

      "Original Face": positions[0]["Original Face"],
      Mid: positions[0]["Mid"],
      ISIN: isin,
      "BB Ticker": positions[0]["BB Ticker"],
    };

    for (let positionIndex = 0; positionIndex < positions.length; positionIndex++) {
      let data = positions[positionIndex];
      let quantity = data["Principal"];
      let averageCost = data["Average Cost"];
      updatedPosition["Principal"] += quantity;
      updatedPosition["Average Cost"] += data["Principal"] * data["Average Cost"];
    }
    updatedPosition["Average Cost"] /= updatedPosition["Principal"];
    aggregatedPortfolio.push(updatedPosition);
  }

  return aggregatedPortfolio;
}

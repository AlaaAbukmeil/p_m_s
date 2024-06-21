import { toTitleCase } from "../tools";

export function getCountrySectorStrategySum(countryPercentage: any, sectorPercentage: any, strategyPercentage: any, issuerPercentage: any, ratingPercentage: any, regionPercentage: any, marketTypePercentage: any, assetClassPercentage: any, nav: any) {
  let countries = Object.keys(countryPercentage);
  let sectors = Object.keys(sectorPercentage);
  let strategies = Object.keys(strategyPercentage);
  let issuers = Object.keys(issuerPercentage);
  let ratings = Object.keys(ratingPercentage);
  let regions = Object.keys(regionPercentage);
  let marketTypes = Object.keys(marketTypePercentage);
  let assetClasss = Object.keys(assetClassPercentage);

  let sumCountryInPercentage = 0,
    sumCountryInNotional = 0,
    sumSectorInPercentage = 0,
    sumSectorInNotional = 0,
    sumStrategyInNotional = 0,
    sumStrategyInPercentage = 0,
    sumIssuerInPercentage = 0,
    sumIssuerInNotional = 0,
    sumRatingInPercentage = 0,
    sumRatingInNotional = 0,
    sumRegionInPercentage = 0,
    sumRegionInNotional = 0,
    sumMarketTypeInPercentage = 0,
    sumMarketTypeInNotional = 0,
    sumAssetClassInPercentage = 0,
    sumAssetClassInNotional = 0;

  for (let index = 0; index < countries.length; index++) {
    if (countryPercentage[countries[index]]) {
      countryPercentage[toTitleCase(countries[index])] = { percentage: Math.round((countryPercentage[countries[index]] / nav) * 10000) / 100, notional: Math.round(countryPercentage[countries[index]]) };
      sumCountryInPercentage += countryPercentage[toTitleCase(countries[index])]["percentage"];
      sumCountryInNotional += countryPercentage[toTitleCase(countries[index])]["notional"];
      delete countryPercentage[countries[index]];
    } else {
      delete countryPercentage[countries[index]];
    }
  }

  for (let index = 0; index < sectors.length; index++) {
    if (sectorPercentage[sectors[index]]) {
      sectorPercentage[toTitleCase(sectors[index])] = { percentage: Math.round((sectorPercentage[sectors[index]] / nav) * 10000) / 100, notional: Math.round(sectorPercentage[sectors[index]]) };
      sumSectorInPercentage += sectorPercentage[toTitleCase(sectors[index])]["percentage"];
      sumSectorInNotional += sectorPercentage[toTitleCase(sectors[index])]["notional"];

      delete sectorPercentage[sectors[index]];
    } else {
      delete sectorPercentage[sectors[index]];
    }
  }

  for (let index = 0; index < strategies.length; index++) {
    if (strategyPercentage[strategies[index]]) {
      strategyPercentage[strategies[index]] = { percentage: Math.round((strategyPercentage[strategies[index]] / nav) * 10000) / 100, notional: Math.round(strategyPercentage[strategies[index]]) };
      sumStrategyInPercentage += strategyPercentage[strategies[index]]["percentage"];
      sumStrategyInNotional += strategyPercentage[strategies[index]]["notional"];
    } else {
      delete strategyPercentage[strategies[index]];
    }
  }

  for (let index = 0; index < issuers.length; index++) {
    if (issuerPercentage[issuers[index]]) {
      issuerPercentage[issuers[index]] = { percentage: Math.round((issuerPercentage[issuers[index]] / nav) * 10000) / 100, notional: Math.round(issuerPercentage[issuers[index]]) };
      sumIssuerInPercentage += issuerPercentage[issuers[index]]["percentage"];
      sumIssuerInNotional += issuerPercentage[issuers[index]]["notional"];
    } else {
      delete issuerPercentage[issuers[index]];
    }
  }

  for (let index = 0; index < ratings.length; index++) {
    if (ratingPercentage[ratings[index]]) {
      ratingPercentage[ratings[index]] = { percentage: Math.round((ratingPercentage[ratings[index]] / nav) * 10000) / 100, notional: Math.round(ratingPercentage[ratings[index]]) };
      sumRatingInPercentage += ratingPercentage[ratings[index]]["percentage"];
      sumRatingInNotional += ratingPercentage[ratings[index]]["notional"];
    } else {
      delete ratingPercentage[ratings[index]];
    }
  }

  for (let index = 0; index < regions.length; index++) {
    if (regionPercentage[regions[index]]) {
      regionPercentage[regions[index]] = { percentage: Math.round((regionPercentage[regions[index]] / nav) * 10000) / 100, notional: Math.round(regionPercentage[regions[index]]) };
      sumRegionInPercentage += regionPercentage[regions[index]]["percentage"];
      sumRegionInNotional += regionPercentage[regions[index]]["notional"];
    } else {
      delete regionPercentage[regions[index]];
    }
  }

  for (let index = 0; index < marketTypes.length; index++) {
    if (marketTypePercentage[marketTypes[index]]) {
      marketTypePercentage[marketTypes[index]] = { percentage: Math.round((marketTypePercentage[marketTypes[index]] / nav) * 10000) / 100, notional: Math.round(marketTypePercentage[marketTypes[index]]) };
      sumMarketTypeInPercentage += marketTypePercentage[marketTypes[index]]["percentage"];
      sumMarketTypeInNotional += marketTypePercentage[marketTypes[index]]["notional"];
    } else {
      delete marketTypePercentage[marketTypes[index]];
    }
  }

  for (let index = 0; index < assetClasss.length; index++) {
    if (assetClassPercentage[assetClasss[index]]) {
      assetClassPercentage[assetClasss[index]] = { percentage: Math.round((assetClassPercentage[assetClasss[index]] / nav) * 10000) / 100, notional: Math.round(assetClassPercentage[assetClasss[index]]) };
      sumAssetClassInPercentage += assetClassPercentage[assetClasss[index]]["percentage"];
      sumAssetClassInNotional += assetClassPercentage[assetClasss[index]]["notional"];
    } else {
      delete assetClassPercentage[assetClasss[index]];
    }
  }

  countryPercentage["Total"] = { percentage: Math.round(sumCountryInPercentage * 10) / 10, notional: Math.round(sumCountryInNotional) };
  strategyPercentage["Total"] = { percentage: Math.round(sumStrategyInPercentage * 10) / 10, notional: Math.round(sumStrategyInNotional) };
  sectorPercentage["Total"] = { percentage: Math.round(sumSectorInPercentage * 10) / 10, notional: Math.round(sumSectorInNotional) };
  issuerPercentage["Total"] = { percentage: Math.round(sumIssuerInPercentage * 10) / 10, notional: Math.round(sumIssuerInNotional) };
  ratingPercentage["Total"] = { percentage: Math.round(sumRatingInPercentage * 10) / 10, notional: Math.round(sumRatingInNotional) };
  regionPercentage["Total"] = { percentage: Math.round(sumRegionInPercentage * 10) / 10, notional: Math.round(sumRegionInNotional) };
  marketTypePercentage["Total"] = { percentage: Math.round(sumMarketTypeInPercentage * 10) / 10, notional: Math.round(sumMarketTypeInNotional) };
  assetClassPercentage["Total"] = { percentage: Math.round(sumAssetClassInPercentage * 10) / 10, notional: Math.round(sumAssetClassInNotional) };

  return;
}

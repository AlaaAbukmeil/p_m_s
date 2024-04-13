import { toTitleCase } from "../tools";

export function getCountrySectorStrategySum(countryPercentage: any, sectorPercentage: any, strategyPercentage: any, issuerPercentage: any, nav: any) {
  let countries = Object.keys(countryPercentage);
  let sectors = Object.keys(sectorPercentage);
  let strategies = Object.keys(strategyPercentage);
  let issuers = Object.keys(issuerPercentage);
  let sumCountryInPercentage = 0,
    sumStrategyInPercentage = 0,
    sumSectorInPercentage = 0,
    sumIssuerInPercentage = 0,
    sumCountryInNotional = 0,
    sumStrategyInNotional = 0,
    sumSectorInNotional = 0,
    sumIssuerInNotional = 0;

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

  countryPercentage["Total"] = { percentage: Math.round(sumCountryInPercentage * 10) / 10, notional: Math.round(sumCountryInNotional) };
  strategyPercentage["Total"] = { percentage: Math.round(sumStrategyInPercentage * 10) / 10, notional: Math.round(sumStrategyInNotional) };
  sectorPercentage["Total"] = { percentage: Math.round(sumSectorInPercentage * 10) / 10, notional: Math.round(sumSectorInNotional) };
  issuerPercentage["Total"] = { percentage: Math.round(sumIssuerInPercentage * 10) / 10, notional: Math.round(sumIssuerInNotional) };

  return;
}

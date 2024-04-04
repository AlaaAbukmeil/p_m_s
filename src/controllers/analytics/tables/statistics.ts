import { toTitleCase } from "../tools";

export function getCountrySectorStrategySum(countryPercentage: any, sectorPercentage: any, strategyPercentage: any, issuerPercentage: any, nav: any) {
    let countries = Object.keys(countryPercentage);
    let sectors = Object.keys(sectorPercentage);
    let strategies = Object.keys(strategyPercentage);
    let issuers = Object.keys(issuerPercentage);
    let sumCountry = 0,
      sumStrategy = 0,
      sumSector = 0,
      sumIssuer = 0;
  
    for (let index = 0; index < countries.length; index++) {
      if (countryPercentage[countries[index]]) {
        countryPercentage[toTitleCase(countries[index])] = Math.round((countryPercentage[countries[index]] / nav) * 10000) / 100;
        sumCountry += countryPercentage[toTitleCase(countries[index])];
        delete countryPercentage[countries[index]];
      } else {
        delete countryPercentage[countries[index]];
      }
    }
  
    for (let index = 0; index < sectors.length; index++) {
      if (sectorPercentage[sectors[index]]) {
        sectorPercentage[toTitleCase(sectors[index])] = Math.round((sectorPercentage[sectors[index]] / nav) * 10000) / 100;
        sumSector += sectorPercentage[toTitleCase(sectors[index])];
        delete sectorPercentage[sectors[index]];
      } else {
        delete sectorPercentage[sectors[index]];
      }
    }
  
    for (let index = 0; index < strategies.length; index++) {
      if (strategyPercentage[strategies[index]]) {
        strategyPercentage[strategies[index]] = Math.round((strategyPercentage[strategies[index]] / nav) * 10000) / 100;
        sumStrategy += strategyPercentage[strategies[index]];
      } else {
        delete strategyPercentage[strategies[index]];
      }
    }
  
    for (let index = 0; index < issuers.length; index++) {
      if (issuerPercentage[issuers[index]]) {
        issuerPercentage[issuers[index]] = Math.round((issuerPercentage[issuers[index]] / nav) * 10000) / 100;
        sumIssuer += issuerPercentage[issuers[index]];
      } else {
        delete issuerPercentage[issuers[index]];
      }
    }
    return {
      sumCountry: sumCountry,
      sumStrategy: sumStrategy,
      sumSector: sumSector,
      sumIssuer: sumIssuer,
    };
  }
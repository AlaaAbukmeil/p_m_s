import { toTitleCase } from "../tools";

export function getCountrySectorStrategySum(countryNAVPercentage: any, sectorNAVPercentage: any, strategyNAVPercentage: any, issuerNAVPercentage: any, nav: any) {
    let countries = Object.keys(countryNAVPercentage);
    let sectors = Object.keys(sectorNAVPercentage);
    let strategies = Object.keys(strategyNAVPercentage);
    let issuers = Object.keys(issuerNAVPercentage);
    let sumCountryLong = 0,
      sumStrategy = 0,
      sumSectorLong = 0,
      sumIssuer = 0;
  
    for (let index = 0; index < countries.length; index++) {
      if (countryNAVPercentage[countries[index]]) {
        countryNAVPercentage[toTitleCase(countries[index])] = Math.round((countryNAVPercentage[countries[index]] / nav) * 10000) / 100;
        sumCountryLong += countryNAVPercentage[toTitleCase(countries[index])];
        delete countryNAVPercentage[countries[index]];
      } else {
        delete countryNAVPercentage[countries[index]];
      }
    }
  
    for (let index = 0; index < sectors.length; index++) {
      if (sectorNAVPercentage[sectors[index]]) {
        sectorNAVPercentage[toTitleCase(sectors[index])] = Math.round((sectorNAVPercentage[sectors[index]] / nav) * 10000) / 100;
        sumSectorLong += sectorNAVPercentage[toTitleCase(sectors[index])];
        delete sectorNAVPercentage[sectors[index]];
      } else {
        delete sectorNAVPercentage[sectors[index]];
      }
    }
  
    for (let index = 0; index < strategies.length; index++) {
      if (strategyNAVPercentage[strategies[index]]) {
        strategyNAVPercentage[strategies[index]] = Math.round((strategyNAVPercentage[strategies[index]] / nav) * 10000) / 100;
        sumStrategy += strategyNAVPercentage[strategies[index]];
      } else {
        delete strategyNAVPercentage[strategies[index]];
      }
    }
  
    for (let index = 0; index < issuers.length; index++) {
      if (issuerNAVPercentage[issuers[index]]) {
        issuerNAVPercentage[issuers[index]] = Math.round((issuerNAVPercentage[issuers[index]] / nav) * 10000) / 100;
        sumIssuer += issuerNAVPercentage[issuers[index]];
      } else {
        delete issuerNAVPercentage[issuers[index]];
      }
    }
    return {
      sumCountryLong: sumCountryLong,
      sumStrategy: sumStrategy,
      sumSectorLong: sumSectorLong,
      sumIssuer: sumIssuer,
    };
  }
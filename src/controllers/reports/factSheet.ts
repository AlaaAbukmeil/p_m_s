import { client } from "../userManagement/auth";
import { getDateTimeInMongoDBCollectionFormat } from "./common";
import { getPortfolioWithAnalytics } from "./portfolios";
import { getMonthName, getSampleStandardDeviation, getStatistics, transformData, updateStats } from "./tools";
export let beforeSwitchRatios: any = {
  a4: 1000 / 1477.16,
  a5: 1000 / 1154.61,
  a6: 1000 / 1154.61,
};
export let switchClasses = ["a4", "a5", "a6"];
export function calculateMonthlyReturn(data: any, variables: any) {
  //assue months are sorted in ascending order

  let monthlyReturns: any = {};
  let monthsIndex = data.length - 1;

  let troughReturn: any = {};
  let peakReturn: any = {};

  let cumulativeReturn: any = {};
  let numOfMonths: any = {};
  let returns: any = {};
  let returnsHashTable: any = {};
  let cumulativeReturnsHashTable: any = {};

  let positiveReturns: any = {};
  let positiveReturn: any = {};
  let positiveReturnsHashTable: any = {};

  let negativeReturns: any = {};
  let negativeReturn: any = {};
  let negativeReturnsHashTable: any = {};

  let annualVolitality: any = {};
  let reset: any = {};
  let resetYears: any = {};

  // let cumulativeHistory = {};

  for (let index = 0; index < variables.length; index++) {
    let variable = variables[index];
    troughReturn[variable] = Infinity;
    peakReturn[variable] = -Infinity;

    cumulativeReturn[variable] = 1;
    positiveReturn[variable] = 1;
    negativeReturn[variable] = 1;

    numOfMonths[variable] = 1;
    returns[variable] = [];
    returnsHashTable[variable] = {};
    cumulativeReturnsHashTable[variable] = { cumulative: 100, max: -Infinity, min: Infinity, cumulativeSwitch: 100, "12/2022": 100 };
    positiveReturnsHashTable[variable] = {};
    negativeReturnsHashTable[variable] = {};

    positiveReturns[variable] = [];
    negativeReturns[variable] = [];
    annualVolitality[variable] = 0;
    reset[variable] = false;
    resetYears[variable] = [];
  }

  let yearlyData: any = {};
  while (monthsIndex >= 0) {
    if (data[monthsIndex].data[variables[0]] || monthsIndex == 0) {
      if (monthsIndex == 0) {
        let month = data[monthsIndex].date;
        let year = (parseInt(month.split("/")[1]) - 1).toString();
        if (!yearlyData[year]) {
          for (let index = 0; index < variables.length; index++) {
            let variable = variables[index];
            yearlyData[year] = {};
            yearlyData[year][variable] = data[monthsIndex].data[variable];
          }
        }

        monthsIndex--;
      } else {
        let month = data[monthsIndex].date;
        let returnMonth: any = {};
        for (let index = 0; index < variables.length; index++) {
          let variable = variables[index];
          returnMonth[variable] = 0;
        }

        let year = month.split("/")[1];
        for (let index = 0; index < variables.length; index++) {
          let variable = variables[index];
          updateStats({ data, returnMonth, cumulativeReturn, numOfMonths, returns, positiveReturns, positiveReturn, negativeReturns, negativeReturn, variable, troughReturn, peakReturn, monthsIndex, returnsHashTable, cumulativeReturnsHashTable, positiveReturnsHashTable, negativeReturnsHashTable, reset });
          if (reset[variables[0]] == false) {
            monthlyReturns[month] = {};
            monthlyReturns[month][variable] = returnMonth[variable];
          }
        }

        if (reset[variables[0]] == true) {
          resetYears[variables[0]].push(year);
          reset[variables[0]] = false;
        }
        if (!yearlyData[year]) {
          for (let index = 0; index < variables.length; index++) {
            let variable = variables[index];
            yearlyData[year] = {};
            yearlyData[year][variable] = data[monthsIndex].data[variable];
          }
        }
        monthsIndex--;
      }
    } else {
      monthsIndex--;
    }
  }

  let years = Object.keys(yearlyData);
  let yearsIndex = years.length - 1;
  let yearlyReturns: any = {};

  while (yearsIndex >= 0) {
    let year = years[yearsIndex];

    let previousYear = years[yearsIndex - 1];

    let yearlyReturn: any = {};
    for (let index = 0; index < variables.length; index++) {
      let variable = variables[index];
      yearlyReturn[variable] = 0;
    }
    if (yearlyData[year] && yearlyData[previousYear] && !resetYears[variables[0]].includes(year)) {
      for (let index = 0; index < variables.length; index++) {
        let variable = variables[index];
        if (yearlyData[year][variable] && yearlyData[previousYear][variable]) {
          yearlyReturn[variable] = yearlyData[year][variable] / yearlyData[previousYear][variable] - 1;
        }
      }

      if (!monthlyReturns["Cumulative/" + year]) {
        for (let index = 0; index < variables.length; index++) {
          let variable = variables[index];
          monthlyReturns["Cumulative/" + year] = {};
          monthlyReturns["Cumulative/" + year][variable] = 0;
        }
      }
      for (let index = 0; index < variables.length; index++) {
        let variable = variables[index];
        monthlyReturns["Cumulative/" + year][variable] = yearlyReturn[variable];
        yearlyReturns[year] = {};
        yearlyReturns[year][variable] = yearlyReturn[variable];
      }
      yearsIndex--;
    } else {
      yearsIndex--;
    }
  }

  let maxDrawdown: any = {};
  let annulizedReturn: any = {};
  let normal: any = {};
  let variance: any = {};
  let positiveAnnualVolitality: any = {};
  let negativeAnnualVolitality: any = {};
  let volitality: any = {};
  let ratios: any = {};
  for (let index = 0; index < variables.length; index++) {
    let variable = variables[index];
    let statistics = getStatistics(returns[variable]);
    let negativeStatistics = getSampleStandardDeviation(negativeReturns[variable]);
    maxDrawdown[variable] = { peak: cumulativeReturnsHashTable[variable].max, trough: cumulativeReturnsHashTable[variable].min, mdd: (cumulativeReturnsHashTable[variable].min - cumulativeReturnsHashTable[variable].max) / cumulativeReturnsHashTable[variable].max };
    annulizedReturn[variable] = { annualPer: Math.pow(cumulativeReturn[variable], 1 / (numOfMonths[variable] / 12)) - 1, bestMonth: peakReturn[variable], worstMonth: troughReturn[variable] };
    normal[variable] = statistics;
    variance[variable] = Math.pow(normal[variable].sd, 2);
    positiveAnnualVolitality[variable] = getSampleStandardDeviation(positiveReturns[variable]);
    negativeAnnualVolitality[variable] = negativeStatistics;
    annualVolitality[variable] = normal[variable].sd * Math.sqrt(12);
    positiveAnnualVolitality[variable].volitality = positiveAnnualVolitality[variable].sd * Math.sqrt(12);
    positiveAnnualVolitality[variable].numOfMonths = positiveAnnualVolitality[variable].arrLength / (positiveAnnualVolitality[variable].arrLength + negativeAnnualVolitality[variable].arrLength);
    negativeAnnualVolitality[variable].volitality = negativeAnnualVolitality[variable].sd * Math.sqrt(12);
    negativeAnnualVolitality[variable].numOfMonths = negativeAnnualVolitality[variable].arrLength / (positiveAnnualVolitality[variable].arrLength + negativeAnnualVolitality[variable].arrLength);
    volitality[variable] = { annualVolitality: annualVolitality[variable], positiveAnnualVolitality: positiveAnnualVolitality[variable], negativeAnnualVolitality: negativeAnnualVolitality[variable] };
    ratios[variable] = { plRatio: positiveAnnualVolitality[variable].mean / Math.abs(negativeAnnualVolitality[variable].mean || 1), glRatio: ((positiveAnnualVolitality[variable].mean / Math.abs(negativeAnnualVolitality[variable].mean || 1)) * positiveAnnualVolitality[variable].numOfMonths) / negativeAnnualVolitality[variable].numOfMonths };
  }
  let fundReturns = {
    cumulativeReturn: cumulativeReturn,
    negativeReturn: negativeReturn,
    positiveReturn: positiveReturn,
    negativeReturnsHashTable: negativeReturnsHashTable,
    positiveReturnsHashTable: positiveReturnsHashTable,
    returnsHashTable: returnsHashTable,
    numOfMonthsPositive: positiveReturns,
    numOfMonthsNegative: negativeReturns,
  };

  return { monthlyReturns: transformData(monthlyReturns, yearlyReturns), maxDrawdown: maxDrawdown, annulizedReturn: annulizedReturn, volitality: volitality, variance: variance, ratios: ratios, normal: normal, fundReturns: fundReturns, returns: returns, negativeAnnualVolitality: negativeAnnualVolitality, cumulativeReturnsHashTable: cumulativeReturnsHashTable };
}

export async function getFactSheetData(collectionName: any, from: any, to: any, variable: any) {
  try {
    // Connect to MongoDB
    const database = client.db("factsheet");
    const collection = database.collection(collectionName);

    const startDate = new Date(from).getTime();
    const endDate = new Date(to).getTime();

    const query = {
      timestamp: { $gte: startDate, $lte: endDate },
    };

    // Modify the find query to include a filter for timestamps after May 2015
    let report = await collection.find(query).sort({ timestamp: 1 }).toArray();
    report = report.filter((data: any) => data.data[variable] != null);
    return report;
  } catch (error) {
    console.error("Failed in bulk operation:", error);
  }
}

export let treasuryData: any = {
  "30/5/2024": 5.405,
  "30/4/2024": 5.4,
  "29/3/2024": 5.371,
  "29/2/2024": 5.384,
  "31/1/2024": 5.368,
  "29/12/2023": 5.344,
  "30/11/2023": 5.394,
  "31/10/2023": 5.469,
  "29/9/2023": 5.451,
  "31/8/2023": 5.451,
  "31/7/2023": 5.416,
  "30/6/2023": 5.298,
  "31/5/2023": 5.403,
  "28/4/2023": 5.056,
  "31/3/2023": 4.749,
  "28/2/2023": 4.812,
  "31/1/2023": 4.665,
  "30/12/2022": 4.374,
  "30/11/2022": 4.349,
  "31/10/2022": 4.074,
  "30/9/2022": 3.27,
  "31/8/2022": 2.925,
  "29/7/2022": 2.364,
  "30/6/2022": 1.667,
  "31/5/2022": 1.058,
  "29/4/2022": 0.834,
  "31/3/2022": 0.496,
  "28/2/2022": 0.307,
  "31/1/2022": 0.186,
  "31/12/2021": 0.044,
  "30/11/2021": 0.051,
  "29/10/2021": 0.055,
  "30/9/2021": 0.037,
  "31/8/2021": 0.041,
  "30/7/2021": 0.043,
  "30/6/2021": 0.043,
  "31/5/2021": 0.01,
  "30/4/2021": 0.009,
  "31/3/2021": 0.018,
  "26/2/2021": 0.038,
  "29/1/2021": 0.052,
  "31/12/2020": 0.072,
  "30/11/2020": 0.076,
  "30/10/2020": 0.089,
  "30/9/2020": 0.097,
  "31/8/2020": 0.101,
  "31/7/2020": 0.091,
  "30/6/2020": 0.139,
  "29/5/2020": 0.139,
  "30/4/2020": 0.1,
  "31/3/2020": 0.092,
  "28/2/2020": 1.284,
  "31/1/2020": 1.547,
  "31/12/2019": 1.549,
  "29/11/2019": 1.575,
  "31/10/2019": 1.535,
  "30/9/2019": 1.816,
  "30/8/2019": 1.983,
  "31/7/2019": 2.065,
  "28/6/2019": 2.093,
  "31/5/2019": 2.342,
  "30/4/2019": 2.418,
  "29/3/2019": 2.389,
  "28/2/2019": 2.436,
  "31/1/2019": 2.39,
  "31/12/2018": 2.361,
  "30/11/2018": 2.345,
  "31/10/2018": 2.328,
  "28/9/2018": 2.2,
  "31/8/2018": 2.098,
  "31/7/2018": 2.023,
  "29/6/2018": 1.917,
  "31/5/2018": 1.9,
  "30/4/2018": 1.802,
  "30/3/2018": 1.706,
  "28/2/2018": 1.656,
  "31/1/2018": 1.459,
  "29/12/2017": 1.382,
  "30/11/2017": 1.26,
  "31/10/2017": 1.132,
  "29/9/2017": 1.049,
  "31/8/2017": 0.994,
  "31/7/2017": 1.075,
  "30/6/2017": 1.014,
  "31/5/2017": 0.973,
  "28/4/2017": 0.795,
  "31/3/2017": 0.754,
  "28/2/2017": 0.607,
  "31/1/2017": 0.515,
  "30/12/2016": 0.5,
  "30/11/2016": 0.48,
  "31/10/2016": 0.302,
  "30/9/2016": 0.276,
  "31/8/2016": 0.332,
  "29/7/2016": 0.256,
  "30/6/2016": 0.261,
  "31/5/2016": 0.287,
  "29/4/2016": 0.211,
  "31/3/2016": 0.201,
  "29/2/2016": 0.318,
  "29/1/2016": 0.313,
  "31/12/2015": 0.165,
  "30/11/2015": 0.17,
  "30/10/2015": 0.074,
  "30/9/2015": -0.015,
  "31/8/2015": 0.003,
  "31/7/2015": 0.064,
  "30/6/2015": 0.008,
  "30/5/2015": 0.003,
};

export let monthlyData: any = {
  "05/2015": { a2: 1000.029, a3: null, a4: 1000.029, a5: null, a6: null },
  "06/2015": { a2: 1005.53, a3: null, a4: 1005.53, a5: null, a6: null },
  "07/2015": { a2: 1018.64, a3: null, a4: 1018.64, a5: null, a6: null },
  "08/2015": { a2: 1007.34, a3: null, a4: 1007.34, a5: null, a6: null },
  "09/2015": { a2: 1013, a3: null, a4: 1013, a5: null, a6: null },
  "10/2015": { a2: 1040.03, a3: null, a4: 1040.03, a5: null, a6: null },
  "11/2015": { a2: 1042.09, a3: null, a4: 1042.09, a5: null, a6: null },
  "12/2015": { a2: 1035.53, a3: null, a4: 1035.53, a5: null, a6: null },
  "01/2016": { a2: 1059.09, a3: null, a4: 1059.09, a5: null, a6: null },
  "02/2016": { a2: 1082.37, a3: null, a4: 1082.37, a5: null, a6: null },
  "03/2016": { a2: 1118.06, a3: null, a4: 1118.06, a5: null, a6: null },
  "04/2016": { a2: 1151.44, a3: null, a4: 1151.44, a5: null, a6: null },
  "05/2016": { a2: 1181.44, a3: null, a4: 1181.44, a5: null, a6: null },
  "06/2016": { a2: 1205.71, a3: 1018.05, a4: 1205.71, a5: 1018.05, a6: 1018.05 },
  "07/2016": { a2: 1248.59, a3: 1050.3, a4: 1248.59, a5: 1050.3, a6: 1050.3 },
  "08/2016": { a2: 1277.54, a3: 1071.87, a4: 1277.54, a5: 1071.87, a6: 1071.87 },
  "09/2016": { a2: 1315.53, a3: 1100.31, a4: 1315.53, a5: 1100.31, a6: 1100.31 },
  "10/2016": { a2: 1333, a3: 1113.06, a4: 1333, a5: 1113.06, a6: 1113.06 },
  "11/2016": { a2: 1338.24, a3: 1116.47, a4: 1338.24, a5: 1116.47, a6: 1116.47 },
  "12/2016": { a2: 1345.31, a3: 1121.27, a4: 1345.31, a5: 1121.27, a6: 1121.27 },
  "01/2017": { a2: 1370.86, a3: 1140.2, a4: 1370.86, a5: 1140.2, a6: 1140.2 },
  "02/2017": { a2: 1409.44, a3: 1169.05, a4: 1409.44, a5: 1169.05, a6: 1169.05 },
  "03/2017": { a2: 1436.94, a3: 1189.41, a4: 1436.94, a5: 1189.41, a6: 1189.41 },
  "04/2017": { a2: 1454.12, a3: 1201.88, a4: 1454.12, a5: 1201.88, a6: 1201.88 },
  "05/2017": { a2: 1460.29, a3: 1205.95, a4: 1460.29, a5: 1205.95, a6: 1205.95 },
  "06/2017": { a2: 1450.27, a3: 1197.69, a4: 1450.27, a5: 1197.69, a6: 1197.69 },
  "07/2017": { a2: 1472.52, a3: 1214, a4: 1472.52, a5: 1214, a6: 1214 },
  "08/2017": { a2: 1496.09, a3: 1231.28, a4: 1496.09, a5: 1231.28, a6: 1231.28 },
  "09/2017": { a2: 1522.15, a3: 1250.42, a4: 1522.15, a5: 1250.42, a6: 1250.42 },
  "10/2017": { a2: 1549.35, a3: 1270.42, a4: 1549.35, a5: 1270.42, a6: 1270.42 },
  "11/2017": { a2: 1553.08, a3: 1272.58, a4: 1553.08, a5: 1272.58, a6: 1272.58 },
  "12/2017": { a2: 1565.24, a3: 1281.12, a4: 1565.24, a5: 1281.12, a6: 1281.12 },
  "01/2018": { a2: 1582.17, a3: 1293.16, a4: 1582.17, a5: 1293.16, a6: 1293.16 },
  "02/2018": { a2: 1577.28, a3: 1288.83, a4: 1577.28, a5: 1288.83, a6: 1288.83 },
  "03/2018": { a2: 1568, a3: 1281.22, a4: 1568, a5: 1281.22, a6: 1281.22 },
  "04/2018": { a2: 1573.75, a3: 1284.86, a4: 1573.75, a5: 1284.86, a6: 1284.86 },
  "05/2018": { a2: 1563.31, a3: 1275.55, a4: 1563.31, a5: 1275.55, a6: 1275.55 },
  "06/2018": { a2: 1556.31, a3: 1269.04, a4: 1556.31, a5: 1269.04, a6: 1269.04 },
  "07/2018": { a2: 1570.37, a3: 1280.17, a4: 1570.37, a5: 1280.17, a6: 1280.17 },
  "08/2018": { a2: 1582.77, a3: 1288.93, a4: 1582.77, a5: 1288.93, a6: 1288.93 },
  "09/2018": { a2: 1604.5, a3: 1304.48, a4: 1604.5, a5: 1304.48, a6: 1304.48 },
  "10/2018": { a2: 1582.39, a3: 1287.32, a4: 1582.39, a5: 1287.32, a6: 1287.32 },
  "11/2018": { a2: 1595.53, a3: 1296.44, a4: 1595.53, a5: 1296.44, a6: 1296.44 },
  "12/2018": { a2: 1597.13, a3: 1296.96, a4: 1597.13, a5: 1296.96, a6: 1296.96 },
  "01/2019": { a2: 1679.2, a3: 1357.35, a4: 1679.2, a5: 1357.35, a6: 1357.35 },
  "02/2019": { a2: 1708.16, a3: 1378.17, a4: 1708.16, a5: 1378.17, a6: 1378.17 },
  "03/2019": { a2: 1753.03, a3: 1410.79, a4: 1753.03, a5: 1410.79, a6: 1410.79 },
  "04/2019": { a2: 1759.66, a3: 1414.97, a4: 1759.66, a5: 1414.97, a6: 1414.97 },
  "05/2019": { a2: 1763.76, a3: 1417.27, a4: 1763.76, a5: 1417.27, a6: 1417.27 },
  "06/2019": { a2: 1770.55, a3: 1421.56, a4: 1770.55, a5: 1421.56, a6: 1421.56 },
  "07/2019": { a2: 1776.2, a3: 1425, a4: 1776.2, a5: 1425, a6: 1425 },
  "08/2019": { a2: 1773.12, a3: 1421.97, a4: 1773.12, a5: 1421.97, a6: 1421.97 },
  "09/2019": { a2: 1775.97, a3: 1423.34, a4: 1775.97, a5: 1423.34, a6: 1423.34 },
  "10/2019": { a2: 1788.1, a3: 1431.56, a4: 1788.1, a5: 1431.56, a6: 1431.56 },
  "11/2019": { a2: 1802.53, a3: 1441.48, a4: 1802.53, a5: 1441.48, a6: 1441.48 },
  "12/2019": { a2: 1806.99, a3: 1444.01, a4: 1806.99, a5: 1444.01, a6: 1444.01 },
  "01/2020": { a2: 1831.55, a3: 1461.25, a4: 1831.55, a5: 1461.25, a6: 1461.25 },
  "02/2020": { a2: 1845.3, a3: 1470.55, a4: 1845.3, a5: 1470.55, a6: 1470.55 },
  "03/2020": { a2: 1747.99, a3: 1394.25, a4: 1747.99, a5: 1394.25, a6: 1394.25 },
  "04/2020": { a2: 1824.36, a3: 1453.72, a4: 1824.36, a5: 1453.72, a6: 1453.72 },
  "05/2020": { a2: 1832.48, a3: 1458.91, a4: 1832.48, a5: 1458.91, a6: 1458.91 },
  "06/2020": { a2: 1864.69, a3: 1481.66, a4: 1864.69, a5: 1481.66, a6: 1481.66 },
  "07/2020": { a2: 1893.02, a3: 1501.55, a4: 1893.02, a5: 1501.55, a6: 1501.55 },
  "08/2020": { a2: 1928.32, a3: 1526.5, a4: 1928.32, a5: 1526.5, a6: 1526.5 },
  "09/2020": { a2: 1909.58, a3: 1512.05, a4: 1909.58, a5: 1512.05, a6: 1512.05 },
  "10/2020": { a2: 1894.78, a3: 1500.49, a4: 1894.78, a5: 1500.49, a6: 1500.49 },
  "11/2020": { a2: 1952.68, a3: 1541.83, a4: 1952.68, a5: 1541.83, a6: 1541.83 },
  "12/2020": { a2: 2022.45, a3: 1591.75, a4: 2022.45, a5: 1591.75, a6: 1591.75 },
  "01/2021": { a2: 1918.96, a3: 1509.36, a4: 1918.96, a5: 1509.36, a6: 1509.36 },
  "02/2021": { a2: 1921.21, a3: 1510.18, a4: 1921.21, a5: 1510.18, a6: 1510.18 },
  "03/2021": { a2: 1921.42, a3: 1509.4, a4: 1921.42, a5: 1509.4, a6: 1509.4 },
  "04/2021": { a2: 1951.81, a3: 1532.32, a4: 1951.81, a5: 1532.32, a6: 1532.32 },
  "05/2021": { a2: 1977.07, a3: 1551.18, a4: 1977.07, a5: 1551.18, a6: 1551.18 },
  "06/2021": { a2: 1929.38, a3: 1512.81, a4: 1929.38, a5: 1512.81, a6: 1512.81 },
  "07/2021": { a2: 1804.79, a3: 1414.23, a4: 1804.79, a5: 1414.23, a6: 1414.23 },
  "08/2021": { a2: 1795.63, a3: 1406.18, a4: 1795.63, a5: 1406.18, a6: 1406.18 },
  "09/2021": { a2: 1712.58, a3: 1340.3, a4: 1712.58, a5: 1340.3, a6: 1340.3 },
  "10/2021": { a2: 1509.62, a3: 1180.72, a4: 1509.62, a5: 1180.72, a6: 1180.72 },
  "11/2021": { a2: 1477.16, a3: 1154.61, a4: 1477.16, a5: 1154.61, a6: 1154.61 },
  "12/2021": { a2: 1475.79, a3: 1152.82, a4: 1000, a5: 1000, a6: 1000 },
  "01/2022": { a2: 1468.55, a3: 1146.49, a4: 995.29, a5: 994.67, a6: 994.88 },
  "02/2022": { a2: 1363.1, a3: 1063.49, a4: 924.01, a5: 922.86, a6: 923.24 },
  "03/2022": { a2: 1366.81, a3: 1065.72, a4: 926.72, a5: 924.99, a6: 925.57 },
  "04/2022": { a2: 1306.59, a3: 1018.14, a4: 886.08, a5: 883.87, a6: 884.6 },
  "05/2022": { a2: 1295.15, a3: 1008.59, a4: 878.5, a5: 875.76, a6: 876.67 },
  "06/2022": { a2: 1252.6, a3: 974.84, a4: 849.82, a5: 846.63, a6: 847.7 },
  "07/2022": { a2: 1237.95, a3: 962.83, a4: 840.05, a5: 836.38, a6: 837.6 },
  "08/2022": { a2: 1275.2, a3: 991.18, a4: 865.51, a5: 861.19, a6: 862.62 },
  "09/2022": { a2: 1277.59, a3: 992.43, a4: 867.32, a5: 862.45, a6: 864.07 },
  "10/2022": { a2: 1228.59, a3: 953.77, a4: 834.23, a5: 829.02, a6: 830.75 },
  "11/2022": { a2: 1243.32, a3: 964.6, a4: 844.4, a5: 838.61, a6: 840.54 },
  "12/2022": { a2: 1262.17, a3: 978.61, a4: 857.38, a5: 850.97, a6: 853.1 },
  "01/2023": { a2: 1290.29, a3: 999.79, a4: 876.67, a5: 869.57, a6: 871.93 },
  "02/2023": { a2: 1293.41, a3: 1001.58, a4: 878.97, a5: 871.31, a6: 873.85 },
  "03/2023": { a2: 1291.16, a3: 999.21, a4: 877.62, a5: 869.43, a6: 872.15 },
  "04/2023": { a2: 1303.34, a3: 1008, a4: 886.09, a5: 877.26, a6: 880.2 },
  "05/2023": { a2: 1305.19, a3: 1008.81, a4: 887.53, a5: 878.14, a6: 881.26 },
  "06/2023": { a2: 1313.79, a3: 1014.81, a4: 893.56, a5: 883.56, a6: 886.88 },
  "07/2023": { a2: 1332.34, a3: 1028.5, a4: 906.37, a5: 895.66, a6: 899.22 },
  "08/2023": { a2: 1322.02, a3: 1019.89, a4: 899.53, a5: 888.35, a6: 892.06 },
  "09/2023": { a2: 1322.89, a3: 1019.93, a4: 900.32, a5: 888.57, a6: 892.47 },
  "10/2023": { a2: 1308.76, a3: 1008.4, a4: 890.89, a5: 878.71, a6: 882.75 },
  "11/2023": { a2: 1352.05, a3: 1041.1, a4: 920.55, a5: 907.4, a6: 911.76 },
  "12/2023": { a2: 1379.93, a3: 1061.91, a4: 939.72, a5: 925.72, a6: 930.36 },
  "01/2024": { a2: 1404.46, a3: 1080.11, a4: 956.63, a5: 941.79, a6: 946.71 },
  "02/2024": { a2: 1422.73, a3: 1093.48, a4: 969.28, a5: 953.64, a6: 958.83 },
  "03/2024": { a2: 1431.79, a3: 1099.75, a4: 975.65, a5: 959.31, a6: 964.73 },
  "04/2024": { a2: 1430.52, a3: 1098.44, a4: 975, a5: 958.16, a6: 963.77 },
  "05/2024": { a2: 1454.84, a3: 1116.06, a4: 991.36, a5: 973.5, a6: 979.44 },
};

export let lg30truu: any = {
  "29/5/2024": 1564.215,
  "29/4/2024": 1541.284,
  "29/3/2024": 1554.347,
  "29/2/2024": 1531.19,
  "31/1/2024": 1519.125,
  "29/12/2023": 1521.999,
  "30/11/2023": 1463.106,
  "31/10/2023": 1388.692,
  "29/9/2023": 1401.972,
  "31/8/2023": 1424.61,
  "31/7/2023": 1431.894,
  "30/6/2023": 1404.411,
  "31/5/2023": 1369.465,
  "28/4/2023": 1385.417,
  "31/3/2023": 1376.641,
  "28/2/2023": 1364.076,
  "31/1/2023": 1390.396,
  "30/12/2022": 1334.639,
  "30/11/2022": 1325.917,
  "31/10/2022": 1262.663,
  "30/9/2022": 1236.149,
  "31/8/2022": 1302.407,
  "29/7/2022": 1322.381,
  "30/6/2022": 1270.984,
  "31/5/2022": 1374.428,
  "29/4/2022": 1375.709,
  "31/3/2022": 1441.915,
  "28/2/2022": 1454.397,
  "31/1/2022": 1490.077,
  "31/12/2021": 1528.887,
  "30/11/2021": 1501.108,
  "29/10/2021": 1531.508,
  "30/9/2021": 1539.749,
  "31/8/2021": 1556.907,
  "30/7/2021": 1547.059,
  "30/6/2021": 1545.413,
  "31/5/2021": 1542.389,
  "30/4/2021": 1528.059,
  "31/3/2021": 1499.526,
  "26/2/2021": 1513.531,
  "29/1/2021": 1511.478,
  "31/12/2020": 1513.969,
  "30/11/2020": 1477.503,
  "30/10/2020": 1407.332,
  "30/9/2020": 1406.305,
  "31/8/2020": 1433.082,
  "31/7/2020": 1410.006,
  "30/6/2020": 1348.645,
  "29/5/2020": 1318.625,
  "30/4/2020": 1254.603,
  "31/3/2020": 1202.082,
  "28/2/2020": 1390.434,
  "31/1/2020": 1416.367,
  "31/12/2019": 1414.563,
  "29/11/2019": 1378.84,
  "31/10/2019": 1377.749,
  "30/9/2019": 1366.718,
  "30/8/2019": 1360.27,
  "31/7/2019": 1381.765,
  "28/6/2019": 1375.872,
  "31/5/2019": 1333.475,
  "30/4/2019": 1347.475,
  "29/3/2019": 1336.199,
  "28/2/2019": 1330.043,
  "31/1/2019": 1311.829,
  "31/12/2018": 1256.6684,
  "30/11/2018": 1266.1663,
  "31/10/2018": 1278.3626,
  "28/9/2018": 1302.0689,
  "31/8/2018": 1284.472,
  "31/7/2018": 1297.8874,
  "29/6/2018": 1276.7616,
  "31/5/2018": 1282.5434,
  "30/4/2018": 1302.1558,
  "30/3/2018": 1305.1303,
  "28/2/2018": 1307.0181,
  "31/1/2018": 1325.4897,
  "29/12/2017": 1309.8409,
  "30/11/2017": 1303.8109,
  "31/10/2017": 1303.4085,
  "29/9/2017": 1298.5914,
  "31/8/2017": 1289.776,
  "31/7/2017": 1281.756,
  "30/6/2017": 1262.754,
  "31/5/2017": 1260.633,
  "28/4/2017": 1244.939,
  "31/3/2017": 1223.759,
  "28/2/2017": 1223.051,
  "31/1/2017": 1208.062,
  "30/12/2016": 1186.09,
  "30/11/2016": 1165.7,
  "31/10/2016": 1184.4944,
  "30/9/2016": 1188.365,
  "31/8/2016": 1179.15,
  "29/7/2016": 1157.269,
  "30/6/2016": 1128.529,
  "31/5/2016": 1118.168,
  "29/4/2016": 1117.801,
  "31/3/2016": 1080.621,
  "29/2/2016": 1029.126,
  "29/1/2016": 1022.48,
  "31/12/2015": 1037.933,
  "30/11/2015": 1058.473,
  "30/10/2015": 1078.4776,
  "30/9/2015": 1046.9512,
  "31/8/2015": 1070.713,
  "31/7/2015": 1084.254,
  "30/6/2015": 1087.602,
};

export let beuytruu: any = {
  "29/5/2024": 209.6806,
  "29/4/2024": 204.5551,
  "29/3/2024": 205.5342,
  "29/2/2024": 201.8762,
  "31/1/2024": 198.5051,
  "29/12/2023": 193.5439,
  "30/11/2023": 189.7018,
  "31/10/2023": 181.9793,
  "29/9/2023": 182.6958,
  "31/8/2023": 181.6283,
  "31/7/2023": 186.9146,
  "30/6/2023": 188.6661,
  "31/5/2023": 183.9958,
  "28/4/2023": 188.7359,
  "31/3/2023": 189.8076,
  "28/2/2023": 193.8017,
  "31/1/2023": 196.5759,
  "30/12/2022": 184.9303,
  "30/11/2022": 173.49,
  "31/10/2022": 153.8387,
  "30/9/2022": 166.8681,
  "31/8/2022": 178.6542,
  "29/7/2022": 172.3585,
  "30/6/2022": 178.869,
  "31/5/2022": 189.866,
  "29/4/2022": 195.5238,
  "31/3/2022": 197.8855,
  "28/2/2022": 203.4706,
  "31/1/2022": 213.2161,
  "31/12/2021": 221.3517,
  "30/11/2021": 224.0986,
  "29/10/2021": 226.7524,
  "30/9/2021": 239.5743,
  "31/8/2021": 250.1008,
  "30/7/2021": 244.6918,
  "30/6/2021": 254.5741,
  "31/5/2021": 257.9431,
  "30/4/2021": 255.9492,
  "31/3/2021": 252.7659,
  "26/2/2021": 253.592,
  "29/1/2021": 252.4675,
  "31/12/2020": 252.2107,
  "30/11/2020": 247.6018,
  "30/10/2020": 241.6722,
  "30/9/2020": 242.8422,
  "31/8/2020": 247.2555,
  "31/7/2020": 242.038,
  "30/6/2020": 236.4203,
  "29/5/2020": 228.2939,
  "30/4/2020": 221.2717,
  "31/3/2020": 212.0796,
  "28/2/2020": 241.6289,
  "31/1/2020": 241.1702,
  "31/12/2019": 239.6441,
  "29/11/2019": 237.6784,
  "31/10/2019": 236.9375,
  "30/9/2019": 233.5941,
  "30/8/2019": 232.4289,
  "31/7/2019": 234.835,
  "28/6/2019": 233.5024,
  "31/5/2019": 230.0556,
  "30/4/2019": 229.9406,
  "29/3/2019": 229.0585,
  "28/2/2019": 223.1493,
  "31/1/2019": 219.9171,
  "31/12/2018": 212.7746,
  "30/11/2018": 209.5629,
  "31/10/2018": 209.7654,
  "28/9/2018": 214.9733,
  "31/8/2018": 213.9506,
  "31/7/2018": 214.1525,
  "29/6/2018": 210.0622,
  "31/5/2018": 213.6644,
  "30/4/2018": 216.2101,
  "30/3/2018": 218.0658,
  "28/2/2018": 219.4103,
  "31/1/2018": 220.9196,
  "29/12/2017": 220.2803,
  "30/11/2017": 219.5193,
  "31/10/2017": 220.2164,
  "29/9/2017": 218.5001,
  "31/8/2017": 217.3552,
  "31/7/2017": 215.094,
  "30/6/2017": 213.2929,
  "31/5/2017": 213.3617,
  "28/4/2017": 214.7595,
  "31/3/2017": 213.2932,
  "28/2/2017": 212.5814,
  "31/1/2017": 208.9942,
  "30/12/2016": 206.1092,
  "30/11/2016": 205.2614,
  "31/10/2016": 207.1261,
  "30/9/2016": 206.3952,
  "31/8/2016": 205.0568,
  "29/7/2016": 204.0044,
  "30/6/2016": 199.391,
  "31/5/2016": 196.4028,
  "29/4/2016": 194.6085,
  "31/3/2016": 191.2175,
  "29/2/2016": 184.9747,
  "29/1/2016": 183.9046,
  "31/12/2015": 184.8829,
  "30/11/2015": 185.9623,
  "30/10/2015": 186.4787,
  "30/9/2015": 179.8764,
  "31/8/2015": 180.9855,
  "31/7/2015": 184.7908,
  "30/6/2015": 184.6587,
  "29/5/2015": 183.9021,
  "30/4/2015": 183.2312,
  "31/3/2015": 179.7456,
  "27/2/2015": 179.252,
  "30/1/2015": 177.2277,
  "31/12/2014": 176.5508,
  "28/11/2014": 179.7106,
  "31/10/2014": 179.3097,
  "30/9/2014": 178.0952,
  "29/8/2014": 179.7436,
  "31/7/2014": 178.3705,
};

export let emustruu: any = {
  "29/5/2024": 1189.556,
  "29/4/2024": 1169.407,
  "29/3/2024": 1188.987,
  "29/2/2024": 1168.854,
  "31/1/2024": 1164.461,
  "29/12/2023": 1171.058,
  "30/11/2023": 1123.852,
  "31/10/2023": 1067.263,
  "29/9/2023": 1083.273,
  "31/8/2023": 1108.519,
  "31/7/2023": 1121.995,
  "30/6/2023": 1108.902,
  "31/5/2023": 1092.604,
  "28/4/2023": 1100.904,
  "31/3/2023": 1096.585,
  "28/2/2023": 1083.122,
  "31/1/2023": 1107.865,
  "30/12/2022": 1073.505,
  "30/11/2022": 1064.459,
  "31/10/2022": 998.2557,
  "30/9/2022": 1007.138,
  "31/8/2022": 1066.051,
  "29/7/2022": 1071.828,
  "30/6/2022": 1049.728,
  "31/5/2022": 1100.03,
  "29/4/2022": 1100.2,
  "31/3/2022": 1149.959,
  "28/2/2022": 1177.464,
  "31/1/2022": 1233.478,
  "31/12/2021": 1266.84,
  "30/11/2021": 1254.603,
  "29/10/2021": 1268.181,
  "30/9/2021": 1273.491,
  "31/8/2021": 1295.025,
  "30/7/2021": 1282.53,
  "30/6/2021": 1280.483,
  "31/5/2021": 1271.371,
  "30/4/2021": 1259.798,
  "31/3/2021": 1243.297,
  "26/2/2021": 1259.04,
  "29/1/2021": 1277.197,
  "31/12/2020": 1288.137,
  "30/11/2020": 1268.911,
  "30/10/2020": 1231.117,
  "30/9/2020": 1232.647,
  "31/8/2020": 1248.426,
  "31/7/2020": 1241.698,
  "30/6/2020": 1204.122,
  "29/5/2020": 1174.844,
  "30/4/2020": 1123.052,
  "31/3/2020": 1094.642,
  "28/2/2020": 1225.523,
  "31/1/2020": 1227.939,
  "31/12/2019": 1209.285,
  "29/11/2019": 1191.17,
  "31/10/2019": 1190.827,
  "30/9/2019": 1184.503,
  "30/8/2019": 1184.067,
  "31/7/2019": 1181.125,
  "28/6/2019": 1169.483,
  "31/5/2019": 1138.648,
  "30/4/2019": 1131.685,
  "29/3/2019": 1127.205,
  "28/2/2019": 1112.019,
  "31/1/2019": 1103.185,
  "31/12/2018": 1069.1127,
  "30/11/2018": 1054.705,
  "31/10/2018": 1056.3934,
  "28/9/2018": 1071.0266,
  "31/8/2018": 1057.0093,
  "31/7/2018": 1071.4297,
  "29/6/2018": 1054.0208,
  "31/5/2018": 1061.072,
  "30/4/2018": 1068.8702,
  "30/3/2018": 1079.8943,
  "28/2/2018": 1079.2784,
  "31/1/2018": 1094.1858,
  "29/12/2017": 1096.0681,
  "30/11/2017": 1091.8585,
  "31/10/2017": 1093.5031,
  "29/9/2017": 1089.332,
  "31/8/2017": 1088.6936,
  "31/7/2017": 1074.1751,
  "30/6/2017": 1065.1086,
  "31/5/2017": 1067.187,
  "28/4/2017": 1059.6214,
  "31/3/2017": 1046.5866,
  "28/2/2017": 1043.2559,
  "31/1/2017": 1026.003,
  "30/12/2016": 1013.3249,
  "30/11/2016": 1001.9254,
  "31/10/2016": 1033.729,
  "30/9/2016": 1040.4327,
  "31/8/2016": 1038.4334,
  "29/7/2016": 1024.181,
  "30/6/2016": 1008.878,
  "31/5/2016": 980.7968,
  "29/4/2016": 980.8723,
  "31/3/2016": 963.9097,
  "29/2/2016": 935.2223,
  "29/1/2016": 921.9492,
  "31/12/2015": 922.1997,
  "30/11/2015": 935.296,
  "30/10/2015": 937.7966,
  "30/9/2015": 913.2438,
  "31/8/2015": 924.8861,
  "31/7/2015": 936.7893,
  "30/6/2015": 935.5775,
};
export let beuctruu: any = {
  "30/5/2024": 194.63,

  "30/4/2024": 191.3954,
  "29/3/2024": 194.1278,
  "29/2/2024": 192.2694,
  "31/1/2024": 192.6428,
  "29/12/2023": 192.019,
  "30/11/2023": 186.474,
  "31/10/2023": 179.3821,
  "29/9/2023": 180.8514,
  "31/8/2023": 183.0715,
  "31/7/2023": 185.0105,
  "30/6/2023": 184.8671,
  "31/5/2023": 184.2583,
  "28/4/2023": 185.6663,
  "31/3/2023": 184.4937,
  "28/2/2023": 182.3397,
  "31/1/2023": 185.0309,
  "30/12/2022": 179.3702,
  "30/11/2022": 176.6729,
  "31/10/2022": 166.9487,
  "30/9/2022": 172.6487,
  "31/8/2022": 180.0819,
  "29/7/2022": 180.7773,
  "30/6/2022": 180.2553,
  "31/5/2022": 184.5302,
  "29/4/2022": 184.9258,
  "31/3/2022": 189.904,
  "28/2/2022": 194.6715,
  "31/1/2022": 198.917,
  "31/12/2021": 203.9716,
  "30/11/2021": 204.3148,
  "29/10/2021": 204.5067,
  "30/9/2021": 207.1563,
  "31/8/2021": 210.6606,
  "30/7/2021": 208.4577,
  "30/6/2021": 209.3629,
  "31/5/2021": 208.7324,
  "30/4/2021": 207.5263,
  "31/3/2021": 206.7719,
  "26/2/2021": 208.4569,
  "29/1/2021": 209.6611,
  "31/12/2020": 209.8117,
  "30/11/2020": 208.3944,
  "30/10/2020": 205.3379,
  "30/9/2020": 205.6488,
  "31/8/2020": 207.0802,
  "31/7/2020": 205.9333,
  "30/6/2020": 201.1623,
  "29/5/2020": 197.5635,
  "30/4/2020": 192.8992,
  "31/3/2020": 189.3128,
  "28/2/2020": 201.8428,
  "31/1/2020": 199.4723,
  "31/12/2019": 196.4742,
  "29/11/2019": 195.7421,
  "31/10/2019": 195.4857,
  "30/9/2019": 194.3058,
  "30/8/2019": 194.6635,
  "31/7/2019": 191.7543,
  "28/6/2019": 190.6454,
  "31/5/2019": 187.6995,
  "30/4/2019": 185.7568,
  "29/3/2019": 185.0538,
  "28/2/2019": 181.1006,
  "31/1/2019": 179.8834,
  "31/12/2018": 176.1538,
  "30/11/2018": 173.4415,
  "31/10/2018": 172.6303,
  "28/9/2018": 174.7163,
  "31/8/2018": 174.9911,
  "31/7/2018": 174.1967,
  "29/6/2018": 172.7483,
  "31/5/2018": 173.9819,
  "30/4/2018": 173.8982,
  "30/3/2018": 175.1194,
  "28/2/2018": 175.1273,
  "31/1/2018": 176.5892,
  "29/12/2017": 177.6416,
  "30/11/2017": 177.1559,
  "31/10/2017": 177.669,
  "29/9/2017": 176.7809,
  "31/8/2017": 177.0206,
  "31/7/2017": 175.2462,
  "30/6/2017": 174.0581,
  "31/5/2017": 173.9605,
  "28/4/2017": 173.204,
  "31/3/2017": 172.2856,
  "28/2/2017": 171.8637,
  "31/1/2017": 169.6218,
  "30/12/2016": 168.2599,
  "30/11/2016": 168.1388,
  "31/10/2016": 171.8199,
  "30/9/2016": 172.8275,
  "31/8/2016": 172.7761,
  "29/7/2016": 171.7799,
  "30/6/2016": 169.3053,
  "31/5/2016": 166.4155,
  "29/4/2016": 165.9955,
  "31/3/2016": 164.6612,
  "29/2/2016": 161.6327,
  "29/1/2016": 160.6749,
  "31/12/2015": 158.9902,
  "30/11/2015": 159.3571,
  "30/10/2015": 159.444,
  "30/9/2015": 157.1361,
  "31/8/2015": 157.0386,
  "31/7/2015": 158.6199,
  "30/6/2015": 157.8878,
};
export let legatruu: any = {
  "29/5/2024": 455.8279,
  "29/4/2024": 449.9313,
  "29/3/2024": 461.58,
  "29/2/2024": 459.0528,
  "31/1/2024": 464.8953,
  "29/12/2023": 471.3998,
  "30/11/2023": 452.5896,
  "31/10/2023": 430.8629,
  "29/9/2023": 436.0752,
  "31/8/2023": 449.1976,
  "31/7/2023": 455.4279,
  "30/6/2023": 452.2958,
  "31/5/2023": 452.3312,
  "28/4/2023": 461.3495,
  "31/3/2023": 459.3227,
  "28/2/2023": 445.2434,
  "31/1/2023": 460.5541,
  "30/12/2022": 445.9152,
  "30/11/2022": 443.5168,
  "31/10/2022": 423.5826,
  "30/9/2022": 426.5159,
  "31/8/2022": 449.6171,
  "29/7/2022": 468.0885,
  "30/6/2022": 458.3446,
  "31/5/2022": 473.5394,
  "29/4/2022": 472.2504,
  "31/3/2022": 499.6239,
  "28/2/2022": 515.3167,
  "31/1/2022": 521.5153,
  "31/12/2021": 532.4266,
  "30/11/2021": 533.171,
  "29/10/2021": 534.7351,
  "30/9/2021": 536.0307,
  "31/8/2021": 545.7278,
  "30/7/2021": 548.0067,
  "30/6/2021": 540.8085,
  "31/5/2021": 545.6221,
  "30/4/2021": 540.5455,
  "31/3/2021": 533.802,
  "26/2/2021": 544.272,
  "29/1/2021": 553.8047,
  "31/12/2020": 558.7254,
  "30/11/2020": 551.3198,
  "30/10/2020": 541.4746,
  "30/9/2020": 540.9572,
  "31/8/2020": 542.91,
  "31/7/2020": 543.739,
  "30/6/2020": 526.9333,
  "29/5/2020": 522.2931,
  "30/4/2020": 520.0118,
  "31/3/2020": 509.9988,
  "28/2/2020": 521.688,
  "31/1/2020": 518.2026,
  "31/12/2019": 511.6712,
  "29/11/2019": 508.7047,
  "31/10/2019": 512.5915,
  "30/9/2019": 509.2007,
  "30/8/2019": 514.4333,
  "31/7/2019": 504.1809,
  "28/6/2019": 505.5858,
  "31/5/2019": 494.6193,
  "30/4/2019": 488.0109,
  "29/3/2019": 489.4602,
  "28/2/2019": 483.4082,
  "31/1/2019": 486.2068,
  "31/12/2018": 478.9153,
  "30/11/2018": 469.4245,
  "31/10/2018": 467.9611,
  "28/9/2018": 473.2476,
  "31/8/2018": 477.3626,
  "31/7/2018": 476.8624,
  "29/6/2018": 477.6598,
  "31/5/2018": 479.7931,
  "30/4/2018": 483.4603,
  "30/3/2018": 491.33,
  "28/2/2018": 486.1554,
  "31/1/2018": 490.5078,
  "29/12/2017": 484.7313,
  "30/11/2017": 483.0576,
  "31/10/2017": 477.752,
  "29/9/2017": 479.5665,
  "31/8/2017": 483.9256,
  "31/7/2017": 479.1785,
  "30/6/2017": 471.2553,
  "31/5/2017": 471.6692,
  "28/4/2017": 464.4815,
  "31/3/2017": 459.3044,
  "28/2/2017": 458.5996,
  "31/1/2017": 456.4424,
  "30/12/2016": 451.3539,
  "30/11/2016": 453.4371,
  "31/10/2016": 472.1983,
  "30/9/2016": 485.6783,
  "31/8/2016": 483.0188,
  "29/7/2016": 485.3764,
  "30/6/2016": 481.7451,
  "31/5/2016": 468.0762,
  "29/4/2016": 474.4409,
  "31/3/2016": 468.2131,
  "29/2/2016": 455.8935,
  "29/1/2016": 445.963,
  "31/12/2015": 442.1315,
  "30/11/2015": 439.7938,
  "30/10/2015": 447.1977,
  "30/9/2015": 446.2552,
  "31/8/2015": 443.9924,
  "31/7/2015": 443.4764,
  "30/6/2015": 442.485,
};

export async function uploadFSData() {
  monthlyData = trimDate(monthlyData);
  lg30truu = trimDate(lg30truu, true);
  beuytruu = trimDate(beuytruu, true);
  beuctruu = trimDate(beuctruu, true);
  emustruu = trimDate(emustruu, true);
  legatruu = trimDate(legatruu, true);
  treasuryData = trimDate(treasuryData, true);

  await updateOrInsertDataWithBulk(monthlyData, "Triada");
  await updateOrInsertDataWithBulk(legatruu, "LEGATRUU Index");
  await updateOrInsertDataWithBulk(emustruu, "EMUSTRUU Index");
  await updateOrInsertDataWithBulk(beuctruu, "BEUCTRUU Index");
  await updateOrInsertDataWithBulk(beuytruu, "BEUYTRUU Index");
  await updateOrInsertDataWithBulk(lg30truu, "LG30TRUU Index");
  await updateOrInsertDataWithBulk(treasuryData, "3 Month Treasury");
}

export function trimDate(data: any, benchmark = false) {
  let keys = Object.keys(data);
  let final = [];
  for (let index = 0; index < keys.length; index++) {
    let date = keys[index];
    let dateArr = date.split("/");
    let dateFinal = "";
    if (dateArr.length > 2) {
      let month = dateArr[1];
      let year = dateArr[2];
      if (parseInt(month) < 10) {
        month = "0" + month;
      }
      dateFinal = month + "/" + year;
      data[dateFinal] = data[date];
      delete data[date];
    } else {
      dateFinal = date;
    }
    let dateComponenets = dateFinal.split("/");
    let timestamp = new Date(dateComponenets[0] + "/01/" + dateComponenets[1]).getTime();
    let object: any = {};
    if (benchmark) {
      object = {
        date: dateFinal,
        timestamp: timestamp,
        data: { main: data[dateFinal] },
      };
    } else {
      let timestampTest = new Date("2021-11-30").getTime() < timestamp;
      if (!timestampTest) {
        object = {
          date: dateFinal,
          timestamp: timestamp,
          data: data[dateFinal],
        };

        object.data.a4 = object.data.a4 * beforeSwitchRatios.a4;
        object.data.a5 = object.data.a5 * beforeSwitchRatios.a5;
        object.data.a6 = object.data.a6 * beforeSwitchRatios.a6;

        console.log(timestampTest);
      } else {
        object = {
          date: dateFinal,
          timestamp: timestamp,
          data: data[dateFinal],
        };
      }
    }

    final.push(object);
  }
  return final;
}

async function updateOrInsertDataWithBulk(entries: any, collectionName: any) {
  try {
    // Connect to MongoDB
    await client.connect();
    const database = client.db("factsheet");
    const collection = database.collection(collectionName);

    // Create bulk operations array
    const bulkOps = entries.map((entry: any) => {
      return {
        updateOne: {
          filter: { date: entry.date }, // Filter to match documents based on the date
          update: { $set: { timestamp: entry.timestamp, data: entry.data } },
          upsert: true, // Insert a new document if no existing document matches
        },
      };
    });

    // Execute bulk operations
    const result = await collection.bulkWrite(bulkOps);
    console.log("Bulk operation result:", result);
  } catch (error) {
    console.error("Failed in bulk operation:", error);
  }
}

export function calculateOutPerformance({ benchmarks, data }: { benchmarks: any; data: any }) {
  let years = Object.keys(data);
  let outPerformance: any = {};
  for (let index = 0; index < years.length; index++) {
    let year: any = years[index];
    let mainPerformance = data[year]["Cumulative"];

    if (year > 2022) {
      if (!outPerformance[year]) {
        outPerformance[year] = {};
      }
      outPerformance[year]["Triada"] = {
        performance: mainPerformance,
        outPerformance: 0,
      };
    }
    for (let benchmark in benchmarks) {
      let benchmarkPerformace = benchmarks[benchmark][year]["Cumulative"];
      let outPerformanceOutput = mainPerformance - benchmarkPerformace;
      if (year > 2022) {
        outPerformance[year][benchmark] = {
          performance: benchmarkPerformace,
          outPerformance: outPerformanceOutput,
        };
      }
    }
  }
  return outPerformance;
}

export function calculateOutPerformanceParam({ benchmarks, data }: { benchmarks: any; data: any }) {
  let outPerformance: any = {};
  let mainPerformance = data;
  if (!outPerformance) {
    outPerformance = {};
  }
  outPerformance["Triada"] = {
    performance: mainPerformance,
    outPerformance: 0,
  };
  for (let benchmark in benchmarks) {
    let benchmarkPerformace = benchmarks[benchmark];
    let outPerformanceOutput = mainPerformance - benchmarkPerformace;

    outPerformance[benchmark] = {
      performance: benchmarkPerformace,
      outPerformance: outPerformanceOutput,
    };
  }
  return outPerformance;
}

export function calculateRatios({ benchmarks, data, type }: { benchmarks: any; data: any; type: "a2" | "a3" | "a4" | "a5" | "a6" }) {
  let ratios: any = {};

  let negativeCorrelation: any = {};
  let positiveCorrelation: any = {};
  for (let benchmark in benchmarks) {
    let negativeReturn = benchmarks[benchmark].negativeReturn["main"];
    let positiveReturn = benchmarks[benchmark].positiveReturn["main"];
    let numOfNegativeMonths = benchmarks[benchmark].numOfMonthsNegative["main"].length;
    let numOfPositiveMonths = benchmarks[benchmark].numOfMonthsPositive["main"].length;
    let numOfNegativeMonthsTriada = 0;
    let numOfPositiveMonthsTriada = 0;
    let triadaNegativeOutperforms = 0;
    let triadaPositiveOutperforms = 0;

    let triadaReturnInSpecifiedMonthsNegative = 1;
    let triadaReturnInSpecifiedMonthsPositive = 1;

    negativeCorrelation[benchmark] = { triada: [], main: [] };

    for (let negativeMonth in benchmarks[benchmark].negativeReturnsHashTable["main"]) {
      let triadaReturn = data.returnsHashTable[type][negativeMonth] + 1;
      if (triadaReturn) {
        negativeCorrelation[benchmark].triada.push(triadaReturn);
        negativeCorrelation[benchmark].main.push(benchmarks[benchmark].negativeReturnsHashTable["main"][negativeMonth]);
        triadaReturnInSpecifiedMonthsNegative = triadaReturnInSpecifiedMonthsNegative * triadaReturn;
        if (benchmarks[benchmark].negativeReturnsHashTable["main"][negativeMonth] < triadaReturn - 1) {
          triadaNegativeOutperforms++;
        }
        if (data.returnsHashTable[type][negativeMonth] < 0) {
          numOfNegativeMonthsTriada++;
        }
      }
    }

    positiveCorrelation[benchmark] = { triada: [], main: [] };

    for (let positiveMonth in benchmarks[benchmark].positiveReturnsHashTable["main"]) {
      let triadaReturn = data.returnsHashTable[type][positiveMonth] + 1;
      if (triadaReturn) {
        positiveCorrelation[benchmark].triada.push(triadaReturn);
        positiveCorrelation[benchmark].main.push(benchmarks[benchmark].positiveReturnsHashTable["main"][positiveMonth]);
        triadaReturnInSpecifiedMonthsPositive = triadaReturnInSpecifiedMonthsPositive * triadaReturn;
        if (benchmarks[benchmark].positiveReturnsHashTable["main"][positiveMonth] < triadaReturn - 1) {
          triadaPositiveOutperforms++;
        }
        if (data.returnsHashTable[type][positiveMonth] > 0) {
          numOfPositiveMonthsTriada++;
        }
      }
    }

    ratios[benchmark] = {
      "Down Capture Ratio": triadaReturnInSpecifiedMonthsNegative / negativeReturn,
      "Down Number Ratio": numOfNegativeMonths / numOfNegativeMonthsTriada,
      "Down Percentage Ratio": triadaNegativeOutperforms / numOfNegativeMonths,
      "Up Capture Ratio": triadaReturnInSpecifiedMonthsPositive / positiveReturn,
      "Up Number Ratio": numOfPositiveMonths / numOfPositiveMonthsTriada,
      "Up Percentage Ratio": triadaPositiveOutperforms / numOfPositiveMonths,
    };
  }
  return { ratios, negativeCorrelation, positiveCorrelation };
}

export function calculateBetaCorrelationBenchMarks({ benchmarks, data }: { benchmarks: any; data: any }) {
  let mainMonthlyReturns = data.results;
  let mainNormal = data.normal;

  let betas: any = {};
  let correlation: any = {};

  for (let benchmark in benchmarks) {
    betas[benchmark] = 0;
    correlation[benchmark] = 0;

    let monthlyReturns = benchmarks[benchmark].results;

    let normal = benchmarks[benchmark].normal;
    let sd = normal.sd;

    let covariance = calculateCovariance(mainMonthlyReturns, monthlyReturns, mainNormal.mean, normal.mean);

    betas[benchmark] = covariance / sd ** 2;
    correlation[benchmark] = covariance / (sd * mainNormal.sd);
  }
  return { betas, correlation };
}

function calculateCovariance(array1: number[], array2: number[], mean1: number, mean2: number): number {
  if (!Array.isArray(array1) || !Array.isArray(array2)) {
    throw new Error("Input should be arrays");
  }

  if (typeof mean1 !== "number" || typeof mean2 !== "number") {
    throw new Error("Means should be numbers");
  }

  // Ensure arrays are of the same length by truncating the longer array
  const minLength = Math.min(array1.length, array2.length);
  array1 = array1.slice(0, minLength);
  array2 = array2.slice(0, minLength);

  const n = array1.length;
  if (n === 0) {
    throw new Error("Arrays are empty");
  }

  let covariance = 0;

  for (let i = 0; i < n; i++) {
    covariance += (array1[i] - mean1) * (array2[i] - mean2);
  }

  return covariance / n;
}

export function calculateRiskRatios({ benchmarks, treasuryAnnualRate }: { benchmarks: any; treasuryAnnualRate: any }) {
  let riskRatios: any = {};
  for (let benchmark in benchmarks) {
    let annulizedReturnVar = benchmarks[benchmark].annulizedReturn.annualPer;
    // console.log(annulizedReturnVar, treasuryAnnualRate);
    let mdd = benchmarks[benchmark].maxDrawdown.mdd;
    let normal = benchmarks[benchmark].normal;
    let negativeAnnualVolitality = benchmarks[benchmark].negativeAnnualVolitality;
    let beta = benchmarks[benchmark].beta;
    riskRatios[benchmark] = {
      "Calmar Ratio": annulizedReturnVar / Math.abs(mdd),
      "Sharpe Ratio": (annulizedReturnVar - treasuryAnnualRate) / (normal.sd * Math.sqrt(12)),
      "Sortino Ratio": (annulizedReturnVar - treasuryAnnualRate) / (negativeAnnualVolitality.sd * Math.sqrt(12)),
      "Sterling Ratio": annulizedReturnVar / (Math.abs(mdd) + 0.1),
      "Treynor Ratio": (annulizedReturnVar - treasuryAnnualRate) / beta,
    };
  }
  return riskRatios;
}

export function calculateRegression({ benchmarks, data, treasuryAnnualRate, correlations, annulizedReturnBenchMarks }: { benchmarks: any; data: any; treasuryAnnualRate: any; correlations: any; annulizedReturnBenchMarks: any }) {
  let regression: any = {};

  let mainMonthlyReturns = data.results;

  let mainAnnualReturn = annulizedReturnBenchMarks["Triada"].performance;

  for (let benchmark in benchmarks) {
    regression[benchmark] = {};

    let beta = benchmarks[benchmark].beta;
    let correlation = benchmarks[benchmark].correlation;
    let monthlyReturns = benchmarks[benchmark].fundReturns;
    let annulizedReturnVar = benchmarks[benchmark].annulizedReturn.annualPer;
    let sdDiff = calculateStdDevOfDifferences(monthlyReturns, mainMonthlyReturns);
    let informationRatio = (mainAnnualReturn - annulizedReturnVar) / (sdDiff * Math.sqrt(12));

    let negativeNormal = getSampleStandardDeviation(correlations.negativeCorrelation[benchmark].main);
    let negativeMainNormal = getSampleStandardDeviation(correlations.negativeCorrelation[benchmark].triada);
    let positiveNormal = getSampleStandardDeviation(correlations.positiveCorrelation[benchmark].main);
    let positiveMainNormal = getSampleStandardDeviation(correlations.positiveCorrelation[benchmark].triada);
    let upsideCorrelation = calculateCovariance(correlations.positiveCorrelation[benchmark].main, correlations.positiveCorrelation[benchmark].triada, positiveNormal.mean, positiveMainNormal.mean) / (positiveNormal.sd * positiveMainNormal.sd);
    let downCorrelation = calculateCovariance(correlations.negativeCorrelation[benchmark].main, correlations.negativeCorrelation[benchmark].triada, negativeNormal.mean, negativeMainNormal.mean) / (negativeNormal.sd * negativeMainNormal.sd);
    let activePremium = annulizedReturnBenchMarks[benchmark].outPerformance;
    let annualReturn = annulizedReturnBenchMarks[benchmark].performance;

    let alpha = mainAnnualReturn - (treasuryAnnualRate + beta * (annualReturn - treasuryAnnualRate));
    let object = { "Upside Correlation": upsideCorrelation, "Information Ratio": informationRatio, "Downside Correlation": downCorrelation, Correlation: correlation, Beta: beta, "Tracking Error": sdDiff, "Active Premium": activePremium, "Annualized Alpha": alpha };
    regression[benchmark] = object;
  }
  return { regression };
}

function calculateStdDevOfDifferences(portfolioReturns: any, benchmarkReturns: any) {
  // Calculate the differences array
  let differences = [];
  for (let month in portfolioReturns) {
    if (portfolioReturns[month] && benchmarkReturns[month]) {
      let diff = portfolioReturns[month] - benchmarkReturns[month];
      differences.push(diff);
    }
  }
  const n = differences.length;

  // Calculate the mean of differences
  const meanDifference = differences.reduce((sum: any, val: any) => sum + val, 0) / n;

  // Calculate the variance of differences
  let variance = differences.reduce((sum: any, val: any) => sum + Math.pow(val - meanDifference, 2), 0) / (n - 1);

  // Standard deviation is the square root of variance
  return Math.sqrt(variance);
}

export function getTreasuryAnnulizedReturn(data: any) {
  if (data.length === 0) {
    return 0; // Return 0 if the data is empty
  }

  // Sort the data by date in ascending order
  data.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let cumulative = 1;
  for (const {
    data: { main },
    date,
  } of data) {
    if (!main) {
      throw new Error(`Missing 'main' property for date: ${date}`);
    }

    const returnData = Math.pow(main / 100 + 1, 1 / 12);
    cumulative *= returnData;
  }
  const annualizedReturn = Math.pow(cumulative, 12 / data.length) - 1;
  return annualizedReturn;
}
export function trimFactSheetData(triada: any, others: any) {
  let months = [];
  let formmated: any = { a2: {}, a3: {}, a4: {}, a5: {}, a6: {}, "3 Month Treasury": {}, "LEGATRUU Index": {}, "EMUSTRUU Index": {}, "BEUCTRUU Index": {}, "BEUYTRUU Index": {}, "LG30TRUU Index": {} };
  for (let index = 0; index < triada.length; index++) {
    let month = triada[index].date;
    let id = triada[index]["_id"];
    let price = triada[index]["data"];
    months.push(month);
    formmated.a2[month] = { _id: id, price: price.a2, month: month, name: "a2" };
    formmated.a3[month] = { _id: id, price: price.a3, month: month, name: "a3" };
    formmated.a4[month] = { _id: id, price: price.a4, month: month, name: "a4" };
    formmated.a5[month] = { _id: id, price: price.a5, month: month, name: "a5" };
    formmated.a6[month] = { _id: id, price: price.a6, month: month, name: "a6" };
  }

  for (let name in others) {
    for (let index = 0; index < others[name].length; index++) {
      let month = others[name][index].date;
      let id = others[name][index]["_id"];
      let price = others[name][index]["data"];
      formmated[name] = formmated[name] ? formmated[name] : {};
      formmated[name][month] = { _id: id, price: price.main, month: month, name: name };
    }
  }
  return { formmated: formmated, months: months };
}

export async function getFactSheet({ from, to, type }: { from: any; to: any; type: any }) {
  let treasuryData = await getFactSheetData("3 Month Treasury", from, to, "main");
  let treasuryAnnualRate = getTreasuryAnnulizedReturn(treasuryData);
  let data = await getFactSheetData("Triada", from, to, type);
  let legatruu = await getFactSheetData("LEGATRUU Index", from, to, "main");
  let emustruu = await getFactSheetData("EMUSTRUU Index", from, to, "main");
  let beuctruu = await getFactSheetData("BEUCTRUU Index", from, to, "main");
  let beuytruu = await getFactSheetData("BEUYTRUU Index", from, to, "main");
  let lg30truu = await getFactSheetData("LG30TRUU Index", from, to, "main");
  let lastDate = getMonthName(data[data.length - 1].date);
  let result = calculateMonthlyReturn(data, [type]);
  let result_lg30truu = calculateMonthlyReturn(lg30truu, ["main"]);
  let result_beuctruu = calculateMonthlyReturn(beuctruu, ["main"]);
  let result_beuytruu = calculateMonthlyReturn(beuytruu, ["main"]);
  let result_emustruu = calculateMonthlyReturn(emustruu, ["main"]);
  let result_legatruu = calculateMonthlyReturn(legatruu, ["main"]);

  let benchmarks = { "LG30TRUU Index": result_lg30truu.monthlyReturns["main"], "BEUCTRUU Index": result_beuctruu.monthlyReturns["main"], "EMUSTRUU Index": result_emustruu.monthlyReturns["main"], "LEGATRUU Index": result_legatruu.monthlyReturns["main"], "BEUYTRUU Index": result_beuytruu.monthlyReturns["main"] };
  let annulizedReturns = { "LG30TRUU Index": result_lg30truu.annulizedReturn["main"]["annualPer"], "BEUCTRUU Index": result_beuctruu.annulizedReturn["main"]["annualPer"], "EMUSTRUU Index": result_emustruu.annulizedReturn["main"]["annualPer"], "LEGATRUU Index": result_legatruu.annulizedReturn["main"]["annualPer"], "BEUYTRUU Index": result_beuytruu.annulizedReturn["main"]["annualPer"] };
  let cumulativeReturns = { "LG30TRUU Index": result_lg30truu.fundReturns.cumulativeReturn["main"] - 1, "BEUCTRUU Index": result_beuctruu.fundReturns.cumulativeReturn["main"] - 1, "EMUSTRUU Index": result_emustruu.fundReturns.cumulativeReturn["main"] - 1, "LEGATRUU Index": result_legatruu.fundReturns.cumulativeReturn["main"] - 1, "BEUYTRUU Index": result_beuytruu.fundReturns.cumulativeReturn["main"] - 1 };
  let fundReturns = { "LG30TRUU Index": result_lg30truu.fundReturns, "BEUCTRUU Index": result_beuctruu.fundReturns, "EMUSTRUU Index": result_emustruu.fundReturns, "LEGATRUU Index": result_legatruu.fundReturns, "BEUYTRUU Index": result_beuytruu.fundReturns };

  let outPerformance = calculateOutPerformance({ benchmarks: benchmarks, data: result.monthlyReturns[type] });
  let annulizedReturnBenchMarks = calculateOutPerformanceParam({ benchmarks: annulizedReturns, data: result.annulizedReturn[type]["annualPer"] });
  let cumulativeReturnsBenchMarks = calculateOutPerformanceParam({ benchmarks: cumulativeReturns, data: result.fundReturns.cumulativeReturn[type] - 1 });
  let ratiosAndPositiveNegativeCorrelations = calculateRatios({ benchmarks: fundReturns, data: result.fundReturns, type: type });

  let benchmarksBeta = {
    "LG30TRUU Index": { results: result_lg30truu.returns["main"], normal: result_lg30truu.normal["main"] },
    "BEUCTRUU Index": { results: result_beuctruu.returns["main"], normal: result_beuctruu.normal["main"] },
    "EMUSTRUU Index": { results: result_emustruu.returns["main"], normal: result_emustruu.normal["main"] },
    "LEGATRUU Index": { results: result_legatruu.returns["main"], normal: result_legatruu.normal["main"] },
    "BEUYTRUU Index": { results: result_beuytruu.returns["main"], normal: result_beuytruu.normal["main"] },
  };

  let betaCorrelation = calculateBetaCorrelationBenchMarks({ benchmarks: benchmarksBeta, data: { results: result.returns[type], normal: result.normal[type] } });
  let benchmarksRiskRatios = {
    "LG30TRUU Index": { annulizedReturn: result_lg30truu.annulizedReturn["main"], maxDrawdown: result_lg30truu.maxDrawdown["main"], normal: result_lg30truu.normal["main"], negativeAnnualVolitality: result_lg30truu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["LG30TRUU Index"] },
    "BEUCTRUU Index": { annulizedReturn: result_beuctruu.annulizedReturn["main"], maxDrawdown: result_beuctruu.maxDrawdown["main"], normal: result_beuctruu.normal["main"], negativeAnnualVolitality: result_beuctruu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["BEUCTRUU Index"] },
    "EMUSTRUU Index": { annulizedReturn: result_emustruu.annulizedReturn["main"], maxDrawdown: result_emustruu.maxDrawdown["main"], normal: result_emustruu.normal["main"], negativeAnnualVolitality: result_emustruu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["EMUSTRUU Index"] },
    "LEGATRUU Index": { annulizedReturn: result_legatruu.annulizedReturn["main"], maxDrawdown: result_legatruu.maxDrawdown["main"], normal: result_legatruu.normal["main"], negativeAnnualVolitality: result_legatruu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["LEGATRUU Index"] },
    "BEUYTRUU Index": { annulizedReturn: result_beuytruu.annulizedReturn["main"], maxDrawdown: result_beuytruu.maxDrawdown["main"], normal: result_beuytruu.normal["main"], negativeAnnualVolitality: result_beuytruu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["BEUYTRUU Index"] },
    Triada: { annulizedReturn: result.annulizedReturn[type], maxDrawdown: result.maxDrawdown[type], normal: result.normal[type], negativeAnnualVolitality: result.negativeAnnualVolitality[type], beta: 1 },
  };
  let riskRatios = calculateRiskRatios({ benchmarks: benchmarksRiskRatios, treasuryAnnualRate: treasuryAnnualRate });

  let benchmarksRegression = {
    "LG30TRUU Index": { results: result_lg30truu.returns["main"], annulizedReturn: result_lg30truu.annulizedReturn["main"], beta: betaCorrelation.betas["LG30TRUU Index"], correlation: betaCorrelation.correlation["LG30TRUU Index"], fundReturns: result_lg30truu.fundReturns.returnsHashTable.main },
    "BEUCTRUU Index": { results: result_beuctruu.returns["main"], annulizedReturn: result_beuctruu.annulizedReturn["main"], beta: betaCorrelation.betas["BEUCTRUU Index"], correlation: betaCorrelation.correlation["BEUCTRUU Index"], fundReturns: result_beuctruu.fundReturns.returnsHashTable.main },
    "EMUSTRUU Index": { results: result_emustruu.returns["main"], annulizedReturn: result_emustruu.annulizedReturn["main"], beta: betaCorrelation.betas["EMUSTRUU Index"], correlation: betaCorrelation.correlation["EMUSTRUU Index"], fundReturns: result_emustruu.fundReturns.returnsHashTable.main },
    "LEGATRUU Index": { results: result_legatruu.returns["main"], annulizedReturn: result_legatruu.annulizedReturn["main"], beta: betaCorrelation.betas["LEGATRUU Index"], correlation: betaCorrelation.correlation["LEGATRUU Index"], fundReturns: result_legatruu.fundReturns.returnsHashTable.main },
    "BEUYTRUU Index": { results: result_beuytruu.returns["main"], annulizedReturn: result_beuytruu.annulizedReturn["main"], beta: betaCorrelation.betas["BEUYTRUU Index"], correlation: betaCorrelation.correlation["BEUYTRUU Index"], fundReturns: result_beuytruu.fundReturns.returnsHashTable.main },
  };
  let correlationAndRegresion = calculateRegression({ benchmarks: benchmarksRegression, treasuryAnnualRate: treasuryAnnualRate, data: { results: result.fundReturns.returnsHashTable[type] }, correlations: ratiosAndPositiveNegativeCorrelations, annulizedReturnBenchMarks: annulizedReturnBenchMarks });
  delete result.cumulativeReturnsHashTable[type]["cumulative"];
  delete result_lg30truu.cumulativeReturnsHashTable["main"]["cumulative"];
  delete result_beuctruu.cumulativeReturnsHashTable["main"]["cumulative"];
  delete result_emustruu.cumulativeReturnsHashTable["main"]["cumulative"];
  delete result_legatruu.cumulativeReturnsHashTable["main"]["cumulative"];
  delete result_beuytruu.cumulativeReturnsHashTable["main"]["cumulative"];

  delete result.cumulativeReturnsHashTable[type]["max"];
  delete result_lg30truu.cumulativeReturnsHashTable["main"]["max"];
  delete result_beuctruu.cumulativeReturnsHashTable["main"]["max"];
  delete result_emustruu.cumulativeReturnsHashTable["main"]["max"];
  delete result_legatruu.cumulativeReturnsHashTable["main"]["max"];
  delete result_beuytruu.cumulativeReturnsHashTable["main"]["max"];

  delete result.cumulativeReturnsHashTable[type]["min"];
  delete result_lg30truu.cumulativeReturnsHashTable["main"]["min"];
  delete result_beuctruu.cumulativeReturnsHashTable["main"]["min"];
  delete result_emustruu.cumulativeReturnsHashTable["main"]["min"];
  delete result_legatruu.cumulativeReturnsHashTable["main"]["min"];
  delete result_beuytruu.cumulativeReturnsHashTable["main"]["min"];

  delete result.cumulativeReturnsHashTable[type]["cumulativeSwitch"];
  delete result_lg30truu.cumulativeReturnsHashTable["main"]["cumulativeSwitch"];
  delete result_beuctruu.cumulativeReturnsHashTable["main"]["cumulativeSwitch"];
  delete result_emustruu.cumulativeReturnsHashTable["main"]["cumulativeSwitch"];
  delete result_legatruu.cumulativeReturnsHashTable["main"]["cumulativeSwitch"];
  delete result_beuytruu.cumulativeReturnsHashTable["main"]["cumulativeSwitch"];

  let cumulativeReturnsHashTable = {
    triada: result.cumulativeReturnsHashTable[type],
    "LG30TRUU Index": result_lg30truu.cumulativeReturnsHashTable["main"],
    "BEUCTRUU Index": result_beuctruu.cumulativeReturnsHashTable["main"],
    "EMUSTRUU Index": result_emustruu.cumulativeReturnsHashTable["main"],
    "LEGATRUU Index": result_legatruu.cumulativeReturnsHashTable["main"],
    "BEUYTRUU Index": result_beuytruu.cumulativeReturnsHashTable["main"],
  };
  let resultFinal = { result: result, outPerformance: outPerformance, annulizedReturnBenchMarks: annulizedReturnBenchMarks, cumulativeReturnsBenchMarks: cumulativeReturnsBenchMarks, ratios: ratiosAndPositiveNegativeCorrelations.ratios, riskRatios: riskRatios, correlationAndRegresion: correlationAndRegresion.regression, lastDate: lastDate, cumulativeReturnsHashTable: cumulativeReturnsHashTable, treasuryAnnualRate: treasuryAnnualRate };
  return resultFinal;
}

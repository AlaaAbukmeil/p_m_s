import { getSampleStandardDeviation, getStatistics, transformData, updateStats } from "./tools";

export let monthlyData: any = {
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
  "04/2024": { a2: 1430.97, a3: 1098.44, a4: 975, a5: 958.16, a6: 963.77 },
};

export function calculateMonthlyReturn(data: any) {
  //assue months are sorted in ascending order
  let months = Object.keys(data);
  let monthlyReturns: any = {};
  let monthsIndex = months.length - 1;

  let peak = { a2: -Infinity, a3: -Infinity, a4: -Infinity, a5: -Infinity, a6: -Infinity };
  let troughReturn = { a2: Infinity, a3: Infinity, a4: Infinity, a5: Infinity, a6: Infinity };
  let peakReturn = { a2: -Infinity, a3: -Infinity, a4: -Infinity, a5: -Infinity, a6: -Infinity };

  let trough = { a2: Infinity, a3: Infinity, a4: Infinity, a5: Infinity, a6: Infinity };

  let cumulativeReturn = { a2: 1, a3: 1, a4: 1, a5: 1, a6: 1 };
  let numOfMonths = { a2: 0, a3: 0, a4: 0, a5: 0, a6: 0 };
  let returns: any = { a2: [], a3: [], a4: [], a5: [], a6: [] };
  let positiveReturns: any = { a2: [], a3: [], a4: [], a5: [], a6: [] };
  let negativeReturns: any = { a2: [], a3: [], a4: [], a5: [], a6: [] };

  let yearlyData: any = {};
  while (monthsIndex >= 0) {
    let month = months[monthsIndex];
    let year = (parseInt(month.split("/")[1]) - 1).toString();
    if (monthsIndex == 0) {
      if (!yearlyData[year]) {
        yearlyData[year] = { a2: data[month].a2, a3: data[month].a3, a4: data[month].a4, a5: data[month].a5, a6: data[month].a6 };
      }
      monthsIndex--;
    } else {
      let month = months[monthsIndex];
      let previousMonth = months[monthsIndex - 1];
      let returnMonth = { a2: 0, a3: 0, a4: 0, a5: 0, a6: 0 };
      let year = month.split("/")[1];
      let variable = "a2";

      updateStats({ data, month, previousMonth, returnMonth, cumulativeReturn, numOfMonths, returns, positiveReturns, negativeReturns, peak, trough, variable, troughReturn, peakReturn });
      variable = "a3";

      updateStats({ data, month, previousMonth, returnMonth, cumulativeReturn, numOfMonths, returns, positiveReturns, negativeReturns, peak, trough, variable, troughReturn, peakReturn });
      variable = "a4";

      updateStats({ data, month, previousMonth, returnMonth, cumulativeReturn, numOfMonths, returns, positiveReturns, negativeReturns, peak, trough, variable, troughReturn, peakReturn });
      variable = "a5";

      updateStats({ data, month, previousMonth, returnMonth, cumulativeReturn, numOfMonths, returns, positiveReturns, negativeReturns, peak, trough, variable, troughReturn, peakReturn });
      variable = "a6";

      updateStats({ data, month, previousMonth, returnMonth, cumulativeReturn, numOfMonths, returns, positiveReturns, negativeReturns, peak, trough, variable, troughReturn, peakReturn });

      monthlyReturns[month] = {
        a2: returnMonth.a2,
        a3: returnMonth.a3,
        a4: returnMonth.a4,
        a5: returnMonth.a5,
        a6: returnMonth.a6,
      };
      monthsIndex--;
      if (!yearlyData[year]) {
        yearlyData[year] = { a2: data[month].a2, a3: data[month].a3, a4: data[month].a4, a5: data[month].a5, a6: data[month].a6 };
      }
    }
  }

  let years = Object.keys(yearlyData);
  let yearsIndex = years.length - 1;
  let yearlyReturns: any = {};
  while (yearsIndex >= 0) {
    let year = years[yearsIndex];
    let previousYear = years[yearsIndex - 1];
    let yearlyReturn = { a2: 0, a3: 0, a4: 0, a5: 0, a6: 0 };
    if (yearlyData[year] && yearlyData[previousYear]) {
      if (yearlyData[year].a2 && yearlyData[previousYear].a2) {
        yearlyReturn.a2 = yearlyData[year].a2 / yearlyData[previousYear].a2 - 1;
      }
      if (yearlyData[year].a3 && yearlyData[previousYear].a3) {
        yearlyReturn.a3 = yearlyData[year].a3 / yearlyData[previousYear].a3 - 1;
      }
      if (yearlyData[year].a4 && yearlyData[previousYear].a4) {
        yearlyReturn.a4 = yearlyData[year].a4 / yearlyData[previousYear].a4 - 1;
      }
      if (yearlyData[year].a5 && yearlyData[previousYear].a5) {
        yearlyReturn.a5 = yearlyData[year].a5 / yearlyData[previousYear].a5 - 1;
      }
      if (yearlyData[year].a6 && yearlyData[previousYear].a6) {
        yearlyReturn.a6 = yearlyData[year].a6 / yearlyData[previousYear].a6 - 1;
      }
      if (!monthlyReturns["Cumulative/" + year]) {
        monthlyReturns["Cumulative/" + year] = {
          a2: 0,
          a3: 0,
          a4: 0,
          a5: 0,
          a6: 0,
        };
      }
      monthlyReturns["Cumulative/" + year]["a2"] = yearlyReturn.a2;
      monthlyReturns["Cumulative/" + year]["a3"] = yearlyReturn.a3;
      monthlyReturns["Cumulative/" + year]["a4"] = yearlyReturn.a4;
      monthlyReturns["Cumulative/" + year]["a5"] = yearlyReturn.a5;
      monthlyReturns["Cumulative/" + year]["a6"] = yearlyReturn.a6;

      yearlyReturns[year] = {
        a2: yearlyReturn.a2,
        a3: yearlyReturn.a3,
        a4: yearlyReturn.a4,
        a5: yearlyReturn.a5,
        a6: yearlyReturn.a6,
      };
      yearsIndex--;
    } else {
      yearsIndex--;
    }
  }
  let annualVolitality = { a2: 0, a3: 0, a4: 0, a5: 0, a6: 0 };

  let maxDrawdown = {
    a2: { peak: peak.a2, trough: trough.a2, mdd: (trough.a2 - peak.a2) / peak.a2 },
    a3: { peak: peak.a3, trough: trough.a3, mdd: (trough.a3 - peak.a3) / peak.a3 },
    a4: { peak: peak.a4, trough: trough.a4, mdd: (trough.a4 - peak.a4) / peak.a4 },
    a5: { peak: peak.a5, trough: trough.a5, mdd: (trough.a5 - peak.a5) / peak.a5 },
    a6: { peak: peak.a6, trough: trough.a6, mdd: (trough.a6 - peak.a6) / peak.a6 },
  };

  let annulizedReturn = {
    a2: { annualPer: Math.pow(cumulativeReturn.a2, 1 / (numOfMonths.a2 / 12)) - 1, bestMonth: peakReturn.a2, worstMonth: troughReturn.a2 },
    a3: { annualPer: Math.pow(cumulativeReturn.a3, 1 / (numOfMonths.a3 / 12)) - 1, bestMonth: peakReturn.a2, worstMonth: troughReturn.a2 },
    a4: { annualPer: Math.pow(cumulativeReturn.a4, 1 / (numOfMonths.a4 / 12)) - 1, bestMonth: peakReturn.a2, worstMonth: troughReturn.a2 },
    a5: { annualPer: Math.pow(cumulativeReturn.a5, 1 / (numOfMonths.a5 / 12)) - 1, bestMonth: peakReturn.a2, worstMonth: troughReturn.a2 },
    a6: { annualPer: Math.pow(cumulativeReturn.a6, 1 / (numOfMonths.a6 / 12)) - 1, bestMonth: peakReturn.a2, worstMonth: troughReturn.a2 },
  };
  let normal = {
    a2: getStatistics(returns.a2),
    a3: getStatistics(returns.a3),
    a4: getStatistics(returns.a4),
    a5: getStatistics(returns.a5),
    a6: getStatistics(returns.a6),
  };
  let variance = {
    a2: Math.pow(normal.a2.sd, 2),
    a3: Math.pow(normal.a3.sd, 2),
    a4: Math.pow(normal.a4.sd, 2),
    a5: Math.pow(normal.a5.sd, 2),
    a6: Math.pow(normal.a6.sd, 2),
  };
  let positiveAnnualVolitality: any = {
    a2: getSampleStandardDeviation(positiveReturns.a2),
    a3: getSampleStandardDeviation(positiveReturns.a3),
    a4: getSampleStandardDeviation(positiveReturns.a4),
    a5: getSampleStandardDeviation(positiveReturns.a5),
    a6: getSampleStandardDeviation(positiveReturns.a6),
  };
  let negativeAnnualVolitality: any = {
    a2: getSampleStandardDeviation(negativeReturns.a2),
    a3: getSampleStandardDeviation(negativeReturns.a3),
    a4: getSampleStandardDeviation(negativeReturns.a4),
    a5: getSampleStandardDeviation(negativeReturns.a5),
    a6: getSampleStandardDeviation(negativeReturns.a6),
  };
  annualVolitality.a2 = normal.a2.sd * Math.sqrt(12);
  annualVolitality.a3 = normal.a3.sd * Math.sqrt(12);
  annualVolitality.a4 = normal.a4.sd * Math.sqrt(12);
  annualVolitality.a5 = normal.a5.sd * Math.sqrt(12);
  annualVolitality.a6 = normal.a6.sd * Math.sqrt(12);

  positiveAnnualVolitality.a2.volitality = positiveAnnualVolitality.a2.sd * Math.sqrt(12);
  positiveAnnualVolitality.a3.volitality = positiveAnnualVolitality.a3.sd * Math.sqrt(12);
  positiveAnnualVolitality.a4.volitality = positiveAnnualVolitality.a4.sd * Math.sqrt(12);
  positiveAnnualVolitality.a5.volitality = positiveAnnualVolitality.a5.sd * Math.sqrt(12);
  positiveAnnualVolitality.a6.volitality = positiveAnnualVolitality.a6.sd * Math.sqrt(12);

  positiveAnnualVolitality.a2.numOfMonths = positiveAnnualVolitality.a2.arrLength / (positiveAnnualVolitality.a2.arrLength + negativeAnnualVolitality.a2.arrLength);
  positiveAnnualVolitality.a3.numOfMonths = positiveAnnualVolitality.a3.arrLength / (positiveAnnualVolitality.a3.arrLength + negativeAnnualVolitality.a3.arrLength);
  positiveAnnualVolitality.a4.numOfMonths = positiveAnnualVolitality.a4.arrLength / (positiveAnnualVolitality.a4.arrLength + negativeAnnualVolitality.a4.arrLength);
  positiveAnnualVolitality.a5.numOfMonths = positiveAnnualVolitality.a5.arrLength / (positiveAnnualVolitality.a5.arrLength + negativeAnnualVolitality.a5.arrLength);
  positiveAnnualVolitality.a6.numOfMonths = positiveAnnualVolitality.a6.arrLength / (positiveAnnualVolitality.a6.arrLength + negativeAnnualVolitality.a6.arrLength);

  negativeAnnualVolitality.a2.volitality = negativeAnnualVolitality.a2.sd * Math.sqrt(12);
  negativeAnnualVolitality.a3.volitality = negativeAnnualVolitality.a3.sd * Math.sqrt(12);
  negativeAnnualVolitality.a4.volitality = negativeAnnualVolitality.a4.sd * Math.sqrt(12);
  negativeAnnualVolitality.a5.volitality = negativeAnnualVolitality.a5.sd * Math.sqrt(12);
  negativeAnnualVolitality.a6.volitality = negativeAnnualVolitality.a6.sd * Math.sqrt(12);

  negativeAnnualVolitality.a2.numOfMonths = negativeAnnualVolitality.a2.arrLength / (positiveAnnualVolitality.a2.arrLength + negativeAnnualVolitality.a2.arrLength);
  negativeAnnualVolitality.a3.numOfMonths = negativeAnnualVolitality.a3.arrLength / (positiveAnnualVolitality.a3.arrLength + negativeAnnualVolitality.a3.arrLength);
  negativeAnnualVolitality.a4.numOfMonths = negativeAnnualVolitality.a4.arrLength / (positiveAnnualVolitality.a4.arrLength + negativeAnnualVolitality.a4.arrLength);
  negativeAnnualVolitality.a5.numOfMonths = negativeAnnualVolitality.a5.arrLength / (positiveAnnualVolitality.a5.arrLength + negativeAnnualVolitality.a5.arrLength);
  negativeAnnualVolitality.a6.numOfMonths = negativeAnnualVolitality.a6.arrLength / (positiveAnnualVolitality.a6.arrLength + negativeAnnualVolitality.a6.arrLength);

  let volitality = {
    a2: { annualVolitality: annualVolitality.a2, positiveAnnualVolitality: positiveAnnualVolitality.a2, negativeAnnualVolitality: negativeAnnualVolitality.a2 },
    a3: { annualVolitality: annualVolitality.a3, positiveAnnualVolitality: positiveAnnualVolitality.a3, negativeAnnualVolitality: negativeAnnualVolitality.a3 },
    a4: { annualVolitality: annualVolitality.a4, positiveAnnualVolitality: positiveAnnualVolitality.a4, negativeAnnualVolitality: negativeAnnualVolitality.a4 },
    a5: { annualVolitality: annualVolitality.a5, positiveAnnualVolitality: positiveAnnualVolitality.a5, negativeAnnualVolitality: negativeAnnualVolitality.a5 },
    a6: { annualVolitality: annualVolitality.a6, positiveAnnualVolitality: positiveAnnualVolitality.a6, negativeAnnualVolitality: negativeAnnualVolitality.a6 },
  };

  let ratios = {
    a2: { plRatio: positiveAnnualVolitality.a2.mean / Math.abs(negativeAnnualVolitality.a2.mean || 1), glRatio: ((positiveAnnualVolitality.a2.mean / Math.abs(negativeAnnualVolitality.a2.mean || 1)) * positiveAnnualVolitality.a2.numOfMonths) / negativeAnnualVolitality.a2.numOfMonths },
    a3: { plRatio: positiveAnnualVolitality.a3.mean / Math.abs(negativeAnnualVolitality.a3.mean || 1), glRatio: ((positiveAnnualVolitality.a3.mean / Math.abs(negativeAnnualVolitality.a3.mean || 1)) * positiveAnnualVolitality.a3.numOfMonths) / negativeAnnualVolitality.a3.numOfMonths },
    a4: { plRatio: positiveAnnualVolitality.a4.mean / Math.abs(negativeAnnualVolitality.a4.mean || 1), glRatio: ((positiveAnnualVolitality.a4.mean / Math.abs(negativeAnnualVolitality.a4.mean || 1)) * positiveAnnualVolitality.a4.numOfMonths) / negativeAnnualVolitality.a4.numOfMonths },
    a5: { plRatio: positiveAnnualVolitality.a5.mean / Math.abs(negativeAnnualVolitality.a5.mean || 1), glRatio: ((positiveAnnualVolitality.a5.mean / Math.abs(negativeAnnualVolitality.a5.mean || 1)) * positiveAnnualVolitality.a5.numOfMonths) / negativeAnnualVolitality.a5.numOfMonths },
    a6: { plRatio: positiveAnnualVolitality.a6.mean / Math.abs(negativeAnnualVolitality.a6.mean || 1), glRatio: ((positiveAnnualVolitality.a6.mean / Math.abs(negativeAnnualVolitality.a6.mean || 1)) * positiveAnnualVolitality.a6.numOfMonths) / negativeAnnualVolitality.a6.numOfMonths },
  };

  return { monthlyReturns: transformData(monthlyReturns, yearlyReturns), maxDrawdown: maxDrawdown, annulizedReturn: annulizedReturn, volitality: volitality, variance: variance, ratios: ratios, normal: normal };
}

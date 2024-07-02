import { parse } from "path";
import { dateWithNoDay } from "../common";
import { client } from "../userManagement/auth";
import { getDateTimeInMongoDBCollectionFormat } from "./common";
import { getPortfolioWithAnalytics } from "./portfolios";
import { calculateAnnualizedReturn, deleteUnnecessaryValues, getMonthName, getSampleStandardDeviation, getStatistics, sortObjectByValues, transformData, updateStats } from "./tools";
import { fiditbd, pimglba, test } from "./data";
import { dateWithMonthOnly } from "../common";
export let beforeSwitchRatios: any = {
  a4: 1000 / 1477.16,
  a5: 1000 / 1154.61,
  a6: 1000 / 1154.61,
};
export let beforeSwitchRatiosTwo: any = {
  a3: 1018.05 / 1181.44,
  a5: 881.72 / 1181.44,
  a6: 881.72 / 1181.44,
};

export let beforeSwitchRatiosMaster: any = {
  ma3: 1029.55 / 1077.9,
  ma4: 995.07 / 1457.23,
  ma6: 824.859138472692 / 1077.9,
};
export let beforeSwitchRatiosMasterTwo: any = {
  ma6: 994.59 / 1241.4,
};

function customEditMonthlyReturn(variables: any, monthlyReturns: any) {
  if (variables[0] == "a5" || variables[0] == "a6") {
    if (monthlyReturns["06/2016"]) {
      monthlyReturns["06/2016"][variables[0]] = 2.05 / 100;
    }
    if (monthlyReturns["12/2021"]) {
      monthlyReturns["12/2021"][variables[0]] = -0.09 / 100;
    }
  }
  if (variables[0] == "a4") {
    if (monthlyReturns["06/2016"]) {
      monthlyReturns["06/2016"][variables[0]] = 2.05 / 100;
    }
    if (monthlyReturns["12/2021"]) {
      monthlyReturns["12/2021"][variables[0]] = -0.16 / 100;
    }
  }
  if (variables[0] == "a3") {
    if (monthlyReturns["06/2016"]) {
      monthlyReturns["06/2016"][variables[0]] = 2.05 / 100;
    }
  }

  if (variables[0] == "ma3") {
    if (monthlyReturns["03/2016"]) {
      monthlyReturns["03/2016"][variables[0]] = 3.27 / 100;
    }
  }
  if (variables[0] == "ma4") {
    if (monthlyReturns["01/2022"]) {
      monthlyReturns["01/2022"][variables[0]] = -0.5 / 100;
    }
  }
  if (variables[0] == "ma6") {
    if (monthlyReturns["03/2016"]) {
      monthlyReturns["03/2016"][variables[0]] = 3.27 / 100;
    }
    if (monthlyReturns["01/2022"]) {
      monthlyReturns["01/2022"][variables[0]] = -0.58 / 100;
    }
  }
}

export function calculateMonthlyReturn(data: any, variables: any, fundData = false, inception = false, rfr: any = {}, map: any = {}, mkt = false, name = "", compare: any = {}) {
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
  let cumulativeReturnsHashTableSince2020: any = {};

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
    cumulativeReturnsHashTable[variable] = { cumulative: 100, max: -Infinity, min: Infinity, cumulativeSwitch: 100 };
    cumulativeReturnsHashTableSince2020[variable] = { cumulative: 100, cumulativeSwitch: 100, "12/2022": 100 };

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
    if (data[monthsIndex].data[variables[0]] == 0 || data[monthsIndex].data[variables[0]] || monthsIndex == 0) {
      let month = data[monthsIndex].date;
      let returnMonth: any = {};

      let year = month.split("/")[1];
      for (let index = 0; index < variables.length; index++) {
        let variable = variables[index];

        updateStats({ data, returnMonth, cumulativeReturn, numOfMonths, returns, positiveReturns, positiveReturn, negativeReturns, negativeReturn, variable, troughReturn, peakReturn, monthsIndex, returnsHashTable, cumulativeReturnsHashTable, cumulativeReturnsHashTableSince2020, positiveReturnsHashTable, negativeReturnsHashTable });
        monthlyReturns[month] = {};
        monthlyReturns[month][variable] = returnMonth[variable];
      }
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
  customEditMonthlyReturn(variables, monthlyReturns);

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
  let formmatedReturns = transformData(monthlyReturns, yearlyReturns);
  if (inception) {
    let returnsTemp = JSON.parse(JSON.stringify(formmatedReturns[variables[0]]));
    let years = Object.keys(returnsTemp);
    for (let year of years) {
      delete returnsTemp[year]["Cumulative"];
      let values = Object.values(returnsTemp[year]).filter((value) => value != null) || [];
      let valuesTreasury: any = Object.values(map[year]).filter((value) => value != null) || [];
      let diffValues = values.map((value: any, index: any) => value - valuesTreasury[index]);
      let negativeValues = diffValues.filter((value: any) => (value != null ? (value < 0 ? true : false) : false)) || [];

      let stats = getSampleStandardDeviation(values);
      let negativeStats = getSampleStandardDeviation(negativeValues);
      let volitality = stats.sd * Math.sqrt(12) || 0;
      let negativeVolitality = negativeStats.sd * Math.sqrt(12) || 0;
      if (year != years[years.length - 1]) {
        formmatedReturns[variables[0]][year]["Annualized Return"] = formmatedReturns[variables[0]][year]["Cumulative"];
      } else {
        formmatedReturns[variables[0]][year]["Annualized Return"] = calculateAnnualizedReturn(values);
      }
      formmatedReturns[variables[0]][year]["Risk"] = volitality || 0;
      formmatedReturns[variables[0]][year]["Downside Risk"] = negativeVolitality || 0;
      formmatedReturns[variables[0]][year]["Annualized Rfr"] = rfr[year];
      let sharpe = (formmatedReturns[variables[0]][year]["Annualized Return"] - formmatedReturns[variables[0]][year]["Annualized Rfr"]) / formmatedReturns[variables[0]][year]["Risk"] || 0;
      let sortino = (formmatedReturns[variables[0]][year]["Annualized Return"] - formmatedReturns[variables[0]][year]["Annualized Rfr"]) / formmatedReturns[variables[0]][year]["Downside Risk"] || 0;
      formmatedReturns[variables[0]][year]["Sharpe"] = isFinite(sharpe) ? (sharpe > 10 ? 10 : sharpe) : 0;
      formmatedReturns[variables[0]][year]["Sortino"] = isFinite(sortino) ? (sortino > 10 ? 10 : sortino) : 0;
      if (mkt) {
        compare.ytdReturns[year] = compare.ytdReturns[year] ? compare.ytdReturns[year] : {};
        compare.ytdReturns[year][name] = formmatedReturns[variables[0]][year]["Cumulative"];
        compare.volitality[year] = compare.volitality[year] ? compare.volitality[year] : {};
        compare.volitality[year][name] = volitality;
        compare.sharpe[year] = compare.sharpe[year] ? compare.sharpe[year] : {};
        compare.sharpe[year][name] = sharpe;
      }
    }
  }
  for (let index = 0; index < variables.length; index++) {
    let variable = variables[index];
    let statistics = getStatistics(returns[variable]);
    let negativeStatistics = getSampleStandardDeviation(negativeReturns[variable]);
    maxDrawdown[variable] = { peak: cumulativeReturnsHashTable[variable].max, trough: cumulativeReturnsHashTable[variable].min, mdd: (cumulativeReturnsHashTable[variable].min - cumulativeReturnsHashTable[variable].max) / cumulativeReturnsHashTable[variable].max };
    annulizedReturn[variable] = { annualPer: Math.pow(cumulativeReturn[variable], 12 / numOfMonths[variable]) - 1, bestMonth: peakReturn[variable], worstMonth: troughReturn[variable] };
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

  return { monthlyReturns: formmatedReturns, maxDrawdown: maxDrawdown, annulizedReturn: annulizedReturn, volitality: volitality, variance: variance, ratios: ratios, normal: normal, fundReturns: fundReturns, returns: returns, negativeAnnualVolitality: negativeAnnualVolitality, cumulativeReturnsHashTable: cumulativeReturnsHashTable, cumulativeReturnsHashTableSince2020: cumulativeReturnsHashTableSince2020 };
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

export async function uploadFSData() {
  // monthlyData = trimDate(monthlyData, false, true);
  // monthlyDataMaster = trimDate(monthlyDataMaster, false, false, true);
  // lg30truu = trimDate(lg30truu, true);
  // beuytruu = trimDate(beuytruu, true);
  // beuctruu = trimDate(beuctruu, true);
  // emustruu = trimDate(emustruu, true);
  // legatruu = trimDate(legatruu, true);
  // bebgtruu = trimDate(bebgtruu, true);
  // treasuryData = trimDate(treasuryData, true);
  // let pimglba_new = trimDate(pimglba, true);
  // let fiditbd_new = trimDate(fiditbd, true);
  // console.log(pimglba_new)
  // await updateOrInsertDataWithBulk(monthlyData, "Triada");
  // await updateOrInsertDataWithBulk(monthlyDataMaster, "Triada Master");
  // await updateOrInsertDataWithBulk(legatruu, "LEGATRUU Index");
  // await updateOrInsertDataWithBulk(emustruu, "EMUSTRUU Index");
  // await updateOrInsertDataWithBulk(beuctruu, "BEUCTRUU Index");
  // await updateOrInsertDataWithBulk(pimglba_new, "PIMGLBA ID Equity");
  // await updateOrInsertDataWithBulk(fiditbd_new, "FIDITBD LX Equity");
  // await updateOrInsertDataWithBulk(treasuryData, "3 Month Treasury");
  // await updateOrInsertDataWithBulk(bebgtruu, "BEBGTRUU Index");
}

export function trimDate(data: any, benchmark = false, triada = false, masterTriada = false) {
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
    } else if (triada) {
      let timestampTest = timestamp < new Date("2021-11-30").getTime() && timestamp > new Date("2016-05-30").getTime();
      if (timestampTest == true) {
        object = {
          date: dateFinal,
          timestamp: timestamp,
          data: data[dateFinal],
        };

        object.data.a4 = object.data.a4 * beforeSwitchRatios.a4;
        object.data.a5 = object.data.a5 * beforeSwitchRatios.a5;
        object.data.a6 = object.data.a6 * beforeSwitchRatios.a6;
        console.log(getDateTimeInMongoDBCollectionFormat(timestamp), "1");
      } else if (timestamp <= new Date("2016-05-30").getTime()) {
        object = {
          date: dateFinal,
          timestamp: timestamp,
          data: data[dateFinal],
        };

        object.data.a3 = object.data.a3 * beforeSwitchRatiosTwo.a3;
        object.data.a4 = object.data.a4 * beforeSwitchRatios.a4;
        object.data.a5 = object.data.a5 * beforeSwitchRatiosTwo.a5;
        object.data.a6 = object.data.a6 * beforeSwitchRatiosTwo.a6;
        console.log(getDateTimeInMongoDBCollectionFormat(timestamp), "2");
      } else {
        object = {
          date: dateFinal,
          timestamp: timestamp,
          data: data[dateFinal],
        };
        console.log(getDateTimeInMongoDBCollectionFormat(timestamp), "3");
      }
    } else if (masterTriada) {
      let timestampTest = timestamp < new Date("2021-12-30").getTime() && timestamp > new Date("2016-02-28").getTime();
      if (timestampTest == true) {
        object = {
          date: dateFinal,
          timestamp: timestamp,
          data: data[dateFinal],
        };

        object.data.ma4 = object.data.ma4 * beforeSwitchRatiosMaster.ma4;
        object.data.ma6 = object.data.ma6 * beforeSwitchRatiosMasterTwo.ma6;

        // object.data.ma6 = object.data.ma6 * beforeSwitchRatios.ma6;
      } else if (timestamp <= new Date("2016-02-28").getTime()) {
        object = {
          date: dateFinal,
          timestamp: timestamp,
          data: data[dateFinal],
        };

        object.data.ma3 = object.data.ma3 * beforeSwitchRatiosMaster.ma3;
        object.data.ma4 = object.data.ma4 * beforeSwitchRatiosMaster.ma4;
        object.data.ma6 = object.data.ma6 * beforeSwitchRatiosMaster.ma6;
      } else {
        object = {
          date: dateFinal,
          timestamp: timestamp,
          data: data[dateFinal],
        };
        console.log(getDateTimeInMongoDBCollectionFormat(timestamp), "3");
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
    // await collection.deleteMany({});
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
    let calmar = annulizedReturnVar / Math.abs(mdd);
    let sharpe = (annulizedReturnVar - treasuryAnnualRate) / (normal.sd * Math.sqrt(12));
    let sortino = (annulizedReturnVar - treasuryAnnualRate) / (negativeAnnualVolitality.sd * Math.sqrt(12));
    let sterling = annulizedReturnVar / (Math.abs(mdd) + 0.1);
    let treynor = (annulizedReturnVar - treasuryAnnualRate) / beta;
    riskRatios[benchmark] = {
      "Calmar Ratio": checkIfCloseToZero(calmar),
      "Sharpe Ratio": checkIfCloseToZero(sharpe),
      "Sortino Ratio": checkIfCloseToZero(sortino),
      "Sterling Ratio": checkIfCloseToZero(sterling),
      "Treynor Ratio": checkIfCloseToZero(treynor),
      annulizedReturnVar: annulizedReturnVar,
      mdd: mdd,
    };
  }
  return riskRatios;
}
function checkIfCloseToZero(number: number) {
  let rounded = Math.round(number * 10000) / 100;
  if (Math.round(rounded) == 0) {
    return 0;
  }
  return number;
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

export function getTreasuryAnnulizedReturn(data: any, inception = false) {
  if (data.length === 0) {
    return 0; // Return 0 if the data is empty
  }

  // Sort the data by date in ascending order
  let map: any = {};
  let rfr: any = {};

  let cumulative = 1;
  for (const {
    data: { main },
    date,
  } of data) {
    if (!main) {
      throw new Error(`Missing 'main' property for date: ${date}`);
    }
    if (inception) {
      let year = date.split("/")[1];
      map[year] = map[year] ? map[year] : [];
      map[year].push(Math.pow(main / 100 + 1, 1 / 12) - 1);
    }

    const returnData = Math.pow(main / 100 + 1, 1 / 12);
    cumulative *= returnData;
  }
  if (inception) {
    for (let year in map) {
      let length = map[year].length;
      let annualCompound = map[year].reduce((acc: any, value: any) => acc * (value + 1), 1);
      let annualizedReturn = Math.pow(annualCompound, 12 / length) - 1;
      rfr[year] = annualizedReturn;
    }
  }
  // console.log(map);
  const annualizedReturn: any = Math.pow(cumulative, 12 / data.length) - 1;
  return { annualizedReturn, rfr, map };
}
export function trimFactSheetData(triada: any, triadaMaster: any, others: any) {
  let months = [];
  let formmated: any = { a2: {}, a3: {}, a4: {}, a5: {}, a6: {}, "3 Month Treasury": {}, "LEGATRUU Index": {}, "EMUSTRUU Index": {}, "BEUCTRUU Index": {}, "LG30TRUU Index": {}, "BEBGTRUU Index": {}, ma2: {}, ma3: {}, ma4: {}, ma6: {} };
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

  for (let index = 0; index < triadaMaster.length; index++) {
    let month = triadaMaster[index].date;
    let id = triadaMaster[index]["_id"];
    let price = triadaMaster[index].data;

    formmated.ma2[month] = { _id: id, price: price.ma2, month: month, name: "ma2" };
    formmated.ma3[month] = { _id: id, price: price.ma3, month: month, name: "ma3" };
    formmated.ma4[month] = { _id: id, price: price.ma4, month: month, name: "ma4" };
    formmated.ma6[month] = { _id: id, price: price.ma6, month: month, name: "ma6" };
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

export async function getFactSheet({ from, to, type, inception, mkt }: { from: any; to: any; type: any; inception: boolean; mkt: boolean }) {
  let masterClasses = ["ma2", "ma3", "ma4", "ma6"];
  let db = masterClasses.includes(type) ? "Triada Master" : "Triada";
  let treasuryData = await getFactSheetData("3 Month Treasury", from, to, "main");
  let treasuryAnnualRate: any = getTreasuryAnnulizedReturn(treasuryData, inception);

  let data = await getFactSheetData(db, from, to, type);

  if (!inception) {
    let lastDate = getMonthName(data[data.length - 1].date);
    let lastDateTimestamp = new Date(dateWithNoDay(data[data.length - 1].date));
    let result = calculateMonthlyReturn(data, [type], true, false);

    let benchmarksRiskRatios = {
      Triada: { annulizedReturn: result.annulizedReturn[type], maxDrawdown: result.maxDrawdown[type], normal: result.normal[type], negativeAnnualVolitality: result.negativeAnnualVolitality[type], beta: 1 },
    };
    let riskRatios = calculateRiskRatios({ benchmarks: benchmarksRiskRatios, treasuryAnnualRate: treasuryAnnualRate.annualizedReturn });

    let resultFinal = {
      result: result,
      riskRatios: riskRatios,
      lastDate: lastDate,
      lastDateTimestamp: lastDateTimestamp,
      treasuryAnnualRate: treasuryAnnualRate.annualizedReturn,
    };
    return resultFinal;
  } else {
    let compare: any = {
      ytdReturns: {},
      volitality: {},
      sharpe: {},
    };

    let legatruu = await getFactSheetData("LEGATRUU Index", from, to, "main");
    let emustruu = await getFactSheetData("EMUSTRUU Index", from, to, "main");
    let beuctruu = await getFactSheetData("BEUCTRUU Index", from, to, "main");
    // let beuytruu = await getFactSheetData("BEUYTRUU Index", from, to, "main");
    let PIMGLBA = await getFactSheetData("PIMGLBA ID Equity", from, to, "main");
    let FIDITBD = await getFactSheetData("FIDITBD LX Equity", from, to, "main");

    let lastDate = getMonthName(data[data.length - 1].date);
    let lastDateTimestamp = new Date(dateWithNoDay(data[data.length - 1].date));
    let result = calculateMonthlyReturn(data, [type], true, true, treasuryAnnualRate.rfr, treasuryAnnualRate.map, mkt, "Triada", compare);
    // let result_lg30truu = calculateMonthlyReturn(lg30truu, ["main"]);
    let result_beuctruu = calculateMonthlyReturn(beuctruu, ["main"], false, true, treasuryAnnualRate.rfr, treasuryAnnualRate.map, mkt, "BBG EM Asia", compare);
    // let result_beuytruu = calculateMonthlyReturn(beuytruu, ["main"], false, true, treasuryAnnualRate.rfr, treasuryAnnualRate.map, mkt, "BBG EM Asia HY", compare);
    let result_emustruu = calculateMonthlyReturn(emustruu, ["main"], false, true, treasuryAnnualRate.rfr, treasuryAnnualRate.map, mkt, "BBG EM Aggregate", compare);
    let result_legatruu = calculateMonthlyReturn(legatruu, ["main"], false, true, treasuryAnnualRate.rfr, treasuryAnnualRate.map, mkt, "BBG Global Aggregate", compare);
    let result_PIMGLBA = calculateMonthlyReturn(PIMGLBA, ["main"], false, true, treasuryAnnualRate.rfr, treasuryAnnualRate.map, mkt, "Pimco Global Bond", compare);
    let result_FIDITBD = calculateMonthlyReturn(FIDITBD, ["main"], false, true, treasuryAnnualRate.rfr, treasuryAnnualRate.map, mkt, "Fidelity Global Bond", compare);

    let benchmarks = { "BEUCTRUU Index": result_beuctruu.monthlyReturns["main"], "EMUSTRUU Index": result_emustruu.monthlyReturns["main"], "LEGATRUU Index": result_legatruu.monthlyReturns["main"], "PIMGLBA ID Equity": result_PIMGLBA.monthlyReturns["main"], "FIDITBD LX Equity": result_FIDITBD.monthlyReturns["main"] };
    let annulizedReturns = { "BEUCTRUU Index": result_beuctruu.annulizedReturn["main"]["annualPer"], "EMUSTRUU Index": result_emustruu.annulizedReturn["main"]["annualPer"], "LEGATRUU Index": result_legatruu.annulizedReturn["main"]["annualPer"], "PIMGLBA ID Equity": result_PIMGLBA.annulizedReturn["main"]["annualPer"], "FIDITBD LX Equity": result_FIDITBD.annulizedReturn["main"]["annualPer"] };
    let cumulativeReturns = { "BEUCTRUU Index": result_beuctruu.fundReturns.cumulativeReturn["main"] - 1, "EMUSTRUU Index": result_emustruu.fundReturns.cumulativeReturn["main"] - 1, "LEGATRUU Index": result_legatruu.fundReturns.cumulativeReturn["main"] - 1, "PIMGLBA ID Equity": result_PIMGLBA.fundReturns.cumulativeReturn["main"] - 1, "FIDITBD LX Equity": result_FIDITBD.fundReturns.cumulativeReturn["main"] - 1 };
    let fundReturns = { "BEUCTRUU Index": result_beuctruu.fundReturns, "EMUSTRUU Index": result_emustruu.fundReturns, "LEGATRUU Index": result_legatruu.fundReturns, "PIMGLBA ID Equity": result_PIMGLBA.fundReturns, "FIDITBD LX Equity": result_FIDITBD.fundReturns };

    let outPerformance = calculateOutPerformance({ benchmarks: benchmarks, data: result.monthlyReturns[type] });
    let annulizedReturnBenchMarks = calculateOutPerformanceParam({ benchmarks: annulizedReturns, data: result.annulizedReturn[type]["annualPer"] });
    let cumulativeReturnsBenchMarks = calculateOutPerformanceParam({ benchmarks: cumulativeReturns, data: result.fundReturns.cumulativeReturn[type] - 1 });
    let ratiosAndPositiveNegativeCorrelations = calculateRatios({ benchmarks: fundReturns, data: result.fundReturns, type: type });

    let benchmarksBeta = {
      "BEUCTRUU Index": { results: result_beuctruu.returns["main"], normal: result_beuctruu.normal["main"] },
      "EMUSTRUU Index": { results: result_emustruu.returns["main"], normal: result_emustruu.normal["main"] },
      "LEGATRUU Index": { results: result_legatruu.returns["main"], normal: result_legatruu.normal["main"] },
      "FIDITBD LX Equity": { results: result_FIDITBD.returns["main"], normal: result_FIDITBD.normal["main"] },
      "PIMGLBA ID Equity": { results: result_PIMGLBA.returns["main"], normal: result_PIMGLBA.normal["main"] },
    };

    let betaCorrelation = calculateBetaCorrelationBenchMarks({ benchmarks: benchmarksBeta, data: { results: result.returns[type], normal: result.normal[type] } });
    let benchmarksRiskRatios = {
      "BEUCTRUU Index": { annulizedReturn: result_beuctruu.annulizedReturn["main"], maxDrawdown: result_beuctruu.maxDrawdown["main"], normal: result_beuctruu.normal["main"], negativeAnnualVolitality: result_beuctruu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["BEUCTRUU Index"] },
      "EMUSTRUU Index": { annulizedReturn: result_emustruu.annulizedReturn["main"], maxDrawdown: result_emustruu.maxDrawdown["main"], normal: result_emustruu.normal["main"], negativeAnnualVolitality: result_emustruu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["EMUSTRUU Index"] },
      "LEGATRUU Index": { annulizedReturn: result_legatruu.annulizedReturn["main"], maxDrawdown: result_legatruu.maxDrawdown["main"], normal: result_legatruu.normal["main"], negativeAnnualVolitality: result_legatruu.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["LEGATRUU Index"] },
      "FIDITBD LX Equity": { annulizedReturn: result_FIDITBD.annulizedReturn["main"], maxDrawdown: result_FIDITBD.maxDrawdown["main"], normal: result_FIDITBD.normal["main"], negativeAnnualVolitality: result_FIDITBD.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["FIDITBD LX Equity"] },
      "PIMGLBA ID Equity": { annulizedReturn: result_PIMGLBA.annulizedReturn["main"], maxDrawdown: result_PIMGLBA.maxDrawdown["main"], normal: result_PIMGLBA.normal["main"], negativeAnnualVolitality: result_PIMGLBA.negativeAnnualVolitality["main"], beta: betaCorrelation.betas["PIMGLBA ID Equity"] },

      Triada: { annulizedReturn: result.annulizedReturn[type], maxDrawdown: result.maxDrawdown[type], normal: result.normal[type], negativeAnnualVolitality: result.negativeAnnualVolitality[type], beta: 1 },
    };
    let riskRatios = calculateRiskRatios({ benchmarks: benchmarksRiskRatios, treasuryAnnualRate: treasuryAnnualRate.annualizedReturn });

    let benchmarksRegression = {
      "BEUCTRUU Index": { results: result_beuctruu.returns["main"], annulizedReturn: result_beuctruu.annulizedReturn["main"], beta: betaCorrelation.betas["BEUCTRUU Index"], correlation: betaCorrelation.correlation["BEUCTRUU Index"], fundReturns: result_beuctruu.fundReturns.returnsHashTable.main },
      "EMUSTRUU Index": { results: result_emustruu.returns["main"], annulizedReturn: result_emustruu.annulizedReturn["main"], beta: betaCorrelation.betas["EMUSTRUU Index"], correlation: betaCorrelation.correlation["EMUSTRUU Index"], fundReturns: result_emustruu.fundReturns.returnsHashTable.main },
      "LEGATRUU Index": { results: result_legatruu.returns["main"], annulizedReturn: result_legatruu.annulizedReturn["main"], beta: betaCorrelation.betas["LEGATRUU Index"], correlation: betaCorrelation.correlation["LEGATRUU Index"], fundReturns: result_legatruu.fundReturns.returnsHashTable.main },
      "FIDITBD LX Equity": { results: result_FIDITBD.returns["main"], annulizedReturn: result_FIDITBD.annulizedReturn["main"], beta: betaCorrelation.betas["FIDITBD LX Equity"], correlation: betaCorrelation.correlation["FIDITBD LX Equity"], fundReturns: result_FIDITBD.fundReturns.returnsHashTable.main },
      "PIMGLBA ID Equity": { results: result_PIMGLBA.returns["main"], annulizedReturn: result_PIMGLBA.annulizedReturn["main"], beta: betaCorrelation.betas["PIMGLBA ID Equity"], correlation: betaCorrelation.correlation["PIMGLBA ID Equity"], fundReturns: result_PIMGLBA.fundReturns.returnsHashTable.main },
    };
    let correlationAndRegresion = calculateRegression({ benchmarks: benchmarksRegression, treasuryAnnualRate: treasuryAnnualRate.annualizedReturn, data: { results: result.fundReturns.returnsHashTable[type] }, correlations: ratiosAndPositiveNegativeCorrelations, annulizedReturnBenchMarks: annulizedReturnBenchMarks });

    deleteUnnecessaryValues(result, type);
    deleteUnnecessaryValues(result_beuctruu, "main");
    deleteUnnecessaryValues(result_emustruu, "main");
    deleteUnnecessaryValues(result_legatruu, "main");
    deleteUnnecessaryValues(result_FIDITBD, "main");
    deleteUnnecessaryValues(result_PIMGLBA, "main");

    let cumulativeReturnsHashTable = {
      triada: result.cumulativeReturnsHashTable[type],
      "BEUCTRUU Index": result_beuctruu.cumulativeReturnsHashTable["main"],
      "EMUSTRUU Index": result_emustruu.cumulativeReturnsHashTable["main"],
      "LEGATRUU Index": result_legatruu.cumulativeReturnsHashTable["main"],
      "FIDITBD LX Equity": result_FIDITBD.cumulativeReturnsHashTable["main"],
      "PIMGLBA ID Equity": result_PIMGLBA.cumulativeReturnsHashTable["main"],
    };

    let cumulativeReturnsHashTableSince2020 = {
      triada: result.cumulativeReturnsHashTableSince2020[type],
      "BEUCTRUU Index": result_beuctruu.cumulativeReturnsHashTableSince2020["main"],
      "EMUSTRUU Index": result_emustruu.cumulativeReturnsHashTableSince2020["main"],
      "LEGATRUU Index": result_legatruu.cumulativeReturnsHashTableSince2020["main"],
      "FIDITBD LX Equity": result_FIDITBD.cumulativeReturnsHashTableSince2020["main"],
      "PIMGLBA ID Equity": result_PIMGLBA.cumulativeReturnsHashTableSince2020["main"],
    };

    let resultFinal: any = {
      result: result,
      outPerformance: outPerformance,
      annulizedReturnBenchMarks: annulizedReturnBenchMarks,
      cumulativeReturnsBenchMarks: cumulativeReturnsBenchMarks,
      ratios: ratiosAndPositiveNegativeCorrelations.ratios,
      riskRatios: riskRatios,
      correlationAndRegresion: correlationAndRegresion.regression,
      lastDate: lastDate,
      lastDateTimestamp: lastDateTimestamp,
      cumulativeReturnsHashTable: cumulativeReturnsHashTable,
      treasuryAnnualRate: treasuryAnnualRate.annualizedReturn,
      cumulativeReturnsHashTableSince2020: cumulativeReturnsHashTableSince2020,
    };
    if (mkt) {
      resultFinal.result_beuctruu = result_beuctruu;
      resultFinal.result_emustruu = result_emustruu;
      resultFinal.result_legatruu = result_legatruu;
      resultFinal.result_PIMGLBA = result_PIMGLBA;
      resultFinal.result_FIDITBD = result_FIDITBD;
      for (let param in compare) {
        for (let year in compare[param]) {
          compare[param][year] = sortObjectByValues(compare[param][year], param)
        }
      }
      resultFinal.compare = compare;
    }
    return resultFinal;
  }
}

import { formatDateRlzdDaily, getAllDatesSinceLastMonthLastDay, getLastDayOfMonth, monthlyRlzdDate } from "../../reports/common";
import { calculateRlzd } from "../../reports/portfolios";
import { parseBondIdentifier } from "../../reports/tools";
import { getRlzdTrades } from "../../reports/trades";
import { client } from "../../userManagement/auth";

export async function getCollectionsInRange(start: any, end: any): Promise<any> {
  const database = client.db("portfolios");

  const cursor = database.listCollections();
  const collections = await cursor.toArray();
  let finalCollections: any = {};
  let finalCollectionsArray: any = [];

  for (let index = 0; index < collections.length; index++) {
    const element = collections[index];
    let name = element.name.split("-");
    let date = new Date(name[2] + "/" + name[3].split(" ")[0] + "/" + name[1]).getTime();
    if (date >= start && date <= end) {
      finalCollections[date] = element.name;
    }
  }
  let keys = Object.keys(finalCollections).sort((a: any, b: any) => a - b);
  for (let index = 0; index < keys.length; index++) {
    const element = keys[index];
    finalCollectionsArray.push(finalCollections[element]);
  }

  return finalCollectionsArray;
}



import { client } from "../auth";



export async function getTrades(tradeType: any) {
  try {
    const database = client.db("trades_v_2");
    const reportCollection = database.collection(`${tradeType}`);
    let documents = await reportCollection.find().sort({ "Trade Date": -1 }).toArray();
    for (let index = 0; index < documents.length; index++) {
      let trade = documents[index];
      if (!trade["BB Ticker"] && trade["Issue"]) {
        trade["BB Ticker"] = trade["Issue"];
        delete trade["Issue"];
      }
    }
    return documents;
  } catch (error) {
    return error;
  }
}


export async function insertTrade(trades: any, tradeType: any) {
  const database = client.db("trades_v_2");
  const reportCollection = database.collection(`${tradeType}`);

  const operations = trades.map((trade: any) => ({
    updateOne: {
      filter: { "Triada Trade Id": trade["Triada Trade Id"] },
      update: { $set: trade },
      upsert: true,
    },
  }));

  // Execute the operations in bulk
  try {
    const result = await reportCollection.bulkWrite(operations);
    return result;
  } catch (error) {
    return error;
  }
}

export async function tradesTriadaIds() {
  try {
    const database = client.db("trades_v_2");
    const reportCollection1 = database.collection("vcons");
    const reportCollection2 = database.collection("ib");
    const reportCollection3 = database.collection("emsx");
    const document1 = await reportCollection1.find().toArray();
    const document2 = await reportCollection2.find().toArray();
    const document3 = await reportCollection3.find().toArray();
    let document = [...document1, ...document2, ...document3];
    if (document) {
      let sequalNumbers = [];
      for (let index = 0; index < document.length; index++) {
        let trade = document[index];
        sequalNumbers.push(trade["Triada Trade Id"]);
      }

      return sequalNumbers;
    } else {
      return [];
    }
  } catch (error) {
    return error;
  }
}
export async function findTrade(tradeType: string, tradeTriadaId: string, seqNo = null) {
  try {
    const database = client.db("trades_v_2");
    const reportCollection = database.collection(tradeType);
    let query;
    if (seqNo != null) {
      query = { $and: [{ "Triada Trade Id": tradeTriadaId }, { "Seq No": seqNo }] };
    } else {
      query = { "Triada Trade Id": tradeTriadaId };
    }

    const documents = await reportCollection.find(query).toArray();

    if (documents) {
      return documents[0];
    } else {
      return [];
    }
  } catch (error) {
    return error;
  }
}







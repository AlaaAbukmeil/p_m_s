import { client } from "./auth";
export async function getAllTrades(from: number, to: number) {
  try {
    const database = client.db("trades_v_2");
    const collections = [database.collection("vcons"), database.collection("ib"), database.collection("emsx")];

    // The query to be used on all collections
    const query = {
      timestamp: {
        $gte: from, // Greater than or equal to "from" timestamp
        $lte: to, // Less than or equal to "to" timestamp
      },
    };

    // An array to hold all the documents from all collections
    let allDocuments: any = [];

    // Loop through each collection and retrieve the documents
    for (const collection of collections) {
      const documents = await collection.find(query).toArray();
      allDocuments = allDocuments.concat(documents);
    }

    return allDocuments;
  } catch (error) {
    // Handle the error appropriately
    return { error: error };
  }
}

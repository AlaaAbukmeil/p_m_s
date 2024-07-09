require("dotenv").config();
const { VertexAI } = require("@google-cloud/vertexai");
const { JWT } = require("google-auth-library");
const fs = require("fs");
const { exec } = require("child_process");
// Initialize Vertex with your Cloud project and location

const vertex_ai = new VertexAI({
  project: process.env.PROJECTID,
  location: "asia-east2",
  keyFilename: process.env.KEYPATHFILE,
});
const model = "gemini-1.5-flash-001";
const instrutions = [
  {
    text: `Input will be trade confirmation from different counter parties. Each message will have different format, but most will have notional amount, settlement date, settlement venue (both buyer and seller). Return these three parameters in a json format.
{
  "B/S", B (buy) or S (sell) from triada's point of you, you might need to reverse what you read on the messages. only answer B / S,
  "ISIN", the issue security id (ISIN),
"BB Ticker", the issue security name/description,
  "Triada Venue": will be triada settlement venue (us),
"Counter Venue": will be the other settlement venue,
"Settlement Date" : settlement date (MM/DD/YYYY Format !important),
"Notional Amount": notional,
"Web Link": you can find it at the end of each message,
"Broker Name": you can find it at the end of each message,
 Note that all messages will be passed in one prompt and they will be sperated by a long \ character and the phrase (next message)} make sure you return json format very important`,
  },
];
// Instantiate the models
const generativeModel = vertex_ai.preview.getGenerativeModel({
  model: model,
  generationConfig: {
    maxOutputTokens: 8192,
    temperature: 1,
    topP: 0.95,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
  systemInstruction: {
    parts: [instrutions],
  },
});

// async function main(
//   // Full path to the service account credential
//   keyFile = process.env.KEYPATHFILE
// ) {
//   const keys = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
//   const client = new JWT({
//     email: keys.client_email,
//     key: keys.private_key,
//     scopes: ['https://www.googleapis.com/auth/cloud-platform'],
//   });
//   const url = `https://dns.googleapis.com/dns/v1/projects/${keys.project_id}`;
//   const res = await client.request({url});
//   console.log('DNS Info:');
//   console.log(res.data);

//   // After acquiring an access_token, you may want to check on the audience, expiration,
//   // or original scopes requested.  You can do that with the `getTokenInfo` method.
//   const tokenInfo = await client.getTokenInfo(client.credentials.access_token);
//   console.log(tokenInfo);
// }

// const args = process.argv.slice(2);
// main(...args).catch(console.error);
// function authenticateGCloud() {
//   const command = 'gcloud auth login --no-launch-browser';

//   exec(command, (error, stdout, stderr) => {
//       if (error) {
//           console.error(`exec error: ${error}`);
//           return;
//       }
//       if (stderr) {
//           console.error(`stderr: ${stderr}`);
//           return;
//       }
//       console.log(`stdout: ${stdout}`);
//       console.log('Authentication process initiated. Check your web browser.');
//   });
// }
export async function generateContent(text: string) {
  const req = {
    contents: [{ role: "user", parts: [{ text: text }] }],
  };

  const streamingResp = await generativeModel.generateContentStream(req);

  //   for await (const item of streamingResp.stream) {
  //     process.stdout.write("stream chunk: " + JSON.stringify(item) + "\n");
  //   }

  //   process.stdout.write(JSON.stringify(await streamingResp.response));
  let response: any = await streamingResp.response;
  return JSON.parse(JSON.parse(JSON.stringify(response.candidates[0].content.parts[0].text)).replace(/`/g, "").replace("json", ""));
  //   return response;
}

import { Position } from "../../models/position";
import { client } from "../userManagement/auth";
import { bucket, bucketPublic, formatDateUS, generateRandomString } from "../common";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { insertEditLogs } from "./logs";
import puppeteer from "puppeteer";
import { uploadToGCloudBucketPDF } from "./readExcel";
import { parseBondIdentifier } from "../reports/tools";

export function formatDateNomura(dateString: any) {
  // Split the input date string by '/'
  const parts = dateString.split("/");

  // Extract month, day, and year from the parts
  const month = parts[0];
  const day = parts[1];
  const year = parts[2];

  // Return the formatted string in 'yyyymmdd' format
  return `${year}${month}${day}`;
}

export async function getCollectionDays(): Promise<string[]> {
  try {
    const database = client.db("portfolios");
    let collections = await database.listCollections().toArray();
    let dates: any = [];
    for (let index = 0; index < collections.length; index++) {
      let collectionTime = collections[index].name.split("portfolio");
      let date = formatDateUS(collectionTime);
      if (!dates.includes(date)) {
        dates.push(date);
      }
    }
    dates.sort((a: any, b: any) => new Date(b).getTime() - new Date(a).getTime());

    return dates;
  } catch (error: any) {
    let dateTime = getDateTimeInMongoDBCollectionFormat(new Date());
    console.log(error);
    let errorMessage = error instanceof Error ? error.message : "An unknown error occurred";

    await insertEditLogs([errorMessage], "Errors", dateTime, "getCollectionDays", "controllers/operations/operations.ts");

    return [];
  }
}
export function getSecurityInPortfolioWithoutLocation(portfolio: any, identifier: string): Position | 404 {
  let document: any = [];
  if (identifier == "" || !identifier) {
    return document;
  }
  for (let index = 0; index < portfolio.length; index++) {
    let issue = portfolio[index];
    if (identifier.includes(issue["ISIN"])) {
      if (issue["ISIN"] != "") {
        document.push(issue);
      }
    } else if (identifier.includes(issue["BB Ticker"])) {
      if (issue["BB Ticker"] != "") {
        document.push(issue);
      }
    } else if (identifier.includes(issue["Bloomberg ID"])) {
      if (issue["Bloomber ID"] != "") {
        document.push(issue);
      }
    }
  }
  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return document.length ? document : 404;
}
export function getSecurityInPortfolioById(portfolio: any, id: string) {
  let document = 404;
  if (id == "" || !id) {
    return document;
  }
  for (let index = 0; index < portfolio.length; index++) {
    let issue = portfolio[index];
    if (id.toString() == issue["_id"].toString()) {
      document = issue;
    }
  }
  // If a matching document was found, return it. Otherwise, return a message indicating that no match was found.
  return document;
}
export function compareMonths(a: any, b: any) {
  // Reformat the month string to 'MM/01/YYYY' for comparison
  let reformattedMonthA = a.month.substring(5) + "/01/" + a.month.substring(0, 4);
  let reformattedMonthB = b.month.substring(5) + "/01/" + b.month.substring(0, 4);
  // Convert the reformatted strings to date objects
  let dateA = new Date(reformattedMonthA).getTime();
  let dateB = new Date(reformattedMonthB).getTime();

  // Compare the date objects
  return dateB - dateA;
}

export function getMonthInFundDetailsFormat(date: any) {
  let fundDetailsMonth = "";
  date = new Date(date);
  let month = date.getMonth() + 1;
  if (month < 10) {
    month = "0" + month;
  }
  let year = date.getFullYear();
  return `${year}/${month}`;
}

export function getDateAndOneWeekLater() {
  // Create a Date object from the input date
  let startDate = new Date();

  // Check if the date is valid

  // Create a new Date object for the date one week later
  let endDate = new Date(startDate.getTime());

  // Add 7 days to the date
  endDate.setDate(startDate.getDate() + 7);

  // Format dates to a more readable form, e.g., YYYY-MM-DD
  const options: any = { year: "numeric", month: "2-digit", day: "2-digit" };
  let formattedStartDate = startDate.toLocaleDateString("en-CA", options);
  let formattedEndDate = endDate.toLocaleDateString("en-CA", options);

  // Return the original and the one week later dates
  return {
    startDate: formattedStartDate,
    endDate: formattedEndDate,
  };
}
export async function printObjectValues(obj: any, buyer: any, seller: any) {
  let bondAtt = parseBondIdentifier(obj["BB Ticker"]);
  let html = `
  <!DOCTYPE html>
  <html lang="en">
  
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation Document</title>
    <style>
      body {
        font-family: 'Arial', sans-serif;
        margin: 10px;
        padding: 0;
        background: #f4f4f4;
        width: 794px;
        /* A4 width in pixels at 96 DPI */
        height: 1123px;
  
      }
  
      .container {
        background: white;
        padding: 10px;
        margin-top: 10px;
        border: 1px solid #ddd;
        transform: scale(0.85);
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        padding: 10mm;
      }
  
  
      .content {
        transform: scale(0.85);
        /* Adjust this scale as needed */
        
        width: 1000px;
        /* Adjust this width as needed */
      }
  
      h1,
      h2,
      h3 {
        color: #333;
        margin: 0 0 2px 0;
      }
  
      h1 {
        text-align: center;
      }
  
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
  
      td {
        border: 1px dotted black;
        width: 20%;
        padding: 8px;
      }
  
      .logo {
        display: block;
        margin: 0;
        max-width: 200px;
      }
  
      footer {
        margin-top: 20px;
        text-align: center;
        font-size: 0.85em;
      }
  
      hr {
        border-top: dotted 1px;
      }
    </style>
  </head>
  
  <body>
    <div class="container">
      <div class="content">
  
        <div>
          <img src="https://admin.triadacapital.com/photos/triada-logo.png" alt="Triada Capital Logo" class="logo"/>
          <center>
          <h2>CONFIRMATION</h2>
          </center>
  
        </div>
        <p><strong>From:</strong> TRIADA CAPITAL LIMITED<br>
            Unit 520, 5/F, Dina House, Ruttonjee Centre, 3-11 Duddell Street, Central, Hong Kong</p>
        <p><strong>To:</strong> ${obj["Broker Full Name & Account"]}<br>
            Bonds Settlement Department</p>
        <p><strong>Triada Trade Id:</strong> ${obj["Triada Trade Id"]}</p>
        <p><strong>Generated On:</strong> ${getDateTimeInMongoDBCollectionFormat(new Date()) + " HKT"}</p>
        <p>We hereby confirm your securities ${obj["B/S"] == "B" ? "SELL" : "PURCHASE"} on the ${obj["Primary (True/False)"] == "True" ? "PRIMARY" : "SECONDARY"} market.</p>
        <hr style="border-top: dotted 1px;" />
        <h2>Main Information</h2>
        <table>
          <tr>
            <td>Buyer</td>
            <td>${buyer}</td>
          </tr>
          <tr>
            <td>Seller</td>
            <td>${seller}</td>
          </tr>
          <tr>
            <td>Trade date</td>
            <td>${obj["Trade Date"]}</td>
          </tr>
          <tr>
            <td>Settlement date</td>
            <td>${obj["Settle Date"]}</td>
          </tr>
          <tr>
            <td>Notional Amount</td>
            <td>${obj["Notional Amount"]}</td>
          </tr>
          <tr>
            <td>Settlement Amount</td>
            <td>${obj["Settlement Amount"]}</td>
          </tr>
          <tr>
            <td>Accrued interest amount</td>
            <td>${obj["Accrued Interest"]}</td>
          </tr>
          <tr>
            <td>Price</td>
            <td>${obj["Price"]}</td>
          </tr>
          <tr>
            <td>Execution time</td>
            <td>${obj["Trade Date"] + " " + obj["Trade Time"]}</td>
          </tr>
        </table>
        <hr />
  
        <h2>Financial Instrument Attributes</h2>
        <table>
          <tr>
            <td>Ticker</td>
            <td>${obj["BB Ticker"]}</td>
          </tr>
          <tr>
            <td>ISIN</td>
            <td>${obj["ISIN"]}</td>
          </tr>
          <tr>
            <td>Cusip</td>
            <td>${obj["Cuisp"]}</td>
          </tr>
          <tr>
            <td>Currency</td>
            <td>${obj["Currency"]}</td>
          </tr>
          <tr>
            <td>Coupon</td>
            <td>${bondAtt.rate == "" ? "0" : bondAtt.rate + " %"}</td>
          </tr>
          <tr>
            <td>Maturity date</td>
            <td>${bondAtt.date}</td>
          </tr>
        </table>
        <hr />
        <h2>Settlement venue instructions</h2>
        <strong>WITH:</strong> ${obj["Settlement Venue"]}<br>
  
        <p>You will be deemed to have accepted the above offer on the terms set out unless we hear from you to the
          contrary within 48 hours from confirmation date.</p>
        <p>This document has been produced automatically and requires no official signature.</p>
  
        <footer>
          <p>Contact Bonds Back-Office: Triada Operations Team</p>
          <p>Email: <a href="mailto:operations@triadacapital.com">operations@triadacapital.com</a></p>
        </footer>
      </div>
    </div>
  
  </body>
  
  </html>`
  let output = "";
  let centralizedBlotterHeader: any = ["B/S", "BB Ticker", "Trade Date", "Trade Time", "Settle Date", "Price", "Notional Amount", "Settlement Amount", "Principal", "Counter Party", "Triada Trade Id", "Seq No", "ISIN", "Cuisp", "Currency", "Yield", "Accrued Interest", "Original Face", "Settlement Venue"];

  // Loop through the centralizedBlotterHeader and format them
  for (let i = 0; i < centralizedBlotterHeader.length; i += 2) {
    // Check if there's a pair of key-value centralizedBlotterHeader to process
    if (i + 1 < centralizedBlotterHeader.length) {
      output += `<pre>${centralizedBlotterHeader[i]}: ${obj[centralizedBlotterHeader[i]]}            ${centralizedBlotterHeader[i + 1]}: ${obj[centralizedBlotterHeader[i + 1]]}</pre><br/>`; // Append with tab and newline
    } else {
      // If there's an odd number of centralizedBlotterHeader, print the last one alone
      output += `${centralizedBlotterHeader[i]}: ${obj[centralizedBlotterHeader[i]]}<br/>`;
    }
  }
  let test = await htmlToPDFandUpload(html, "broker", "confirmation");
  return { url: test, output: output };
}

export async function htmlToPDFandUpload(html: string, pathName: string, folderName: string): Promise<string> {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(html);

  const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await browser.close();

  let randomString = generateRandomString(6);
  let fileName = `${folderName}/${pathName.replace(/[!@#$%^&*(),.?":{}|<>\/\[\]\\;'\-=+`~]/g, "_")}_${randomString}.pdf`;

  const publicUrl = await uploadToGCloudBucketPDF(pdfBuffer, fileName);
  return bucketPublic + publicUrl;
}

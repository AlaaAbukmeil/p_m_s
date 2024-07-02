import { Position } from "../../models/position";
import { client } from "../userManagement/auth";
import { bucket, bucketPublic, formatDateUS, generateRandomString } from "../common";
import { getDateTimeInMongoDBCollectionFormat } from "../reports/common";
import { insertEditLogs } from "./logs";
import puppeteer from "puppeteer";
import { uploadToGCloudBucketPDF } from "./readExcel";

export function formatDateNomura(dateString: any) {
  // Split the input date string by '/'
  const parts = dateString.split("/");

  // Extract month, day, and year from the parts
  const month = parts;
  const day = parts;
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
export async function printObjectValues(obj: any) {
  let html = `<!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmation Document</title>
      <style>
          body {
              font-family: 'Arial', sans-serif;
              margin: 20px;
              padding: 0;
              background: #f4f4f4;
          }
          .container {
              background: white;
              padding: 20px;
              margin-top: 20px;
              border: 1px solid #ddd;
          }
          h1, h2, h3 {
              color: #333;
          }
          table {
              width: 100%;
              border-collapse: collapse;
          }
          th, td {
              border: 1px solid black;
              padding: 8px;
              text-align: left;
          }
          footer {
              margin-top: 20px;
              text-align: center;
              font-size: 0.85em;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <h1>CONFIRMATION</h1>
          <p><strong>From:</strong> CREDIT AGRICOLE CORPORATE AND INVESTMENT BANK<br>
          12, Place des Etats-Unis - CS 70052, 92547, Montrouge Cedex, FRA</p>
          <p><strong>To:</strong> TRIADA CAPITAL LIMITED<br>
          Bonds Settlement Department</p>
          <p><strong>Message reference:</strong> CYC00302096032CS</p>
          <p><strong>Generated On:</strong> 26/06/24 7:11:53.227 o'clock AM GMT</p>
          <p>We hereby confirm your securities PURCHASE on the PRIMARY market.</p>
  
          <h2>Main Information</h2>
          <table>
              <tr><td>Our reference</td><td>42682653</td></tr>
              <tr><td>Buyer</td><td>TRIADA CAPITAL LIMITED 0001141531</td></tr>
              <tr><td>Seller</td><td>CREDIT AGRICOLE CORPORATE AND INVESTMENT BANK</td></tr>
              <tr><td>Trade date</td><td>25/06/2024</td></tr>
              <tr><td>Settlement date</td><td>02/07/2024</td></tr>
              <tr><td>Accrued interest amount</td><td>$0.00</td></tr>
              <tr><td>Clean price</td><td>100.00</td></tr>
              <tr><td>Dirty price</td><td>100.00</td></tr>
              <tr><td>Cash countervalue</td><td>$1,700,000.00 USD</td></tr>
              <tr><td>Nominal</td><td>$1,700,000.00 USD</td></tr>
              <tr><td>Execution time</td><td>26/06/24 6:30:41.000 AM GMT</td></tr>
          </table>
  
          <h2>Financial Instrument Attributes</h2>
          <p><strong>ISIN:</strong> XS2841151553<br>
          <strong>Currency:</strong> USD<br>
          <strong>Issuer:</strong> CHINA GREAT WALL INTERNATIONAL HOLDINGS VI LIMITED<br>
          <strong>Issue date:</strong> JULY 2, 2024<br>
          <strong>Rate:</strong> 7.15<br>
          <strong>Maturity date:</strong> JULY 2, 2027<br>
          <strong>Spread:</strong> (not specified)</p>
  
          <h2>CREDIT AGRICOLE CORPORATE AND INVESTMENT BANK instructions</h2>
          <p><strong>ACCOUNT:</strong> 70496<br>
          <strong>WITH:</strong> CLEARSTREAM - CEDELULLXXX<br>
          <strong>BENEFICIARY:</strong> Crédit Agricole CIB - BSUIFRPPXXX</p>
  
          <h2>TRIADA CAPITAL LIMITED instructions</h2>
          <p><strong>SECURITY SETTLEMENT SYSTEM AGAINST PAYMENT:</strong> EUROCLEAR - MGTCBEBEECL<br>
          <strong>ACCOUNT:</strong> 25342<br>
          <strong>WITH EUROCLEAR BANK SA NV:</strong> MGTCBEBEECL<br>
          <strong>BENEFICIARY:</strong> TRIADA CAPITAL LIMITED</p>
  
          <p>You will be deemed to have accepted the above offer on the terms set out unless we hear from you to the contrary within 48 hours from confirmation date.</p>
          <p>This document has been produced automatically and requires no official signature.</p>
  
          <footer>
              <p>Contact Bonds Back-Office: CLIENT SETTLEMENT TEAM</p>
              <p>Email: <a href="mailto:Bondsettlement@ca-cib.com">Bondsettlement@ca-cib.com</a></p>
              <p>Phone:</p>
              <p>Fax: 33(0)141894320</p>
          </footer>
      </div>
  </body>
  </html>`;
  let output = ""
  let centralizedBlotterHeader: any = ["B/S", "BB Ticker", "Trade Date", "Trade Time", "Settle Date", "Price", "Notional Amount", "Settlement Amount", "Principal", "Counter Party", "Triada Trade Id", "Seq No", "ISIN", "Cuisp", "Currency", "Yield", "Accrued Interest", "Original Face", "Settlement Venue", "Triada-Broker Notes"];

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

  const pdfBuffer = await page.pdf({ format: "A4" });
  await browser.close();

  let randomString = generateRandomString(6);
  let fileName = `${folderName}/${pathName.replace(/[!@#$%^&*(),.?":{}|<>\/\[\]\\;'\-=+`~]/g, "_")}_${randomString}.pdf`;

  const publicUrl = await uploadToGCloudBucketPDF(pdfBuffer, fileName);
  return bucketPublic + publicUrl;
}

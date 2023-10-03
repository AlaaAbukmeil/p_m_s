"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendIsinComplaint = exports.checkIfSecurityExist = void 0;
const axios = require("axios");
const xlsx = require("xlsx");
require("dotenv").config();
const SibApiV3Sdk = require('sib-api-v3-sdk');
SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.SEND_IN_BLUE_API_KEY;
async function checkIfSecurityExist(path) {
    const data = await readIsinExcel(path);
    // return data[0]
    if (data.error) {
        return data;
    }
    else {
        const nodeId = process.env.NODE_ID;
        let isin = {
            "isin": data
        };
        let url = "https://api.imaginesoftware.com/farm/app/isin/results";
        let action = await axios({
            method: 'post',
            url: url,
            data: isin,
            auth: {
                username: process.env.IMAGINE_USER,
                password: process.env.IMAGINE_PASSWORD
            }
        });
        // console.log(action)
        let result = action.data;
        if (Object.keys(result).length > 0) {
            await sendIsinComplaint(result);
            return result;
        }
        else {
            return result;
        }
    }
}
exports.checkIfSecurityExist = checkIfSecurityExist;
async function readIsinExcel(path) {
    const response = await axios.get(path, { responseType: 'arraybuffer' });
    /* Parse the data */
    const workbook = xlsx.read(response.data, { type: 'buffer' });
    /* Get first worksheet */
    const worksheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[worksheetName];
    /* Convert worksheet to JSON */
    // const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: ''});
    // Read data
    const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    const headersFormat = [
        'ISIN', 'Security', 'BrkrName'
    ];
    const arraysAreEqual = headersFormat.length === headers[0].length && headersFormat.every((value, index) => value === headers[0][index]);
    if (!arraysAreEqual) {
        return { error: "Incompatible format, please upload isin e-blot xlsx/csv file" };
    }
    else {
        const data = xlsx.utils.sheet_to_json(worksheet, { defval: '', range: 'A1:C10000' });
        return data;
    }
}
async function sendIsinComplaint(data) {
    let rows = Object.keys(data);
    let text = ``;
    for (let index = 0; index < rows.length; index++) {
        let row = rows[index];
        text += `<strong>Security Name:</strong> ${data[row]["Security"]}<br /><br /> <strong>Issuer:</strong> ${data[row]["BrkrName"]} <br /><br /> <strong>ISIN:</strong> ${data[row]["ISIN"]}<br /><br /><br />`;
    }
    try {
        let email = new SibApiV3Sdk.TransactionalEmailsApi().sendTransacEmail({
            "sender": { "email": "abukmeilalaa@gmail.com", "name": "Alaa Abukmeil" },
            "subject": "Set up of new secuirty in Imagine",
            "htmlContent": "<!DOCTYPE html><html><body><p>Set up of new secuirty in Imagine .</p></body></html>",
            "params": {
                "greeting": "Hello",
                "headline": "Set up of new secuirty in Imagine"
            },
            "messageVersions": [
                //Definition for Message Version 1 
                {
                    "to": [
                        {
                            "email": "abukmeilalaa@gmail.com" //"help@imagine-sw.com"
                        }
                    ],
                    "cc": [{
                            "email": "jm@triadacapital.com"
                        }],
                    "htmlContent": `<!DOCTYPE html><html><body>Hi team,<br /><br />
                    <p>Please kindly arrange to set up a new secuirty in imagine and blew is the details:  </p>` +
                        text
                        + `Thanks,<br /><br /> Alaa</body></html>`,
                    "subject": "Set up of new secuirty in Imagine"
                }
            ]
        });
        return { statusCode: 200 };
    }
    catch (error) {
        return error;
    }
}
exports.sendIsinComplaint = sendIsinComplaint;

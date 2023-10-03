const axios = require("axios")
const FormData = require('form-data');
import { renderVcon } from "./vconOperation";

export async function getGraphToken() {
    try {
        let form = new FormData()
        form.append('grant_type', 'client_credentials');
        // form.append('username', 'vcons@triadacapital.com');
        // form.append('password', 'Jon63977');
        form.append('client_id', '43e02cc4-3327-41f6-86a2-2da01d65e641');
        form.append('scope', 'https://graph.microsoft.com/.default');
        form.append('client_secret', 'zt58Q~NTqG4OrbCG32TvhJBD2e0VHXxIBb1UNbyd');
        let url = `https://login.microsoftonline.com/cb7b2398-24e7-4982-ba78-31f3ad6aee9f/oauth2/v2.0/token`
        let action = await axios.post(url, form)
        return action.data["access_token"]
    } catch (error) {
        return error
    }
}

function format_date_ISO(date: string) {
    return new Date(date).toISOString();
}

export async function getVcons(token: string, start_time: string, end_time: string) {

    try {
        // console.log(object)
        let url = `https://graph.microsoft.com/v1.0/users/vcons@triadacapital.com/messages?$filter=contains(subject,'New BB') and receivedDateTime ge ${format_date_ISO(start_time)} and receivedDateTime le ${format_date_ISO(end_time)}&$top=10000`
        let action = await axios.get(url, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
        let vcons = action.data.value
        // console.log(url)
        let object = []
        for (let index = 0; index < vcons.length; index++) {
            let vcon = vcons[index].body.content
            object.push(renderVcon(vcon))
        }
        return object
    } catch (error) {
        return error
    }
}



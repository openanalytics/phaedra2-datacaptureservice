'use strict';

const axios = require('axios')
const oauth2 = require('../data.capture.auth/oauth2.client')

const serviceAPI = {

    postProperty: async (measID, propName, propValue) => {
        const url = makeURL('/properties');
        const body = JSON.stringify({
            objectClass: "MEASUREMENT",
            objectId: measID,
            propertyName: propName,
            propertyValue: propValue
        });
        const headers = await buildRequestHeaders();
        const response = await axios.post(url, body, { headers: headers });
    },

    postTag: async (measID, tagValue) => {
        const url = makeURL('/tags');
        const body = JSON.stringify({
            objectClass: "MEASUREMENT",
            objectId: measID,
            tag: tagValue
        });
        const headers = await buildRequestHeaders();
        const response = await axios.post(url, body, { headers: headers });
    }

}

module.exports = serviceAPI;

function makeURL(path) {
    const host = process.env.METADATA_SERVICE_HOST || 'http://localhost'
    const port = process.env.PORT || 3008
    return `${host}:${port}/phaedra/metadata-service${path}`;
}

async function buildRequestHeaders(isBinary) {
    const token = await oauth2.getAccessToken();
    const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Bearer ' + token
    };
    if (isBinary) headers['Content-Type'] = 'application/octet-stream';
    return headers;
}

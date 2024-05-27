'use strict';

const axios = require('axios')
const oauth2 = require('../data.capture.auth/oauth2.client')

const measServiceAPI = {

    postMeasurement: async (measurement) => {
        const url = makeURL('/measurements');
        const body = JSON.stringify(measurement);
        const headers = await buildRequestHeaders();
        const response = await axios.post(url, body, { headers: headers });
        measurement.id = response.data.id;
    },

    putMeasurement: async (measurement) => {
        const url = makeURL(`/measurements/${measurement.id}`);
        const body = JSON.stringify(measurement);
        const headers = await buildRequestHeaders();
        const response = await axios.put(url, body, { headers: headers });
        measurement.id = response.data.id;
    },

    deleteMeasurement: async (measurementId) => {
        const url = makeURL(`/measurements/${measurementId}`);
        const headers = await buildRequestHeaders();
        await axios.delete(url, { headers: headers });
    },

    postImageData: async (measId, wellNr, channelId, imageData) => {
        console.log(`Uploading imageData for meas ${measId}, well ${wellNr}, channel ${channelId}: ${imageData.length} bytes`);
        const url = makeURL(`/measurements/${measId}/imagedata/${wellNr}/${channelId}`);
        const headers = await buildRequestHeaders(true);
        // await axios.post(url, imageData, { headers: headers });
        await axios({
            method: 'POST',
            url: url,
            data: imageData,
            headers: headers
        });
    }
}

module.exports = measServiceAPI;

function makeURL(path) {
    const host = process.env.MEASUREMENT_SERVICE_HOST || 'http://localhost:3008'
    return `${host}/phaedra/measurement-service${path}`;
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

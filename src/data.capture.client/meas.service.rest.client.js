'use strict';

const http = require('http')
const axios = require('axios')

const measServiceAPI = {
    postMeasurement: async (measurement, token) => {
        const host = process.env.MEAS_SERVICE_HOST || 'http://localhost'
        const port = process.env.PORT || 3008
        const path = '/phaedra/measurement-service/measurements';
        const url = host + ":" + port + path

        const options = {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Authorization': 'Bearer ' + token
                }
        }
        console.log("Post measurement to " + url)

        const body = JSON.stringify(measurement);
        // console.log("Measurement request body: " + JSON.stringify(body))

        const response = await axios.post(url, body, options)
        // console.log(response)
        measurement.id = response.data.id
    },
    putMeasurement: async (measurement, token) => {
        const host = process.env.MEAS_SERVICE_HOST || 'http://localhost'
        const port = process.env.PORT || 3008
        const path = '/phaedra/measurement-service/measurements/' + measurement.id;
        const url = host + ":" + port + path

        const options = {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': 'Bearer ' + token
            }
        }

        const body = JSON.stringify(measurement);
        const response = await axios.put(url, body, options)
        // console.log(response)
        measurement.id = response.data.id
    },
    postImageData: (measId, wellNr, channelId, imageData, token) => {
        console.log(`Uploading imageData for meas ${measId}, well ${wellNr}, channel ${channelId}: ${imageData.length} bytes`);
        const path = `/phaedra/measurement-service/meas/${measId}/imagedata/${wellNr}/${channelId}`;
        makePOSTRequest(path, imageData, token);
    }
}

module.exports = measServiceAPI;

const makePOSTRequest = (path, body, token, responseCallback) => {
    const options = {
        host: process.env.MEAS_SERVICE_HOST || 'http://localhost',
        port: process.env.PORT || 3008,
        path: path,
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': 'Bearer ' + token
        }
    };
    let request = http.request(options, res => {
        if (res.statusCode !== 201) {
            console.error(`Did not get a Created (201) response from the server. Code: ${res.statusCode}`);
            res.resume();
            return;
        }

        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('close', () => {
            if (responseCallback) responseCallback(data);
        });
    });

    request.write(body);
    request.end();
    request.on('error', (err) => {
        console.error(`Failed to POST measurement: ${err.message}`);
    });
}

const makePUTRequest = (path, body, token, responseCallback) => {
    const options = {
        host: process.env.MEAS_SERVICE_HOST || 'localhost',
        port: process.env.PORT || 3008,
        path: path,
        method: 'PUT',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': 'Bearer ' + token
        }
    };

    let request = http.request(options, (res) => {
        if (res.statusCode !== 200) {
            console.error(`Did not get a OK (200) response from the server. Code: ${res.statusCode}`);
            res.resume();
            return;
        }

        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('close', () => {
            if (responseCallback) responseCallback(data);
        });
    });

    request.write(body);
    request.end();
    request.on('error', (err) => {
        console.error(`Failed to PUT measurement: ${err.message}`);
    });
}

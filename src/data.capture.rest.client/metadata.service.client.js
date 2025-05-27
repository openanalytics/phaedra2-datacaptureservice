/*
 * Phaedra II
 *
 * Copyright (C) 2016-2025 Open Analytics
 *
 * ===========================================================================
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the Apache License as published by
 * The Apache Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * Apache License for more details.
 *
 * You should have received a copy of the Apache License
 * along with this program.  If not, see <http://www.apache.org/licenses/>
 */
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
    },

    getMetadata: async (objectIds, objectClass) => {
        const query = `
            query metadata($objectIds: [ID], $objectClass: String) {
                metadata(objectIds: $objectIds, objectClass: $objectClass) {
                    objectId
                    properties {
                      propertyName
                      propertyValue
                    }
                    tags {
                      tag
                    }
                }
            }
        `
        const variables = {
            objectIds: objectIds,
            objectClass: objectClass
        }

        const url = makeURL('/graphql');
        const body = JSON.stringify({
            query,
            variables
        })
        const headers = await buildRequestHeaders();
        const response = await axios.post(url, body, { headers: headers });

        return response.data;
    }

}

module.exports = serviceAPI;

function makeURL(path) {
    const host = process.env.METADATA_SERVICE_HOST || 'http://localhost:3008'
    return `${host}/phaedra/metadata-service${path}`;
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

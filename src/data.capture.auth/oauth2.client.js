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
const { ClientCredentials } = require('simple-oauth2');

const config = {
    client: {
        id: process.env.OAUTH2_CLIENT_ID,
        secret: process.env.OAUTH2_CLIENT_SECRET
    },
    auth: {
        tokenHost: process.env.OAUTH2_HOST,
        tokenPath: process.env.OAUTH2_TOKEN_PATH
    }
};

const client = new ClientCredentials(config);

const tokenContext = {
    currentToken: null
};

module.exports = {
    getAccessToken: async () => {
        if (!tokenContext.currentToken || tokenContext.currentToken?.expired()) {
            tokenContext.currentToken = await client.getToken({}, { json: true });
        }
        // Note: refres tokens should not be used in client credentials grant
        // if (tokenContext.currentToken?.expired()) {
        //     tokenContext.currentToken = await tokenContext.currentToken.refresh();
        // }
        return tokenContext.currentToken?.token?.access_token;
    }
};
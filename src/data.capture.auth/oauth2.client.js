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
        if (!tokenContext.currentToken) {
            tokenContext.currentToken = await client.getToken({}, { json: true });
        }
        if (tokenContext.currentToken?.expired()) {
            tokenContext.currentToken = await tokenContext.currentToken.refresh();
        }
        return tokenContext.currentToken?.token?.access_token;
    }
};
const parseJWT = (jwt) => {
    if (!jwt) return;

    // Assuming here that the JWT token is a series of 3 base64-encoded parts separated by a dot: header.payload.signature
    const tokenParts = jwt.split(".");
    const payloadString = Buffer.from(tokenParts[1], 'base64');
    const payload = JSON.parse(payloadString);
    return payload;
};

module.exports = {
    getAccessToken: (request) => {
        const authHeader = request.header("Authorization") || "";
        if (authHeader.startsWith("Bearer ")) {
            return authHeader.split(" ")[1];
        }
    },

    getSubject: (accessToken) => {
        const payload = parseJWT(accessToken);
        return payload?.sub;
    },

    getRoles: (accessToken) => {
        const payload = parseJWT(accessToken);
        return payload?.realm_access?.roles || [];
    },

    hasAdminAccess: (accessToken) => {
        const roles = module.exports.getRoles(accessToken);
        return roles.includes('phaedra2-admin');
    }
};
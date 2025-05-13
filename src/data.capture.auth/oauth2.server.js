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
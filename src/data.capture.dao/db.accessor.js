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
/**
 * PostgreSQL DB accessor
 *
 * Connection parameters are obtained from environment variables:
 * PGHOST
 * PGPORT
 * PGDATABASE
 * PGUSER
 * PGPASSWORD
 */

const { Pool } = require('pg')
const pool = new Pool();

const doQuery = async (sql, args, errorHandler) => {
    const client = await pool.connect();
    try {
        return await client.query(sql, args)
    } catch (err) {
        if (errorHandler) errorHandler(err);
        else throw err;
        // else console.log(err.stack)
    } finally {
        client.release();
    }
}

const getFirstResultOrNull = (result) => {
    return (result && result.rows && result.rows.length > 0) ? result.rows[0] : null;
}

const getAllResults = (result) => {
    return result ? result.rows : [];
}

const queryOne = async (sql, args) => {
    const rs = await doQuery(sql, args);
    return getFirstResultOrNull(rs);
}

const queryAll = async (sql, args) => {
    const rs = await doQuery(sql, args);
    return getAllResults(rs);
}

module.exports = {
    doQuery,
    getFirstResultOrNull,
    getAllResults,
    queryOne,
    queryAll
}
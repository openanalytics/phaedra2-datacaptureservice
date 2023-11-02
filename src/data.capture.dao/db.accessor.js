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
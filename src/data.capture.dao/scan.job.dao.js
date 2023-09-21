/**
 * Data Access for ScanJobs.
 * *************************************************
 *
 * A DataCaptureJob is formatted as follows:
 * {
 *  id (number),
 *  createDate (Date),
 *  createdBy (string),
 *  sourcePath (string),
 *  captureConfig (Object, serialized as JSON),
 *  statusCode (string mapped to enum, see updateCaptureJob),
 *  statusMessage: string
 * }
 *
 * A DataCaptureJob can have zero or more DataCaptureJobEvents, formatted as follows:
 * {
 *  jobId (number),
 *  eventDate (Date),
 *  eventType (string mapped to enum, see insertCaptureJobEvent),
 *  eventDetails (string)
 * }
 *
 * Note: connection parameters are obtained from environment variables:
 * PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
 */
const dotenv = require('dotenv');
dotenv.config()

const { Pool } = require('pg')
const pool = new Pool();

const doQuery = async (sql, args, errorHandler) => {
    const client = await pool.connect();
    try {
        return await client.query(sql, args)
    } catch (err) {
        if (errorHandler) errorHandler(err);
        else console.log(err.stack)
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

const mapToScanJob = (row) => {
    if (row === null) return null;
    return {
        id: row.id,
        schedule: row.schedule,
        scannerType: row.scanner_type,
        label: row.label,
        description: row.description,
        scanJobConfig: row.scan_job_config,
        createdOn: row.created_on,
        createdBy: row.created_by,
        updatedOn: row.updated_on,
        updatedBy: row.updated_by
    };
}

// ----------------------------------------------------------------------------
// Public Functions
// ----------------------------------------------------------------------------

/**
 *
 * @param {string} owner The username who created the ScanJob
 * @param {Object} scanJob The new ScanJob object
 * @returns The newly created ScanJob
 */
const insertScanJob = async (owner, scanJob) => {
    console.log(`Creating new ScanJob by ${owner}`)
    const result = await doQuery('insert into datacapture.scan_job (schedule, scanner_type, label, description, scan_job_config, created_on, created_by, updated_on, updated_by) ' +
        'values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *',
        [ scanJob.schedule, scanJob.scannerType, scanJob.label, scanJob.description, scanJob.scanJobConfig,
            new Date(), owner, scanJob.updatedOn, scanJob.updatedBy ]);
    return mapToScanJob(getFirstResultOrNull(result));
}

/**
 * Get a list of all ScanJobs
 *
 * @returns An array containing all matching ScanJobs.
 */
const getAllScanJobs = async () => {
    const result = await doQuery('select * from datacapture.scan_job');
    return getAllResults(result).map(mapToScanJob);
}

/**
 * Retrieve a ScanJob using its unique ID.
 *
 * @param {Number} jobId The unique ID of the scan job to retrieve.
 * @returns The matching ScanJob, or null if no match was found.
 */
const getScanJobById = async (jobId) => {
    const result = await doQuery('select * from datacapture.scan_job where id = $1', [ jobId ]);
    return mapToScanJob(getFirstResultOrNull(result));
}

/**
 * Update an existing ScanJob in the database.
 *
 * @param {string} user Username who updated the ScanJob
 * @param {Object} scanJob The updated ScanJob object
 * @returns The updated ScanJob object
 */
const updateScanJob = async (user, scanJob) => {
    console.log(`Updating CaptureJob ...`)
    const result = await doQuery('update datacapture.scan_job set schedule = $1, scanner_type = $2, label = $3, description = $4, scan_job_config = $5, updated_on = $6, updated_by = $7',
            [ scanJob.schedule, scanJob.scannerType, scanJob.label, scanJob.description, scanJob.scanJobConfig, new Date(), user ])
    return mapToScanJob(getFirstResultOrNull(result))
}

/**
 * Delete a specific ScanJob from database.
 *
 * @param {Number} jobId The unique ID of the ScanJob
 */
const deleteScanJobById = async (jobId) => {
    console.log(`Removing a ScanJob from database ${jobId}`)
    await doQuery('delete from datacapture.scan_job where id = $1', [ jobId ])
}

// ----------------------------------------------------------------------------

module.exports = {
    insertScanJob,
    getAllScanJobs,
    getScanJobById,
    updateScanJob,
    deleteScanJobById
}

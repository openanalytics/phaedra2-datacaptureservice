/**
 * Data Access for CaptureJobs and CaptureJobEvents.
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

const mapToCaptureJob = (row) => {
    if (row === null) return null;
    return {
        id: row.id,
        createDate: row.create_date,
        createdBy: row.created_by,
        sourcePath: row.source_path,
        captureConfig: row.capture_config,
        statusCode: row.status_code,
        statusMessage: row.status_message
    };
}

const mapToCaptureJobEvent = (row) => {
    if (row === null) return null;
    return {
        jobId: row.job_id,
        eventDate: row.event_date,
        eventType: row.event_type,
        eventDetails: row.event_details
    };
}

// ----------------------------------------------------------------------------
// Public Functions
// ----------------------------------------------------------------------------

/**
 * Retrieve a CaptureJob using its unique ID.
 *
 * @param {Number} jobId The unique ID of the job to retrieve.
 * @returns The matching CaptureJob, or null if no match was found.
 */
const getCaptureJob = async (jobId) => {
    const result = await doQuery('select * from datacapture.capture_job where id = $1', [ jobId ]);
    return mapToCaptureJob(getFirstResultOrNull(result));
}

/**
 * Get a list of all CaptureJobs that were created between the two given dates.
 *
 * @param {Date} fromDate The starting Date (inclusive)
 * @param {Date} toDate The ending Date (inclusive)
 * @returns An array containing all matching CaptureJobs.
 */
const getCaptureJobs = async (fromDate, toDate) => {
    const result = await doQuery('select * from datacapture.capture_job where create_date between $1 and $2', [ fromDate, toDate ]);
    return getAllResults(result).map(mapToCaptureJob);
}

/**
 * Retrieve a config of a CaptureJob using its unique ID.
 *
 * @param {Number} jobId The unique ID of the job to retrieve.
 * @returns The matching capture_config, or null if no match was found.
 */
const getCaptureJobConfig = async (jobId) => {
    const result = await doQuery('select * from datacapture.capture_job where id = $1', [ jobId ]);
    return result?getFirstResultOrNull(result).capture_config:null;
}

/**
 * Save a new CaptureJob in the database.
 *
 * @param {string} owner The user who created this CaptureJob
 * @param {string} sourcePath The source path of the CaptureJob
 * @param {*} captureConfig The config (JSON) of the CaptureJob
 * @returns The newly created CaptureJob.
 */
const insertCaptureJob = async (owner, sourcePath, captureConfig) => {
    console.log(`Creating new CaptureJob for user ${owner} on ${sourcePath}`)
    const result = await doQuery('insert into datacapture.capture_job (create_date, created_by, source_path, capture_config, status_code)'
            + ' values ($1, $2, $3, $4, $5) returning *',
            [ new Date(), owner, sourcePath, captureConfig, 'Submitted' ]);
    return mapToCaptureJob(getFirstResultOrNull(result));
}

/**
 * Update the status of an existing CaptureJob in the database.
 *
 * @param {Number} jobId The unique ID of the job to update.
 * @param {string} status The new status to apply ('Submitted', 'Running', 'Cancelled', 'Error', 'Completed').
 * @param {string} message An optional status message string to add.
 */
const updateCaptureJob = async (jobId, status, message) => {
    console.log(`Updating CaptureJob ${jobId} with status ${status} (${message || ''})`)
    await doQuery('update datacapture.capture_job set status_code = $1, status_message = $2 where id = $3',
            [ status, message, jobId ]);
}

/**
 * Retrieve all events for a specific CaptureJob.
 *
 * @param {Number} jobId The unique ID of the CaptureJob to get events for.
 * @returns An array containing all events pertaining to the specified CaptureJob.
 */
const getCaptureJobEvents = async (jobId) => {
    const result = await doQuery('select * from datacapture.capture_job_event where job_id = $1', [ jobId ]);
    return getAllResults(result).map(mapToCaptureJobEvent);
}

/**
 * Save a new CaptureJob event in the database.
 *
 * @param {Number} jobId The unique ID of the CaptureJob this event belongs to.
 * @param {string} eventType The type of the event ('Info', 'Warning', 'Error').
 * @param {string} eventDetails Optional details for the event, as a string.
 */
const insertCaptureJobEvent = async (jobId, eventType, eventDetails) => {
    console.log(`Adding CaptureJobEvent for job ${jobId}: ${eventType}: ${eventDetails}`)
    await doQuery('insert into datacapture.capture_job_event (job_id, event_date, event_type, event_details)'
            + ' values ($1, $2, $3, $4)', [ jobId, new Date(), eventType, eventDetails ])
}

// ----------------------------------------------------------------------------

module.exports = {
    getCaptureJob,
    getCaptureJobs,
    insertCaptureJob,
    updateCaptureJob,
    getCaptureJobEvents,
    insertCaptureJobEvent,
    getCaptureJobConfig
}

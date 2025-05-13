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
const db = require('./db.accessor');

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
    const record = await db.queryOne('select * from datacapture.capture_job where id = $1', [ jobId ]);
    return mapToCaptureJob(record);
}

/**
 * Get a list of all CaptureJobs that were created between the two given dates.
 *
 * @param {Date} fromDate The starting Date (inclusive)
 * @param {Date} toDate The ending Date (inclusive)
 * @returns An array containing all matching CaptureJobs.
 */
const getCaptureJobs = async (fromDate, toDate) => {
    const records = await db.queryAll('select * from datacapture.capture_job where create_date between $1 and $2', [ fromDate, toDate ]);
    return records.map(mapToCaptureJob);
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
    // console.log(`Creating new CaptureJob for user ${owner} on ${sourcePath}`)
    const record = await db.queryOne('insert into datacapture.capture_job (create_date, created_by, source_path, capture_config, status_code)'
            + ' values ($1, $2, $3, $4, $5) returning *',
            [ new Date(), owner, sourcePath, captureConfig, 'Submitted' ]);
    return mapToCaptureJob(record);
}

/**
 * Update the status of an existing CaptureJob in the database.
 *
 * @param {Number} jobId The unique ID of the job to update.
 * @param {string} status The new status to apply ('Submitted', 'Running', 'Cancelled', 'Error', 'Completed').
 * @param {string} message An optional status message string to add.
 */
const updateCaptureJob = async (jobId, status, message) => {
    // console.log(`Updating CaptureJob ${jobId} with status ${status} (${message || ''})`)
    await db.queryOne('update datacapture.capture_job set status_code = $1, status_message = $2 where id = $3', [ status, message, jobId ]);
}

/**
 * Retrieve all events for a specific CaptureJob.
 *
 * @param {Number} jobId The unique ID of the CaptureJob to get events for.
 * @returns An array containing all events pertaining to the specified CaptureJob.
 */
const getCaptureJobEvents = async (jobId) => {
    const records = await db.queryAll('select * from datacapture.capture_job_event where job_id = $1', [ jobId ]);
    return records.map(mapToCaptureJobEvent);
}

/**
 * Save a new CaptureJob event in the database.
 *
 * @param {Number} jobId The unique ID of the CaptureJob this event belongs to.
 * @param {string} eventType The type of the event ('Info', 'Warning', 'Error').
 * @param {string} eventDetails Optional details for the event, as a string.
 */
const insertCaptureJobEvent = async (jobId, eventType, eventDetails) => {
    // console.log(`Adding CaptureJobEvent for job ${jobId}: ${eventType}: ${eventDetails}`)
    await db.queryOne('insert into datacapture.capture_job_event (job_id, event_date, event_type, event_details)'
            + ' values ($1, $2, $3, $4)', [ jobId, new Date(), eventType, eventDetails ])
}

// ----------------------------------------------------------------------------

module.exports = {
    getCaptureJob,
    getCaptureJobs,
    insertCaptureJob,
    updateCaptureJob,
    getCaptureJobEvents,
    insertCaptureJobEvent
}

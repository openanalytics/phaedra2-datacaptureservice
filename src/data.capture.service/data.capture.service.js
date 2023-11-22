'use strict';

const fs = require('fs');
const vm = require('node:vm');

const measClient = require('../data.capture.client/meas.service.rest.client');
const measProducer = require('../data.capture.client/measurement.producer')
const jobDAO = require('../data.capture.dao/data.capture.job.dao');
const dataCaptureProducer = require('./data.capture.producer.service');
const fileStoreService = require('./file.store.service');
const oauth2 = require('../data.capture.auth/oauth2.server');
const captureUtils = require('../data.capture.utils/capture.utils');

const defaultScriptContext = {
    console: console,
    require: require,
    captureUtils: captureUtils,
    measClient: measClient,
    imageCodec: require('../data.capture.utils/image.codec.jp2k'),
    imageIdentifier: require('../data.capture.utils/image.identifier'),
    s3: require('../data.capture.utils/s3.api')
};

exports.getCaptureJob = async (jobId) => {
    const captureJob = await jobDAO.getCaptureJob(jobId);
    if (captureJob) captureJob.events = await jobDAO.getCaptureJobEvents(jobId);
    return captureJob;
}

exports.getCaptureJobs = async (fromDate, toDate) => {
    const captureJobs = await jobDAO.getCaptureJobs(fromDate, toDate);
    await Promise.all(captureJobs.map(async (c) => {
        c.events = await jobDAO.getCaptureJobEvents(c.id)
    }));
    return captureJobs;
}

exports.submitCaptureJob = async (sourcePath, captureConfig) => {
    const captureJob = await jobDAO.insertCaptureJob('System', sourcePath, captureConfig);

    // Here, we could schedule or queue the job execution in some fashion,
    // e.g. to apply throttling or delay if there are too many jobs running.
    // Currently, the job is executed immediately, in an async call without waiting for it to complete.
    this.executeCaptureJob(captureJob);

    return captureJob;
}

exports.cancelCaptureJob = async (captureJobId) => {
    const captureJob = await jobDAO.getCaptureJob(captureJobId);
    if (captureJob.statusCode === 'Running' || captureJob.statusCode === 'Submitted') {
        await jobDAO.insertCaptureJobEvent(captureJobId, 'Warning', `Capture job cancelled by request`);
        return await updateCaptureJob(captureJob, 'Cancelled');
    }
}

exports.executeCaptureJob = async (captureJob) => {
    console.log('Executing capture job: ' + JSON.stringify(captureJob));

    if (captureJob.id === undefined) {
        captureJob = await jobDAO.insertCaptureJob('System', captureJob.sourcePath, captureJob.captureConfig);
    }
    await updateCaptureJob(captureJob, 'Running');

    try {
        const captureConfig = captureJob.captureConfig;
        
        let sourcePath = captureJob.sourcePath;
        //TODO Find a better way to distinguish tmp uploads from other source paths such as S3 URLs
        if (!sourcePath.toLowerCase().startsWith("s3://")) {
            sourcePath = `/usr/app/uploads/${sourcePath}`;
        }

        if (!captureConfig.identifyMeasurements) throw "Capture config is missing the identifyMeasurements step";
        const measurements = await identifyMeasurements(sourcePath, captureJob);
        await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', `${measurements.length} measurement(s) identified`);

        let cancelled = false;
        if (measurements && measurements.length > 0) {
            for (const m of measurements) {
                await measClient.postMeasurement(m);

                if (captureConfig.gatherWellData) {
                    await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', 'Processing measurement well data for ' + m.barcode);
                    await gatherWellData(m, captureJob);
                }

                if (captureConfig.gatherSubwellData) {
                    await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', 'Processing measurement subwell data for ' + m.barcode);
                    //TODO: Stream to the MeasurementService after the well data has been sent, in parallel with image data
                    await gatherSubWellData(m, captureJob);
                }

                if (captureConfig.gatherImageData) {
                    await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', 'Processing measurement image data for ' + m.barcode);
                    await gatherImageData(m, captureJob);
                }

                cancelled = await checkForCancel(captureJob.id);
                if (cancelled) break;

                await dataCaptureProducer.notifyCaptureJobUpdated({
                    ...captureJob,
                    measurementId: m.id,
                    barcode: m.barcode,
                });
            }
        }

        if (!cancelled) {
            await updateCaptureJob(captureJob, 'Completed');
        }
    } catch (err) {
        await updateCaptureJob(captureJob, 'Error', err.toString());
    }
}

/*
 **************************
 * Capture Configurations *
 **************************
 */

exports.getAllCaptureConfigurations = async () => {
    return await fileStoreService.getConfigStore().getAllFiles();
}

exports.getCaptureConfiguration = async (id) => {
    return await fileStoreService.getConfigStore().loadFile(id);
}

exports.addNewCaptureConfiguration = async (config, accessToken) => {
    config.createdBy = oauth2.getSubject(accessToken);
    return await fileStoreService.getConfigStore().saveFile(config);
}

exports.updateCaptureConfiguration = async (id, config, accessToken) => {
    const existingFile = await fileStoreService.getConfigStore().loadFile(id);
    if (!canEditFile(accessToken, existingFile)) throw new StatusError(`No permission to modify file ${id}`, 403 );

    config.id = id;
    config.updatedBy = oauth2.getSubject(accessToken);
    return await fileStoreService.getConfigStore().saveFile(config);
}

exports.deleteCaptureConfiguration = async (id, accessToken) => {
    const existingFile = await fileStoreService.getConfigStore().loadFile(id);
    if (!canEditFile(accessToken, existingFile)) throw new StatusError(`No permission to modify file ${id}`, 403 );

    await fileStoreService.getConfigStore().deleteFile(id);
}

/*
 *******************
 * Capture Scripts *
 *******************
 */

exports.getAllCaptureScripts = async () => {
    return await fileStoreService.getScriptStore().getAllFiles();
}

exports.getCaptureScript = async (id) => {
    return await fileStoreService.getScriptStore().loadFile(id);
}

exports.addNewCaptureScript = async (script, accessToken) => {
    script.createdBy = oauth2.getSubject(accessToken);
    return await fileStoreService.getScriptStore().saveFile(script);
}

exports.updateCaptureScript = async (id, script, accessToken) => {
    const existingFile = await fileStoreService.getScriptStore().loadFile(id);
    if (!canEditFile(accessToken, existingFile)) throw new StatusError(`No permission to modify file ${id}`, 403 );

    script.id = id;
    script.updatedBy = oauth2.getSubject(accessToken);
    return await fileStoreService.getScriptStore().saveFile(script);
}

exports.deleteCaptureScript = async (id, accessToken) => {
    const existingFile = await fileStoreService.getScriptStore().loadFile(id);
    if (!canEditFile(accessToken, existingFile)) throw new StatusError(`No permission to modify file ${id}`, 403 );

    await fileStoreService.getScriptStore().deleteFile(id);
}

/*
 ************************
 * Non-public functions *
 ************************
 */

function canEditFile(accessToken, file) {
    if (oauth2.hasAdminAccess(accessToken)) return true;
    const userId = oauth2.getSubject(accessToken);
    return file.createdBy == userId;
}

async function checkForCancel(jobId) {
    let currentJob = await jobDAO.getCaptureJob(jobId);
    return (currentJob.statusCode === 'Cancelled');
}

async function updateCaptureJob(job, newStatus, message) {
    await jobDAO.updateCaptureJob(job.id, newStatus, message);
    job.statusCode = newStatus;
    job.statusMessage = message;
    await dataCaptureProducer.notifyCaptureJobUpdated(job);
    return job;
}

const identifyMeasurements = async (sourcePath, captureJob) => {
    const moduleConfig = captureJob.captureConfig.identifyMeasurements;
    return await invokeScript(moduleConfig.scriptId, {
        sourcePath: sourcePath,
        moduleConfig: moduleConfig,
        captureJob: captureJob
    });
}

const gatherWellData = async (measurement, captureJob) => {
    const moduleConfig = captureJob.captureConfig.gatherWellData;
    const result = await invokeScript(moduleConfig.scriptId, {
        measurement: measurement,
        moduleConfig: moduleConfig,
        captureJob: captureJob
    });

    const wellCount = result.rows * result.columns;
    measurement["rows"] = result.rows
    measurement["columns"] = result.columns
    measurement["wellColumns"] = result.wellColumns.filter(column => !isEmptyOrWhitespace(column))
    await measClient.putMeasurement(measurement)

    const sendWellDataPromises = Object.entries(result.welldata).map(([column, data]) => {
        if (column == null || column == '' || data == null || data.length == 0) return Promise.resolve(0);
        while (data.length < wellCount) data.push(NaN);
        return measProducer.requestMeasurementSaveWellData({
            measurementId: measurement.id,
            column: column,
            data: data
        });
    });

    await Promise.all(sendWellDataPromises);
}

const gatherSubWellData = async (measurement, captureJob) => {
    const moduleConfig = captureJob.captureConfig.gatherSubwellData;
    const result = await invokeScript(moduleConfig.scriptId, {
        measurement: measurement,
        moduleConfig: moduleConfig,
        captureJob: captureJob
    });

    for (const r of result) {
        if (r.subWellData == null || r.subWellData.length == 0) continue;

        measurement["subWellColumns"] = Object.keys(r.subWellData[0].data);
        await measClient.putMeasurement(measurement);
        for (const swData of r.subWellData) {
            let dto = createSubWellDataDTO(measurement, swData);
            await measProducer.requestMeasurementSaveSubwellData(dto);
        }
    }
}

const gatherImageData = async (measurement, captureJob) => {
    const moduleConfig = captureJob.captureConfig.gatherImageData;
    await invokeScript(moduleConfig.scriptId, {
        measurement: measurement,
        moduleConfig: moduleConfig,
        captureJob: captureJob
    });
};

const invokeScript = async (scriptName, scriptContext) => {
    const scriptFile = await fileStoreService.getScriptStore().loadFileByName(scriptName);
    if (!scriptFile) throw `No script found with name "${scriptName}"`;
    console.log(`Invoking script "${scriptFile.name}", id ${scriptFile.id}, version ${scriptFile.version}`);
    const ctx = { ...defaultScriptContext, ...(scriptContext || {})};
    ctx.output = null;
    ctx.log = async (message, level) => await jobDAO.insertCaptureJobEvent(ctx.captureJob?.id, level || 'Info', message);
    vm.createContext(ctx);
    vm.runInContext(scriptFile.value, ctx);
    return ctx.output;
}

const isEmptyOrWhitespace = (value) => {
    return /^[\s]*$/.test(value);
}

const createSubWellDataDTO = (measurement, subWellData) => {
    return Object.entries(subWellData.data).map(([key, value]) => ({
        measurementId: measurement.id,
        wellId: captureUtils.getWellNr(subWellData.well, measurement.columns),
        wellNr: subWellData.well,
        column: key,
        data: value
    }));
}

class StatusError extends Error {
    status = null;

    constructor(msg, status) {
        super(msg);
        this.status = status;
    }
}

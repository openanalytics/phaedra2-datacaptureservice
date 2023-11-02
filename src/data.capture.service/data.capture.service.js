'use strict';

const path = require('path');
const measClient = require('../data.capture.client/meas.service.rest.client');
const measProducer = require('../data.capture.client/measurement.producer')
const jobDAO = require('../data.capture.dao/data.capture.job.dao');
const captureUtils = require('../data.capture.utils/capture.utils');
const dataCaptureProducer = require('./data.capture.producer.service');
const fileStoreService = require('./file.store.service');

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
        await jobDAO.updateCaptureJob(captureJobId, 'Cancelled');
        return captureJob;
    }
}

exports.executeCaptureJob = async (captureJob) => {
    console.log('Executing capture job: ' + JSON.stringify(captureJob));

    if (captureJob.id === undefined) {
        captureJob = await jobDAO.insertCaptureJob('System', captureJob.sourcePath, captureJob.captureConfig);
    }
    updateCaptureJob(captureJob, 'Running');

    try {
        const captureConfg = captureJob.captureConfig;
        if (!captureConfg.identifyMeasurements) throw "Capture config is missing the identifyMeasurements step";

        const sourcePath = path.join(captureUtils.getDefaultSourcePath(), captureJob.sourcePath)
        const measurements = identifyMeasurements(sourcePath, captureConfg.identifyMeasurements)
        await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', `${measurements.length} measurement(s) identified`);

        // Capture well data if well data config exists
        if (measurements && measurements.length > 0) {
            // for (let i = 0; i < measurements.length; i++) {
            for (const m of measurements) {
                await measClient.postMeasurement(m)

                // If capture job contains well data configuration, import measurements well data
                if (captureConfg.gatherWellData) {
                    await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', 'Processing measurement well data')

                    await gatherWellData(m, captureConfg.gatherWellData)

                    const cancelled = await checkForCancel(captureJob.id);
                    if (cancelled) continue;
                }

                // If capture job contains sub-well data configuration, import measurements sub-well data
                if (captureConfg.gatherSubwellData) {
                    await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', 'Processing measurement subwell data')
                    //TODO: Stream to the MeasurementService after the well data has been sent, in parallel with image data
                    await gatherSubWellData(m, captureConfg.gatherSubwellData)

                    const cancelled = await checkForCancel(captureJob.id);
                    if (cancelled) continue;
                }

                // If capture job contains image data configuration, import measurements image data
                if (captureConfg.imageData) {
                    await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', 'Processing imagedata')

                    let parserId = captureConfg.imageData.parserId;
                    if (!parserId) throw 'Cannot parse image data: no parserId specified';

                    const parser = require(`../parsers/${parserId}`);
                    await parser.parse(captureConfg, measurements, {measService: measClient});
                }

                await dataCaptureProducer.notifyCaptureJobUpdated({
                    ...captureJob,
                    measurementId: m.id,
                    barcode: m.barcode,
                });
            }
        }

        captureJob = await jobDAO.getCaptureJob(captureJob.id);
        if (captureJob.statusCode !== 'Cancelled') {
            updateCaptureJob(captureJob, 'Completed');
        }
    } catch (err) {
        updateCaptureJob(captureJob, 'Error', err.toString());
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

exports.addNewCaptureConfiguration = async (config) => {
    //TODO createdBy
    config.createdBy = "System";
    return await fileStoreService.getConfigStore().saveFile(config);
}

exports.updateCaptureConfiguration = async (id, config) => {
    //TODO updatedBy
    config.updatedBy = "System";
    config.id = id;
    return await fileStoreService.getConfigStore().saveFile(config);
}

exports.deleteCaptureConfiguration = async (id) => {
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

exports.addNewCaptureScript = async (config) => {
    //TODO createdBy
    config.createdBy = "System";
    return await fileStoreService.getScriptStore().saveFile(config);
}

exports.updateCaptureScript = async (id, config) => {
    //TODO updatedBy
    config.updatedBy = "System";
    config.id = id;
    return await fileStoreService.getScriptStore().saveFile(config);
}

exports.deleteCaptureScript = async (id) => {
    await fileStoreService.getScriptStore().deleteFile(id);
}

/*
 ************************ 
 * Non-public functions *
 ************************
 */

async function checkForCancel(jobId) {
    let currentJob = await jobDAO.getCaptureJob(jobId);
    let isCancelled = (currentJob.statusCode === 'Cancelled');
    if (isCancelled) {
        jobDAO.insertCaptureJobEvent(jobId, 'Warning', `Capture job cancelled by request`);
    }
    return isCancelled;
}

async function updateCaptureJob(job, newStatus, message) {
    await jobDAO.updateCaptureJob(job.id, newStatus, message);
    job.statusCode = newStatus;
    job.statusMessage = message;
    await dataCaptureProducer.notifyCaptureJobUpdated(job);
    return job;
}

const identifyMeasurements = (sourcePath, moduleConfig) => {
    const useScript = require('../data.capture.script/' + moduleConfig.scriptId)
    return useScript.execute(sourcePath, moduleConfig)
}

const gatherWellData = async (measurement, moduleConfig) => {
    console.log("DataCaptureService -> gather well data")
    const useScript = require('../data.capture.script/' + moduleConfig.scriptId)

    const result = await useScript.execute(measurement, moduleConfig)
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

const gatherSubWellData = async (measurement, moduleConfig) => {
    const useScript = require('../data.capture.script/' + moduleConfig.scriptId);
    const result = await useScript.execute(measurement, moduleConfig);

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

const invokeScript = async (id) => {
    const scriptFile = fileStoreService.getScriptStore().loadFile(id);
    if (!scriptFile) throw `No script found with id ${id}`;
    console.log(`Invoking script ${scriptFile.id} version ${scriptFile.version}`);
    return eval(scriptFile.value);
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

'use strict';

const path = require('path');
const vm = require('node:vm');

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
        await jobDAO.insertCaptureJobEvent(captureJobId, 'Warning', `Capture job cancelled by request`);
        return await updateCaptureJob(captureJob, 'Cancelled');
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
        const sourcePath = path.join(captureUtils.getDefaultSourcePath(), captureJob.sourcePath);
        
        if (!captureConfg.identifyMeasurements) throw "Capture config is missing the identifyMeasurements step";
        const measurements = await identifyMeasurements(sourcePath, captureConfg.identifyMeasurements);
        await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', `${measurements.length} measurement(s) identified`);
        
        let cancelled = false;
        if (measurements && measurements.length > 0) {
            for (const m of measurements) {
                await measClient.postMeasurement(m);

                if (captureConfg.gatherWellData) {
                    await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', 'Processing measurement well data');
                    await gatherWellData(m, captureConfg.gatherWellData);
                }

                if (captureConfg.gatherSubwellData) {
                    await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', 'Processing measurement subwell data');
                    //TODO: Stream to the MeasurementService after the well data has been sent, in parallel with image data
                    await gatherSubWellData(m, captureConfg.gatherSubwellData);
                }

                if (captureConfg.imageData) {
                    await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', 'Processing measurement image data');
                    await gatherImageData(m, captureConfg.imageData);
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
    return (currentJob.statusCode === 'Cancelled');
}

async function updateCaptureJob(job, newStatus, message) {
    await jobDAO.updateCaptureJob(job.id, newStatus, message);
    job.statusCode = newStatus;
    job.statusMessage = message;
    await dataCaptureProducer.notifyCaptureJobUpdated(job);
    return job;
}

const identifyMeasurements = async (sourcePath, moduleConfig) => {
    return await invokeScript(moduleConfig.scriptId, {
        sourcePath: sourcePath,
        moduleConfig: moduleConfig
    });
}

const gatherWellData = async (measurement, moduleConfig) => {
    const result = await invokeScript(moduleConfig.scriptId, {
        measurement: measurement,
        moduleConfig: moduleConfig
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

const gatherSubWellData = async (measurement, moduleConfig) => {
    const result = await invokeScript(moduleConfig.scriptId, {
        measurement: measurement,
        moduleConfig: moduleConfig
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

const gatherImageData = async (measurement, moduleConfig) => {
    await invokeScript(moduleConfig.scriptId, {
        measurement: measurement,
        moduleConfig: moduleConfig
    });
};

const invokeScript = async (scriptName, scriptContext) => {
    const scriptFile = await fileStoreService.getScriptStore().loadFileByName(scriptName);
    if (!scriptFile) throw `No script found with name "${scriptName}"`;
    console.log(`Invoking script "${scriptFile.name}", id ${scriptFile.id}, version ${scriptFile.version}`);
    const ctx = scriptContext || {};
    ctx.output = null;
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

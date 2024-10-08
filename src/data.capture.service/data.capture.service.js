'use strict';

/*
 * TODO: support for file uploads, make them available to the js-worker somehow
 */

const crypto = require('crypto');
const jobDAO = require('../data.capture.dao/data.capture.job.dao');
const fileStoreService = require('./file.store.service');
const oauth2 = require('../data.capture.auth/oauth2.server');

const measurementServiceClient = require('../data.capture.rest.client/measurement.service.client');
const metadataServiceClient = require('../data.capture.rest.client/metadata.service.client');
const scriptEngineProducer = require('../data.capture.kafka/scriptengine.producer');
const dataCaptureProducer = require('../data.capture.kafka/data.capture.producer');

const activeJobs = [];

const ActiveJobStatus = {
    IdentifyingMeasurements: 1,
    CapturingWellData: 2,
    CapturingSubWellData: 3,
    CapturingImageData: 4
}

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

exports.submitCaptureJob = async (captureJobRequest) => {
    if (captureJobRequest.captureConfigId && !captureJobRequest.captureConfig) {
        // A config ID was provided instead of a config object: load it now.
        captureJobRequest.captureConfig = await this.getCaptureConfiguration(captureJobRequest.captureConfigId);
    }
    const captureJob = await jobDAO.insertCaptureJob('System', captureJobRequest.sourcePath, captureJobRequest.captureConfig);
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
    if (captureJob.id === undefined) {
        captureJob = await jobDAO.insertCaptureJob('System', captureJob.sourcePath, captureJob.captureConfig);
    }

    console.log(`Executing capture job ${captureJob.id} on sourcePath: ${captureJob.sourcePath}`);
    await updateCaptureJob(captureJob, 'Running');

    const activeJob = {
        status: ActiveJobStatus.IdentifyingMeasurements,
        job: captureJob,
        activeScriptIds: []
    };
    activeJobs.push(activeJob);

    try {
        // Invoke first step: identifyMeasurements
        const moduleConfig = captureJob.captureConfig.identifyMeasurements;
        if (!moduleConfig) throw "Capture config is missing the 'identifyMeasurements' step";
        const requestID = await invokeScript(moduleConfig.scriptId, {
            sourcePath: captureJob.sourcePath,
            moduleConfig: moduleConfig,
            captureJob: captureJob
        });
        activeJob.activeScriptIds.push(requestID);
    } catch (err) {
        handleAbortJob(activeJob, err);
    }
}

exports.processScriptExecutionUpdate = async (update) => {
    const activeJob = activeJobs.find(job => job.activeScriptIds.includes(update.inputId));
    if (!activeJob) {
        console.log(`Ignoring unknown script execution update: ${update.inputId}`);
        return;
    }

    // Remove the ID from the list of active script IDs
    activeJob.activeScriptIds.splice(activeJob.activeScriptIds.indexOf(update.inputId), 1);

    if (update.statusCode == "SCRIPT_ERROR") {
        handleAbortJob(activeJob, update.statusMessage);
        return;
    }

    console.log(`Script ${update.inputId} finished`);
    this.completeCurrentStep(activeJob, update.output);
}

exports.completeCurrentStep = async (activeJob, stepOutput) => {
    if (activeJob.status == ActiveJobStatus.IdentifyingMeasurements) {
        // Note: assuming here that the script output was not stringified
        activeJob.measurements = stepOutput;

        for (const meas of activeJob.measurements) {
            await measurementServiceClient.postMeasurement(meas);
        }

        // Proceed with CapturingWellData of the first measurement
        activeJob.currentMeasurementIndex = 0;
        activeJob.status = ActiveJobStatus.CapturingWellData;
        this.invokeCurrentStep(activeJob);
    } else if (activeJob.status == ActiveJobStatus.CapturingImageData) {
        // Current measurement has been fully captured, persist it.
        const completedMeasurement = activeJob.measurements[activeJob.currentMeasurementIndex];
        await measurementServiceClient.putMeasurement(completedMeasurement);
        await updateMeasurementMetadata(completedMeasurement);
        await dataCaptureProducer.notifyCaptureJobUpdated({
            ...activeJob.job,
            measurementId: completedMeasurement.id,
            barcode: completedMeasurement.barcode,
        });

        // Then proceed to the next measurement, or end the job if all measurements are done.
        activeJob.currentMeasurementIndex++;
        if (activeJob.currentMeasurementIndex < activeJob.measurements.length) {
            activeJob.status = ActiveJobStatus.CapturingWellData;
            this.invokeCurrentStep(activeJob);
        } else {
            await updateCaptureJob(activeJob.job, 'Completed');
            activeJobs.splice(activeJobs.indexOf(activeJob), 1);
        }
    } else {
        // A stage (welldata, subwelldata, imagedata) has been completed for the current measurement.

        if (stepOutput?.measurement) {
            // If the script modified the measurement object (e.g. added properties or metadata), update it.
            activeJob.measurements[activeJob.currentMeasurementIndex] = stepOutput.measurement;
        }

        if (activeJob.status == ActiveJobStatus.CapturingWellData) {
            activeJob.status = ActiveJobStatus.CapturingSubWellData;
        } else if (activeJob.status == ActiveJobStatus.CapturingSubWellData) {
            activeJob.status = ActiveJobStatus.CapturingImageData;
        }
        this.invokeCurrentStep(activeJob);
    }
}

exports.invokeCurrentStep = async (activeJob) => {
    const jobIsCancelled = await checkForCancel(activeJob.job.id);
    if (jobIsCancelled) {
        handleAbortJob(activeJob);
        return;
    }

    let stepConfig = null;

    if (activeJob.status == ActiveJobStatus.CapturingWellData) {
        stepConfig = activeJob.job.captureConfig.gatherWellData;
    } else if (activeJob.status == ActiveJobStatus.CapturingSubWellData) {
        stepConfig = activeJob.job.captureConfig.gatherSubwellData;
    } else if (activeJob.status == ActiveJobStatus.CapturingImageData) {
        stepConfig = activeJob.job.captureConfig.gatherImageData;
    }

    if (stepConfig) {
        const currentMeas = activeJob.measurements[activeJob.currentMeasurementIndex];
        await logCaptureJobEvent(activeJob.job.id, "Info", `Measurement ${currentMeas.name}: invoking ${stepConfig.scriptId}`);

        const requestID = await invokeScript(stepConfig.scriptId, {
            measurement: currentMeas,
            moduleConfig: stepConfig,
            captureJob: activeJob.job
        });
        activeJob.activeScriptIds.push(requestID);
    } else {
        this.completeCurrentStep(activeJob);
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

async function handleAbortJob(activeJob, error) {
    if (error) {
        await updateCaptureJob(activeJob.job, 'Error', error.toString());
        console.error(`An error occurred executing capture job ${activeJob.job.id}`, error);
    }
    for (const m of (activeJob.measurements || [])) {
        try {
            await measurementServiceClient.deleteMeasurement(m.id);
        } catch (err) {
            console.log(`Error while deleting measurement ${m.id}: ${err}`);
        }
    }
}

async function updateCaptureJob(job, newStatus, message) {
    if (newStatus != job.statusCode) {
        const eventCode = (newStatus == "Error") ? "Error" : "Info";
        await logCaptureJobEvent(job.id, eventCode, `Status changed to ${newStatus}`);
    }
    await jobDAO.updateCaptureJob(job.id, newStatus, message);
    job.statusCode = newStatus;
    job.statusMessage = message;
    await dataCaptureProducer.notifyCaptureJobUpdated(job);
    return job;
}

async function logCaptureJobEvent(jobId, eventCode, message) {
    await jobDAO.insertCaptureJobEvent(jobId, eventCode, message);
}

async function updateMeasurementMetadata(measurement) {
    if (measurement.properties) {
        for (const [key, value] of Object.entries(measurement.properties)) {
            await metadataServiceClient.postProperty(measurement.id, key, value);
        }
    }
    if (measurement.tags) {
        for (const tag of measurement.tags) {
            await metadataServiceClient.postTag(measurement.id, tag);
        }
    }
}

const invokeScript = async (scriptName, scriptContext) => {
    const scriptFile = await fileStoreService.getScriptStore().loadFileByName(scriptName);
    if (!scriptFile) throw `No script found with name "${scriptName}"`;
    console.log(`Executing script "${scriptFile.name}", id ${scriptFile.id}, version ${scriptFile.version}`);
    
    const request = {
        id: crypto.randomUUID(),
        language: "JS",
        script: scriptFile.value,
        input: JSON.stringify(scriptContext)
    };
    await scriptEngineProducer.requestScriptExecution(request);
    return request.id;
}

class StatusError extends Error {
    status = null;

    constructor(msg, status) {
        super(msg);
        this.status = status;
    }
}

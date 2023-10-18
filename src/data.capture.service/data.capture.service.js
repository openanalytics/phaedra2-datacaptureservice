'use strict';
const fs = require('fs');
const path = require('path');

const measClient = require('../data.capture.client/meas.service.rest.client');
const measProducer = require('../data.capture.client/measurement.producer')
const jobDAO = require('../data.capture.dao/data.capture.job.dao');
const captureUtils = require('../data.capture.utils/capture.utils');
const dataCaptureProducer = require('./data.capture.producer.service')

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

exports.getCaptureJobConfig = async (jobId) => {
    return await jobDAO.getCaptureJobConfig(jobId);
}

exports.submitCaptureJob = async (sourcePath, captureConfig, token) => {
    const captureJob = await jobDAO.insertCaptureJob('System', sourcePath, captureConfig);

    // Here, we could schedule or queue the job execution in some fashion,
    // e.g. to apply throttling or delay if there are too many jobs running.
    // Currently, the job is executed immediately, in an async call without waiting for it to complete.
    this.executeCaptureJob(captureJob, token);

    return captureJob;
}

exports.cancelCaptureJob = async (captureJobId) => {
    const captureJob = await jobDAO.getCaptureJob(captureJobId);
    if (captureJob.statusCode === 'Running' || captureJob.statusCode === 'Submitted') {
        await jobDAO.updateCaptureJob(captureJobId, 'Cancelled');
        return captureJob;
    }
}

exports.executeCaptureJob = async (captureJob, token) => {
    console.log('Executing capture job: ' + JSON.stringify(captureJob));

    if (captureJob.id === undefined) {
        captureJob = await jobDAO.insertCaptureJob('System', captureJob.sourcePath, captureJob.captureConfig);
    }
    updateCaptureJob(captureJob, 'Running');

    try {
        const captureConfg = captureJob.captureConfig;
        if (!captureConfg.identifyMeasurements) return
        const sourcePath = path.join(captureUtils.getDefaultSourcePath(), captureJob.sourcePath)
        const measurements = identifyMeasurements(sourcePath, captureConfg.identifyMeasurements)
        await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', `${measurements.length} measurement(s) identified`);

        // Capture well data if well data config exists
        if (measurements && measurements.length > 0) {
            // for (let i = 0; i < measurements.length; i++) {
            for (const m of measurements) {
                await measClient.postMeasurement(m, token)

                // If capture job contains well data configuration, import measurements well data
                if (captureConfg.gatherWellData) {
                    await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', 'Processing measurement well data')

                    await gatherWellData(m, captureConfg.gatherWellData, token)

                    const cancelled = await checkForCancel(captureJob.id);
                    if (cancelled) continue;
                }

                // If capture job contains sub-well data configuration, import measurements sub-well data
                if (captureConfg.gatherSubwellData) {
                    await jobDAO.insertCaptureJobEvent(captureJob.id, 'Info', 'Processing measurement subwell data')
                    //TODO: Stream to the MeasurementService after the well data has been sent, in parallel with image data
                    await gatherSubWellData(m, captureConfg.gatherSubwellData, token)

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

exports.getAllCaptureConfigurations = async () => {
    const captureConfigPath = './capture.config';
    return new Promise((resolve, reject) => {
        fs.readdir(captureConfigPath, (err, files) => {
            if (err) {
                return reject(err);
            }

            const result = files
                .filter(file => path.extname(file) === '.json')
                .map(file => path.basename(file, '.json'));

            return resolve(result);
        })
    });
}

exports.getCaptureConfigurationByName = async (name) => {
    const captureConfigPath = './capture.config';
    return new Promise((resolve, reject) => {
        const filePath = path.join(captureConfigPath, `${name}.json`);
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            return resolve(data);
        })
    });
}

exports.addNewCaptureConfiguration = async (newCaptureConfiguration) => {
    const captureConfigPath = './capture.config';
    return new Promise((resolve, reject) => {
        const dcConfigObj = JSON.parse(newCaptureConfiguration);
        const filePath = path.join(captureConfigPath, `${dcConfigObj.name}.json`);
        fs.writeFile(filePath, newCaptureConfiguration, 'utf8', err => {
            if (err) {
                return reject(err);
            }
            return resolve(`${dcConfigObj.name}.json`);
        });
    });
}

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

const gatherWellData = async (measurement, moduleConfig, token) => {
    console.log("DataCaptureService -> gather well data")
    const useScript = require('../data.capture.script/' + moduleConfig.scriptId)

    const result = await useScript.execute(measurement, moduleConfig)
    const wellCount = result.rows * result.columns;

    measurement["rows"] = result.rows
    measurement["columns"] = result.columns
    measurement["wellColumns"] = result.wellColumns.filter(column => !isEmptyOrWhitespace(column))

    await measClient.putMeasurement(measurement, token)

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

const gatherSubWellData = async (measurement, moduleConfig, token) => {
    const useScript = require('../data.capture.script/' + moduleConfig.scriptId);
    const result = await useScript.execute(measurement, moduleConfig);

    for (const r of result) {
        if (r.subWellData == null || r.subWellData.length == 0) continue;

        measurement["subWellColumns"] = Object.keys(r.subWellData[0].data);
        await measClient.putMeasurement(measurement, token);
        for (const swData of r.subWellData) {
            let dto = createSubWellDataDTO(measurement, swData);
            await measProducer.requestMeasurementSaveSubwellData(dto);
        }
    }
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

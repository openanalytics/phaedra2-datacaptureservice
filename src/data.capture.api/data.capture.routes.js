'use strict';

const captureUtils = require('../data.capture.utils/capture.utils')
const controller = require('./data.capture.controller')

const baseURL = '/phaedra/datacapture-service'

module.exports = function (app) {
    app.get(baseURL + '/job', controller.getDataCaptureJob);
    app.get(baseURL + '/jobs', controller.getDataCaptureJobs);
    app.post(baseURL + '/job', controller.startDataCaptureJob);
    app.post(baseURL + '/cancel', controller.cancelCaptureJob);
    app.get(baseURL + '/job/config', controller.getDataCaptureJobConfig)
    app.post(baseURL + '/upload-data', captureUtils.getUploadConfig(), controller.uploadRawDataFile)
    app.get(baseURL + '/capture-config', controller.getCaptureConfiguration)
    app.get(baseURL + '/capture-configs', controller.getAllCaptureConfigurations)
    app.post(baseURL + '/capture-config', controller.submitNewCaptureConfiguration)
}

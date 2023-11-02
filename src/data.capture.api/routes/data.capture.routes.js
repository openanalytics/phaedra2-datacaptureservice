'use strict';

const jobController = require('../controllers/data.capture.job.controller');
const configController = require('../controllers/data.capture.config.controller');
const scriptController = require('../controllers/data.capture.script.controller');
const captureUtils = require('../../data.capture.utils/capture.utils');

const baseURL = '/phaedra/datacapture-service';

module.exports = function (app) {
    app.get(baseURL + '/jobs', jobController.getDataCaptureJobs);
    app.get(baseURL + '/jobs/:id', jobController.getDataCaptureJob);
    app.post(baseURL + '/jobs', jobController.startDataCaptureJob);
    app.post(baseURL + '/jobs/:id/cancel', jobController.cancelCaptureJob);

    app.post(baseURL + '/upload-data', captureUtils.getUploadConfig(), (req, res) => res.sendStatus(200));

    app.get(baseURL + '/capture-configs', configController.getAllCaptureConfigurations);
    app.get(baseURL + '/capture-configs/:id', configController.getCaptureConfiguration);
    app.post(baseURL + '/capture-configs', configController.submitNewCaptureConfiguration);
    app.put(baseURL + '/capture-configs/:id', configController.updateCaptureConfiguration);
    app.delete(baseURL + '/capture-configs/:id', configController.deleteCaptureConfiguration);

    app.get(baseURL + '/capture-scripts', scriptController.getAllCaptureScripts);
    app.get(baseURL + '/capture-scripts/:id', scriptController.getCaptureScript);
    app.post(baseURL + '/capture-scripts', scriptController.submitNewCaptureScript);
    app.put(baseURL + '/capture-scripts/:id', scriptController.updateCaptureScript);
    app.delete(baseURL + '/capture-scripts/:id', scriptController.deleteCaptureScript);
}

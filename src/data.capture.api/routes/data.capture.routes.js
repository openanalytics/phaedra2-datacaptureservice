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

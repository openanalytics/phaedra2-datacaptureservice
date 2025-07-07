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

const controller = require('../controllers/scan.job.controller')

const baseURL = '/phaedra/datacapture-service'

module.exports = function (app) {
    app.post(baseURL + '/scanjob', controller.submitNewScanJob)
    app.post(baseURL + '/scanjob/:id/run', controller.executeScanJob)
    app.get(baseURL + '/scanjobs', controller.getScanJobs)
    app.get(baseURL + '/scanjob/:id', controller.getScanJob)
    app.put(baseURL + '/scanjob/:id', controller.updateScanJob)
    app.delete(baseURL + '/scanjob/:id', controller.deleteScanJob)
}

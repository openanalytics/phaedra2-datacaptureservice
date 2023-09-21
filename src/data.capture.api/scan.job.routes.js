'use strict';

const controller = require('./scan.job.controller')

const baseURL = '/phaedra/datacapture-service'

module.exports = function (app) {
    app.post(baseURL + '/scanjob', controller.submitNewScanJob)
    app.post(baseURL + '/scanjob/:id/run', controller.executeScanJob)
    app.get(baseURL + '/scanjobs', controller.getScanJobs)
    app.get(baseURL + '/scanjob/:id', controller.getScanJob)
    app.put(baseURL + '/scanjob/:id', controller.updateScanJob)
    app.delete(baseURL + '/scanjob/:id', controller.deleteScanJob)
}

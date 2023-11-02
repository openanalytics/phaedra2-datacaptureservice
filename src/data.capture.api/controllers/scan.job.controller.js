'use strict';


const scanJobService = require('../../data.capture.service/scan.job.service');

module.exports = {
    submitNewScanJob: (req, res) => {
        console.log('Create new scan job: ', req.body)
        const newScanJob = req.body;
        scanJobService.createNewScanJob(newScanJob).then(scanJob => {
            res.end(JSON.stringify(scanJob))
        })
    },
    executeScanJob: (req, res) => {
        console.log('Execute scan job with id: ', req.params['id'])
        const scanJobId = req.params['id']
        scanJobService.executeScanJob(scanJobId).then(scanJob => {
            res.end(JSON.stringify(scanJob))
        })

    },
    getScanJobs: (req, res) => {
        console.log('Get all Scan Jobs')
        scanJobService.getScanJobs().then(scanJobs => {
            res.end(JSON.stringify(scanJobs))
        })
    },
    getScanJob: (req, res) => {
        console.log('Get scan job with id: ', req.params['id'])
        const scanJobId = req.params['id']
        scanJobService.getScanJob(scanJobId).then(scanJobs => {
            res.end(JSON.stringify(scanJobs))
        })
    },
    updateScanJob: (req, res) => {
        console.log('Update scan job with id: ', req.params['id'])
        const scanJob = req.body
        scanJobService.saveScanJob(scanJob).then(updatedScanJob => {
            res.end(JSON.stringify(updatedScanJob))
        })
    },
    deleteScanJob: (req, res) => {
        console.log('Delete scan job with id: ', req.params['id'])
        const scanJobId = req.params['id']
        scanJobService.deleteScanJob(scanJobId).then(() => {
            res.end("ScanJob deleted successfully!")
        })
    }
}

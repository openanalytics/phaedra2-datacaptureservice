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

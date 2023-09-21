'use strict';

const scanJobDao = require('../data.capture.dao/scan.job.dao');

const service = {
    createNewScanJob: async (scanJob) => {
        const newScanJob = await scanJobDao.insertScanJob('TestUser', scanJob)
        if (newScanJob) return newScanJob;
    },
    executeScanJob: async (scanJobId) => {
      const scanJob = await scanJobDao.getScanJobById(scanJobId)
      console.log('Execute a Scan Job is not implemented yet!!')
    },
    getScanJobs: async () => {
        const scanJobs = await scanJobDao.getAllScanJobs();
        return scanJobs
    },
    getScanJob: async (scanJobId) => {
        return await scanJobDao.getScanJobById(jobId)
    },
    saveScanJob: async (scanJob) => {
        return await scanJobDao.updateScanJob('TestUser', scanJob)
    },
    deleteScanJob: async (scanJobId) => {
        await scanJobDao.deleteScanJobById(scanJobId)
    }
}

module.exports = service


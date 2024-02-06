`use strict`;

const dcService = require('../../data.capture.service/data.capture.service');

module.exports = {

    getDataCaptureJob: async (req, res, next) => {
        try {
            const job = await dcService.getCaptureJob(req.params.id)
            if (job) res.send(job);
            else res.sendStatus(404);
        } catch (err) {
            next(err);
        }
    },

    getDataCaptureJobs: async (req, res, next) => {
        try {
            if (req.query.fromDate && req.query.toDate) {
                let fromDate = new Date(parseInt(req.query.fromDate));
                let toDate = new Date(parseInt(req.query.toDate));
                const jobs = await dcService.getCaptureJobs(fromDate, toDate);
                res.send(jobs);
            } else {
                res.send([]);
            }
        } catch (err) {
            next(err);
        }
    },

    startDataCaptureJob: async (req, res, next) => {
        try {
            const captureConfig = req.body;
            const sourcePath = decodeURIComponent((req.query.sourcePath || "").replace(/\+/g, " "));
            const job = await dcService.submitCaptureJob(sourcePath, captureConfig);
            res.send(job);
        } catch (err) {
            next(err);
        }
    },

    cancelCaptureJob: async (req, res, next) => {
        try {
            const job = await dcService.cancelCaptureJob(req.params.id);
            if (job) res.sendStatus(200);
            else res.sendStatus(404);
        } catch (err) {
            next(err);
        }    
    }

};

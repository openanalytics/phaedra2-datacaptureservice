`use strict`;

const jwt = require('jsonwebtoken');

const dcService = require('../data.capture.service/data.capture.service');

module.exports = {
    getDataCaptureJob: function (req, res) {
        let jobId = req.query.id;
        dcService.getCaptureJob(jobId).then(captureJob => {
            if (captureJob) res.end(JSON.stringify(captureJob));
            else res.sendStatus(404)
        });
    },
    getDataCaptureJobs: function (req, res) {
        // Without args, no jobs will be returned.
        if (!req.query.fromDate||!req.query.toDate)
            res.end(JSON.stringify([]))
        //Parse string dates to useable format
        let fromDate = new Date(parseInt(req.query.fromDate));
        let toDate = new Date(parseInt(req.query.toDate));
        dcService.getCaptureJobs(fromDate, toDate).then(captureJobs => {
            res.end(JSON.stringify(captureJobs));
        });
    },
    getDataCaptureJobConfig: function (req, res) {
        let jobId = req.query.id;
        dcService.getCaptureJobConfig(jobId).then(captureJob => {
            if (captureJob) res.end(JSON.stringify(captureJob));
        });
    },
    startDataCaptureJob: function (req, res) {
        const captureConfig = req.body;
        const sourcePath = req.query.sourcePath;

        const authHeader = req.headers.authorization;
        const token = authHeader.split(' ')[1]

        dcService.submitCaptureJob(sourcePath, captureConfig, token).then(captureJob => {
            res.end(JSON.stringify(captureJob));
        });
    },
    cancelCaptureJob: function (req, res) {
        let jobId = req.body.id;
        dcService.cancelCaptureJob(jobId).then(captureJob => {
            if (captureJob) res.sendStatus(200)
            else res.sendStatus(404)
        });
    },
    uploadRawDataFile: (req, res) => {
        // console.log('Received:', req)
        res.sendStatus(200)
    },
    getAllCaptureConfigurations: (req, res) => {
        dcService.getAllCaptureConfigurations()
            .then(dcConfigs => res.end(JSON.stringify(dcConfigs)))
            .catch(err => {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain');
                res.end(err.message);
            });
    },
    submitNewCaptureConfiguration: (req, res) => {
        const newCaptureConfiguration = req.body.captureConfig;
        dcService.addNewCaptureConfiguration(newCaptureConfiguration)
            .then(result => res.end(result))
            .catch(err => {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain');
                res.end(err.message);
            });
    },
    getCaptureConfiguration: (req, res) => {
        const configName = req.query.name;
        dcService.getCaptureConfigurationByName(configName)
            .then(result => {
                try {
                    const json = JSON.parse(result);
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify(json));
                } catch (err) {
                    res.statusCode = 500;
                    res.setHeader('Content-Type', 'text/plain');
                    res.end('Error parsing JSON');
                }
            })
            .catch(err => {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'text/plain');
                res.end(err.message);
            })
    }
};

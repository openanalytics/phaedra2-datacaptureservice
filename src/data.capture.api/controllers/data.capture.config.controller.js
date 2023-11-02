`use strict`;

const dcService = require('../../data.capture.service/data.capture.service');

module.exports = {

    getAllCaptureConfigurations: async (req, res, next) => {
        try {
            const configs = await dcService.getAllCaptureConfigurations();
            res.send(configs);
        } catch (err) {
            next(err);
        }
    },

    getCaptureConfiguration: async (req, res, next) => {
        try {
            const config = await dcService.getCaptureConfiguration(req.params.id);
            res.send(config);
        } catch (err) {
            next(err);
        }
    },

    submitNewCaptureConfiguration: async (req, res, next) => {
        try {
            const config = await dcService.addNewCaptureConfiguration(req.body);
            res.send(config);
        } catch (err) {
            next(err);
        }
    },

    updateCaptureConfiguration: async (req, res, next) => {
        try {
            const config = await dcService.updateCaptureConfiguration(req.params.id, req.body);
            res.send(config);
        } catch (err) {
            next(err);
        }
    },

    deleteCaptureConfiguration: async (req, res, next) => {
        try {
            await dcService.deleteCaptureConfiguration(req.params.id);
            res.sendStatus(204);
        } catch (err) {
            next(err);
        }
    }
};

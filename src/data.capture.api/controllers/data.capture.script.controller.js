`use strict`;

const dcService = require('../../data.capture.service/data.capture.service');

module.exports = {

    getAllCaptureScripts: async (req, res, next) => {
        try {
            const configs = await dcService.getAllCaptureScripts();
            res.send(configs);
        } catch (err) {
            next(err);
        }
    },

    getCaptureScript: async (req, res, next) => {
        try {
            const config = await dcService.getCaptureScript(req.params.id);
            res.send(config);
        } catch (err) {
            next(err);
        }
    },

    submitNewCaptureScript: async (req, res, next) => {
        try {
            const config = await dcService.addNewCaptureScript(req.body);
            res.send(config);
        } catch (err) {
            next(err);
        }
    },

    updateCaptureScript: async (req, res, next) => {
        try {
            const config = await dcService.updateCaptureScript(req.params.id, req.body);
            res.send(config);
        } catch (err) {
            next(err);
        }
    },

    deleteCaptureScript: async (req, res, next) => {
        try {
            await dcService.deleteCaptureScript(req.params.id);
            res.sendStatus(204);
        } catch (err) {
            next(err);
        }
    }
};

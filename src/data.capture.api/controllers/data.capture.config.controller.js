`use strict`;

const dcService = require('../../data.capture.service/data.capture.service');
const oauth2 = require('../../data.capture.auth/oauth2.server');

module.exports = {

    getAllCaptureConfigurations: async (req, res, next) => {
        try {
            const configs = await dcService.getAllCaptureConfigurations();
            res.send(configs);
        } catch (err) {
            if (err.status) res.status(err.status).send(err.message);
            else next(err);
        }
    },

    getCaptureConfiguration: async (req, res, next) => {
        try {
            const config = await dcService.getCaptureConfiguration(req.params.id);
            res.send(config);
        } catch (err) {
            if (err.status) res.status(err.status).send(err.message);
            else next(err);
        }
    },

    submitNewCaptureConfiguration: async (req, res, next) => {
        try {
            const config = await dcService.addNewCaptureConfiguration(req.body, oauth2.getAccessToken(req));
            res.send(config);
        } catch (err) {
            if (err.status) res.status(err.status).send(err.message);
            else next(err);
        }
    },

    updateCaptureConfiguration: async (req, res, next) => {
        try {
            const config = await dcService.updateCaptureConfiguration(req.params.id, req.body, oauth2.getAccessToken(req));
            res.send(config);
        } catch (err) {
            if (err.status) res.status(err.status).send(err.message);
            else next(err);
        }
    },

    deleteCaptureConfiguration: async (req, res, next) => {
        try {
            await dcService.deleteCaptureConfiguration(req.params.id, oauth2.getAccessToken(req));
            res.sendStatus(204);
        } catch (err) {
            if (err.status) res.status(err.status).send(err.message);
            else next(err);
        }
    }
};

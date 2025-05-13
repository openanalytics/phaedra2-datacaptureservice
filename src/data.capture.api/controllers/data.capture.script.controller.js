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
`use strict`;

const dcService = require('../../data.capture.service/data.capture.service');
const oauth2 = require('../../data.capture.auth/oauth2.server');

module.exports = {

    getAllCaptureScripts: async (req, res, next) => {
        try {
            const configs = await dcService.getAllCaptureScripts();
            res.send(configs);
        } catch (err) {
            if (err.status) res.status(err.status).send(err.message);
            else next(err);
        }
    },

    getCaptureScript: async (req, res, next) => {
        try {
            const config = await dcService.getCaptureScript(req.params.id);
            res.send(config);
        } catch (err) {
            if (err.status) res.status(err.status).send(err.message);
            else next(err);
        }
    },

    submitNewCaptureScript: async (req, res, next) => {
        try {
            const config = await dcService.addNewCaptureScript(req.body, oauth2.getAccessToken(req));
            res.send(config);
        } catch (err) {
            if (err.status) res.status(err.status).send(err.message);
            else next(err);
        }
    },

    updateCaptureScript: async (req, res, next) => {
        try {
            const config = await dcService.updateCaptureScript(req.params.id, req.body, oauth2.getAccessToken(req));
            res.send(config);
        } catch (err) {
            if (err.status) res.status(err.status).send(err.message);
            else next(err);
        }
    },

    deleteCaptureScript: async (req, res, next) => {
        try {
            await dcService.deleteCaptureScript(req.params.id, oauth2.getAccessToken(req));
            res.sendStatus(204);
        } catch (err) {
            if (err.status) res.status(err.status).send(err.message);
            else next(err);
        }
    }
};

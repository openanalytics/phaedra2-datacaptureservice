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
const kafkaConfig = require('./kafka.config')
const shutdownHandler = require('../data.capture.utils/shutdown.handler');

const producer = kafkaConfig.makeProducer({
    allowAutoTopicCreation: false
});

shutdownHandler(async () => await producer.disconnect());
producer.connect();

module.exports = {
    requestMeasurementSaveWellData: async (wellData) => {
        try {
            await producer.send({
                topic: kafkaConfig.TOPIC_MEASUREMENTS,
                messages: [{
                    key: kafkaConfig.EVENT_REQ_MEAS_SAVE_WELL_DATA,
                    value: JSON.stringify(wellData)
                }]
            })
        } catch (err) {
            console.error("could not write message " + err)
        }
    },
    requestMeasurementSaveSubwellData: async (subwellData) => {
        try {
            for (const swData of subwellData) {
                await producer.send({
                    topic: kafkaConfig.TOPIC_MEASUREMENTS,
                    messages: [{
                        key: kafkaConfig.EVENT_REQ_MEAS_SAVE_SUBWELL_DATA,
                        value: JSON.stringify(swData)
                    }]
                })
            }
        } catch (err) {
            console.error("could not write message " + err)
        }
    }
};

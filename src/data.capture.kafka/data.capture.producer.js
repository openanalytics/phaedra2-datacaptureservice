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

const producer = kafkaConfig.makeProducer({
    allowAutoTopicCreation: false
});

let dataCaptureProducer = {
    notifyCaptureJobUpdated: async (jobInfo) => {
        await producer.connect();
        await producer.send({
            topic: kafkaConfig.TOPIC_DATACAPTURE,
            messages: [{
                key: kafkaConfig.EVENT_NOTIFY_CAPTURE_JOB_UPDATED,
                value: JSON.stringify(jobInfo)
            }]
        });
        await producer.disconnect();
    },
    submitCaptureJob: async (jobRequest) => {
        await producer.connect();
        await producer.send({
            topic: kafkaConfig.TOPIC_DATACAPTURE,
            messages: [{
                key: kafkaConfig.EVENT_REQ_CAPTURE_JOB,
                value: JSON.stringify(jobRequest)
            }]
        });
        await producer.disconnect();
    }
}

module.exports = dataCaptureProducer

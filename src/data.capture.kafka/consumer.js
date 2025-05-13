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
const dcService = require('../data.capture.service/data.capture.service')

const consumer = kafkaConfig.makeConsumer({ groupId: kafkaConfig.GROUP_ID });

let dataCaptureConsumer = {
    run: async () => {
        await consumer.connect();
        await consumer.subscribe({ topics: [ kafkaConfig.TOPIC_DATACAPTURE, kafkaConfig.TOPIC_SCRIPTENGINE_UPDATES ] });

        dcService.registerActiveJobsCallback((active, max) => {
            const isPaused = (consumer.paused() || []).length > 0;
            if (active >= max && !isPaused) consumer.pause([{ topic: kafkaConfig.TOPIC_DATACAPTURE }]);
            if (active < max && isPaused) consumer.resume([{ topic: kafkaConfig.TOPIC_DATACAPTURE }]);
        });
        
        await consumer.run({
            eachMessage: async ({topic, partition, message}) => {
                const msgKey = message.key?.toString();

                if (topic == kafkaConfig.TOPIC_DATACAPTURE && msgKey == kafkaConfig.EVENT_REQ_CAPTURE_JOB) {
                    try {
                        const captureJob = JSON.parse(message.value.toString());
                        console.log(`Kafka topic ${kafkaConfig.TOPIC_DATACAPTURE}: received ${kafkaConfig.EVENT_REQ_CAPTURE_JOB}, submitting capture job`);
                        await dcService.submitCaptureJob(captureJob);
                    } catch (err) {
                        console.log(`Kafka topic ${kafkaConfig.TOPIC_DATACAPTURE}: failed to process ${kafkaConfig.EVENT_REQ_CAPTURE_JOB} message`);
                        console.error(err);
                    }
                }
                else if (topic == kafkaConfig.TOPIC_SCRIPTENGINE_UPDATES) {
                    const messasgeValue = JSON.parse(message.value.toString());
                    await dcService.processScriptExecutionUpdate(messasgeValue);
                }
            },
        })
    }
}

module.exports = dataCaptureConsumer

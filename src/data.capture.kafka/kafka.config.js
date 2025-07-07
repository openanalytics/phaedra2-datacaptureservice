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
const { Kafka } = require('kafkajs');

// Brokers
const BROKERS = [ process.env.KAFKA_SERVERS ];

// Groups
exports.GROUP_ID = process.env.KAFKA_GROUP_ID || "datacapture-service";

// Topics
exports.TOPIC_DATACAPTURE = "datacapture"
exports.TOPIC_MEASUREMENTS = "measurements"
exports.TOPIC_SCRIPTENGINE_REQUESTS = "scriptengine-requests"
exports.TOPIC_SCRIPTENGINE_UPDATES = "scriptengine-updates"

// Events
exports.EVENT_REQ_CAPTURE_JOB = "requestCaptureJob"
exports.EVENT_NOTIFY_CAPTURE_JOB_UPDATED = "notifyCaptureJobUpdated"
exports.EVENT_REQ_MEAS_SAVE_WELL_DATA = "requestMeasurementSaveWellData"
exports.EVENT_REQ_MEAS_SAVE_SUBWELL_DATA = "requestMeasurementSaveSubwellData"

exports.makeConsumer = (opts) => {
    let kafka = new Kafka({
        brokers: BROKERS
    });
    return kafka.consumer(opts);
}

exports.makeProducer = (opts) => {
    let kafka = new Kafka({
        brokers: BROKERS
    });
    return kafka.producer(opts);
}
const { Kafka } = require('kafkajs');

// Brokers
const BROKERS = [ process.env.KAFKA_SERVERS ];
const CLIENT_ID = "datacapture-service";

// Groups
exports.GROUP_ID = CLIENT_ID

// Topics
exports.TOPIC_DATACAPTURE = "datacapture"
exports.TOPIC_MEASUREMENTS = "measurements"

// Events
exports.EVENT_REQ_CAPTURE_JOB = "requestCaptureJob"
exports.EVENT_NOTIFY_CAPTURE_JOB_UPDATED = "notifyCaptureJobUpdated"
exports.EVENT_REQ_MEAS_SAVE_WELL_DATA = "requestMeasurementSaveWellData"
exports.EVENT_REQ_MEAS_SAVE_SUBWELL_DATA = "requestMeasurementSaveSubwellData"

exports.makeConsumer = (opts) => {
    let kafka = new Kafka({
        clientId: CLIENT_ID,
        brokers: BROKERS
    });
    return kafka.consumer(opts);
}

exports.makeProducer = (opts) => {
    let kafka = new Kafka({
        clientId: CLIENT_ID,
        brokers: BROKERS
    });
    return kafka.producer(opts);
}
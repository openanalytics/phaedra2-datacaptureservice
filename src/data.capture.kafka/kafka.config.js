const { Kafka } = require('kafkajs');

// Brokers
const BROKERS = [ process.env.KAFKA_SERVERS ];

// Groups
exports.GROUP_ID = process.env.KAFKA_GROUP_ID || "datacapture-service";

// Topics
exports.TOPIC_DATACAPTURE = "datacapture"
exports.TOPIC_MEASUREMENTS = "measurements"
exports.TOPIC_SCRIPTENGINE = "scriptengine"

// Events
exports.EVENT_REQ_CAPTURE_JOB = "requestCaptureJob"
exports.EVENT_NOTIFY_CAPTURE_JOB_UPDATED = "notifyCaptureJobUpdated"
exports.EVENT_REQ_MEAS_SAVE_WELL_DATA = "requestMeasurementSaveWellData"
exports.EVENT_REQ_MEAS_SAVE_SUBWELL_DATA = "requestMeasurementSaveSubwellData"
exports.EVENT_REQUEST_SCRIPT_EXECUTION = "requestScriptExecution"
exports.EVENT_SCRIPT_EXECUTION_UPDATE = "scriptExecutionUpdate"


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
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

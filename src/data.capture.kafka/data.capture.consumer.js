const kafkaConfig = require('./kafka.config')
const dcService = require('../data.capture.service/data.capture.service')

const consumer = kafkaConfig.makeConsumer({ groupId: kafkaConfig.GROUP_ID });

let dataCaptureConsumer = {
    run: async () => {
        await consumer.connect();
        await consumer.subscribe({topic: kafkaConfig.TOPIC_DATACAPTURE, fromBeginning: true});
        await consumer.run({
            eachMessage: async ({topic, partition, message}) => {
                if (message.key.toString() === kafkaConfig.EVENT_REQ_CAPTURE_JOB) {
                    try {
                        const captureJob = JSON.parse(message.value.toString());
                        console.log(`Kafka (topic: ${kafkaConfig.TOPIC_DATACAPTURE}): received ${kafkaConfig.EVENT_REQ_CAPTURE_JOB} message, submitting captureJob`);
                        await dcService.submitCaptureJob(captureJob);
                    } catch (err) {
                        console.log(`Kafka (topic: ${kafkaConfig.TOPIC_DATACAPTURE}): failed to process ${kafkaConfig.EVENT_REQ_CAPTURE_JOB} message`);
                        console.error(err);
                    }
                }
            },
        })
    }
}

module.exports = dataCaptureConsumer

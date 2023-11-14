const dcService = require('./data.capture.service')
const kafkaConfig = require('../data.capture.config/kafka.config')

const consumer = kafkaConfig.makeConsumer({ groupId: kafkaConfig.GROUP_ID });

let dataCaptureConsumer = {
    run: async () => {
        await consumer.connect();
        await consumer.subscribe({topic: kafkaConfig.TOPIC_DATACAPTURE, fromBeginning: true});
        await consumer.run({
            eachMessage: async ({topic, partition, message}) => {
                if (message.key.toString() === kafkaConfig.EVENT_REQ_CAPTURE_JOB) {
                    const captureJob = JSON.parse(message.value.toString());
                    console.log("Data Capture Consumer: about to execute a capture job " + JSON.stringify(captureJob))
                    await dcService.executeCaptureJob(captureJob);
                }
            },
        })
    }
}

module.exports = dataCaptureConsumer

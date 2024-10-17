const kafkaConfig = require('./kafka.config')
const dcService = require('../data.capture.service/data.capture.service')

const consumer = kafkaConfig.makeConsumer({ groupId: kafkaConfig.GROUP_ID });

let dataCaptureConsumer = {
    run: async () => {
        await consumer.connect();
        await consumer.subscribe({ topics: [ kafkaConfig.TOPIC_DATACAPTURE, kafkaConfig.TOPIC_SCRIPTENGINE ] });

        dcService.registerActiveJobsCallback((active, max) => {
            if (active >= max) consumer.pause([{ topic: kafkaConfig.TOPIC_DATACAPTURE }]);
            else if (consumer.paused().length > 0) consumer.resume([{ topic: kafkaConfig.TOPIC_DATACAPTURE }]);
        });
        
        await consumer.run({
            eachMessage: async ({topic, partition, message}) => {
                const msgKey = message.key.toString();

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
                else if (topic == kafkaConfig.TOPIC_SCRIPTENGINE && msgKey == kafkaConfig.EVENT_SCRIPT_EXECUTION_UPDATE) {
                    const messasgeValue = JSON.parse(message.value.toString());
                    await dcService.processScriptExecutionUpdate(messasgeValue);
                }
            },
        })
    }
}

module.exports = dataCaptureConsumer

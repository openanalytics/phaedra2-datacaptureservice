const kafkaConfig = require('./kafka.config')
const dcService = require('../data.capture.service/data.capture.service')

const consumer = kafkaConfig.makeConsumer({ groupId: kafkaConfig.GROUP_ID });

module.exports = {
    run: async () => {
        await consumer.connect();
        await consumer.subscribe({ topic: kafkaConfig.TOPIC_SCRIPTENGINE, fromBeginning: false });
        await consumer.run({
            eachMessage: async ({topic, partition, message}) => {
                if (message.key.toString() === kafkaConfig.EVENT_SCRIPT_EXECUTION_UPDATE) {
                    const messasgeValue = JSON.parse(message.value.toString());
                    await dcService.processScriptExecutionUpdate(messasgeValue);
                }
            },
        })
    }
}

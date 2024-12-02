const kafkaConfig = require('./kafka.config')
const shutdownHandler = require('../data.capture.utils/shutdown.handler');

const producer = kafkaConfig.makeProducer({
    allowAutoTopicCreation: false
});

shutdownHandler(async () => await producer.disconnect());
producer.connect();

module.exports = {
    requestScriptExecution: async (request) => {
        try {
            await producer.send({
                topic: kafkaConfig.TOPIC_SCRIPTENGINE,
                messages: [{
                    key: `${kafkaConfig.EVENT_REQUEST_SCRIPT_EXECUTION}-${request.id}`,
                    value: JSON.stringify(request)
                }]
            })
        } catch (err) {
            console.error("could not write message " + err)
        }
    }
};

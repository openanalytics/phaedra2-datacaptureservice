const kafkaConfig = require('../data.capture.config/kafka.config')
const shutdownHandler = require('../data.capture.utils/shutdown.handler');

const producer = kafkaConfig.makeProducer({
    allowAutoTopicCreation: false
});

shutdownHandler(async () => await producer.disconnect());
producer.connect();

module.exports = {
    requestMeasurementSaveWellData: async (wellData) => {
        try {
            await producer.send({
                topic: kafkaConfig.TOPIC_MEASUREMENTS,
                messages: [
                    {
                        key: kafkaConfig.EVENT_REQ_MEAS_SAVE_WELL_DATA,
                        value: JSON.stringify(wellData),
                    },
                ],
            })
        } catch (err) {
            console.error("could not write message " + err)
        }
    },
    requestMeasurementSaveSubwellData: async (subwellData) => {
        try {
            for (const swData of subwellData) {
                await producer.send({
                    topic: kafkaConfig.TOPIC_MEASUREMENTS,
                    messages: [
                        {
                            key: kafkaConfig.EVENT_REQ_MEAS_SAVE_SUBWELL_DATA,
                            value: JSON.stringify(swData),
                        },
                    ],
                })
            }
        } catch (err) {
            console.error("could not write message " + err)
        }
    }
};

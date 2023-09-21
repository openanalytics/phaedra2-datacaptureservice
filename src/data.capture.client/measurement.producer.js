const kafkaConfig = require('../data.capture.config/kafka.config')

const producer = kafkaConfig.makeProducer({
    allowAutoTopicCreation: false
});

module.exports = {
    requestMeasurementSaveWellData: async (wellData) => {
        await producer.connect()
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
        await producer.disconnect();
    },
    requestMeasurementSaveSubwellData: async (subwellData) => {
        await producer.connect()
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
        await producer.disconnect();
    }
};

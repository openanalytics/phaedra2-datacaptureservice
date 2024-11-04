const dotenv = require('dotenv');
dotenv.config()

const express = require('express');
const bodyParser = require('body-parser');
const swaggerUI = require('swagger-ui-express')
const swaggerFile = require('../swagger_output.json')

const dcRoutes = require('./data.capture.api/routes/data.capture.routes');
const sjRoutes = require('./data.capture.api/routes/scan.job.routes');

const app = express();
const port = process.env.PORT || 3004;

// parse application/json
app.use(bodyParser.json())
app.use("/swagger-ui", swaggerUI.serve, swaggerUI.setup(swaggerFile))

dcRoutes(app)
sjRoutes(app)
app.listen(port, function () {
    console.log('Data Capture server started on port ' + port);
});

const kafkaConsumer = require('./data.capture.kafka/consumer');
kafkaConsumer.run().catch(console.error);

const sqsScanner = require('./data.capture.service/sqs.scan.service');
sqsScanner.run();
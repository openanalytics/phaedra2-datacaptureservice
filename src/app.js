/*
 * Phaedra II
 * 
 * Copyright (C) 2016-2025 Open Analytics
 * 
 * ===========================================================================
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the Apache License as published by
 * The Apache Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * Apache License for more details.
 * 
 * You should have received a copy of the Apache License
 * along with this program.  If not, see <http://www.apache.org/licenses/>
 */
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
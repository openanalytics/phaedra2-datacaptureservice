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
/**
 * This service will poll an AWS SQS queue (specified by SQS_QUEUE_URL) on a regular interval (specified by SQS_POLL_INTERVAL).
 * All messages are parsed into JSON and forwarded to a Kafka topic (see data.capture.producer).
 * Every message is deleted afterwards, even if it cannot be forwarded due to an error (for example, if the message body is not valid JSON).
 */
const dataCaptureProducer = require('../data.capture.kafka/data.capture.producer');

const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require("@aws-sdk/client-sqs");
const sqsClient = new SQSClient({ region: process.env.AWS_REGION || "eu-west-1" });

const queueURL = process.env.SQS_QUEUE_URL;
const pollInterval = parseInt(process.env.SQS_POLL_INTERVAL || "60");

async function pollMessages() {
    try {
        // Attempt to receive a packet of messages
        const receiveRequest = new ReceiveMessageCommand({
            QueueUrl: queueURL,
            MaxNumberOfMessages: 10
        });
        const response = await sqsClient.send(receiveRequest);
        
        for (const msg of (response.Messages || [])) {
            try {
                await dataCaptureProducer.submitCaptureJob(JSON.parse(msg.Body));
                console.log(`Forwarded SQS message ${msg.MessageId} to Kafka`);
            } catch (messageProcessingError) {
                console.log(`Discarded SQS message ${msg.MessageId} due to processing error`);
                console.error(messageProcessingError);
            } finally {
                const deleteRequest = new DeleteMessageCommand({
                    QueueUrl: queueURL,
                    ReceiptHandle: msg.ReceiptHandle
                });
                await sqsClient.send(deleteRequest);
            }
        }
    } catch (err) {
        console.error(err);
    }
}

function run() {
    if (queueURL) {
        setInterval(pollMessages, pollInterval * 1000);
        console.log(`SQS Scanning Service started: polling "${queueURL}" every ${pollInterval} sec.`);
    } else {
        console.log("SQS Scanning Service is NOT started: no SQS_QUEUE_URL configured");
    }
}

module.exports = { run };
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
        console.log(`Polling SQS queue: ${queueURL}`);

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
    if (queueURL) setInterval(pollMessages, pollInterval * 1000);
    else console.log("SQS Scanning Service is NOT started: no SQS_QUEUE_URL configured");
}

module.exports = { run };
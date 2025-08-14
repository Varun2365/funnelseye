// D:\PRJ_YCT_Final\workers\worker_scheduled_action_executor.js

const amqp = require('amqplib');
const mongoose = require('mongoose');
const { executeAutomationAction } = require('../services/actionExecutorService');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const SCHEDULED_ACTIONS_QUEUE = 'funnelseye_scheduled_actions';

// Export this function so it can be called by main.js
const initScheduledExecutorWorker = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/FunnelsEye');
        console.log('[Scheduled Action Executor] Connected to MongoDB.');

        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        
        // Assert the queue with the 'x-delayed-message' exchange plugin
        // This is necessary for RabbitMQ to handle delayed messages
        await channel.assertExchange('delayed_actions_exchange', 'x-delayed-message', {
            durable: true,
            arguments: { 'x-delayed-type': 'direct' }
        });
        await channel.assertQueue(SCHEDULED_ACTIONS_QUEUE, { durable: true });
        await channel.bindQueue(SCHEDULED_ACTIONS_QUEUE, 'delayed_actions_exchange', SCHEDULED_ACTIONS_QUEUE);

        console.log('[Scheduled Action Executor] Waiting for scheduled actions...');

        channel.consume(SCHEDULED_ACTIONS_QUEUE, async (msg) => {
            if (msg.content) {
                const message = JSON.parse(msg.content.toString());
                console.log(`[Scheduled Action Executor] Received delayed message for action: ${message.actionType}`);
                
                try {
                    // Call the same executeAutomationAction function from the main executor
                    await executeAutomationAction(message);
                    console.log(`[Scheduled Action Executor] Successfully executed action: ${message.actionType}`);
                    channel.ack(msg);
                } catch (error) {
                    console.error(`[Scheduled Action Executor] Error executing scheduled action "${message.actionType}":`, error.message);
                    // Requeue the message for another attempt
                    channel.nack(msg);
                }
            }
        }, { noAck: false });

    } catch (error) {
        console.error('[Scheduled Action Executor] Failed to initialize worker:', error);
        setTimeout(initScheduledExecutorWorker, 5000);
    }
};

module.exports = initScheduledExecutorWorker;
// worker_rules_engine.js

const amqp = require('amqplib');
const mongoose = require('mongoose');
const AutomationRule = require('./schema/AutomationRule');

// --- NEW: Using dotenv to load environment variables for RabbitMQ and MongoDB ---
require('dotenv').config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/FunnelsEye';

const EXCHANGE_NAME = 'funnelseye_events';
const ACTIONS_QUEUE = 'funnelseye_actions'; // This queue is for the action executor worker

async function startWorker() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('[RulesEngine] Connected to MongoDB.');

        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        // 1. Assert the EXCHANGE to listen from
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        // 2. Assert a dedicated QUEUE for this worker
        const { queue } = await channel.assertQueue('', { exclusive: true });
        console.log(`[RulesEngine] Listening for events on a temporary queue "${queue}"...`);

        // 3. Bind the queue to the EXCHANGE to receive ALL messages
        // The '#' wildcard means this worker will receive all events published to the exchange.
        await channel.bindQueue(queue, EXCHANGE_NAME, '#');

        // 4. Assert the ACTIONS_QUEUE where this worker will send messages
        await channel.assertQueue(ACTIONS_QUEUE, { durable: true });

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                try {
                    const event = JSON.parse(msg.content.toString());
                    console.log('[RulesEngine] Received event:', event.eventName);

                    const rules = await AutomationRule.find({ triggerEvent: event.eventName, isActive: true });

                    if (rules.length > 0) {
                        for (const rule of rules) {
                            for (const action of rule.actions) {
                                const actionMessage = {
                                    actionType: action.type,
                                    config: action.config,
                                    payload: event.payload // Pass the original event payload
                                };
                                channel.sendToQueue(ACTIONS_QUEUE, Buffer.from(JSON.stringify(actionMessage)), { persistent: true });
                                console.log(`[RulesEngine] Published action: ${action.type} for rule "${rule.name}"`);
                            }
                        }
                    } else {
                        console.log(`[RulesEngine] No rules found for event: ${event.eventName}`);
                    }
                    channel.ack(msg);
                } catch (error) {
                    console.error('[RulesEngine] Error processing event:', error);
                    channel.nack(msg);
                }
            }
        });
    } catch (error) {
        console.error('[RulesEngine] Worker failed to start:', error);
        process.exit(1);
    }
}

startWorker();
// PRJ_YCT_Final/workers/worker_rules_engine.js

const amqp = require('amqplib');
const mongoose = require('mongoose');

// Schemas to be used for fetching full documents
const Lead = require('../schema/Lead');
const Coach = require('../schema/coachSchema'); // Corrected import path for Coach schema
const AutomationRule = require('../schema/AutomationRule');
const Appointment = require('../schema/Appointment'); // Assuming you have an Appointment schema
const Payment = require('../schema/Payment.js'); // Assuming you have a Payment schema

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
const EVENTS_EXCHANGE = 'funnelseye_events';
const ACTIONS_EXCHANGE = 'funnelseye_actions';
const SCHEDULED_ACTIONS_QUEUE = 'funnelseye_scheduled_actions';

// Export this function so it can be called by main.js
const initRulesEngineWorker = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/FunnelsEye');
        console.log('[Rules Engine] Connected to MongoDB.');

        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
        await channel.assertExchange(ACTIONS_EXCHANGE, 'topic', { durable: true });
        
        // Assert the scheduled actions exchange (x-delayed-message)
        await channel.assertExchange('delayed_actions_exchange', 'x-delayed-message', {
            durable: true,
            arguments: { 'x-delayed-type': 'direct' }
        });

        // Assert the scheduled queue and bind it to the delayed exchange
        await channel.assertQueue(SCHEDULED_ACTIONS_QUEUE, { durable: true });
        await channel.bindQueue(SCHEDULED_ACTIONS_QUEUE, 'delayed_actions_exchange', SCHEDULED_ACTIONS_QUEUE);

        const { queue } = await channel.assertQueue('', { exclusive: true });
        channel.bindQueue(queue, EVENTS_EXCHANGE, '#');

        console.log('[Rules Engine] Waiting for events...');

        channel.consume(queue, async (msg) => {
            if (msg.content) {
                let eventPayload;
                try {
                    eventPayload = JSON.parse(msg.content.toString());
                    const eventName = msg.fields.routingKey;

                    console.log(`[Rules Engine] Received event: ${eventName}`);

                    // --- Determine the document to fetch based on event name ---
                    let relatedDoc;
                    let rules;

                    if (eventName.startsWith('lead_') || eventName.startsWith('funnel_') || eventName.startsWith('form_submitted') || eventName.startsWith('content_consumed') || eventName.startsWith('whatsapp_message_received')) {
                        const leadId = eventPayload.leadId || eventPayload.payload.leadId;
                        relatedDoc = await Lead.findById(leadId);
                        rules = await AutomationRule.find({ triggerEvent: eventName, isActive: true });
                    } else if (eventName.startsWith('appointment_') || eventName.startsWith('task_')) {
                        const appointmentId = eventPayload.appointmentId || eventPayload.payload.appointmentId;
                        relatedDoc = await Appointment.findById(appointmentId);
                        rules = await AutomationRule.find({ triggerEvent: eventName, isActive: true });
                    } else if (eventName.startsWith('payment_') || eventName.startsWith('invoice_') || eventName.startsWith('subscription_') || eventName.startsWith('card_')) {
                        const paymentId = eventPayload.paymentId || eventPayload.payload.paymentId;
                        relatedDoc = await Payment.findById(paymentId);
                        rules = await AutomationRule.find({ triggerEvent: eventName, isActive: true });
                    } else if (eventName === 'coach.inactive') {
                        const coachId = eventPayload.coachId || eventPayload.payload.coachId;
                        relatedDoc = await Coach.findById(coachId);
                        rules = await AutomationRule.find({ triggerEvent: eventName, isActive: true });
                    } else {
                        console.log(`[Rules Engine] Unhandled event type: ${eventName}. Skipping.`);
                        return channel.ack(msg);
                    }

                    if (!relatedDoc) {
                        console.error(`[Rules Engine] Related document for event '${eventName}' not found. Skipping rule processing.`);
                        return channel.ack(msg);
                    }

                    for (const rule of rules) {
                        for (const action of rule.actions) {
                            console.log(`[Rules Engine] Triggering action: ${action.type} for event: ${eventName}`);

                            // Build the payload with all relevant data
                            const fullActionPayload = {
                                actionType: action.type,
                                config: action.config,
                                payload: {
                                    ...eventPayload, // Keep original event payload
                                    relatedDoc: relatedDoc, // Add the full document
                                    timestamp: new Date().toISOString(),
                                }
                            };
                            
                            if (action.config.delayMinutes && action.config.delayMinutes > 0) {
                                const delayInMilliseconds = action.config.delayMinutes * 60 * 1000;
                                
                                channel.publish(
                                    'delayed_actions_exchange',
                                    SCHEDULED_ACTIONS_QUEUE,
                                    Buffer.from(JSON.stringify(fullActionPayload)),
                                    { headers: { 'x-delay': delayInMilliseconds } }
                                );
                                
                                console.log(`[Rules Engine] Scheduled action "${action.type}" for event ${eventName} to run in ${action.config.delayMinutes} minutes.`);
                            } else {
                                channel.publish(
                                    ACTIONS_EXCHANGE,
                                    action.type,
                                    Buffer.from(JSON.stringify(fullActionPayload))
                                );
                                console.log(`[Rules Engine] Dispatched immediate action "${action.type}" for event ${eventName}.`);
                            }
                        }
                    }
                    channel.ack(msg);
                } catch (error) {
                    console.error('[Rules Engine] Error processing message:', error);
                    // Log the malformed message payload for debugging
                    console.error('Malformed message content:', eventPayload); 
                    channel.nack(msg);
                }
            }
        });
    } catch (error) {
        console.error('[Rules Engine] Failed to initialize worker:', error);
        setTimeout(initRulesEngineWorker, 5000);
    }
};

module.exports = initRulesEngineWorker;
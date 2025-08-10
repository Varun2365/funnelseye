// D:\PRJ_YCT_Final\services\rabbitmqProducer.js

const amqp = require('amqplib');

let connection;
let channel;
const EXCHANGE_NAME = 'funnelseye_events';

/**
 * Initializes the RabbitMQ connection and channel.
 */
const init = async () => {
    try {
        console.log('[RabbitMQ Producer] Attempting to connect to RabbitMQ...');
        connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
        channel = await connection.createChannel();

        // Assert an exchange to which messages will be published. This exchange should be 'topic' type.
        await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });

        console.log(`[RabbitMQ Producer] Connected and asserted exchange "${EXCHANGE_NAME}"`);
        
        // Add a listener to handle connection close events
        connection.on('close', () => {
            console.error('[RabbitMQ Producer] Connection closed unexpectedly. Attempting to reconnect...');
            setTimeout(init, 5000); // Attempt to reconnect every 5 seconds
        });
        
    } catch (error) {
        console.error('[RabbitMQ Producer] Failed to connect or initialize:', error.message);
        // Implement a retry mechanism to handle initial connection failures
        setTimeout(init, 5000);
    }
};

/**
 * Publishes an event to the RabbitMQ exchange.
 * @param {string} routingKey - The routing key for the event (e.g., 'lead_created').
 * @param {object} payload - The data payload for the event.
 */
const publishEvent = async (routingKey, payload) => {
    if (!channel) {
        console.error(`[RabbitMQ Producer] Channel not initialized. Cannot publish event "${routingKey}".`);
        return;
    }
    
    try {
        const message = JSON.stringify(payload);
        channel.publish(EXCHANGE_NAME, routingKey, Buffer.from(message));
        console.log(`[RabbitMQ Producer] Event published: "${routingKey}"`);
    } catch (error) {
        console.error(`[RabbitMQ Producer] Failed to publish event "${routingKey}":`, error.message);
    }
};

/**
 * Gracefully closes the RabbitMQ connection.
 */
const closeConnection = async () => {
    if (connection) {
        try {
            await connection.close();
            console.log('[RabbitMQ Producer] Connection closed.');
        } catch (error) {
            console.error('[RabbitMQ Producer] Error closing connection:', error.message);
        }
    }
};

process.on('beforeExit', closeConnection);
process.on('SIGINT', closeConnection);

module.exports = {
    init,
    publishEvent
};
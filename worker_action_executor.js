// worker_action_executor.js

const amqp = require('amqplib');
const { executeAutomationAction } = require('./services/actionExecutorService');
const mongoose = require('mongoose');

const mongoURI = 'mongodb://localhost:27017/FunnelsEye'; 

async function startWorker() {
    let connection;
    try {
        await mongoose.connect(mongoURI);
        console.log("Action Executor Worker connected to MongoDB.");

        connection = await amqp.connect('amqp://guest:guest@localhost:5672');
        const channel = await connection.createChannel();

        const actionQueue = 'funnelseye_actions';

        await channel.assertQueue(actionQueue, { durable: true });

        console.log("Action Executor Worker is listening for actions...");

        channel.consume(actionQueue, async (msg) => {
            if (msg !== null) {
                let actionPayload;
                try {
                    actionPayload = JSON.parse(msg.content.toString());
                    const actionType = actionPayload.actionType;
                    console.log(`[ActionExecutor] Received action: ${actionType}`);

                    await executeAutomationAction(actionPayload);
                    console.log(`[ActionExecutor] Successfully executed action: ${actionType}`);
                    
                    // ACKNOWLEDGE ONLY ON SUCCESS
                    channel.ack(msg); 

                } catch (executionError) {
                    console.error(`[ActionExecutor] Error executing action:`, executionError);
                    
                    // NACK THE MESSAGE ON FAILURE, so it can be handled
                    channel.nack(msg); 
                }
            }
        });
    } catch (error) {
        console.error("Action Executor Worker failed to start:", error);
    }
}

startWorker();
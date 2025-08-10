// D:\PRJ_YCT_Final\services\metaWhatsAppService.js

const axios = require('axios');
const Coach = require('../schema/coachSchema');
const WhatsAppMessage = require('../schema/whatsappMessageSchema');
const Lead = require('../schema/Lead');

// Meta API configuration from environment variables
const META_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0';
const CENTRAL_API_TOKEN = process.env.WHATSAPP_CENTRAL_API_TOKEN;
const CENTRAL_PHONE_NUMBER_ID = process.env.WHATSAPP_CENTRAL_PHONE_NUMBER_ID;

/**
 * Sends a WhatsApp message using either the central or a coach's personal account.
 * This function first checks if the coach has credits, deducts one if they do,
 * and then sends the message via the Meta API. A record of the message is saved
 * to the database upon successful delivery.
 * * @param {string} coachId The ID of the coach sending the message.
 * @param {string} recipientPhoneNumber The recipient's phone number.
 * @param {string} messageContent The content of the message.
 */
async function sendMessageByCoach(coachId, recipientPhoneNumber, messageContent) {
    try {
        // Fetch the coach document, explicitly selecting the hidden fields needed.
        const coach = await Coach.findById(coachId).select('+whatsApp.whatsAppApiToken credits');
        if (!coach) {
            throw new Error('Coach not found.');
        }

        // 1. Check for available credits
        if (coach.credits <= 0) {
            console.warn(`Coach ${coachId} attempted to send a message but has insufficient credits.`);
            throw new Error('Insufficient credits. Please top up your account.');
        }

        // 2. Determine which WhatsApp API credentials to use
        let apiToken, phoneNumberId;
        if (coach.whatsApp.useCentralAccount) {
            apiToken = CENTRAL_API_TOKEN;
            phoneNumberId = CENTRAL_PHONE_NUMBER_ID;
        } else {
            apiToken = coach.whatsApp.whatsAppApiToken;
            phoneNumberId = coach.whatsApp.phoneNumberId;
        }

        if (!apiToken || !phoneNumberId) {
            throw new Error('WhatsApp API credentials not configured for this coach.');
        }

        // 3. Construct and send the message payload to the Meta API
        const payload = {
            messaging_product: 'whatsapp',
            to: recipientPhoneNumber,
            type: 'text',
            text: { body: messageContent }
        };

        const headers = {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
        };

        const response = await axios.post(
            `${META_API_URL}/${phoneNumberId}/messages`,
            payload,
            { headers }
        );
        
        // 4. Deduct one credit from the coach's balance
        coach.credits -= 1;
        await coach.save();
        console.log(`Credit deducted. Coach ${coachId} now has ${coach.credits} credits.`);

        // 5. Find the lead and save a record of the outbound message
        const lead = await Lead.findOne({ coachId: coachId, phone: recipientPhoneNumber });
        if (lead) {
            const newMessage = new WhatsAppMessage({
                coach: coach._id,
                lead: lead._id,
                messageId: response.data.messages[0].id,
                from: phoneNumberId, // The sender's phone number ID
                to: recipientPhoneNumber,
                content: messageContent,
                direction: 'outbound',
                timestamp: new Date()
            });
            await newMessage.save();
            console.log('Outbound message saved to database.');
        }

        return response.data;

    } catch (error) {
        // Log the error and re-throw it so it can be handled by the calling function/route.
        console.error('Error in sendMessageByCoach:', error.response ? error.response.data : error.message);
        throw error;
    }
}

/**
 * Handles incoming webhook messages from the Meta API.
 * This function is responsible for parsing the webhook payload, identifying the
 * lead and coach, and saving the incoming message to the database.
 * NOTE: The implementation of this function should be from our previous conversations
 * and is not included here for brevity.


/**
 * Handles incoming messages and status updates from the Meta Webhook.
 */
async function handleWebhook(req, res) {
    // Webhook verification (GET request from Meta)
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        console.log('Webhook verified!');
        return res.status(200).send(challenge);
    } else if (mode === 'subscribe') {
        console.warn('Webhook verification failed: Invalid token.');
        return res.sendStatus(403);
    }

    // Process incoming message payload (POST request)
    const body = req.body;
    if (body.object) {
        if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            const messageData = body.entry[0].changes[0].value.messages[0];
            const senderPhoneNumber = messageData.from; // The user's phone number
            const recipientPhoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id; // Your phone number ID

            // Extract the message content based on its type
            let messageContent = '';
            let messageType = messageData.type;

            if (messageData.type === 'text') {
                messageContent = messageData.text.body;
            }
            // Add more cases for other message types (image, video, etc.) as needed
            // else if (messageData.type === 'image') { ... }

            if (messageContent) {
                // Find the coach associated with this phone number ID
                const coach = await Coach.findOne({ 'whatsApp.phoneNumberId': recipientPhoneNumberId });

                if (coach) {
                    // Find or create the lead based on the sender's phone number
                    let lead = await Lead.findOne({ coachId: coach._id, phone: senderPhoneNumber });
                    if (!lead) {
                        // Create a new lead if one doesn't exist
                        lead = new Lead({
                            coachId: coach._id,
                            phone: senderPhoneNumber,
                            name: senderPhoneNumber, // Use the number as a temporary name
                            status: 'New',
                            source: 'WhatsApp'
                        });
                        await lead.save();
                    }

                    // Save the incoming message to the database
                    const newMessage = new WhatsAppMessage({
                        coach: coach._id,
                        lead: lead._id,
                        messageId: messageData.id,
                        from: senderPhoneNumber,
                        to: recipientPhoneNumberId,
                        content: messageContent,
                        direction: 'inbound',
                        timestamp: new Date(messageData.timestamp * 1000), // Meta sends a Unix timestamp in seconds
                        type: messageType
                    });

                    await newMessage.save();
                    console.log(`Saved new inbound message from ${senderPhoneNumber}`);
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
}

module.exports = {
    sendMessageByCoach,
    handleWebhook
};
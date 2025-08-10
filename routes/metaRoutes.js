// routes/metaRoutes.js

const express = require('express');
const { handleWebhook, sendMessageByCoach } = require('../services/metaWhatsAppService');

const router = express.Router();

// This is the GET endpoint for webhook verification from Meta
router.get('/webhook', handleWebhook);

// This is the POST endpoint for receiving incoming messages from Meta
router.post('/webhook', handleWebhook);

// This is a sample POST endpoint to trigger an outbound message from your app
// For example, this could be used by a UI button on the coach dashboard
router.post('/send-message', async (req, res) => {
    try {
        const { coachId, recipientPhoneNumber, messageContent } = req.body;

        if (!coachId || !recipientPhoneNumber || !messageContent) {
            return res.status(400).json({ error: 'Missing required fields.' });
        }

        const result = await sendMessageByCoach(coachId, recipientPhoneNumber, messageContent);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Error in /send-message route:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
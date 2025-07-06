// D:\PRJ_YCT_Final\routes\coachWhatsappRoutes.js

const express = require('express');
const router = express.Router();
// Assuming you have an authMiddleware for protecting routes
// const { protect } = require('../middleware/authMiddleware'); // Uncomment if you use authentication

// IMPORTANT: Import the whatsappManager service
const whatsappManager = require('../services/whatsappManager'); // Adjust path if your services folder is elsewhere, e.g., '../src/services/whatsappManager'

// --- Existing Coach WhatsApp Routes ---

// @route   GET /api/coach-whatsapp/status
// @desc    Check WhatsApp connection status for a coach
// @access  Private (or public, depending on your auth strategy)
router.get('/status', async (req, res) => {
    // In a real app, you'd get coachId from req.user (after auth middleware)
    // For now, let's assume coachId is passed as a query param for testing, or from auth
    const coachId = req.query.coachId; // Example: /api/coach-whatsapp/status?coachId=YOUR_COACH_ID
    if (!coachId) {
        return res.status(400).json({ success: false, message: 'Coach ID is required.' });
    }

    const isConnected = whatsappManager.isClientConnected(coachId);
    res.json({ success: true, coachId, connected: isConnected });
});

// @route   POST /api/coach-whatsapp/add-device
// @desc    Initiate WhatsApp device linking (get QR code)
// @access  Private
router.post('/add-device', async (req, res) => {
    const { coachId } = req.body;
    if (!coachId) {
        return res.status(400).json({ success: false, message: 'Coach ID is required.' });
    }

    try {
        await whatsappManager.initializeClient(coachId);
        // Initializing the client will trigger 'qr' event, which is emitted via Socket.IO
        res.status(202).json({
            success: true,
            message: 'WhatsApp client initialization initiated. Awaiting QR code via WebSocket.',
            coachId: coachId
        });
    } catch (error) {
        console.error('Error initiating WhatsApp client:', error);
        res.status(500).json({ success: false, message: 'Failed to initiate WhatsApp client.', error: error.message });
    }
});

// @route   GET /api/coach-whatsapp/get-qr
// @desc    Retrieve the latest QR code for a coach
// @access  Private (usually for initial fetching if WebSocket missed, or for retry)
router.get('/get-qr', async (req, res) => {
    const coachId = req.query.coachId;
    if (!coachId) {
        return res.status(400).json({ success: false, message: 'Coach ID is required.' });
    }

    const qrCodeData = whatsappManager.getQrCode(coachId);
    if (qrCodeData) {
        res.json({ success: true, coachId, qrCodeData });
    } else {
        res.status(404).json({ success: false, message: 'No QR code available or client already connected.' });
    }
});

// @route   POST /api/coach-whatsapp/logout-device
// @desc    Disconnect WhatsApp device for a coach
// @access  Private
router.post('/logout-device', async (req, res) => {
    const { coachId } = req.body;
    if (!coachId) {
        return res.status(400).json({ success: false, message: 'Coach ID is required.' });
    }

    try {
        await whatsappManager.logoutClient(coachId);
        res.json({ success: true, message: 'WhatsApp device logged out and session cleared.' });
    } catch (error) {
        console.error('Error logging out WhatsApp client:', error);
        res.status(500).json({ success: false, message: 'Failed to log out WhatsApp client.', error: error.message });
    }
});

// --- NEW: Routes for Sending Messages ---

// @route   POST /api/coach-whatsapp/send-message
// @desc    Send a text message from coach to lead
// @access  Private (e.g., protect with authentication middleware)
router.post('/send-message', async (req, res) => {
    const { coachId, recipientPhoneNumber, messageContent } = req.body;

    // Basic validation
    if (!coachId || !recipientPhoneNumber || !messageContent) {
        return res.status(400).json({ success: false, message: 'Missing required fields: coachId, recipientPhoneNumber, and messageContent.' });
    }

    try {
        const sentMessage = await whatsappManager.sendCoachMessage(coachId, recipientPhoneNumber, messageContent);
        res.status(200).json({ success: true, message: 'Text message sent successfully.', data: sentMessage });
    } catch (error) {
        console.error('Error sending text message:', error);
        res.status(500).json({ success: false, message: 'Failed to send text message.', error: error.message });
    }
});

// @route   POST /api/coach-whatsapp/send-media
// @desc    Send a media message (image, video, document) from coach to lead
// @access  Private (e.g., protect with authentication middleware)
router.post('/send-media', async (req, res) => {
    const { coachId, recipientPhoneNumber, filePathOrUrl, caption } = req.body;

    // Basic validation
    if (!coachId || !recipientPhoneNumber || !filePathOrUrl) {
        return res.status(400).json({ success: false, message: 'Missing required fields: coachId, recipientPhoneNumber, and filePathOrUrl.' });
    }

    try {
        const sentMediaMessage = await whatsappManager.sendMediaMessage(coachId, recipientPhoneNumber, filePathOrUrl, caption);
        res.status(200).json({ success: true, message: 'Media message sent successfully.', data: sentMediaMessage });
    } catch (error) {
        console.error('Error sending media message:', error);
        res.status(500).json({ success: false, message: 'Failed to send media message.', error: error.message });
    }
});


module.exports = router;
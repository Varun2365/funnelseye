// D:\\PRJ_YCT_Final\\routes\\coachWhatsappRoutes.js

const express = require('express');
const router = express.Router();
// IMPORTANT: Import the whatsappManager service
const whatsappManager = require('../services/whatsappManager');

// Import authentication and activity tracking middleware
const { protect } = require('../middleware/auth');
const { updateLastActive } = require('../middleware/activityMiddleware');

// --- Apply middleware to ALL routes below this line ---
router.use(protect, updateLastActive);


// @route   GET /api/coach-whatsapp/status
// @desc    Check WhatsApp connection status for a coach
// @access  Private
router.get('/status', async (req, res) => {
    // Get coachId securely from the authenticated user
    const coachId = req.user.id;
    if (!coachId) {
        return res.status(400).json({ success: false, message: 'Coach ID is required from authenticated user.' });
    }

    const isConnected = whatsappManager.isClientConnected(coachId);
    res.json({ success: true, coachId, connected: isConnected });
});

// @route   POST /api/coach-whatsapp/add-device
// @desc    Initiate WhatsApp device linking (get QR code)
// @access  Private
router.post('/add-device', async (req, res) => {
    const coachId = req.user.id;
    try {
        await whatsappManager.initializeClient(coachId);
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
// @access  Private
router.get('/get-qr', async (req, res) => {
    const coachId = req.user.id;
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
    const coachId = req.user.id;
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
// @access  Private
router.post('/send-message', async (req, res) => {
    const { recipientPhoneNumber, messageContent } = req.body;
    const coachId = req.user.id;

    if (!coachId || !recipientPhoneNumber || !messageContent) {
        return res.status(400).json({ success: false, message: 'Missing required fields: recipientPhoneNumber, and messageContent.' });
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
// @access  Private
router.post('/send-media', async (req, res) => {
    const { recipientPhoneNumber, filePathOrUrl, caption } = req.body;
    const coachId = req.user.id;

    if (!coachId || !recipientPhoneNumber || !filePathOrUrl) {
        return res.status(400).json({ success: false, message: 'Missing required fields: recipientPhoneNumber, and filePathOrUrl.' });
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
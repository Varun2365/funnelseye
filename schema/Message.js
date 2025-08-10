// D:\PRJ_YCT_Final\schema\Message.js

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead',
        required: true // Each message must belong to a Lead
    },
    coach: { // The coach associated with this message
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming your coaches are 'User' models
        required: true
    },
    messageId: { // Unique ID from WhatsApp/Baileys for this message
        type: String,
        required: true,
        unique: true // Ensures no duplicate messages are saved
    },
    timestamp: {
        type: Date,
        default: Date.now // When the message was sent/received
    },
    direction: { // 'inbound' for messages received by the coach, 'outbound' for messages sent by the coach
        type: String,
        enum: ['inbound', 'outbound'],
        required: true
    },
    type: { // Type of message: 'text', 'image', 'video', 'document', 'audio', 'voice_note', etc.
        type: String,
        required: true
    },
    content: { // The actual text content or caption of the message
        type: String,
        required: true // Make this required for all messages
    },
    sender: { // The JID (WhatsApp ID like 'phonenumber@s.whatsapp.net') of the actual sender
        type: String,
        required: true
        // *** IMPORTANT: Ensure there is NO 'enum' property here! ***
    },
    mediaUrl: { // URL to the media file if it's an image, video, etc.
        type: String,
        required: false // Not all messages have media
    }
}, {
    timestamps: true // Adds createdAt and updatedAt fields automatically
});

// Create indexes for efficient querying
MessageSchema.index({ lead: 1, timestamp: -1 }); // To query messages for a lead, sorted by newest first
MessageSchema.index({ coach: 1, timestamp: -1 }); // To query all messages for a coach

// Prevent Mongoose from overwriting the model if it's already defined (useful in development with hot-reloading)
// module.exports = mongoose.models.Message || mongoose.model('Message', MessageSchema);
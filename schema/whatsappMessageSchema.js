const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    // Link the message to a specific coach
    coach: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'coach',
        required: true
    },
    // Link the message to a specific lead/client
    lead: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lead', // Assuming your lead schema is named 'Lead'
        required: true
    },
    // The unique ID from the Meta API
    messageId: {
        type: String,
        required: true,
        unique: true
    },
    // The phone number of the sender
    from: {
        type: String,
        required: true
    },
    // The phone number of the recipient
    to: {
        type: String,
        required: true
    },
    // The content of the message
    content: {
        type: String,
        required: true
    },
    // Message direction: 'inbound' or 'outbound'
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        required: true
    },
    timestamp: {
        type: Date,
        required: true
    },
    // Add more fields for media, templates, etc. as needed
    mediaUrl: {
        type: String,
        default: null
    },
    type: {
        type: String,
        enum: ['text', 'image', 'video', 'document', 'audio', 'unknown'],
        default: 'text'
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.WhatsAppMessage || mongoose.model('WhatsAppMessage', messageSchema);
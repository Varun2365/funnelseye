// D:\PRJ_YCT_Final\schema\Conversation.js

const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    coach: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming your coach/user model is named 'User'
        required: true,
        index: true // Index for efficient lookup by coach
    },
    lead: {
        type: {
            // This allows flexible lead identification (e.g., by phone number for WhatsApp)
            // You might link this to a full 'Lead' model later if you have one.
            name: { type: String, default: 'Unknown Lead' },
            phoneNumber: { type: String, unique: true, sparse: true, index: true }, // For WhatsApp/SMS
            email: { type: String, unique: true, sparse: true }, // For Email
            // Add other lead identifiers as needed
        },
        required: true
    },
    type: {
        type: String,
        enum: ['whatsapp', 'sms', 'email', 'other'], // Type of communication channel
        required: true,
        default: 'whatsapp' // Default to whatsapp as that's our current focus
    },
    lastMessageAt: {
        type: Date,
        default: Date.now,
        index: true // For sorting conversations by recent activity
    },
    // Optional: You can add a reference to a dedicated 'Lead' model if you have one
    // leadRef: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: 'Lead',
    //     required: false // Not required if lead data is embedded above
    // },
}, {
    timestamps: true // Adds createdAt and updatedAt timestamps automatically
});

// Compound index to ensure uniqueness of a conversation per coach and lead phone number
ConversationSchema.index({ coach: 1, 'lead.phoneNumber': 1 }, { unique: true });

module.exports = mongoose.model('Conversation', ConversationSchema);
const mongoose = require('mongoose');

// Sub-schema for individual actions within an automation rule
const AutomationActionSchema = new mongoose.Schema({
    type: { // e.g., 'SEND_WHATSAPP_MESSAGE', 'CREATE_TASK', 'UPDATE_LEAD_STATUS'
        type: String,
        required: true,
        enum: [
            'SEND_WHATSAPP_MESSAGE',
            'CREATE_EMAIL_MESSAGE',
            'CREATE_SMS_MESSAGE',
            'CREATE_TASK',
            'UPDATE_LEAD_STATUS',
            'ASSIGN_LEAD_TO_COACH',
            // Add more action types as your platform grows
        ]
    },
    config: { // Specific configuration for the action (e.g., message template ID, task description)
        type: mongoose.Schema.Types.Mixed, // Allows for flexible data structures
        default: {}
    }
}, { _id: false }); // Actions are embedded, no separate _id needed

// Main schema for an automation rule
const AutomationRuleSchema = new mongoose.Schema({
    name: { // Unique and descriptive name for the rule (e.g., "Welcome New Form Lead")
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    triggerEvent: { // The specific event that will cause this rule to fire
        type: String,
        required: true,
        enum: [
            'LEAD_CREATED',
            'LEAD_STATUS_CHANGED',
            'LEAD_TEMPERATURE_CHANGED',
            'FORM_SUBMITTED',
            'APPOINTMENT_BOOKED',
            'APPOINTMENT_REMINDER_TIME',
            'WHATSAPP_MESSAGE_RECEIVED',
            'FUNNEL_STAGE_COMPLETED',
            'PAYMENT_FAILED',
            'SUBSCRIPTION_EXPIRED',
            'DOWNLINE_INACTIVE',
            'PAGE_VIEWED', // If you want to track specific page views as triggers
            'BUTTON_CLICKED', // If specific CTA clicks are triggers
            // ... and any other events you listed previously or find in your document
        ]
    },
    // Optional: Add conditions here if you need more complex trigger logic beyond just the event type.
    // For example: { "field": "lead.source", "operator": "eq", "value": "Facebook Ad" }
    // conditions: {
    //     type: mongoose.Schema.Types.Mixed,
    //     default: {}
    // },
    actions: { // Array of actions to execute when the rule triggers
        type: [AutomationActionSchema],
        required: true,
        default: []
    },
    isActive: { // Toggle to enable/disable the rule without deleting it
        type: Boolean,
        default: true
    },
    createdBy: { // Reference to the user who created this automation rule
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming you have a 'User' schema/model
        required: true
    }
}, {
    timestamps: true // Mongoose will automatically add `createdAt` and `updatedAt` fields
});

const AutomationRule = mongoose.model('AutomationRule', AutomationRuleSchema);

module.exports = AutomationRule;
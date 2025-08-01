// PRJ_YCT_Final/schema/AutomationRule.js

const mongoose = require('mongoose');

// Sub-schema for individual actions within an automation rule
const AutomationActionSchema = new mongoose.Schema({
    type: { // e.g., 'SEND_WHATSAPP_MESSAGE', 'CREATE_TASK', 'UPDATE_LEAD_STATUS'
        type: String,
        required: true,
        enum: [
            'SEND_WHATSAPP',
            'CREATE_EMAIL_MESSAGE',
            'CREATE_SMS_MESSAGE',
            'CREATE_TASK',
            'UPDATE_LEAD_STATUS',
            'ASSIGN_LEAD_TO_COACH', // This action type is for the *action* of assigning
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
            // Core Lead Events
            'LEAD_CREATED', // Manual lead creation by coach
            'LEAD_CREATED_VIA_FORM', // <-- NEW: From public forms
            'LEAD_UPDATED_VIA_FORM', // <-- NEW: From public forms
            'LEAD_STATUS_CHANGED',
            'LEAD_TEMPERATURE_CHANGED',
            'LEAD_ASSIGNED_TO_CHANGED', // <-- RENAMED from ASSIGN_LEAD_TO_COACH
            'LEAD_FOLLOW_UP_ADDED', // <-- NEW: When a coach adds a note
            'LEAD_FOLLOWUP_SCHEDULED_OR_UPDATED', // <-- NEW: When next follow-up date changes
            'LEAD_DELETED', // <-- NEW

            // Other General Events (from your original list, for future use)
            'FORM_SUBMITTED', // Generic form submission (if you want a broader trigger than just lead creation/update)
            'APPOINTMENT_BOOKED',
            'APPOINTMENT_REMINDER_TIME',
            'WHATSAPP_MESSAGE_RECEIVED', // Received messages from contacts
            'FUNNEL_STAGE_COMPLETED',
            'PAYMENT_FAILED',
            'SUBSCRIPTION_EXPIRED',
            'DOWNLINE_INACTIVE',
            'PAGE_VIEWED',
            'BUTTON_CLICKED',
            // ... and any other events you listed previously or find in your document
        ]
    },
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

const AutomationRule = mongoose.models.AutomationRule || mongoose.model('AutomationRule', AutomationRuleSchema);

module.exports = AutomationRule;
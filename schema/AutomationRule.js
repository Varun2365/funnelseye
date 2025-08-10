// PRJ_YCT_Final/schema/AutomationRule.js

const mongoose = require('mongoose');

// Sub-schema for individual actions within an automation rule
const AutomationActionSchema = new mongoose.Schema({
    type: { // e.g., 'send_whatsapp_message', 'create_task', 'update_lead_status'
        type: String,
        required: true,
        enum: [
            // Lead Data & Funnel Actions
            'update_lead_score',
            'add_lead_tag',
            'remove_lead_tag',
            'add_to_funnel',
            'move_to_funnel_stage',
            'remove_from_funnel',
            'update_lead_field',
            'create_deal',

            // Communication Actions
            'send_whatsapp_message',
            'create_email_message',
            'create_sms_message',
            'send_internal_notification', // e.g., to a coach's dashboard
            'send_push_notification',
            'schedule_drip_sequence', // starts a sequence of emails/messages

            // Task & Workflow Actions
            'create_task',
            'create_calendar_event',
            'add_note_to_lead',
            'add_followup_date',

            // Payment Actions
            'create_invoice',
            'issue_refund',

            // System Actions
            'call_webhook', // for integrating with external services
            'trigger_another_automation'
        ]
    },
    config: { // Specific configuration for the action
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { _id: false });

// Main schema for an automation rule
const AutomationRuleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    triggerEvent: {
        type: String,
        required: true,
        enum: [
            // Lead & Customer Lifecycle
            'lead_created',
            'lead_status_changed',
            'lead_temperature_changed',
            'lead_converted_to_client',

            // Funnel & Conversion
            'form_submitted',
            'funnel_stage_entered',
            'funnel_stage_exited',
            'funnel_completed',

            // Appointment & Calendar
            'appointment_booked',
            'appointment_rescheduled',
            'appointment_cancelled',
            'appointment_reminder_time',
            'appointment_finished',

            // Communication
            'whatsapp_message_received',
            'content_consumed',

            // Task & System
            'task_created',
            'task_completed',
            'task_overdue',

            // Payment & Subscription
            'payment_successful',
            'payment_failed',
            'payment_link_clicked',
            'payment_abandoned',
            'invoice_paid',
            'subscription_created',
            'subscription_cancelled',
            'card_expired'
        ]
    },
    actions: {
        type: [AutomationActionSchema],
        required: true,
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const AutomationRule = mongoose.models.AutomationRule || mongoose.model('AutomationRule', AutomationRuleSchema);

module.exports = AutomationRule;
const mongoose = require('mongoose');

const NurturingStepSchema = new mongoose.Schema({
    actionType: {
        type: String,
        enum: ['send_email', 'send_sms', 'update_status', 'add_note', 'custom'],
        required: true
    },
    actionConfig: {
        type: mongoose.Schema.Types.Mixed, // e.g., { templateId, message, newStatus }
        required: false
    },
    delayDays: {
        type: Number,
        default: 0 // Days after previous step or sequence start
    },
    conditions: {
        type: mongoose.Schema.Types.Mixed, // e.g., { status: 'Contacted' }
        required: false
    }
});

const NurturingSequenceSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    steps: [NurturingStepSchema],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.models.NurturingSequence || mongoose.model('NurturingSequence', NurturingSequenceSchema);

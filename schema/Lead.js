// PRJ_YCT_Final/schema/Lead.js
const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
    coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Lead must be associated with a coach.']
    },
    funnelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Funnel',
        required: false
    },
    funnelName: {
        type: String,
        trim: true,
        maxlength: [100, 'Funnel name can not be more than 100 characters'],
        required: false
    },
    name: {
        type: String,
        required: [true, 'Please add a name for the lead'],
        trim: true,
        maxlength: [50, 'Name can not be more than 50 characters']
    },
    email: {
        type: String,
        required: function() { return !this.phone; },
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please add a valid email'
        ],
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        maxlength: [20, 'Phone number can not be longer than 20 characters'],
        required: function() { return !this.email; },
        trim: true
    },
    country: {
        type: String,
        trim: true,
        required: false
    },
    city: {
        type: String,
        trim: true,
        required: false
    },
    // --- LEAD QUALIFICATION FIELDS ---
    status: {
        type: String,
        default: 'New'
    },
    leadTemperature: {
        type: String,
        enum: ['Cold', 'Warm', 'Hot'],
        default: 'Warm',
        required: [true, 'Please specify lead temperature']
    },
    source: {
        type: String,
        required: [true, 'Please add a lead source'],
        default: 'Web Form'
    },
    targetAudience: {
        type: String,
        enum: ['customer', 'coach'],
        default: 'customer',
    },
    notes: {
        type: String,
        maxlength: [2000, 'Notes can not be more than 2000 characters']
    },
    // --- END LEAD QUALIFICATION FIELDS ---

    lastFollowUpAt: {
        type: Date,
        required: false
    },
    nextFollowUpAt: {
        type: Date,
        required: false
    },
    followUpHistory: [
        {
            note: {
                type: String,
                required: [true, 'Follow-up note is required.']
            },
            followUpDate: {
                type: Date,
                default: Date.now
            },
            createdBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: false
            }
        }
    ],
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },

    // --- NEW: APPOINTMENT & WORKFLOW FIELDS ---
    appointment: {
        status: {
            type: String,
            enum: ['Unbooked', 'Booked', 'Rescheduled', 'Confirmed', 'No Show', 'Attended'],
            default: 'Unbooked'
        },
        scheduledTime: {
            type: Date,
            required: false // Not all leads have a booked appointment
        },
        zoomLink: {
            type: String,
            required: false
        },
        assignedStaffId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false
        }
    },
    // We'll use a `score` field to track the lead's overall score.
    score: {
        type: Number,
        default: 0
    },
    // --- Automated Lead Nurturing ---
    nurturingSequence: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NurturingSequence',
        required: false
    },
    nurturingStepIndex: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

// --- Indexes for efficient querying and preventing duplicates ---
LeadSchema.index({ coachId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true, $ne: null } } });
LeadSchema.index({ coachId: 1, phone: 1 }, { unique: true, partialFilterExpression: { phone: { $exists: true, $ne: null } } });
LeadSchema.index({ coachId: 1, status: 1 });
LeadSchema.index({ coachId: 1, leadTemperature: 1 });
LeadSchema.index({ coachId: 1, nextFollowUpAt: 1 });
LeadSchema.index({ coachId: 1, createdAt: -1 });

module.exports = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
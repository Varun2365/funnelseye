// PRJ_YCT_Final/schema/Lead.js
const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
    coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Assuming your User schema is in 'schema/User.js'
        required: [true, 'Lead must be associated with a coach.']
    },
    funnelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Funnel', // Assuming your Funnel schema is in 'schema/Funnel.js'
        required: false // A lead might not always come from a specific funnel
    },
    funnelName: { // Storing name for easier display without populating
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
        required: function() { return !this.phone; }, // Requires email OR phone
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please add a valid email'
        ],
        lowercase: true, // Store emails in lowercase for consistency
        trim: true
    },
    phone: {
        type: String,
        maxlength: [20, 'Phone number can not be longer than 20 characters'],
        required: function() { return !this.email; }, // Requires email OR phone
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
        enum: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Follow-up', 'Archived'],
        default: 'New'
    },
    leadTemperature: {
        type: String,
        enum: ['Cold', 'Warm', 'Hot'],
        default: 'Warm', // Default to Warm if no specific signals
        required: [true, 'Please specify lead temperature']
    },
    source: {
        type: String,
        required: [true, 'Please add a lead source'],
        default: 'Web Form' // General default, can be overridden by specific forms
    },
    notes: {
        type: String,
        maxlength: [2000, 'Notes can not be more than 2000 characters'] // Increased for initial messages + internal notes
    },
    // --- END LEAD QUALIFICATION FIELDS ---

    lastFollowUpAt: { // Timestamp of the last time a coach followed up
        type: Date,
        required: false
    },
    nextFollowUpAt: { // When the next follow-up is scheduled
        type: Date,
        required: false
    },
    followUpHistory: [ // Log of follow-up interactions
        {
            note: {
                type: String,
                required: [true, 'Follow-up note is required.']
            },
            followUpDate: {
                type: Date,
                default: Date.now
            },
            createdBy: { // Which user logged this follow-up
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: false
            }
        }
    ],
    assignedTo: { // Which specific coach is actively working this lead (can be different from coachId)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    }
}, {
    timestamps: true // Adds createdAt and updatedAt automatically
});

// --- Indexes for efficient querying and preventing duplicates ---
// Combined unique index for coach and email (case-insensitive for email)
LeadSchema.index({ coachId: 1, email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true, $ne: null } } });
// Combined unique index for coach and phone
LeadSchema.index({ coachId: 1, phone: 1 }, { unique: true, partialFilterExpression: { phone: { $exists: true, $ne: null } } });

// Other useful indexes for querying
LeadSchema.index({ coachId: 1, status: 1 });
LeadSchema.index({ coachId: 1, leadTemperature: 1 });
LeadSchema.index({ coachId: 1, nextFollowUpAt: 1 });
LeadSchema.index({ coachId: 1, createdAt: -1 }); // For sorting by newest lead

module.exports = mongoose.models.Lead || mongoose.model('Lead', LeadSchema);
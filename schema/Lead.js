// D:\PRJ_YCT_Final\models\Lead.js

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
        required: [true, 'Lead must be associated with a funnel.']
    },
    name: {
        type: String,
        required: [true, 'Please add a name for the lead'],
        trim: true,
        maxlength: [50, 'Name can not be more than 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: false,
        match: [
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            'Please add a valid email'
        ]
    },
    phone: {
        type: String,
        maxlength: [20, 'Phone number can not be longer than 20 characters'],
        required: false
    },
    status: { // e.g., 'New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Follow-up'
        type: String,
        enum: ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted', 'Follow-up'],
        default: 'New'
    },
    source: { // e.g., 'Funnel Form', 'Manual', 'Import'
        type: String,
        required: [true, 'Please add a lead source'],
        default: 'Funnel Form'
    },
    notes: { // General notes about the lead
        type: String,
        maxlength: [500, 'Notes can not be more than 500 characters']
    },
    // --- NEW FIELDS FOR LEAD TEMPERATURE & FOLLOW-UPS ---
    leadTemperature: {
        type: String,
        enum: ['Cold', 'Warm', 'Hot'],
        default: 'Warm', // Default to Warm for new leads unless specified
        required: [true, 'Please specify lead temperature']
    },
    lastFollowUpAt: {
        type: Date,
        required: false // Not required initially
    },
    nextFollowUpAt: {
        type: Date,
        required: false // Not required initially
    },
    followUpHistory: [ // Array to store a log of follow-up interactions
        {
            note: {
                type: String,
                required: [true, 'Follow-up note is required.']
            },
            followUpDate: { // Date when this specific follow-up occurred
                type: Date,
                default: Date.now
            },
            createdBy: { // Who recorded this follow-up (e.g., Coach or Employee)
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User', // Assuming User model has Coaches/Employees
                required: false // Might be auto-generated sometimes
            }
        }
    ],
    assignedTo: { // If leads are assigned to specific employees/coaches
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Optional, can be assigned later
    }
}, {
    timestamps: true
});

LeadSchema.index({ coachId: 1, funnelId: 1, email: 1 });
LeadSchema.index({ coachId: 1, createdAt: -1 });
LeadSchema.index({ coachId: 1, leadTemperature: 1, nextFollowUpAt: 1 }); // For efficient follow-up reminders

module.exports = mongoose.model('Lead', LeadSchema);
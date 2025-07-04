// Example: D:\PRJ_YCT_Final\models\LandingPage.js

const mongoose = require('mongoose');

const landingPageSchema = new mongoose.Schema({
    // Verify or Add: Link to the coach who owns this landing page content
    coachId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Coach', // Use 'Coach' as per your Funnel schema
        required: true
    },
    // Add: Link this specific stage content document back to its parent funnel
    funnelId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Funnel',
        required: false // Set to true if a stage MUST always belong to a funnel
                        // Setting to false allows creating content independent of a funnel first
    },
    name: {
        type: String,
        required: [true, 'Landing page name is required'],
        trim: true
    },
    slug: {
        type: String,
        required: [true, 'Landing page slug is required'],
        unique: true,
        trim: true,
        lowercase: true
    },
    htmlContent: {
        type: String,
        default: ''
    },
    cssContent: {
        type: String,
        default: ''
    },
    gjsJson: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // ... (any other fields specific to LandingPage) ...
    status: {
        type: String,
        enum: ['draft', 'published', 'unpublished'],
        default: 'draft'
    }
}, {
    timestamps: true
});

// Ensure unique slugs per coach (useful for direct access to individual pages)
landingPageSchema.index({ coachId: 1, slug: 1 }, { unique: true });

const LandingPage = mongoose.models.LandingPage || mongoose.model('LandingPage', landingPageSchema);

module.exports = LandingPage;
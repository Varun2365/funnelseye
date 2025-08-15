const mongoose = require('mongoose');

const AdCampaignSchema = new mongoose.Schema({
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    campaignId: { type: String, required: true }, // Meta/Facebook campaign ID
    name: { type: String, required: true },
    status: { type: String, enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'DRAFT'], default: 'DRAFT' },
    objective: { type: String },
    budget: { type: Number },
    spend: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' },
    startDate: { type: Date },
    endDate: { type: Date },
    targeting: { type: mongoose.Schema.Types.Mixed }, // e.g., { age, gender, location, interests }
    results: { type: mongoose.Schema.Types.Mixed }, // e.g., { impressions, clicks, conversions }
    analytics: { type: mongoose.Schema.Types.Mixed }, // e.g., { cpc, ctr, cpm, roas }
    lastSynced: { type: Date },
    metaRaw: { type: mongoose.Schema.Types.Mixed }, // Store raw Meta API response if needed
}, { timestamps: true });

module.exports = mongoose.models.AdCampaign || mongoose.model('AdCampaign', AdCampaignSchema);

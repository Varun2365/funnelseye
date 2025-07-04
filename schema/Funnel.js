// D:\PRJ_YCT_Final\models\Funnel.js

const mongoose = require('mongoose');

const stageReferenceSchema = new mongoose.Schema({
    stageType: {
        type: String,
        required: true,
        // Ensure these enum values match the lowercase names of your Mongoose Models (e.g., 'landingpage' for LandingPage model)
         enum: ['LandingPage', 'Appointment', 'Thankyou', 'VSL', 'WACommunity']
    },
    stageSettingsId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'stages.stageType', // Dynamically references the model based on 'stageType'
    },
    order: {
        type: Number,
        required: true,
        min: 0,
    },
    stageName: {
        type: String,
        required: true,
        trim: true,
    },
    isEnabled: {
        type: Boolean,
        default: true,
    },
}, { _id: false });

const funnelSchema = new mongoose.Schema({
    coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach',
        required: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
        minlength: 3,
        maxlength: 100,
    },
    description: {
        type: String,
        required: false,
        trim: true,
        maxlength: 500,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    funnelUrl: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/^[\w\-\/]+$/, 'Please use a valid URL path segment (letters, numbers, hyphens, slashes).'],
    },
    stages: {
        type: [stageReferenceSchema], // Use the defined sub-schema
        default: [],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    lastUpdated: {
        type: Date,
        default: Date.now,
    },
});

// Indices for uniqueness and efficient queries
funnelSchema.index({ coachId: 1, name: 1 }, { unique: true });
funnelSchema.index({ coachId: 1, funnelUrl: 1 }, { unique: true });
funnelSchema.index({ _id: 1, "stages.order": 1 }, { unique: true, partialFilterExpression: { "stages.order": { $exists: true } } });
funnelSchema.index({ _id: 1, "stages.stageType": 1, "stages.stageSettingsId": 1 }, { unique: true, partialFilterExpression: { "stages.stageSettingsId": { $exists: true } } });


module.exports = mongoose.models.Funnel || mongoose.model('Funnel', funnelSchema);


// {
//     "_id": "60c72b2f9c1d4a001c8babcd",
//     "coachId": "60c72b2f9c1d4a001c8b1234", // A valid ObjectId for a 'Coach'
//     "name": "My First Fitness Funnel",
//     "description": "A funnel for fitness coaches to capture leads and book discovery calls.",
//     "isActive": true,
//     "funnelUrl": "fitness-funnel-alpha",
//     "stages": [
//         {
//             "stageType": "landingpage",
//             "stageSettingsId": "60c72b2f9c1d4a001c8b5555", // ObjectId of a LandingPage document
//             "order": 0,
//             "stageName": "Free Workout Guide Opt-in",
//             "isEnabled": true
//         },
//         {
//             "stageType": "thankyou",
//             "stageSettingsId": "60c72b2f9c1d4a001c8b6666", // ObjectId of a Thankyou document
//             "order": 1,
//             "stageName": "Thank You for Downloading",
//             "isEnabled": true
//         },
//         {
//             "stageType": "appointment",
//             "stageSettingsId": "60c72b2f9c1d4a001c8b7777", // ObjectId of an Appointment document
//             "order": 2,
//             "stageName": "Book Your Free Discovery Call",
//             "isEnabled": true
//         },
//         {
//             "stageType": "wacommunity",
//             "stageSettingsId": "60c72b2f9c1d4a001c8b8888", // ObjectId of a WACommunity document
//             "order": 3,
//             "stageName": "Join Our Private WhatsApp Group",
//             "isEnabled": true
//         }
//     ],
//     "createdAt": "2025-07-01T10:00:00.000Z",
//     "lastUpdated": "2025-07-02T11:15:00.000Z"
// }
// D:\PRJ_YCT_Final\models\Funnel.js

const mongoose = require('mongoose');

// 1. Sub-schema for basic SEO and social media information (Embedded within Stage)
const basicInfoSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        trim: true,
        default: '',
    },
    favicon: {
        type: String, // URL or path to favicon
        default: null,
    },
    keywords: {
        type: String,
        trim: true,
        default: '',
    },
    socialTitle: {
        type: String,
        trim: true,
        default: '',
    },
    socialImage: {
        type: String, // URL or path to social sharing image
        default: null,
    },
    socialDescription: {
        type: String,
        trim: true,
        default: '',
    },
    customHtmlHead: {
        type: String, // For custom scripts/meta tags in <head>
        default: '',
    },
    customHtmlBody: {
        type: String, // For custom scripts at the end of <body>
        default: '',
    },
}, { _id: false }); // No separate _id for this deeply embedded subdocument


// 2. Sub-schema for individual Funnel Stages (now including full page data)
const stageSchema = new mongoose.Schema({
    // MongoDB will assign an _id to each stage subdocument by default (since _id: false is not used)

    pageId: { // This is your custom, client-side identifier for the page within the funnel
        type: String,
        required: true,
        trim: true,
    },
    name: {
        type: String,
        required: true,
        trim: true,
    },
    type: { // e.g., "welcome-page", "custom-page", "opt-in-page", etc.
        type: String,
        required: true,
        trim: true,
        // Optional: You can add an enum here if stage types are fixed and known:
        // enum: ['welcome-page', 'opt-in-page', 'sales-page', 'thank-you-page', 'webinar-page', 'custom-page'],
    },
    selectedTemplateKey: {
        type: String,
        default: null, // Stores the key of the template used (e.g., "professional_blank")
    },
    html: {
        type: String,
        required: true,
        default: '', // Stores the full HTML content of the page
    },
    css: {
        type: String,
        required: true,
        default: '', // Stores the full CSS content of the page
    },
    js: {
        type: String,
        required: true,
        default: '', // Stores the full JavaScript content of the page
    },
    assets: {
        type: [String], // Array of asset URLs or identifiers
        default: [],
    },
    basicInfo: {
        type: basicInfoSchema, // Embed the basicInfoSchema here
        required: true,
        default: () => ({}), // Ensures basicInfo is always an object, even if empty
    },
    // If 'order' and 'isEnabled' are still needed for individual stages as part of the funnel flow:
    order: {
        type: Number,
        // required: true, // Make required if every stage MUST have an order
        min: 0,
    },
    isEnabled: {
        type: Boolean,
        default: true,
    },
});


// 3. Main Funnel Schema
const funnelSchema = new mongoose.Schema({
    coachId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coach', // Assuming you have a Coach model
        required: true,
        index: true // Index for efficient querying by coach
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
    funnelUrl: { // This likely corresponds to "Funnel Slug"
        type: String,
        required: true,
        unique: true, // Unique across all funnels
        trim: true,
        match: [/^[\w\-\/]+$/, 'Please use a valid URL path segment (letters, numbers, hyphens, slashes).'],
    },
    stages: {
        type: [stageSchema], // Array of the comprehensive stageSchema
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
}, {
    timestamps: true, // Automatically manage createdAt and updatedAt for the Funnel document
});

// Indices for uniqueness and efficient queries
// Ensure funnel name is unique per coach
funnelSchema.index({ coachId: 1, name: 1 }, { unique: true });
// Ensure funnelUrl is unique across all funnels (or per coach, depending on requirements)
// If funnelUrl should be unique PER COACH: funnelSchema.index({ coachId: 1, funnelUrl: 1 }, { unique: true });
// If funnelUrl should be globally unique (as implied by current `unique: true` above):
funnelSchema.index({ funnelUrl: 1 }, { unique: true }); 

// New compound index to ensure 'pageId' is unique within each funnel document
// This is critical since 'pageId' is a custom client-side identifier.
funnelSchema.index(
    { _id: 1, "stages.pageId": 1 },
    { unique: true, partialFilterExpression: { "stages.pageId": { $exists: true } } }
);

// If 'order' is put back into stageSchema and needs to be unique per funnel
funnelSchema.index(
    { _id: 1, "stages.order": 1 },
    { unique: true, partialFilterExpression: { "stages.order": { $exists: true } } }
);


module.exports = mongoose.models.Funnel || mongoose.model('Funnel', funnelSchema);

// {
//   "coachId": "66993a2b724f8d22d2f78e4d", // Replace with a valid ObjectId of an existing Coach
//   "name": "My AI-Powered Lead Gen Funnel",
//   "description": "A funnel designed to capture leads and guide them through a value sequence using AI-powered pages.",
//   "isActive": true,
//   "funnelUrl": "ai-lead-gen-mastery",
//   "stages": [
//     {
//       "pageId": "welcome-page-123",
//       "name": "AI Workshop Welcome",
//       "type": "welcome-page",
//       "selectedTemplateKey": "modern_lead_capture",
//       "html": "<body><div class=\"container\"><p>Welcome to our AI Mastery Workshop!</p></div></body>",
//       "css": ".container { padding: 20px; text-align: center; }",
//       "js": "console.log('Welcome page loaded!');",
//       "assets": [
//         "https://example.com/images/ai-hero.png",
//         "https://example.com/videos/intro-video.mp4"
//       ],
//       "basicInfo": {
//         "title": "AI Workshop - Enroll Now!",
//         "description": "Learn how AI can scale your coaching business.",
//         "favicon": null,
//         "keywords": "AI, coaching, workshop, lead generation",
//         "socialTitle": "Join the AI Revolution",
//         "socialImage": "https://example.com/social/ai-workshop.jpg",
//         "socialDescription": "Unlock the power of AI for your business."
//       },
//       "order": 0,
//       "isEnabled": true
//     },
//     {
//       "pageId": "vsl-page-456",
//       "name": "Value Series Video",
//       "type": "vsl-page",
//       "selectedTemplateKey": "vsl_template_default",
//       "html": "<body><div class=\"video-wrapper\"><iframe src=\"https://youtube.com/embed/yourvsl\" frameborder=\"0\"></iframe></div></body>",
//       "css": ".video-wrapper { max-width: 800px; margin: 0 auto; }",
//       "js": "console.log('VSL page loaded and tracking...');",
//       "assets": [],
//       "basicInfo": {
//         "title": "Watch the Full AI Blueprint Video",
//         "description": "Discover the 5-step AI blueprint for coaches.",
//         "favicon": null,
//         "keywords": "VSL, AI blueprint, business growth",
//         "socialTitle": "AI Blueprint for Coaches",
//         "socialImage": null,
//         "socialDescription": "Your guide to automated coaching success."
//       },
//       "order": 1,
//       "isEnabled": true
//     },
//     {
//       "pageId": "appointment-booking-789",
//       "name": "Book Your Strategy Call",
//       "type": "appointment-page",
//       "selectedTemplateKey": "booking_form_simple",
//       "html": "<body><div class=\"booking-form\"><p>Schedule your free AI strategy call.</p></div></body>",
//       "css": ".booking-form { padding: 30px; border: 1px solid #eee; }",
//       "js": "console.log('Booking form initialized.');",
//       "assets": [],
//       "basicInfo": {
//         "title": "Book a Free AI Strategy Call",
//         "description": "Connect with an expert to discuss your AI strategy.",
//         "favicon": null,
//         "keywords": "strategy call, AI consultation, coaching",
//         "socialTitle": "Free AI Consultation",
//         "socialImage": null,
//         "socialDescription": "Book your slot today!"
//       },
//       "order": 2,
//       "isEnabled": true
//     },
//     {
//       "pageId": "thank-you-page-101",
//       "name": "Thank You & Next Steps",
//       "type": "thankyou-page",
//       "selectedTemplateKey": "thankyou_basic",
//       "html": "<body><div class=\"thankyou-message\"><p>Thank you for booking! Check your email.</p></div></body>",
//       "css": ".thankyou-message { font-size: 1.2em; color: green; }",
//       "js": "console.log('Thank you page displayed.');",
//       "assets": [],
//       "basicInfo": {
//         "title": "Confirmation & Next Steps",
//         "description": "Your booking is confirmed. Details sent to your email.",
//         "favicon": null,
//         "keywords": "thank you, confirmation",
//         "socialTitle": "Booking Confirmed!",
//         "socialImage": null,
//         "socialDescription": "We look forward to speaking with you."
//       },
//       "order": 3,
//       "isEnabled": true
//     }
//   ],
//   "createdAt": "2025-07-19T10:00:00.000Z",
//   "lastUpdated": "2025-07-19T10:30:00.000Z"
// }
// // D:\PRJ_YCT_Final\models\Coach.js
// const mongoose = require('mongoose');

// // --- Sub-schema for Portfolio Details ---
// const portfolioSchema = new mongoose.Schema({
//     headline: { type: String, trim: true },
//     bio: { type: String, trim: true },
//     specializations: [{ name: { type: String, trim: true } }], // e.g., Strength Training, Nutrition Coaching
//     experienceYears: { type: Number, min: 0, default: 0 },
//     totalProjectsCompleted: { type: Number, min: 0, default: 0 },
//     profileImages: [{ url: { type: String, trim: true }, altText: { type: String, trim: true } }], // Store actual URLs, not null
//     gallery: [{ url: { type: String, trim: true }, caption: { type: String, trim: true } }], // For image/video gallery
//     testimonials: [{
//         text: { type: String, trim: true },
//         image: { type: String, trim: true }, // URL to testimonial giver's image
//         name: { type: String, trim: true },
//         rating: { type: Number, min: 1, max: 5 } // e.g., star rating
//     }],
//     partnerLogos: [{ name: { type: String, trim: true }, url: { type: String, trim: true } }], // Partner company logos
//     coachLogos: [{ name: { type: String, trim: true }, url: { type: String, trim: true } }], // Coach's own brand logos
//     certificationIcons: [{ name: { type: String, trim: true }, url: { type: String, trim: true } }], // URLs for certification images/icons
//     videoEmbedUrls: [{
//         ytUrl: { // Renamed from yturl for consistency, assumes YouTube embed
//             type: String,
//             trim: true,
//             match: [/^<iframe.*src="(https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/embed\/[^"]+)".*<\/iframe>$/, 'Please use a valid YouTube embed iframe.']
//         },
//         title: { type: String, trim: true } // Title for the embedded video
//     }],
//     customVideoUploads: [{
//         url: { type: String, trim: true },
//         thumbnailUrl: { type: String, trim: true },
//         title: { type: String, trim: true }
//     }],
//     trainingOfferings: [{ // Renamed from 'training' for clarity on what it represents
//         imageUrl: { type: String, trim: true }, // URL for pic
//         text: { type: String, trim: true } // Description of the training offering
//     }],
//     faqs: [{
//         id: { type: Number }, // Optional, could use _id
//         question: { type: String, trim: true },
//         answer: { type: String, trim: true }
//     }]
// }, { _id: false });

// // --- Sub-schema for Appointment Settings ---
// const appointmentSchema = new mongoose.Schema({
//     appointmentHeadline: { type: String, trim: true, default: 'Schedule a Call With Us' },
//     availableDays: [{
//         type: String,
//         enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
//     }],
//     availableFromTime: {
//         type: String, // e.g., '09:00', store as HH:MM
//         trim: true,
//         match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:MM format (e.g., 09:00).']
//     },
//     availableToTime: {
//         type: String, // e.g., '17:00'
//         trim: true,
//         match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:MM format (e.g., 17:00).']
//     },
//     slotDuration: {
//         type: Number, // in minutes, e.g., 30, 60
//         min: 1,
//         default: 30
//     },
//     timeZone: {
//         type: String, // e.g., 'Asia/Kolkata' (IANA format) or 'UTC+05:30' if simplified
//         trim: true,
//         default: 'UTC+05:30'
//     },
//     blockedDates: [{ // Specific dates the coach is unavailable
//         date: { type: Date, required: true },
//         reason: { type: String, trim: true }
//     }]
// }, { _id: false });


// // --- Main Coach Schema ---
// const coachSchema = new mongoose.Schema({
//     userId: { // If coaches are also users in your system
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'User',
//         required: true,
//         unique: true
//     },
//     name: {
//         type: String,
//         required: true,
//         trim: true
//     },
//     email: {
//         type: String,
//         required: true,
//         unique: true,
//         trim: true,
//         lowercase: true,
//         match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
//     },

//     // --- MLM Downline Field ---
//     // A reference to the coach who sponsored this coach.
//     // This forms the hierarchical relationship for the MLM tree.
//     sponsorId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: 'Coach',
//         default: null // The top-level coach will not have a sponsor
//     },

//     // Embedded Portfolio sub-document
//     portfolio: {
//         type: portfolioSchema,
//         default: {}
//     },
//     // Embedded Appointment Settings sub-document
//     appointmentSettings: {
//         type: appointmentSchema,
//         default: {}
//     },
//     // Other coach-specific fields could go here
// }, {
//     timestamps: true
// });

// module.exports = mongoose.model('Coach', coachSchema);

const mongoose = require('mongoose');
const User = require('./User'); // Import the base User model

// --- Sub-schema for Portfolio Details ---
const portfolioSchema = new mongoose.Schema({
    headline: { type: String, trim: true },
    bio: { type: String, trim: true },
    specializations: [{ name: { type: String, trim: true } }],
    experienceYears: { type: Number, min: 0, default: 0 },
    totalProjectsCompleted: { type: Number, min: 0, default: 0 },
    profileImages: [{ url: { type: String, trim: true }, altText: { type: String, trim: true } }],
    gallery: [{ url: { type: String, trim: true }, caption: { type: String, trim: true } }],
    testimonials: [{
        text: { type: String, trim: true },
        image: { type: String, trim: true },
        name: { type: String, trim: true },
        rating: { type: Number, min: 1, max: 5 }
    }],
    partnerLogos: [{ name: { type: String, trim: true }, url: { type: String, trim: true } }],
    coachLogos: [{ name: { type: String, trim: true }, url: { type: String, trim: true } }],
    certificationIcons: [{ name: { type: String, trim: true }, url: { type: String, trim: true } }],
    videoEmbedUrls: [{
        ytUrl: {
            type: String,
            trim: true,
            match: [/^<iframe.*src="(https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/embed\/[^"]+)".*<\/iframe>$/, 'Please use a valid YouTube embed iframe.']
        },
        title: { type: String, trim: true }
    }],
    customVideoUploads: [{
        url: { type: String, trim: true },
        thumbnailUrl: { type: String, trim: true },
        title: { type: String, trim: true }
    }],
    trainingOfferings: [{
        imageUrl: { type: String, trim: true },
        text: { type: String, trim: true }
    }],
    faqs: [{
        id: { type: Number },
        question: { type: String, trim: true },
        answer: { type: String, trim: true }
    }]
}, { _id: false });

// --- Sub-schema for Appointment Settings ---
const appointmentSchema = new mongoose.Schema({
    appointmentHeadline: { type: String, trim: true, default: 'Schedule a Call With Us' },
    availableDays: [{
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    }],
    availableFromTime: {
        type: String,
        trim: true,
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:MM format (e.g., 09:00).']
    },
    availableToTime: {
        type: String,
        trim: true,
        match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Please use HH:MM format (e.g., 17:00).']
    },
    slotDuration: {
        type: Number,
        min: 1,
        default: 30
    },
    timeZone: {
        type: String,
        trim: true,
        default: 'UTC+05:30'
    },
    blockedDates: [{
        date: { type: Date, required: true },
        reason: { type: String, trim: true }
    }]
}, { _id: false });

// --- Discriminator Schema for Coach ---
const Coach = User.discriminator('coach', new mongoose.Schema({
    sponsorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    portfolio: {
        type: portfolioSchema,
        default: {}
    },
    appointmentSettings: {
        type: appointmentSchema,
        default: {}
    },
}, { timestamps: true }));

module.exports = Coach;
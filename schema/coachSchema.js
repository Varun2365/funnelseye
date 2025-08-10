// D:\PRJ_YCT_Final\schema\coachSchema.js

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
        ref: 'User', // Reference the User model, as all users are in the same collection
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
    // --- Fields for WhatsApp Integration ---
    whatsApp: {
        useCentralAccount: {
            type: Boolean,
            default: true
        },
        phoneNumberId: {
            type: String,
            trim: true,
            default: null
        },
        whatsAppBusinessAccountId: {
            type: String,
            trim: true,
            default: null
        },
        whatsAppApiToken: {
            type: String,
            trim: true,
            default: null,
            select: false
        },
    },
    // ✅ ADDED: The new credits field for message-based billing
    credits: {
        type: Number,
        required: true,
        default: 100
    }
}, { timestamps: true }));

module.exports = Coach;
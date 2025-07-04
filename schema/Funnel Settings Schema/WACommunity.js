const mongoose = require('mongoose');

const whatsAppCommunitySettingsSchema = new mongoose.Schema({
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: true,
    unique: true,
  },
  isActive: { // Global switch to enable/disable this funnel page
    type: Boolean,
    default: true,
  },
  inviteLink: { // The essential WhatsApp Group or Community invite link
    type: String,
    required: true,
    trim: true,
    match: [/^(https?:\/\/)?(chat\.whatsapp\.com\/|wa\.me\/)/, 'Please use a valid WhatsApp invite link or wa.me link.'],
  },
  pageHeadline: { // The main title to grab attention on the redirect page
    type: String,
    required: true,
    trim: true,
    default: "Join Our Exclusive Community!",
  },
  callToActionText: { // Text for the button that users click
    type: String,
    required: true,
    trim: true,
    default: "Click to Join Now",
  },
  autoRedirect: { // If true, the page will redirect immediately to the inviteLink
    type: Boolean,
    default: false,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('WACommunity', whatsAppCommunitySettingsSchema);

// {
//   "_id": "60c72b2f9c1d4a001c8b7890", // Mongoose/MongoDB generated ID
//   "coachId": "60c72b2f9c1d4a001c8b1234", // Replace with an actual Coach ObjectId
//   "isActive": true,
//   "inviteLink": "https://chat.whatsapp.com/ABCDEFGHIJKLMNO", // Replace with your actual WhatsApp group/community link
//   "pageHeadline": "Join Our Exclusive Fitness Community!",
//   "callToActionText": "Click to Join Now",
//   "autoRedirect": false,
//   "lastUpdated": "2025-06-28T09:05:00.000Z", // Example timestamp for current date/time
//   "__v": 0
// }
const mongoose = require('mongoose');

const thankYouPageSettingsSchema = new mongoose.Schema({
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: true,
  },
  relatedActionType: {
    type: String,
    enum: ['AppointmentBooked', 'LeadMagnetDownloaded', 'FormSubmitted', 'PurchaseMade', 'Other'],
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  pageHeadline: {
    type: String,
    required: true,
    trim: true,
    default: "Thank You! Action Completed!",
  },
  pageSubheadline: {
    type: String,
    required: false,
    trim: true,
    default: "We appreciate your engagement. Here's what's next:",
  },
  bodyContent: {
    type: String,
    required: false,
    trim: true,
  },
  callToActions: { // Simplified: Removed 'type' field
    type: [{
      _id: false,
      text: {
        type: String,
        required: true,
        trim: true,
      },
      link: {
        type: String,
        required: true,
        trim: true,
        match: [/^(https?:\/\/[^\s$.?#].[^\s]*)$/, 'Please use a valid URL.'],
      },
    }],
    default: [],
  },
  socialMediaLinks: {
    type: [{
      _id: false,
      platform: {
        type: String,
        enum: ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'LinkedIn', 'Other'],
        required: true,
      },
      url: {
        type: String,
        required: true,
        trim: true,
        match: [/^(https?:\/\/[^\s$.?#].[^\s]*)$/, 'Please use a valid URL.'],
      },
    }],
    default: [],
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

thankYouPageSettingsSchema.index({ coachId: 1, relatedActionType: 1 }, { unique: true });

module.exports = mongoose.model('Thankyou', thankYouPageSettingsSchema);


// {
//   "_id": "60c72b2f9c1d4a001c8b9988", // MongoDB generated unique ID for this setting document
//   "coachId": "60c72b2f9c1d4a001c8b1234", // Replace with an actual Coach ObjectId
//   "relatedActionType": "AppointmentBooked", // This specific setting is for when an appointment is booked
//   "isActive": true,
//   "pageHeadline": "Your Discovery Call is Confirmed!",
//   "pageSubheadline": "We're excited to connect with you soon. Here's what's next:",
//   "bodyContent": "You'll receive a calendar invitation shortly with all the details for our upcoming call. In the meantime, feel free to explore our resources or connect with us on social media.",
//   "callToActions": [
//     {
//       "text": "Join Our Exclusive Facebook Group",
//       "link": "https://www.facebook.com/groups/coachfitnesscommunity"
//     },
//     {
//       "text": "Download Your Free Meal Prep Guide",
//       "link": "https://yourwebsite.com/freemealprep.pdf"
//     },
//     {
//       "text": "Visit My Website",
//       "link": "https://yourcoachwebsite.com"
//     }
//   ],
//   "socialMediaLinks": [
//     {
//       "platform": "Instagram",
//       "url": "https://www.instagram.com/yourcoachprofile"
//     },
//     {
//       "platform": "YouTube",
//       "url": "https://www.youtube.com/yourchannel"
//     }
//   ],
//   "lastUpdated": "2025-06-28T09:30:15.000Z", // Example timestamp
//   "__v": 0
// }
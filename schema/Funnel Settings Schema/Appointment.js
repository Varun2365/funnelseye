const mongoose = require('mongoose');

const appointmentSettingsSchema = new mongoose.Schema({
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coach',
    required: true,
    unique: true,
  },
  isBookingEnabled: { 
    type: Boolean,
    default: true,
  },
  generalAvailability: {
    type: [{
      dayOfWeek: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true,
      },
      isAvailable: {
        type: Boolean,
        default: true,
      },
      startTime: {
        type: String, // HH:MM format
        required: function() { return this.isAvailable; },
      },
      endTime: {
        type: String, // HH:MM format
        required: function() { return this.isAvailable; },
      },
    }],
    default: [],
  },
  appointmentTypes: {
    type: [{
      _id: false,
      name: {
        type: String,
        required: true,
        trim: true,
      },
      durationMinutes: {
        type: Number,
        required: true,
        min: 15,
      },
      isActive: {
        type: Boolean,
        default: true,
      },
    }],
    default: [],
  },
  bufferTimeMinutes: {
    type: Number,
    default: 0,
    min: 0,
  },
  minBookingNoticeHours: {
    type: Number,
    default: 12, // Adjusted default from 24 to 12 as per previous examples, if desired
    min: 0,
  },
  maxBookingAheadDays: {
    type: Number,
    default: 60,
    min: 1,
  },
  blackoutDates: {
    type: [Date],
    default: [],
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Appointment || mongoose.model('Appointment', appointmentSettingsSchema);


// {
//   "_id": "60c72b2f9c1d4a001c8b4567", // Mongoose/MongoDB generated ID
//   "coachId": "60c72b2f9c1d4a001c8b1234", // Replace with an actual Coach ObjectId
//   "isBookingEnabled": true, // New field: Set to true if the coach is open for bookings
//   "generalAvailability": [
//     {
//       "dayOfWeek": "Monday",
//       "isAvailable": true,
//       "startTime": "09:00",
//       "endTime": "17:00"
//     },
//     {
//       "dayOfWeek": "Tuesday",
//       "isAvailable": true,
//       "startTime": "09:00",
//       "endTime": "17:00"
//     },
//     {
//       "dayOfWeek": "Wednesday",
//       "isAvailable": false,
//       "startTime": "",
//       "endTime": ""
//     },
//     {
//       "dayOfWeek": "Thursday",
//       "isAvailable": true,
//       "startTime": "10:00",
//       "endTime": "18:00"
//     },
//     {
//       "dayOfWeek": "Friday",
//       "isAvailable": true,
//       "startTime": "09:00",
//       "endTime": "16:00"
//     },
//     {
//       "dayOfWeek": "Saturday",
//       "isAvailable": true,
//       "startTime": "10:00",
//       "endTime": "14:00"
//     },
//     {
//       "dayOfWeek": "Sunday",
//       "isAvailable": false,
//       "startTime": "",
//       "endTime": ""
//     }
//   ],
//   "appointmentTypes": [
//     {
//       "name": "Discovery Call",
//       "durationMinutes": 30,
//       "isActive": true
//     },
//     {
//       "name": "1-on-1 Coaching Session",
//       "durationMinutes": 60,
//       "isActive": true
//     },
//     {
//       "name": "Quick Check-in",
//       "durationMinutes": 15,
//       "isActive": false
//     }
//   ],
//   "bufferTimeMinutes": 15,
//   "minBookingNoticeHours": 12,
//   "maxBookingAheadDays": 60,
//   "blackoutDates": [
//     "2025-12-25T00:00:00.000Z",
//     "2026-01-01T00:00:00.000Z",
//     "2025-07-15T00:00:00.000Z"
//   ],
//   "lastUpdated": "2025-06-28T08:42:35.000Z",
//   "__v": 0
// }
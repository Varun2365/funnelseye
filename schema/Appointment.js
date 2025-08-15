// D:\PRJ_YCT_Final\models\Appointment.js

const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  coachId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Assuming your User model holds the coach data
    required: true,
  },
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number, // in minutes
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
  },
  timeZone: {
    type: String,
    required: true,
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt fields automatically
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
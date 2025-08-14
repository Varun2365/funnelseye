// D:\PRJ_YCT_Final\routes\dailyPriorityFeedRoutes.js

const express = require('express');
const { getDailyPriorityFeed } = require('../controllers/dailyPriorityFeedController');
const { 
    getCoachAvailability, 
    setCoachAvailability, 
    getAvailableSlots, 
    bookAppointment, 
    getCoachCalendar 
} = require('../controllers/coachAvailabilityController');
const { 
    initiateBookingRecovery, 
    cancelBookingRecovery 
} = require('../controllers/bookingRecoveryController'); // <-- NEW: Import booking recovery controller
const { protect, authorizeCoach } = require('../middleware/auth');
const { updateLastActive } = require('../middleware/activityMiddleware');

const router = express.Router();

// --- Main Coach & Feed Routes ---
router.get('/daily-feed', protect, updateLastActive, authorizeCoach('coach', 'admin'), getDailyPriorityFeed);

// --- Coach Availability & Calendar Routes ---
router.get('/:coachId/availability', getCoachAvailability);
router.post('/availability', protect, updateLastActive, authorizeCoach('coach', 'admin'), setCoachAvailability);
router.get('/:coachId/available-slots', getAvailableSlots);
router.post('/:coachId/book', bookAppointment);
router.get('/:coachId/calendar', getCoachCalendar);

// --- NEW: Booking Recovery Routes ---
// @desc    Initiate a booking recovery session when a user visits the booking page
// @route   POST /api/coach/booking-recovery/initiate
// @access  Public
router.post('/booking-recovery/initiate', initiateBookingRecovery);

// @desc    Cancel the recovery session upon successful booking
// @route   POST /api/coach/booking-recovery/cancel
// @access  Public
router.post('/booking-recovery/cancel', cancelBookingRecovery);

module.exports = router;
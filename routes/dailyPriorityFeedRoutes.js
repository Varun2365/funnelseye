// D:\PRJ_YCT_Final\routes\dailyPriorityFeedRoutes.js

const express = require('express');
const { getDailyPriorityFeed } = require('../controllers/dailyPriorityFeedController');
const { getCoachAvailability, setCoachAvailability, getAvailableSlots, bookAppointment, getCoachCalendar } = require('../controllers/coachAvailabilityController');
const { protect, authorizeCoach } = require('../middleware/auth');

const router = express.Router();

// Existing Daily Priority Feed route
router.get('/daily-feed', protect, authorizeCoach('coach', 'admin'), getDailyPriorityFeed);

// --- Coach Availability & Calendar Routes ---
// @desc    Get a coach's availability (public endpoint for the booking page)
// @route   GET /api/coach/:coachId/availability
// @access  Public
router.get('/:coachId/availability', getCoachAvailability);

// @desc    Set or update the authenticated coach's availability
// @route   POST /api/coach/availability
// @access  Private (Coach)
router.post('/availability', protect, authorizeCoach('coach', 'admin'), setCoachAvailability);

// @desc    Calculate and return available booking slots for a coach
// @route   GET /api/coach/:coachId/available-slots
// @access  Public
router.get('/:coachId/available-slots', getAvailableSlots);

// @desc    Book an appointment for a coach
// @route   POST /api/coach/:coachId/book
// @access  Public (No authentication needed for the lead)
router.post('/:coachId/book', bookAppointment);
// @desc    Get a full calendar view for a coach
// @route   GET /api/coach/:coachId/calendar
// @access  Public (or Private with protect middleware)
router.get('/:coachId/calendar', getCoachCalendar);
module.exports = router;
// D:\PRJ_YCT_Final\routes\dailyPriorityFeedRoutes.js

const express = require('express');
const { getDailyPriorityFeed } = require('../controllers/dailyPriorityFeedController');
// Import both protect and authorizeCoach from your authMiddleware
const { protect, authorizeCoach } = require('../middleware/auth');

const router = express.Router();

// Route to get the daily priority feed for the authenticated coach
// This route requires:
// 1. 'protect': To ensure the user is authenticated and set req.user, req.coachId, req.role
// 2. 'authorizeCoach('coach', 'admin')': To ensure only users with 'coach' or 'admin' roles can access
//    (You can adjust the allowed roles as per your application's logic. 'admin' is often included for management purposes.)
router.get('/daily-feed', protect, authorizeCoach('coach', 'admin'), getDailyPriorityFeed);

module.exports = router;
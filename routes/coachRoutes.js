// D:\\PRJ_YCT_Final\\routes\\coachRoutes.js

const express = require('express');
const router = express.Router();
const { updateCoachProfile } = require('../controllers/coachController');

const { protect, authorizeCoach } = require('../middleware/auth'); // Import auth middleware
const { updateLastActive } = require('../middleware/activityMiddleware'); // Your new middleware

// Use router.use() to apply authentication and activity tracking middleware
// to ALL subsequent routes in this file.
router.use(protect, updateLastActive);


// Route 1: Update a coach's portfolio information
// The 'protect' middleware is now handled by router.use()
// Method: PUT
// Endpoint: /api/v1/coach/:id/profile
router.put('/:id/profile', authorizeCoach('coach'), updateCoachProfile);

module.exports = router;
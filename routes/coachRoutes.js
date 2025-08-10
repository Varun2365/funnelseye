// D:\PRJ_YCT_Final\routes\coachRoutes.js

const express = require('express');
const router = express.Router();
const { updateCoachProfile, addCredits } = require('../controllers/coachController');

const { protect, authorizeCoach } = require('../middleware/auth');
const { updateLastActive } = require('../middleware/activityMiddleware');

// Apply middleware to all routes in this file
router.use(protect, updateLastActive);


// Route 1: Update a coach's portfolio information
// Method: PUT
router.put('/:id/profile', authorizeCoach('coach'), updateCoachProfile);


// Route 2: Add credits to a coach's account
// A coach can add credits to their own account. An admin can add credits to any account.
// Method: POST
router.post('/add-credits/:id', addCredits);


module.exports = router;
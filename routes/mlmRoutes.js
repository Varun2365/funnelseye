// D:\\PRJ_YCT_Final\\routes\\mlmRoutes.js

const express = require('express');
const router = express.Router();
const { addDownline, getDownline, getDownlineHierarchy } = require('../controllers/mlmController');
const { protect, authorizeCoach } = require('../middleware/auth');
const { updateLastActive } = require('../middleware/activityMiddleware');

// Route 1: Add a new coach to a sponsor's downline (Private)
// This route requires authentication and will update the lastActiveAt timestamp
router.post('/downline', protect, updateLastActive, authorizeCoach('coach'), addDownline);

// Route 2: Get the direct downline for a specific sponsor (Public)
// This route is now public and does not require a token
router.get('/downline/:sponsorId', getDownline);

// Route 3: Get the entire nested downline hierarchy for a specific coach (Public)
// This route is now public and does not require a token
router.get('/hierarchy/:coachId', getDownlineHierarchy);

module.exports = router;
// D:\\PRJ_YCT_Final\\routes\\funnelRoutes.js

const express = require('express');
const router = express.Router();
const funnelController = require('../controllers/funnelController');
const { protect, authorizeCoach } = require('../middleware/auth');
const { updateLastActive } = require('../middleware/activityMiddleware'); // Your new middleware
const { getFunnelAnalytics } = require('../controllers/analyticsController');

// --- Public Routes (Must be defined BEFORE router.use()) ---
// Track a funnel event (no changes needed here as it deals with FunnelEvent schema)
router.post('/track', funnelController.trackFunnelEvent);

// --- Apply authentication and activity tracking to all routes below this line ---
router.use(protect, updateLastActive);

// Route to get all funnels for a specific coach
router.get('/coach/:coachId/funnels', authorizeCoach(), funnelController.getFunnelsByCoachId);

// Route to get a specific funnel by ID
router.get('/coach/:coachId/funnels/:funnelId', authorizeCoach(), funnelController.getFunnelById);

// Route to create a new funnel
router.post('/coach/:coachId/funnels', authorizeCoach(), funnelController.createFunnel);

// Route to update an existing funnel
router.put('/coach/:coachId/funnels/:funnelId', authorizeCoach(), funnelController.updateFunnel);

// Route to delete a funnel
router.delete('/coach/:coachId/funnels/:funnelId', authorizeCoach(), funnelController.deleteFunnel);


// Route to add a new stage to a funnel
router.post(
    '/:funnelId/stages',
    authorizeCoach(),
    funnelController.addStageToFunnel
);

// PUT /api/funnels/:funnelId/stages/:stageId
router.put(
    '/:funnelId/stages/:stageId',
    authorizeCoach(),
    funnelController.editFunnelStage
);

// Get analytics for a specific funnel
router.get('/:funnelId/analytics', authorizeCoach(), getFunnelAnalytics);

module.exports = router;
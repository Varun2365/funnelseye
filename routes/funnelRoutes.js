// D:\PRJ_YCT_Final\routes\funnelRoutes.js

const express = require('express');
const router = express.Router();
const funnelController = require('../controllers/funnelController');
const { protect, authorizeCoach } = require('../middleware/auth');
const { getFunnelAnalytics } = require('../controllers/analyticsController');

// All existing routes remain largely the same in their definitions.
// The key change is how `stageSettingsId` parameter is interpreted/used.

// Route to get all funnels for a specific coach
router.get('/coach/:coachId/funnels', protect, authorizeCoach(), funnelController.getFunnelsByCoachId);

// Route to get a specific funnel by ID
router.get('/coach/:coachId/funnels/:funnelId', protect, authorizeCoach(), funnelController.getFunnelById);

// Route to create a new funnel
router.post('/coach/:coachId/funnels', protect, authorizeCoach(), funnelController.createFunnel);

// Route to update an existing funnel
router.put('/coach/:coachId/funnels/:funnelId', protect, authorizeCoach(), funnelController.updateFunnel);

// Route to delete a funnel
router.delete('/coach/:coachId/funnels/:funnelId', protect, authorizeCoach(), funnelController.deleteFunnel);

// Route to get funnel stages by type
// This route will now filter the embedded stages directly
router.get(
    '/coach/:coachId/funnels/:funnelId/stages/:stageType',
    protect,
    authorizeCoach(),
    funnelController.getFunnelStagesByType
);

// Route to add a new stage to a funnel
// This expects the FULL stage object in the request body
router.post(
    '/:funnelId/stages',
    protect,
    authorizeCoach(),
    funnelController.addStageToFunnel
);

// PUT /api/funnels/:funnelId/stages/:stageId
// Edits properties (name, order, isEnabled, HTML, CSS, etc.) of a stage WITHIN the funnel.
// `:stageId` here refers to the MongoDB `_id` of the embedded stage subdocument.
router.put(
    '/:funnelId/stages/:stageId', // Changed from `:stageSettingsId` to `:stageId` for clarity
    protect,
    authorizeCoach(),
    funnelController.editFunnelStage
);

// Track a funnel event (no changes needed here as it deals with FunnelEvent schema)
router.post('/track', funnelController.trackFunnelEvent);

// Get analytics for a specific funnel (no changes to this route definition)
router.get('/:funnelId/analytics', protect, authorizeCoach(), getFunnelAnalytics);

module.exports = router;
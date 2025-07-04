// D:\PRJ_YCT_Final\routes\funnels.js

const express = require('express');
const router = express.Router();
const funnelController = require('../controllers/funnelController'); // Import the controller
const { protect, authorizeCoach } = require('../middleware/auth'); // Import your auth middleware
const { getFunnelAnalytics } = require('../controllers/analyticsController');
// Route to get all funnels for a specific coach
// GET /api/coach/:coachId/funnels
// Params: URL -> :coachId
// Middleware adds: req.coachId (authenticated user ID), req.role (authenticated user role)
router.get('/coach/:coachId/funnels', protect, authorizeCoach(), funnelController.getFunnelsByCoachId);

// Route to get a specific funnel by ID
// GET /api/coach/:coachId/funnels/:funnelId
// Params: URL -> :coachId, :funnelId
// Middleware adds: req.coachId, req.role
router.get('/coach/:coachId/funnels/:funnelId', protect, authorizeCoach(), funnelController.getFunnelById);

// Route to create a new funnel
// POST /api/coach/:coachId/funnels
// Params: URL -> :coachId
// Body: JSON object with funnel details (e.g., name, description, stages)
// Middleware adds: req.coachId, req.role
router.post('/coach/:coachId/funnels', protect, authorizeCoach(), funnelController.createFunnel);

// Route to update an existing funnel
// PUT /api/coach/:coachId/funnels/:funnelId
// Params: URL -> :coachId, :funnelId
// Body: JSON object with fields to update (e.g., name, description)
// Middleware adds: req.coachId, req.role
router.put('/coach/:coachId/funnels/:funnelId', protect, authorizeCoach(), funnelController.updateFunnel);

// Route to delete a funnel
// DELETE /api/coach/:coachId/funnels/:funnelId
// Params: URL -> :coachId, :funnelId
// Middleware adds: req.coachId, req.role
router.delete('/coach/:coachId/funnels/:funnelId', protect, authorizeCoach(), funnelController.deleteFunnel);


router.get(
    '/coach/:coachId/funnels/:funnelId/stages/:stageType',
    protect,
    authorizeCoach(),
    funnelController.getFunnelStagesByType
);


router.post(
    '/:funnelId/stages',
    protect,        // Ensures user is authenticated
    authorizeCoach(),
    funnelController.addStageToFunnel
);

// PUT /api/funnels/:funnelId/stages/:stageSettingsId
// Edits properties (name, order, isEnabled) of a stage WITHIN the funnel's sequence.
router.put(
    '/:funnelId/stages/:stageSettingsId',
    protect,
    authorizeCoach(),
    funnelController.editFunnelStage
);

// @desc    Track a funnel event
// @route   POST /api/funnels/track
// @access  Public (no authentication needed as guest users will also generate events)
router.post('/track', funnelController.trackFunnelEvent); 

// @desc    Get analytics for a specific funnel
// @route   GET /api/funnels/:funnelId/analytics
// @access  Private (only authorized coaches can view their funnel analytics)
router.get('/:funnelId/analytics', protect, authorizeCoach(), getFunnelAnalytics);

module.exports = router;
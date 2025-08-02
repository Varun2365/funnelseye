// D:\PRJ_YCT_Final\routes\leads.js

const express = require('express');
const {
    createLead,
    getLeads,
    getLead,
    updateLead,
    addFollowUpNote,
    getUpcomingFollowUps,
    deleteLead
} = require('../controllers/leadController');

const { protect, authorizeCoach } = require('../middleware/auth');

const router = express.Router();

// --- Public Route for creating a Lead ---
// This route is placed before the authentication middleware.
// Anyone can post to this endpoint without a token.
router.route('/').post(createLead);

// --- All Subsequent Routes require Authentication ---
// All routes below this line will be protected.
router.use(protect, authorizeCoach());

// GET /api/leads - Get All Leads (supports query filters)
router.route('/').get(getLeads);

// GET /api/leads/:id - Get Single Lead
// PUT /api/leads/:id - Update Lead
// DELETE /api/leads/:id - Delete Lead
router.route('/:id')
    .get(getLead)
    .put(updateLead)
    .delete(deleteLead);

// POST /api/leads/:id/followup - Add Follow-up Note
router.route('/:id/followup')
    .post(addFollowUpNote);

// GET /api/leads/followups/upcoming - Get Upcoming Follow-ups
router.route('/followups/upcoming')
    .get(getUpcomingFollowUps);

module.exports = router;
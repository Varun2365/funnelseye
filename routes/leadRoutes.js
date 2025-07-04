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

// All lead routes in this file require authentication and coach authorization
router.use(protect);
router.use(authorizeCoach());

// --- Core Lead Management Routes ---

// POST /api/leads - Create New Lead
//   Body: { name, email, funnelId, etc. }
// GET /api/leads - Get All Leads (supports query filters for status, temperature, dates, pagination)
//   Query: ?status=New&temperature=Hot&page=1&limit=10&sortBy=-createdAt
router.route('/')
    .post(createLead)
    .get(getLeads);

// GET /api/leads/:id - Get Single Lead
//   Param: id (Lead ObjectId)
// PUT /api/leads/:id - Update Lead
//   Param: id (Lead ObjectId)
//   Body: { name?, email?, status?, leadTemperature?, nextFollowUpAt?, etc. }
// DELETE /api/leads/:id - Delete Lead
//   Param: id (Lead ObjectId)
router.route('/:id')
    .get(getLead)
    .put(updateLead)
    .delete(deleteLead);

// --- Lead Follow-up Specific Routes ---

// POST /api/leads/:id/followup - Add Follow-up Note
//   Param: id (Lead ObjectId)
//   Body: { note: "...", nextFollowUpAt?: "Date" }
router.route('/:id/followup')
    .post(addFollowUpNote);

// GET /api/leads/followups/upcoming - Get Upcoming Follow-ups
//   Query: ?days=number (default 7)&includeOverdue=boolean (default false)
router.route('/followups/upcoming')
    .get(getUpcomingFollowUps);

module.exports = router;
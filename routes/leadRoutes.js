// D:\\PRJ_YCT_Final\\routes\\leads.js

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
const { updateLastActive } = require('../middleware/activityMiddleware');

const router = express.Router();

// --- Public Route for creating a Lead ---
router.route('/').post(createLead);

// --- All Subsequent Routes require Authentication ---
router.use(protect, updateLastActive, authorizeCoach());

router.route('/').get(getLeads);
router.route('/:id')
    .get(getLead)
    .put(updateLead)
    .delete(deleteLead);
router.route('/:id/followup')
    .post(addFollowUpNote);
router.route('/followups/upcoming')
    .get(getUpcomingFollowUps);

module.exports = router;
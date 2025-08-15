// D:\\PRJ_YCT_Final\\routes\\leads.js

const express = require('express');
const {
    createLead,
    getLeads,
    getLead,
    updateLead,
    addFollowUpNote,
    getUpcomingFollowUps,
    deleteLead,
    assignNurturingSequence,
    advanceNurturingStep,
    getNurturingProgress
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
// AI rescore endpoint (protected)
router.post('/:id/ai-rescore', require('../controllers/leadController').aiRescore);
router.route('/:id/followup')
    .post(addFollowUpNote);
router.route('/followups/upcoming')
    .get(getUpcomingFollowUps);
// Assign a nurturing sequence to a lead
router.post('/assign-nurturing-sequence', assignNurturingSequence);
// Advance a lead to the next nurturing step
router.post('/advance-nurturing-step', advanceNurturingStep);
// Get nurturing sequence progress for a lead
router.get('/:leadId/nurturing-progress', getNurturingProgress);

module.exports = router;
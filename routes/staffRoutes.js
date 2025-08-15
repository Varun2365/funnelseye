const express = require('express');
const router = express.Router();
const { protect, authorizeCoach } = require('../middleware/auth');
const { updateLastActive } = require('../middleware/activityMiddleware');
const { createStaff, listStaff, updateStaff, deactivateStaff } = require('../controllers/staffController');

// All staff routes are protected; coach/admin/staff access as applicable
router.use(protect, updateLastActive);

// Create and list staff
router.post('/', authorizeCoach('coach','admin','super_admin'), createStaff);
router.get('/', authorizeCoach('coach','admin','super_admin'), listStaff);

// Update and deactivate staff
router.put('/:id', authorizeCoach('coach','admin','super_admin'), updateStaff);
router.delete('/:id', authorizeCoach('coach','admin','super_admin'), deactivateStaff);

module.exports = router;



// D:\\PRJ_YCT_Final\\routes\\automationRuleRoutes.js

const express = require('express');
const router = express.Router();
const { createAutomationRule } = require('../controllers/automationRuleController');

// Assuming you have an authentication middleware to protect routes
const {protect} = require('../middleware/auth'); // Adjust path as per your project structure
const { updateLastActive } = require('../middleware/activityMiddleware'); // Your new middleware

// Use router.use() to apply both the authentication and activity tracking middleware
// to ALL subsequent routes in this file.
router.use(protect, updateLastActive);


// Route to create a new automation rule
// This route is now protected, and it will update the user's lastActiveAt timestamp
router.post('/', createAutomationRule);

// You would add more routes here for GET, PUT, DELETE operations later:
// router.get('/', getAutomationRules);
// router.get('/:id', getAutomationRule);
// router.put('/:id', updateAutomationRule);
// router.delete('/:id', deleteAutomationRule);

module.exports = router;
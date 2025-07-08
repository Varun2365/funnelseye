// D:\PRJ_YCT_Final\routes\automationRuleRoutes.js

const express = require('express');
const router = express.Router();
const { createAutomationRule } = require('../controllers/automationRuleController');

// Assuming you have an authentication middleware to protect routes
const {protect} = require('../middleware/auth'); // Adjust path as per your project structure

// Route to create a new automation rule
// This route is protected, meaning only authenticated users (coaches/admins) can create rules
router.post('/', protect, createAutomationRule);

// You would add more routes here for GET, PUT, DELETE operations later:
// router.get('/', protect, getAutomationRules);
// router.get('/:id', protect, getAutomationRule);
// router.put('/:id', protect, updateAutomationRule);
// router.delete('/:id', protect, deleteAutomationRule);

module.exports = router;
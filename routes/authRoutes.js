const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController'); // Import the auth controller
const { protect } = require('../middleware/auth'); // Import 'protect' middleware

// --- Public Routes (No authentication required) ---

// Signup route: Register a new user and send OTP for verification
// POST /api/auth/signup
// Required Body Fields: { "name": "string", "email": "string", "password": "string", "role": "string" }
router.post('/signup', authController.signup);

// Verify OTP route: Confirm user's email with OTP
// POST /api/auth/verify-otp
// Required Body Fields: { "email": "string", "otp": "string" }
router.post('/verify-otp', authController.verifyOtp);

// Login route: Authenticate user and issue JWT
// POST /api/auth/login
// Required Body Fields: { "email": "string", "password": "string" }
router.post('/login', authController.login);


// --- Private Routes (Authentication required via JWT) ---

// Get current logged-in user's details
// GET /api/auth/me
// Required Body Fields: None (relies on JWT sent in Authorization header)
router.get('/me', protect, authController.getMe);

// Log out user / Clear token cookie
// GET /api/auth/logout
// Required Body Fields: None (relies on JWT sent in Authorization header, primarily clears server-set cookie)
router.get('/logout', protect, authController.logout);


module.exports = router;
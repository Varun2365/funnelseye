// D:\PRJ_YCT_Final\routes\paymentRoutes.js

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

/**
 * @route POST /api/payments/receive
 * @description Listens for a payment webhook and processes the payment.
 * @access Public (This endpoint must be accessible by your payment gateway)
 */
router.post('/receive', paymentController.handlePaymentWebhook);

module.exports = router;
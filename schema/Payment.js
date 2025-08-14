// D:\PRJ_YCT_Final\schema\Payment.js

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const paymentSchema = new Schema({
    // Unique identifier for the payment
    paymentId: {
        type: String,
        required: true,
        unique: true
    },
    
    // Reference to the lead or customer associated with the payment
    lead: {
        type: Schema.Types.ObjectId,
        ref: 'Lead',
        required: true
    },
    
    // Reference to the coach who may receive a commission or is related to the sale
    coach: {
        type: Schema.Types.ObjectId,
        ref: 'Coach',
        required: false // A payment might not always be directly tied to a coach
    },
    
    // The amount of the payment
    amount: {
        type: Number,
        required: true
    },
    
    // The currency of the payment (e.g., 'USD', 'EUR')
    currency: {
        type: String,
        required: true,
        enum: ['USD', 'INR', 'EUR', 'GBP'],
        default: 'USD'
    },
    
    // Status of the payment
    status: {
        type: String,
        required: true,
        enum: ['pending', 'successful', 'failed', 'refunded', 'abandoned'],
        default: 'pending'
    },
    
    // Method used for the payment (e.g., 'card', 'paypal', 'bank_transfer')
    paymentMethod: {
        type: String,
        required: false
    },
    
    // Details from the payment gateway (e.g., Stripe, Razorpay)
    gatewayResponse: {
        type: Object, // Store the full response object from the gateway
        required: false
    },
    
    // Optional description of the item or service being paid for
    description: {
        type: String,
        required: false
    },

    // Dates for tracking the lifecycle of the payment
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the `updatedAt` field on save
paymentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
const mongoose = require('mongoose');
const User = require('./User');

// Staff model extends User discriminator with linkage to owning coach and permissions
const Staff = User.discriminator('staff', new mongoose.Schema({
	coachId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User', // coach user
		required: true,
		index: true
	},
	permissions: {
		type: [String],
		default: [], // e.g., ['leads:read', 'leads:update', 'calendar:manage']
	},
	isActive: {
		type: Boolean,
		default: true
	}
}, { timestamps: true }));

module.exports = Staff;

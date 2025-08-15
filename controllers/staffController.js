const Staff = require('../schema/Staff');
const User = require('../schema/User');

// Helpers
function ensureCoachScopeOrAdmin(req, staffDoc) {
	if (req.role === 'admin' || req.role === 'super_admin') return true;
	if (!staffDoc || String(staffDoc.coachId) !== String(req.coachId)) {
		const err = new Error('Forbidden');
		err.statusCode = 403;
		throw err;
	}
	return true;
}

// POST /api/staff
// Create a staff member under the authenticated coach (or specified coachId for admins)
exports.createStaff = async (req, res) => {
	try {
		if (!['coach', 'admin', 'super_admin'].includes(req.role)) {
			return res.status(403).json({ success: false, message: 'Only coach/admin can create staff.' });
		}
		const { name, email, password, permissions, coachId: bodyCoachId } = req.body;
		if (!name || !email || !password) {
			return res.status(400).json({ success: false, message: 'name, email, password are required.' });
		}
		const coachId = (req.role === 'coach') ? req.coachId : (bodyCoachId || req.coachId);
		if (!coachId) {
			return res.status(400).json({ success: false, message: 'coachId is required for admin.' });
		}

		const existing = await User.findOne({ email });
		if (existing) {
			return res.status(409).json({ success: false, message: 'Email already in use.' });
		}

		const staff = await Staff.create({ name, email, password, permissions: permissions || [], coachId });
		const safe = staff.toObject();
		delete safe.password;
		return res.status(201).json({ success: true, data: safe });
	} catch (err) {
		console.error('createStaff error:', err.message);
		return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server Error' });
	}
};

// GET /api/staff
// List staff for the authenticated coach (admin can pass coachId query)
exports.listStaff = async (req, res) => {
	try {
		const filterCoachId = (req.role === 'admin' || req.role === 'super_admin') && req.query.coachId ? req.query.coachId : req.coachId;
		const staff = await Staff.find({ coachId: filterCoachId }).select('-password');
		return res.status(200).json({ success: true, count: staff.length, data: staff });
	} catch (err) {
		console.error('listStaff error:', err.message);
		return res.status(500).json({ success: false, message: 'Server Error' });
	}
};

// PUT /api/staff/:id
// Update staff (name, permissions, isActive)
exports.updateStaff = async (req, res) => {
	try {
		const staff = await Staff.findById(req.params.id);
		if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
		ensureCoachScopeOrAdmin(req, staff);

		const updates = {};
		const allowed = ['name', 'permissions', 'isActive'];
		for (const key of allowed) if (req.body[key] !== undefined) updates[key] = req.body[key];

		const updated = await Staff.findByIdAndUpdate(staff._id, { $set: updates }, { new: true }).select('-password');
		return res.status(200).json({ success: true, data: updated });
	} catch (err) {
		console.error('updateStaff error:', err.message);
		return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server Error' });
	}
};

// DELETE /api/staff/:id
// Deactivate staff (soft delete)
exports.deactivateStaff = async (req, res) => {
	try {
		const staff = await Staff.findById(req.params.id);
		if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
		ensureCoachScopeOrAdmin(req, staff);

		staff.isActive = false;
		await staff.save();
		return res.status(200).json({ success: true, message: 'Staff deactivated.' });
	} catch (err) {
		console.error('deactivateStaff error:', err.message);
		return res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Server Error' });
	}
};



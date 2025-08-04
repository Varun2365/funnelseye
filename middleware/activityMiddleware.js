// D:\\PRJ_YCT_Final\\middleware\\activityMiddleware.js

const User = require('../schema/User'); // Import the base User model

exports.updateLastActive = async (req, res, next) => {
    // This assumes your authentication middleware sets the user's ID on req.user.id
    if (req.user && req.user.id) {
        try {
            await User.findByIdAndUpdate(req.user.id, { lastActiveAt: Date.now() });
        } catch (err) {
            console.error('Error updating last active timestamp:', err.message);
        }
    }
    next();
};
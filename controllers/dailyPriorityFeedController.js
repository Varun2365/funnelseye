// D:\PRJ_YCT_Final\controllers\dailyPriorityFeedController.js

const asyncHandler = require('../middleware/async');
const { generateDailyPriorityFeed } = require('../services/dailyPriorityFeedService'); // Import the service

// @desc    Get the daily priority feed for the authenticated coach
// @route   GET /api/coach/daily-feed
// @access  Private (Coaches/Admins)
const getDailyPriorityFeed = asyncHandler(async (req, res) => {
    // The coachId is derived from the authenticated user.
    // Your authentication middleware should attach the user object (req.user)
    // including their ID (req.user.id) and role.
    const coachId = req.user.id;

    // Basic validation: ensure a user ID is present
    if (!coachId) {
        return res.status(401).json({ success: false, message: 'Authentication required: User ID not found.' });
    }

    console.log(`[DailyPriorityFeedController] Request to get daily feed for coachId: ${coachId}`);

    // Call the service to generate the prioritized feed items
    const feed = await generateDailyPriorityFeed(coachId);

    res.status(200).json({
        success: true,
        count: feed.length,
        data: feed
    });
});

module.exports = {
    getDailyPriorityFeed
};
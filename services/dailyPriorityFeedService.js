// D:\PRJ_YCT_Final\services\dailyPriorityFeedService.js

const Lead = require('../schema/Lead');

const generateDailyPriorityFeed = async (coachId) => {
    const feedItems = [];
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const seventyTwoHoursAgo = new Date(now.getTime() - (72 * 60 * 60 * 1000));
    const fifteenDaysAgo = new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000));

    // Priority 1: Overdue Lead Follow-ups
    try {
        const overdueFollowUps = await Lead.find({
            coachId: coachId,
            status: { $in: ['New', 'Contacted', 'Follow-up', 'Qualified'] },
            nextFollowUpAt: { $lt: startOfToday, $ne: null } // Due date is *before* today
        }).sort('nextFollowUpAt');

        overdueFollowUps.forEach(lead => {
            feedItems.push({
                type: 'Overdue Follow-up',
                priority: 1,
                title: `Overdue Follow-up for ${lead.firstName} ${lead.lastName || ''}`,
                description: `Scheduled for: ${lead.nextFollowUpAt ? lead.nextFollowUpAt.toLocaleString() : 'N/A'}. Current Status: ${lead.status}`,
                leadId: lead._id,
                leadName: lead.name,
                nextFollowUpAt: lead.nextFollowUpAt
            });
        });
    } catch (error) {
        console.error('[DailyPriorityFeedService] Error fetching overdue follow-ups:', error.message);
    }

    // Priority 2: Leads Requiring Immediate Follow-up Today
    try {
        const todayFollowUps = await Lead.find({
            coachId: coachId,
            status: { $in: ['New', 'Contacted', 'Follow-up', 'Qualified'] },
            nextFollowUpAt: { $gte: startOfToday, $lte: now, $ne: null } // Due *today* but not yet overdue
        }).sort('nextFollowUpAt');

        todayFollowUps.forEach(lead => {
            feedItems.push({
                type: 'Follow-up Today',
                priority: 2,
                title: `Follow-up today for ${lead.firstName} ${lead.lastName || ''}`,
                description: `Scheduled for: ${lead.nextFollowUpAt ? lead.nextFollowUpAt.toLocaleString() : 'N/A'}. Current Status: ${lead.status}`,
                leadId: lead._id,
                leadName: lead.name,
                nextFollowUpAt: lead.nextFollowUpAt
            });
        });
    } catch (error) {
        console.error('[DailyPriorityFeedService] Error fetching today\'s follow-ups:', error.message);
    }

    // Priority 3: New "Hot" Leads (Created/Updated recently)
    try {
        const newHotLeads = await Lead.find({
            coachId: coachId,
            leadTemperature: 'Hot',
            status: { $in: ['New', 'Contacted'] },
            $or: [ // Either created recently OR leadTemperature/status was updated recently
                { createdAt: { $gte: seventyTwoHoursAgo } },
                { updatedAt: { $gte: twentyFourHoursAgo } } // Assuming updatedAt reflects significant changes
            ]
        }).sort('-createdAt');

        newHotLeads.forEach(lead => {
            feedItems.push({
                type: 'New Hot Lead',
                priority: 3,
                title: `New Hot Lead: ${lead.firstName} ${lead.lastName || ''}`,
                description: `Source: ${lead.source || 'N/A'}. Current Status: ${lead.status}.`,
                leadId: lead._id,
                leadName: lead.name,
                createdAt: lead.createdAt
            });
        });
    } catch (error) {
        console.error('[DailyPriorityFeedService] Error fetching new hot leads:', error.message);
    }

    // Priority 4: Stale "Hot" or "Warm" Leads Needing Re-engagement
    try {
        const staleLeads = await Lead.find({
            coachId: coachId,
            leadTemperature: { $in: ['Hot', 'Warm'] },
            status: { $nin: ['Converted', 'Unqualified'] }, // Not already closed
            updatedAt: { $lt: fifteenDaysAgo } // No activity/update in 15+ days
        }).sort('updatedAt'); // Oldest stale leads first

        staleLeads.forEach(lead => {
            feedItems.push({
                type: 'Stale Lead - Re-engage',
                priority: 4,
                title: `Re-engage: ${lead.firstName} ${lead.lastName || ''}`,
                description: `Last activity: ${lead.updatedAt ? lead.updatedAt.toLocaleString() : 'N/A'}. Status: ${lead.status}. Temp: ${lead.leadTemperature}.`,
                leadId: lead._id,
                leadName: lead.name,
                lastActivityAt: lead.updatedAt
            });
        });
    } catch (error) {
        console.error('[DailyPriorityFeedService] Error fetching stale leads:', error.message);
    }

    feedItems.sort((a, b) => a.priority - b.priority);

    return feedItems;
};

module.exports = {
    generateDailyPriorityFeed
};
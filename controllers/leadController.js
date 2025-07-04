// D:\PRJ_YCT_Final\controllers\leadController.js

const Lead = require('../Schema/Lead');
const Funnel = require('../Schema/Funnel');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');

// @desc    Create a new Lead
// @route   POST /api/leads
// @access  Private (Coaches/Admins) - Triggered by FormSubmission or manual
const createLead = asyncHandler(async (req, res, next) => {
    req.body.coachId = req.user.id;

    const funnel = await Funnel.findOne({ _id: req.body.funnelId, coachId: req.user.id });
    if (!funnel) {
        return next(new ErrorResponse(`Funnel not found with ID ${req.body.funnelId} or you do not own this funnel`, 404));
    }

    const lead = await Lead.create(req.body);

    res.status(201).json({
        success: true,
        data: lead
    });
});

// @desc    Get all Leads for the authenticated coach with filtering, sorting, and pagination
// @route   GET /api/leads?status=New&temperature=Hot&assignedTo=userId&nextFollowUpAt[lte]=date&sortBy=-createdAt&page=1&limit=10
// @access  Private (Coaches/Admins)
const getLeads = asyncHandler(async (req, res, next) => {
    const coachId = req.user.id;
    let query;

    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from the query (for filtering/sorting/pagination)
    const removeFields = ['select', 'sort', 'page', 'limit', 'nextFollowUpAt'];
    removeFields.forEach(param => delete reqQuery[param]);

    // Build query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc.) for filtering
    queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

    // Handle specific date range for nextFollowUpAt
    if (req.query.nextFollowUpAt) {
        const nextFollowUpAtFilter = JSON.parse(req.query.nextFollowUpAt);
        if (nextFollowUpAtFilter.lte) {
            nextFollowUpAtFilter.lte = new Date(nextFollowUpAtFilter.lte);
        }
        if (nextFollowUpAtFilter.gte) {
            nextFollowUpAtFilter.gte = new Date(nextFollowUpAtFilter.gte);
        }
        queryStr = JSON.stringify({ ...JSON.parse(queryStr), nextFollowUpAt: nextFollowUpAtFilter });
    }


    query = Lead.find({ ...JSON.parse(queryStr), coachId });

    // Select Fields
    if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
    }

    // Sort
    if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
    } else {
        query = query.sort('-createdAt'); // Default sort by most recent
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const total = await Lead.countDocuments({ coachId }); // Count total for pagination meta

    query = query.skip(startIndex).limit(limit);

    // Populate references
    query = query.populate('funnelId', 'name');
    query = query.populate('assignedTo', 'name');


    const leads = await query;

    // Pagination result
    const pagination = {};
    if (endIndex < total) {
        pagination.next = {
            page: page + 1,
            limit
        };
    }
    if (startIndex > 0) {
        pagination.prev = {
            page: page - 1,
            limit
        };
    }

    res.status(200).json({
        success: true,
        count: leads.length,
        total, // Total documents without limit/skip
        pagination,
        data: leads
    });
});

// @desc    Get single Lead by ID for the authenticated coach
// @route   GET /api/leads/:id
// @access  Private (Coaches/Admins)
const getLead = asyncHandler(async (req, res, next) => {
    const lead = await Lead.findOne({ _id: req.params.id, coachId: req.user.id })
                           .populate('funnelId', 'name')
                           .populate('assignedTo', 'name')
                           .populate('followUpHistory.createdBy', 'name');

    if (!lead) {
        return next(new ErrorResponse(`Lead not found with ID ${req.params.id} or you do not own this lead`, 404));
    }

    res.status(200).json({
        success: true,
        data: lead
    });
});

// @desc    Update Lead for the authenticated coach
// @route   PUT /api/leads/:id
// @access  Private (Coaches/Admins)
const updateLead = asyncHandler(async (req, res, next) => {
    let lead = await Lead.findOne({ _id: req.params.id, coachId: req.user.id });

    if (!lead) {
        return next(new ErrorResponse(`Lead not found with ID ${req.params.id} or you do not own this lead`, 404));
    }

    // Perform the update
    lead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        data: lead
    });
});

// @desc    Add a follow-up note to a Lead
// @route   POST /api/leads/:id/followup
// @access  Private (Coaches/Admins)
const addFollowUpNote = asyncHandler(async (req, res, next) => {
    let lead = await Lead.findOne({ _id: req.params.id, coachId: req.user.id });

    if (!lead) {
        return next(new ErrorResponse(`Lead not found with ID ${req.params.id} or you do not own this lead`, 404));
    }

    const { note, nextFollowUpAt } = req.body;

    if (!note || note.trim() === '') {
        return next(new ErrorResponse('Follow-up note is required.', 400));
    }

    lead.followUpHistory.push({
        note: note,
        createdBy: req.user.id,
        followUpDate: Date.now()
    });
    lead.lastFollowUpAt = Date.now();

    if (nextFollowUpAt) {
        const nextDate = new Date(nextFollowUpAt);
        if (isNaN(nextDate.getTime())) {
            return next(new ErrorResponse('Invalid next follow-up date provided.', 400));
        }
        lead.nextFollowUpAt = nextDate;
    } else {
        // If no nextFollowUpAt is provided, clear it or set it to null
        lead.nextFollowUpAt = undefined; // Or null, depending on preference
    }


    await lead.save();

    // Re-fetch with populated fields for the response
    lead = await Lead.findOne({ _id: req.params.id, coachId: req.user.id })
                           .populate('funnelId', 'name')
                           .populate('assignedTo', 'name')
                           .populate('followUpHistory.createdBy', 'name');

    res.status(200).json({
        success: true,
        data: lead
    });
});


// @desc    Get Leads for upcoming follow-ups
// @route   GET /api/leads/followups/upcoming?days=7
// @access  Private (Coaches/Admins)
const getUpcomingFollowUps = asyncHandler(async (req, res, next) => {
    const coachId = req.user.id;
    const days = parseInt(req.query.days, 10) || 7; // Default to next 7 days
    const includeOverdue = req.query.includeOverdue === 'true'; // Allow including overdue leads

    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(now.getDate() + days);

    let matchQuery = {
        coachId,
        nextFollowUpAt: { $ne: null } // Must have a next follow-up date set
    };

    if (includeOverdue) {
        // Next follow-up is in the past OR in the future (up to 'days' from now)
        matchQuery.nextFollowUpAt.$lte = futureDate;
    } else {
        // Next follow-up is between now and 'days' from now (exclusive of overdue)
        matchQuery.nextFollowUpAt.$gte = now;
        matchQuery.nextFollowUpAt.$lte = futureDate;
    }

    const leads = await Lead.find(matchQuery)
                            .sort('nextFollowUpAt') // Sort by the nearest follow-up date
                            .populate('funnelId', 'name')
                            .populate('assignedTo', 'name');

    res.status(200).json({
        success: true,
        count: leads.length,
        data: leads
    });
});


// @desc    Delete Lead for the authenticated coach
// @route   DELETE /api/leads/:id
// @access  Private (Coaches/Admins)
const deleteLead = asyncHandler(async (req, res, next) => {
    const lead = await Lead.findOne({ _id: req.params.id, coachId: req.user.id });

    if (!lead) {
        return next(new ErrorResponse(`Lead not found with ID ${req.params.id} or you do not own this lead`, 404));
    }

    await lead.deleteOne();

    res.status(200).json({
        success: true,
        data: {}
    });
});

// Export all functions
module.exports = {
    createLead,
    getLeads,
    getLead,
    updateLead,
    addFollowUpNote,
    getUpcomingFollowUps,
    deleteLead
};
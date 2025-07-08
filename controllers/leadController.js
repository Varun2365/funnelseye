// D:\PRJ_YCT_Final\controllers\leadController.js

const Lead = require('../schema/Lead');
const Funnel = require('../schema/Funnel');
const funnelseyeEventEmitter = require('../services/eventEmitterService');

// @desc    Create a new Lead
// @route   POST /api/leads
// @access  Private (Coaches/Admins) - Triggered by FormSubmission or manual
const createLead = async (req, res) => {
    try {
        req.body.coachId = req.user.id; // Assuming req.user.id is set by auth middleware

        const funnel = await Funnel.findOne({ _id: req.body.funnelId, coachId: req.user.id });

        if (!funnel) {
            return res.status(404).json({
                success: false,
                message: `Funnel not found or you do not own this funnel.`
            });
        }

        const lead = await Lead.create(req.body);

        // --- UPDATED: Emit generic 'trigger' event with eventType in payload ---
        funnelseyeEventEmitter.emit('trigger', {
            eventType: 'LEAD_CREATED', // <-- The actual event type
            leadId: lead._id,
            leadData: lead.toObject(), // Convert Mongoose document to a plain JavaScript object
            coachId: req.user.id,
            funnelId: lead.funnelId,
            timestamp: new Date().toISOString() // Add timestamp for consistency
        });
        // --- END UPDATED ---

        res.status(201).json({
            success: true,
            data: lead
        });
    } catch (error) {
        console.error("Error creating lead:", error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error. Could not create lead.'
        });
    }
};

// @desc    Get all Leads for the authenticated coach with filtering, sorting, and pagination
// @route   GET /api/leads?status=New&temperature=Hot&assignedTo=userId&nextFollowUpAt[lte]=date&sortBy=-createdAt&page=1&limit=10
// @access  Private (Coaches/Admins)
const getLeads = async (req, res) => {
    try {
        const coachId = req.user.id;
        let query;

        const reqQuery = { ...req.query };

        const removeFields = ['select', 'sort', 'page', 'limit', 'nextFollowUpAt'];
        removeFields.forEach(param => delete reqQuery[param]);

        let queryStr = JSON.stringify(reqQuery);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

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

        if (req.query.select) {
            const fields = req.query.select.split(',').join(' ');
            query = query.select(fields);
        }

        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;
        const total = await Lead.countDocuments({ coachId });

        query = query.skip(startIndex).limit(limit);

        query = query.populate('funnelId', 'name');
        query = query.populate('assignedTo', 'name');

        const leads = await query;

        const pagination = {};
        if (endIndex < total) {
            pagination.next = { page: page + 1, limit };
        }
        if (startIndex > 0) {
            pagination.prev = { page: page - 1, limit };
        }

        res.status(200).json({
            success: true,
            count: leads.length,
            total,
            pagination,
            data: leads
        });
    } catch (error) {
        console.error("Error fetching leads:", error);
        res.status(500).json({
            success: false,
            message: 'Server Error. Could not retrieve leads.'
        });
    }
};

// @desc    Get single Lead by ID for the authenticated coach
// @route   GET /api/leads/:id
// @access  Private (Coaches/Admins)
const getLead = async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, coachId: req.user.id })
            .populate('funnelId', 'name')
            .populate('assignedTo', 'name')
            .populate('followUpHistory.createdBy', 'name');

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: `Lead not found or you do not own this lead.`
            });
        }

        res.status(200).json({
            success: true,
            data: lead
        });
    } catch (error) {
        console.error("Error fetching single lead:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid Lead ID format.'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error. Could not retrieve lead.'
        });
    }
};

// @desc    Update Lead for the authenticated coach
// @route   PUT /api/leads/:id
// @access  Private (Coaches/Admins)
const updateLead = async (req, res) => {
    try {
        // --- NEW: Fetch existing lead to compare values before update ---
        const existingLead = await Lead.findOne({ _id: req.params.id, coachId: req.user.id });

        if (!existingLead) {
            return res.status(404).json({
                success: false,
                message: `Lead not found or you do not own this lead.`
            });
        }

        const oldStatus = existingLead.status;
        const oldTemperature = existingLead.temperature;
        const oldAssignedTo = existingLead.assignedTo ? existingLead.assignedTo.toString() : null; // Convert ObjectId to string for comparison

        // Perform the update
        const updatedLead = await Lead.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });

        // --- UPDATED: Emit generic 'trigger' events based on changes ---
        if (updatedLead.status !== oldStatus) {
            funnelseyeEventEmitter.emit('trigger', {
                eventType: 'LEAD_STATUS_CHANGED', // <-- The actual event type
                leadId: updatedLead._id,
                leadData: updatedLead.toObject(),
                oldStatus: oldStatus,
                newStatus: updatedLead.status,
                coachId: req.user.id,
                timestamp: new Date().toISOString()
            });
        }

        if (updatedLead.temperature !== oldTemperature) {
            funnelseyeEventEmitter.emit('trigger', {
                eventType: 'LEAD_TEMPERATURE_CHANGED', // <-- The actual event type
                leadId: updatedLead._id,
                leadData: updatedLead.toObject(),
                oldTemperature: oldTemperature,
                newTemperature: updatedLead.temperature,
                coachId: req.user.id,
                timestamp: new Date().toISOString()
            });
        }

        const newAssignedTo = updatedLead.assignedTo ? updatedLead.assignedTo.toString() : null;
        if (newAssignedTo && newAssignedTo !== oldAssignedTo) {
            funnelseyeEventEmitter.emit('trigger', {
                eventType: 'ASSIGN_LEAD_TO_COACH', // <-- The actual event type
                leadId: updatedLead._id,
                leadData: updatedLead.toObject(),
                oldAssignedTo: oldAssignedTo,
                newAssignedTo: newAssignedTo,
                coachId: req.user.id, // This is the coach who made the assignment
                timestamp: new Date().toISOString()
            });
        }
        // --- END UPDATED ---

        res.status(200).json({
            success: true,
            data: updatedLead
        });
    } catch (error) {
        console.error("Error updating lead:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid Lead ID format.'
            });
        }
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error. Could not update lead.'
        });
    }
};

// @desc    Add a follow-up note to a Lead
// @route   POST /api/leads/:id/followup
// @access  Private (Coaches/Admins)
const addFollowUpNote = async (req, res) => {
    try {
        let lead = await Lead.findOne({ _id: req.params.id, coachId: req.user.id });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: `Lead not found or you do not own this lead.`
            });
        }

        const { note, nextFollowUpAt } = req.body;

        if (!note || note.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Follow-up note is required.'
            });
        }

        // --- NEW: Check if nextFollowUpAt is changing to emit event ---
        const oldNextFollowUpAt = lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString() : null; // Store as ISO string for comparison
        
        lead.followUpHistory.push({
            note: note,
            createdBy: req.user.id,
            followUpDate: Date.now()
        });
        lead.lastFollowUpAt = Date.now();

        if (nextFollowUpAt) {
            const nextDate = new Date(nextFollowUpAt);
            if (isNaN(nextDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid next follow-up date provided.'
                });
            }
            lead.nextFollowUpAt = nextDate;
        } else {
            lead.nextFollowUpAt = undefined;
        }

        await lead.save();

        // Re-fetch with populated fields for the response
        lead = await Lead.findOne({ _id: req.params.id, coachId: req.user.id })
            .populate('funnelId', 'name')
            .populate('assignedTo', 'name')
            .populate('followUpHistory.createdBy', 'name');

        // --- NEW: Emit event if nextFollowUpAt changed ---
        const newNextFollowUpAt = lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString() : null;
        if (newNextFollowUpAt !== oldNextFollowUpAt) {
             funnelseyeEventEmitter.emit('trigger', {
                eventType: 'LEAD_FOLLOWUP_SCHEDULED_OR_UPDATED', // New event type
                leadId: lead._id,
                leadData: lead.toObject(),
                oldNextFollowUpAt: oldNextFollowUpAt,
                newNextFollowUpAt: newNextFollowUpAt,
                coachId: req.user.id,
                timestamp: new Date().toISOString()
            });
        }
        // --- END NEW ---

        res.status(200).json({
            success: true,
            data: lead
        });
    } catch (error) {
        console.error("Error adding follow-up note:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid Lead ID format.'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error. Could not add follow-up note.'
        });
    }
};

// @desc    Get Leads for upcoming follow-ups
// @route   GET /api/leads/followups/upcoming?days=7
// @access  Private (Coaches/Admins)
const getUpcomingFollowUps = async (req, res) => {
    try {
        const coachId = req.user.id;
        const days = parseInt(req.query.days, 10) || 7;
        const includeOverdue = req.query.includeOverdue === 'true';

        const now = new Date();
        const futureDate = new Date(now);
        futureDate.setDate(now.getDate() + days);

        let matchQuery = {
            coachId,
            nextFollowUpAt: { $ne: null }
        };

        if (includeOverdue) {
            matchQuery.nextFollowUpAt.$lte = futureDate;
        } else {
            matchQuery.nextFollowUpAt.$gte = now;
            matchQuery.nextFollowUpAt.$lte = futureDate;
        }

        const leads = await Lead.find(matchQuery)
            .sort('nextFollowUpAt')
            .populate('funnelId', 'name')
            .populate('assignedTo', 'name');

        res.status(200).json({
            success: true,
            count: leads.length,
            data: leads
        });
    } catch (error) {
        console.error("Error fetching upcoming follow-ups:", error);
        res.status(500).json({
            success: false,
            message: 'Server Error. Could not retrieve upcoming follow-ups.'
        });
    }
};

// @desc    Delete Lead for the authenticated coach
// @route   DELETE /api/leads/:id
// @access  Private (Coaches/Admins)
const deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, coachId: req.user.id });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: `Lead not found or you do not own this lead.`
            });
        }

        await lead.deleteOne();

        // --- NEW: Emit LEAD_DELETED event ---
        funnelseyeEventEmitter.emit('trigger', {
            eventType: 'LEAD_DELETED', // <-- The actual event type
            leadId: lead._id,
            coachId: req.user.id,
            timestamp: new Date().toISOString()
        });
        // --- END NEW ---

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        console.error("Error deleting lead:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({
                success: false,
                message: 'Invalid Lead ID format.'
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error. Could not delete lead.'
        });
    }
};

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
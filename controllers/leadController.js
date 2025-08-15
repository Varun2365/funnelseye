// D:\PRJ_YCT_Final\controllers\leadController.js

const Lead = require('../schema/Lead');
const Funnel = require('../schema/Funnel');
const { publishEvent } = require('../services/rabbitmqProducer');
const LeadModel = require('../schema/Lead');
const NurturingSequence = require('../schema/NurturingSequence');
const { scheduleFutureEvent } = require('../services/automationSchedulerService');

// @desc    Create a new Lead
// @route   POST /api/leads
// @access  Public - Triggered by a public form submission
const createLead = async (req, res) => {
    try {
        const { coachId, funnelId } = req.body;

        if (!coachId || !funnelId) {
            return res.status(400).json({
                success: false,
                message: 'Both coachId and funnelId are required to create a new lead.'
            });
        }

        const funnel = await Funnel.findOne({ _id: funnelId, coachId });

        if (!funnel) {
            return res.status(404).json({
                success: false,
                message: `Funnel not found or does not belong to the specified coach.`
            });
        }

        const lead = await Lead.create(req.body);

        // --- Publish event to RabbitMQ ---
        const eventName = 'lead_created';
        const eventPayload = {
            eventName: eventName,
            payload: {
                leadId: lead._id,
                leadData: lead.toObject(),
                coachId: lead.coachId,
                funnelId: lead.funnelId,
            }
        };

        publishEvent(eventName, eventPayload)
            .then(() => console.log(`[Controller] Published event: ${eventName}`))
            .catch(err => console.error(`[Controller] Failed to publish event: ${eventName}`, err));
        // --- End of event publishing ---

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

// @desc    Get all Leads for the authenticated coach with filtering, sorting, and pagination
// @route   GET /api/leads?status=New&temperature=Hot&assignedTo=userId&nextFollowUpAt[lte]=date&sortBy=-createdAt&page=1&limit=10
// @access  Private (Coaches/Admins)
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

// @desc    Get single Lead by ID for the authenticated coach
// @route   GET /api/leads/:id
// @access  Private (Coaches/Admins)
const getLead = async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, coachId: req.coachId })
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

// @desc    Update Lead for the authenticated coach
// @route   PUT /api/leads/:id
// @access  Private (Coaches/Admins)
const updateLead = async (req, res) => {
    try {
        const existingLead = await Lead.findOne({ _id: req.params.id, coachId: req.coachId });

        if (!existingLead) {
            return res.status(404).json({
                success: false,
                message: `Lead not found or you do not own this lead.`
            });
        }

        const oldStatus = existingLead.status;
        const oldTemperature = existingLead.leadTemperature;
        const oldAssignedTo = existingLead.assignedTo ? existingLead.assignedTo.toString() : null;

        const updatedLead = await Lead.findOneAndUpdate({ _id: req.params.id, coachId: req.coachId }, req.body, {
            new: true,
            runValidators: true
        });

        // --- Publish events based on changes to RabbitMQ ---
        if (updatedLead.status !== oldStatus) {
            const eventName = 'lead_status_changed';
            const eventPayload = {
                eventName: eventName,
                payload: {
                    leadId: updatedLead._id,
                    leadData: updatedLead.toObject(),
                    oldStatus: oldStatus,
                    newStatus: updatedLead.status,
                    coachId: req.user.id,
                }
            };
            publishEvent(eventName, eventPayload).catch(err => console.error(`[Controller] Failed to publish event: ${eventName}`, err));
        }

        if (updatedLead.leadTemperature !== oldTemperature) {
            const eventName = 'lead_temperature_changed';
            const eventPayload = {
                eventName: eventName,
                payload: {
                    leadId: updatedLead._id,
                    leadData: updatedLead.toObject(),
                    oldTemperature: oldTemperature,
                    newTemperature: updatedLead.leadTemperature,
                    coachId: req.user.id,
                }
            };
            publishEvent(eventName, eventPayload).catch(err => console.error(`[Controller] Failed to publish event: ${eventName}`, err));
        }

        const newAssignedTo = updatedLead.assignedTo ? updatedLead.assignedTo.toString() : null;
        if (newAssignedTo && newAssignedTo !== oldAssignedTo) {
            const eventName = 'assign_lead_to_coach';
            const eventPayload = {
                eventName: eventName,
                payload: {
                    leadId: updatedLead._id,
                    leadData: updatedLead.toObject(),
                    oldAssignedTo: oldAssignedTo,
                    newAssignedTo: newAssignedTo,
                    coachId: req.user.id,
                }
            };
            publishEvent(eventName, eventPayload).catch(err => console.error(`[Controller] Failed to publish event: ${eventName}`, err));
        }
        // --- End of event publishing ---

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

// @desc    Add a follow-up note to a Lead
// @route   POST /api/leads/:id/followup
// @access  Private (Coaches/Admins)
const addFollowUpNote = async (req, res) => {
    try {
        let lead = await Lead.findOne({ _id: req.params.id, coachId: req.coachId });

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

        const oldNextFollowUpAt = lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString() : null;

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

        lead = await Lead.findOne({ _id: req.params.id, coachId: req.coachId })
            .populate('funnelId', 'name')
            .populate('assignedTo', 'name')
            .populate('followUpHistory.createdBy', 'name');

        const newNextFollowUpAt = lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString() : null;
        if (newNextFollowUpAt !== oldNextFollowUpAt) {
            const eventName = 'lead_followup_scheduled_or_updated';
            const eventPayload = {
                eventName: eventName,
                payload: {
                    leadId: lead._id,
                    leadData: lead.toObject(),
                    oldNextFollowUpAt: oldNextFollowUpAt,
                    newNextFollowUpAt: newNextFollowUpAt,
                    coachId: req.user.id,
                }
            };
            publishEvent(eventName, eventPayload).catch(err => console.error(`[Controller] Failed to publish event: ${eventName}`, err));
        }

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

// @desc    Get Leads for upcoming follow-ups
// @route   GET /api/leads/followups/upcoming?days=7
// @access  Private (Coaches/Admins)
const getUpcomingFollowUps = async (req, res) => {
    try {
        const coachId = req.coachId;
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

// @desc    Delete Lead for the authenticated coach
// @route   DELETE /api/leads/:id
// @access  Private (Coaches/Admins)
const deleteLead = async (req, res) => {
    try {
        const lead = await Lead.findOne({ _id: req.params.id, coachId: req.coachId });

        if (!lead) {
            return res.status(404).json({
                success: false,
                message: `Lead not found or you do not own this lead.`
            });
        }

        await lead.deleteOne();

        // --- Publish event to RabbitMQ ---
        const eventName = 'lead_deleted';
        const eventPayload = {
            eventName: eventName,
            payload: {
                leadId: lead._id,
                coachId: req.user.id,
            }
        };
        publishEvent(eventName, eventPayload).catch(err => console.error(`[Controller] Failed to publish event: ${eventName}`, err));
        // --- End of event publishing ---

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

// --- Basic lead scoring function with explanation ---
function calculateLeadScore(lead) {
    let score = 0;
    let explanation = [];
    if (lead.leadTemperature === 'Hot') {
        score += 30;
        explanation.push('Hot lead temperature: +30');
    }
    if (lead.source) {
        score += 5;
        explanation.push('Lead source present: +5');
    }
    if (lead.email && lead.phone) {
        score += 15;
        explanation.push('Both email and phone provided: +15');
    } else if (lead.email || lead.phone) {
        score += 5;
        explanation.push('Either email or phone provided: +5');
    }
    if (lead.nextFollowUpAt) {
        score += 10;
        explanation.push('Next follow-up scheduled: +10');
    }
    score = Math.min(100, score);
    return { score, explanation };
}

// Helper to trigger automation for a nurturing step
async function triggerNurturingStepAction(lead, step) {
    const actionType = step.actionType;
    const config = step.actionConfig || {};
    const eventPayload = {
        leadId: lead._id,
        coachId: lead.coachId,
        stepIndex: lead.nurturingStepIndex,
        actionType,
        config,
        leadData: lead.toObject()
    };
    await publishEvent('funnelseye_actions', 'lead.nurture', {
        actionType,
        config,
        payload: eventPayload
    });
}

// Assign a nurturing sequence to a lead
const assignNurturingSequence = async (req, res) => {
    try {
        const { leadId, sequenceId } = req.body;
        const lead = await Lead.findById(leadId);
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        const sequence = await NurturingSequence.findById(sequenceId);
        if (!sequence) return res.status(404).json({ success: false, message: 'Nurturing sequence not found' });
        lead.nurturingSequence = sequenceId;
        lead.nurturingStepIndex = 0;
        await lead.save();
        res.status(200).json({ success: true, message: 'Nurturing sequence assigned', data: lead });
    } catch (e) {
        console.error('Assign nurturing sequence error:', e);
        res.status(500).json({ success: false, message: 'Server error during assignment.' });
    }
};

// Advance a lead to the next nurturing step (now uses automation system)
const advanceNurturingStep = async (req, res) => {
    try {
        const { leadId } = req.body;
        const lead = await Lead.findById(leadId).populate('nurturingSequence');
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        if (!lead.nurturingSequence) return res.status(400).json({ success: false, message: 'No nurturing sequence assigned' });
        const sequence = lead.nurturingSequence;
        if (lead.nurturingStepIndex >= sequence.steps.length) {
            return res.status(400).json({ success: false, message: 'Lead has completed the nurturing sequence' });
        }
        const step = sequence.steps[lead.nurturingStepIndex];
        // Schedule or trigger the action
        if (step.delayDays && step.delayDays > 0) {
            const scheduledTime = new Date(Date.now() + step.delayDays * 24 * 60 * 60 * 1000);
            await scheduleFutureEvent(scheduledTime, 'funnelseye_actions', 'lead.nurture', {
                actionType: step.actionType,
                config: step.actionConfig || {},
                payload: {
                    leadId: lead._id,
                    coachId: lead.coachId,
                    stepIndex: lead.nurturingStepIndex,
                    actionType: step.actionType,
                    config: step.actionConfig || {},
                    leadData: lead.toObject()
                }
            });
        } else {
            await triggerNurturingStepAction(lead, step);
        }
        lead.nurturingStepIndex += 1;
        await lead.save();
        res.status(200).json({ success: true, message: 'Advanced to next nurturing step and published automation event', data: lead });
    } catch (e) {
        console.error('Advance nurturing step error:', e);
        res.status(500).json({ success: false, message: 'Server error during step advancement.' });
    }
};

// Get nurturing sequence progress for a lead
const getNurturingProgress = async (req, res) => {
    try {
        const { leadId } = req.params;
        const lead = await Lead.findById(leadId).populate('nurturingSequence');
        if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
        if (!lead.nurturingSequence) return res.status(200).json({ success: true, data: { progress: null, message: 'No nurturing sequence assigned' } });
        const sequence = lead.nurturingSequence;
        const currentStep = sequence.steps[lead.nurturingStepIndex] || null;
        res.status(200).json({ success: true, data: { sequence, currentStep, stepIndex: lead.nurturingStepIndex } });
    } catch (e) {
        console.error('Get nurturing progress error:', e);
        res.status(500).json({ success: false, message: 'Server error during progress fetch.' });
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
    deleteLead,
    // simple AI rescore endpoint handler
    aiRescore: async (req, res) => {
        try {
            const lead = await LeadModel.findOne({ _id: req.params.id, coachId: req.coachId });
            if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
            const { score, explanation } = calculateLeadScore(lead);
            lead.score = score;
            await lead.save();
            return res.status(200).json({ success: true, data: { leadId: lead._id, score, explanation } });
        } catch (e) {
            console.error('AI rescore error:', e);
            return res.status(500).json({ success: false, message: 'Server error during AI rescore.' });
        }
    },
    assignNurturingSequence,
    advanceNurturingStep,
    getNurturingProgress,
};
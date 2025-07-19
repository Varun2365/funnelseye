// D:\PRJ_YCT_Final\controllers\funnelController.js

const Funnel = require('../schema/Funnel'); // Corrected path to the Funnel model
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const FunnelEvent = require('../schema/FunnelEvent'); // Still needed for event tracking

// No longer need to import separate stage content schemas
// No longer need `stageModels` object

// Helper for ownership check
const checkFunnelOwnership = (funnel, reqCoachId) => {
    if (funnel.coachId.toString() !== reqCoachId.toString()) {
        throw new ErrorResponse('Forbidden: You are not authorized to access/modify this funnel.', 403);
    }
};

const getFunnelsByCoachId = asyncHandler(async (req, res, next) => {
    if (req.coachId.toString() !== req.params.coachId.toString()) {
        return next(new ErrorResponse('Forbidden: You can only access your own funnels.', 403));
    }
    const funnels = await Funnel.find({ coachId: req.params.coachId });
    res.status(200).json({
        success: true,
        count: funnels.length,
        data: funnels
    });
});

const getFunnelById = asyncHandler(async (req, res, next) => {
    const funnel = await Funnel.findById(req.params.funnelId);
    if (!funnel) {
        return next(new ErrorResponse(`Funnel not found with id of ${req.params.funnelId}`, 404));
    }
    checkFunnelOwnership(funnel, req.coachId);
    res.status(200).json({ success: true, data: funnel });
});

const createFunnel = asyncHandler(async (req, res, next) => {
    req.body.coachId = req.coachId;
    if (req.coachId.toString() !== req.params.coachId.toString()) {
        return next(new ErrorResponse('Forbidden: You can only create funnels for yourself.', 403));
    }
    const funnel = await Funnel.create(req.body); // `stages` array comes directly in `req.body`
    res.status(201).json({
        success: true,
        data: funnel
    });
});

const updateFunnel = asyncHandler(async (req, res, next) => {
    let funnel = await Funnel.findById(req.params.funnelId);
    if (!funnel) {
        return next(new ErrorResponse(`Funnel not found with id of ${req.params.funnelId}`, 404));
    }
    checkFunnelOwnership(funnel, req.coachId);

    // If `stages` array is sent in `req.body`, it will entirely replace the existing one.
    // Ensure frontend sends the complete updated `stages` array if modifying stages.
    funnel = await Funnel.findByIdAndUpdate(req.params.funnelId, req.body, {
        new: true,
        runValidators: true
    });
    res.status(200).json({ success: true, data: funnel });
});

const deleteFunnel = asyncHandler(async (req, res, next) => {
    const funnel = await Funnel.findById(req.params.funnelId);
    if (!funnel) {
        return next(new ErrorResponse(`Funnel not found with id of ${req.params.funnelId}`, 404));
    }
    checkFunnelOwnership(funnel, req.coachId);
    await funnel.deleteOne();
    res.status(200).json({ success: true, message: 'Funnel deleted successfully.' });
});

const addStageToFunnel = asyncHandler(async (req, res, next) => {
    const { funnelId } = req.params;
    const newStageData = req.body; // Expecting the full stage object here

    const funnel = await Funnel.findById(funnelId);
    if (!funnel) {
        return next(new ErrorResponse('Funnel not found.', 404));
    }
    checkFunnelOwnership(funnel, req.coachId);

    if (!newStageData || !newStageData.pageId || !newStageData.name || !newStageData.type) {
        return next(new ErrorResponse('Missing required stage data (pageId, name, type).', 400));
    }

    // Check for duplicate custom `pageId` within the funnel
    const existingStageWithPageId = funnel.stages.find(s => s.pageId === newStageData.pageId);
    if (existingStageWithPageId) {
        return next(new ErrorResponse(`Stage with pageId '${newStageData.pageId}' already exists in this funnel.`, 400));
    }

    if (newStageData.order === undefined || newStageData.order === null) {
        newStageData.order = funnel.stages.length; // Assign sequential order if not provided
    }

    funnel.stages.push(newStageData);
    funnel.stages.sort((a, b) => a.order - b.order); // Keep stages sorted

    await funnel.save();

    res.status(201).json({
        success: true,
        message: `Stage '${newStageData.name}' (${newStageData.type}) added successfully.`,
        data: funnel.stages.find(s => s.pageId === newStageData.pageId) // Return the newly added stage (with its MongoDB _id)
    });
});

const editFunnelStage = asyncHandler(async (req, res, next) => {
    const { funnelId, stageId } = req.params; // `stageId` here refers to the MongoDB `_id` of the subdocument
    const updates = req.body; // Full or partial updates for the stage

    const funnel = await Funnel.findById(funnelId);
    if (!funnel) {
        return next(new ErrorResponse('Funnel not found.', 404));
    }
    checkFunnelOwnership(funnel, req.coachId);

    const stageToUpdate = funnel.stages.id(stageId); // Mongoose helper to find subdocument by _id
    if (!stageToUpdate) {
        return next(new ErrorResponse('Stage not found in this funnel.', 404));
    }

    // Apply updates
    Object.assign(stageToUpdate, updates);

    // If order was updated, re-sort the array
    if (updates.order !== undefined) {
        funnel.stages.sort((a, b) => a.order - b.order);
    }

    await funnel.save(); // Save the entire funnel document

    res.status(200).json({
        success: true,
        message: 'Funnel stage updated successfully.',
        data: stageToUpdate // Return the updated stage
    });
});


// ⭐ MAJOR CHANGE HERE: getFunnelStagesByType
// This route now filters embedded stages instead of querying separate collections
const getFunnelStagesByType = asyncHandler(async (req, res, next) => {
    const { coachId, funnelId, stageType } = req.params;

    if (req.coachId.toString() !== coachId.toString()) {
        return next(new ErrorResponse('Forbidden: You are not authorized to access this coach\'s funnels.', 403));
    }

    const funnel = await Funnel.findById(funnelId);
    if (!funnel) {
        return next(new ErrorResponse('Funnel not found.', 404));
    }
    checkFunnelOwnership(funnel, req.coachId);

    // Filter stages directly from the embedded array based on 'type'
    const filteredStages = funnel.stages.filter(stage => stage.type === stageType);

    res.status(200).json({
        success: true,
        count: filteredStages.length,
        data: filteredStages
    });
});


const trackFunnelEvent = asyncHandler(async (req, res, next) => {
    const { funnelId, stageId, eventType, sessionId, userId, metadata } = req.body;

    if (!funnelId || !eventType || !sessionId) {
        return next(new ErrorResponse('Missing required tracking parameters: funnelId, eventType, sessionId', 400));
    }

    const eventData = {
        funnelId,
        stageId: stageId || null,
        eventType,
        sessionId,
        userId: userId || null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        metadata: metadata || null
    };

    const funnelEvent = await FunnelEvent.create(eventData);

    res.status(201).json({
        success: true,
        message: 'Funnel event tracked successfully',
        data: funnelEvent
    });
});

module.exports = {
    getFunnelsByCoachId,
    getFunnelById,
    createFunnel,
    updateFunnel,
    deleteFunnel,
    addStageToFunnel,
    editFunnelStage,
    getFunnelStagesByType,
    trackFunnelEvent
};
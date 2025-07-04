// D:\PRJ_YCT_Final\controllers\funnelController.js

const Funnel = require('../Schema/Funnel');
const User = require('../Schema/User');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middleware/async');
const FunnelEvent = require('../schema/FunnelEvent');
const LandingPage = require('../Schema/Funnel Settings Schema/LandingPage');
const Appointment = require('../Schema/Funnel Settings Schema/Appointment');
const Thankyou = require('../Schema/Funnel Settings Schema/Thankyou');
const VSL = require('../Schema/Funnel Settings Schema/VSL');
const WACommunity = require('../Schema/Funnel Settings Schema/WACommunity');


const stageModels = {
    LandingPage: LandingPage,
    Appointment: Appointment,
    Thankyou: Thankyou,
    VSL: VSL,
    WACommunity: WACommunity,
};


const getFunnelsByCoachId = async (req, res, next) => {
    try {
        if (req.coachId.toString() !== req.params.coachId.toString()) {
            return res.status(403).json({ success: false, message: 'Forbidden: You can only access your own funnels.' });
        }
        const funnels = await Funnel.find({ coachId: req.params.coachId });
        res.status(200).json({
            success: true,
            count: funnels.length,
            data: funnels
        });
    } catch (error) {
        console.error('Error fetching funnels by coach ID:', error.message);
        res.status(500).json({ success: false, message: 'Server Error fetching funnels.' });
    }
};

const getFunnelById = async (req, res, next) => {
    try {
        // Find the funnel by ID and populate the 'stageSettingsId' within the 'stages' array.
        // Mongoose will use the 'refPath' defined in your Funnel schema (stages.stageType)
        // to correctly determine which model to populate from.
        const funnel = await Funnel.findById(req.params.funnelId)
            .populate('stages.stageSettingsId'); // <-- ADD THIS POPULATE LINE

        if (!funnel) {
            return res.status(404).json({ success: false, message: `Funnel not found with id of ${req.params.funnelId}` });
        }

        // Optional: Ensure the authenticated coach owns this specific funnel
        if (funnel.coachId.toString() !== req.coachId.toString()) {
            return res.status(403).json({ success: false, message: 'Forbidden: You do not own this funnel.' });
        }

        res.status(200).json({ success: true, data: funnel });
    } catch (error) {
        console.error('Error fetching funnel by ID:', error.message);
        // Handle CastError for invalid IDs
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: `Invalid Funnel ID format.` });
        }
        res.status(500).json({ success: false, message: 'Server Error fetching funnel.' });
    }
};

const createFunnel = async (req, res, next) => {
    try {
        req.body.coachId = req.coachId;
        if (req.coachId.toString() !== req.params.coachId.toString()) {
            return res.status(403).json({ success: false, message: 'Forbidden: You can only create funnels for yourself.' });
        }
        const funnel = await Funnel.create(req.body);
        res.status(201).json({
            success: true,
            data: funnel
        });
    } catch (error) {
        console.error('Error creating funnel:', error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            const value = error.keyValue[field];
            return res.status(400).json({ success: false, message: `Duplicate funnel ${field}: '${value}'. Please use a different one.` });
        }
        res.status(500).json({ success: false, message: 'Server Error creating funnel.' });
    }
};

const updateFunnel = async (req, res, next) => {
    try {
        let funnel = await Funnel.findById(req.params.funnelId);
        if (!funnel) {
            return res.status(404).json({ success: false, message: `Funnel not found with id of ${req.params.funnelId}` });
        }
        if (funnel.coachId.toString() !== req.coachId.toString()) {
            return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to update this funnel.' });
        }
        funnel = await Funnel.findByIdAndUpdate(req.params.funnelId, req.body, {
            new: true,
            runValidators: true
        });
        res.status(200).json({ success: true, data: funnel });
    } catch (error) {
        console.error('Error updating funnel:', error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            const value = error.keyValue[field];
            return res.status(400).json({ success: false, message: `Duplicate funnel ${field}: '${value}'. Please use a different one.` });
        }
        res.status(500).json({ success: false, message: 'Server Error updating funnel.' });
    }
};

const deleteFunnel = async (req, res, next) => {
    try {
        const funnel = await Funnel.findById(req.params.funnelId);
        if (!funnel) {
            return res.status(404).json({ success: false, message: `Funnel not found with id of ${req.params.funnelId}` });
        }
        if (funnel.coachId.toString() !== req.coachId.toString()) {
            return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to delete this funnel.' });
        }
        await funnel.deleteOne();
        res.status(200).json({ success: true, message: 'Funnel deleted successfully.' });
    } catch (error) {
        console.error('Error deleting funnel:', error.message);
        res.status(500).json({ success: false, message: 'Server Error deleting funnel.' });
    }
};


const addStageToFunnel = async (req, res, next) => {
    const { funnelId } = req.params;
    const { stageType, stageName, order, ...stageContentData } = req.body;

    try {
        const funnel = await Funnel.findById(funnelId);
        if (!funnel) {
            return res.status(404).json({ success: false, message: 'Funnel not found.' });
        }
        if (funnel.coachId.toString() !== req.coachId.toString()) {
            return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to add stages to this funnel.' });
        }

        const StageModel = stageModels[stageType];
        if (!StageModel) {
            return res.status(400).json({ success: false, message: 'Invalid stage type provided.' });
        }

        stageContentData.coachId = req.coachId;
        stageContentData.funnelId = funnelId;

        const newStageContent = await StageModel.create(stageContentData);

        funnel.stages.push({
            stageType: stageType,
            stageSettingsId: newStageContent._id,
            stageName: stageName || newStageContent.name,
            order: order !== undefined ? order : funnel.stages.length,
            isEnabled: true
        });

        funnel.stages.sort((a, b) => a.order - b.order);
        await funnel.save();

        res.status(201).json({
            success: true,
            message: `Stage '${stageName}' (${stageType}) added successfully to funnel.`,
            data: {
                funnel: funnel,
                newStageContent: newStageContent
            }
        });

    } catch (error) {
        console.error('Error adding stage to funnel:', error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            const value = error.keyValue[field];
            return res.status(400).json({ success: false, message: `Duplicate value for ${field}: '${value}'. Please use another.` });
        }
        res.status(500).json({ success: false, message: 'Server Error adding stage to funnel.' });
    }
};


const editFunnelStage = async (req, res, next) => {
    const { funnelId, stageSettingsId } = req.params;
    const { stageName, order, isEnabled } = req.body;

    try {
        const funnel = await Funnel.findById(funnelId);
        if (!funnel) {
            return res.status(404).json({ success: false, message: 'Funnel not found.' });
        }
        if (funnel.coachId.toString() !== req.coachId.toString()) {
            return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to edit this funnel.' });
        }

        const stageToUpdate = funnel.stages.find(s => s.stageSettingsId.toString() === stageSettingsId);
        if (!stageToUpdate) {
            return res.status(404).json({ success: false, message: 'Stage not found in this funnel.' });
        }

        if (stageName !== undefined) {
            stageToUpdate.stageName = stageName;
        }
        if (order !== undefined) {
            stageToUpdate.order = order;
        }
        if (isEnabled !== undefined) {
            stageToUpdate.isEnabled = isEnabled;
        }

        if (order !== undefined) {
            funnel.stages.sort((a, b) => a.order - b.order);
        }

        await funnel.save();

        res.status(200).json({
            success: true,
            message: 'Funnel stage updated successfully.',
            data: funnel
        });

    } catch (error) {
        console.error('Error editing funnel stage:', error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: `Invalid ID provided for funnel or stage.` });
        }
        res.status(500).json({ success: false, message: 'Server Error updating funnel stage.' });
    }
};


const getFunnelStagesByType = async (req, res, next) => {
    const { coachId, funnelId, stageType } = req.params;

    try {
        // 1. Authenticate & Authorize: Ensure the request comes from the owner of the coachId
        if (req.coachId.toString() !== coachId.toString()) {
            return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized to access this coach\'s funnels.' });
        }

        // 2. Find the funnel
        const funnel = await Funnel.findById(funnelId);

        if (!funnel) {
            return res.status(404).json({ success: false, message: 'Funnel not found.' });
        }

        // 3. Ownership check for the funnel itself
        if (funnel.coachId.toString() !== req.coachId.toString()) {
            return res.status(403).json({ success: false, message: 'Forbidden: You do not own this funnel.' });
        }

        // 4. Validate stageType and get the corresponding Mongoose Model
        const StageModel = stageModels[stageType];
        if (!StageModel) {
            return res.status(400).json({ success: false, message: `Invalid stage type: '${stageType}'.` });
        }

        // 5. Filter funnel stages to get references of the requested type
        const stageReferences = funnel.stages.filter(s => s.stageType === stageType);

        if (stageReferences.length === 0) {
            // If no stages of this type exist in the funnel, return empty array.
            // This is generally better than a 404 for a GET request expecting a list.
            return res.status(200).json({ success: true, count: 0, data: [] });
        }

        // 6. Extract the stageSettingsIds
        const stageContentIds = stageReferences.map(s => s.stageSettingsId);

        // 7. Fetch the actual stage content documents
        const stageContents = await StageModel.find({
            _id: { $in: stageContentIds },
            coachId: req.coachId, // Double-check coach ownership of content
            funnelId: funnelId   // Double-check content belongs to this funnel
        });

        // Optional: Re-sort the fetched contents based on the order in the funnel's stages array
        // (This ensures the returned list matches the funnel's sequence)
        const orderedStageContents = stageReferences.map(ref =>
            stageContents.find(content => content._id.toString() === ref.stageSettingsId.toString())
        ).filter(Boolean); // Filter out any nulls if a content doc was not found (unlikely but safe)


        res.status(200).json({
            success: true,
            count: orderedStageContents.length,
            data: orderedStageContents
        });

    } catch (error) {
        console.error('Error fetching funnel stages by type:', error.message);
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: `Invalid ID format for funnel.` });
        }
        res.status(500).json({ success: false, message: 'Server Error fetching funnel stages.' });
    }
};

const trackFunnelEvent = asyncHandler(async (req, res, next) => {
    // Extract necessary data from the request body
    const { funnelId, stageId, eventType, sessionId, userId, metadata } = req.body;

    // Basic validation: Ensure essential tracking parameters are present
    if (!funnelId || !eventType || !sessionId) {
        return next(new ErrorResponse('Missing required tracking parameters: funnelId, eventType, sessionId', 400));
    }

    // Prepare the data to be saved as a new FunnelEvent document
    const eventData = {
        funnelId,
        stageId: stageId || null, // stageId is optional for some generic funnel events
        eventType,
        sessionId,
        userId: userId || null, // userId is optional; it will be null for unauthenticated (guest) users
        ipAddress: req.ip, // Express provides the client's IP address automatically
        userAgent: req.headers['user-agent'], // Express provides the client's User-Agent string automatically
        // If you added a 'metadata' field to your FunnelEvent schema, uncomment and use this:
        // metadata: metadata || null
    };

    // Create the new FunnelEvent document in the database
    const funnelEvent = await FunnelEvent.create(eventData);

    // Send a success response
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

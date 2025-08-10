// D:\PRJ_YCT_Final\controllers\automationRuleController.js

const AutomationRule = require('../schema/AutomationRule');
// The publishEvent function is not needed here
// const { publishEvent } = require('../services/rabbitmqProducer');

/**
 * @desc Create a new automation rule.
 * @route POST /api/automation-rules
 * @access Private (Protected by auth middleware)
 */
exports.createRule = async (req, res) => {
    try {
        const { name, coachId, triggerEvent, triggerCondition, actions } = req.body;

        // Get the createdBy ID from the authenticated user
        const createdBy = req.user.id;
        
        // Create the new rule in MongoDB
        const newRule = new AutomationRule({ name, coachId, triggerEvent, triggerCondition, actions, createdBy });
        await newRule.save();

        console.log(`[AutomationRuleController] New automation rule created: "${newRule.name}" (ID: ${newRule._id}) by coach ${newRule.coachId}.`);
        
        res.status(201).json(newRule);
    } catch (error) {
        console.error('Error creating automation rule:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * @desc Get all automation rules
 * @route GET /api/automation-rules
 * @access Private
 */
exports.getRules = async (req, res) => {
    try {
        const rules = await AutomationRule.find({});
        res.status(200).json(rules);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * @desc Get a single automation rule by ID
 * @route GET /api/automation-rules/:id
 * @access Private
 */
exports.getRuleById = async (req, res) => {
    try {
        const rule = await AutomationRule.findById(req.params.id);
        if (!rule) {
            return res.status(404).json({ message: 'Rule not found' });
        }
        res.status(200).json(rule);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * @desc Update an existing automation rule
 * @route PUT /api/automation-rules/:id
 * @access Private
 */
exports.updateRule = async (req, res) => {
    try {
        const rule = await AutomationRule.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!rule) {
            return res.status(404).json({ message: 'Rule not found' });
        }
        res.status(200).json(rule);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * @desc Delete an automation rule
 * @route DELETE /api/automation-rules/:id
 * @access Private
 */
exports.deleteRule = async (req, res) => {
    try {
        const rule = await AutomationRule.findByIdAndDelete(req.params.id);
        if (!rule) {
            return res.status(404).json({ message: 'Rule not found' });
        }
        res.status(200).json({ message: 'Rule deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
};
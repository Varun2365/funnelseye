// D:\PRJ_YCT_Final\controllers\automationRuleController.js

const AutomationRule = require('../schema/AutomationRule'); // Your AutomationRule Mongoose model

/**
 * @desc    Create a new Automation Rule
 * @route   POST /api/automation-rules
 * @access  Private (Coaches/Admins)
 */
const createAutomationRule = async (req, res) => {
    try {
        // req.user.id should be set by your authentication middleware
        const coachId = req.user.id;

        // Extract rule details from the request body
        const { name, description, triggerEvent, conditions, actions, isActive = true } = req.body;

        // Basic validation (you might want more detailed schema validation or Joi/Yup)
        if (!name || !triggerEvent || !actions || !Array.isArray(actions) || actions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Name, triggerEvent, and at least one action are required.'
            });
        }

        // Validate each action within the array (basic check)
        for (const action of actions) {
            if (!action.type || !action.config) {
                return res.status(400).json({
                    success: false,
                    message: 'Each action must have a "type" and "config" field.'
                });
            }
            // Add more specific validation for action.config based on action.type if needed
        }

        // Create a new AutomationRule document
        const newRule = new AutomationRule({
            name,
            description,
            triggerEvent,
            conditions: conditions || [], // Default to empty array if not provided
            actions,
            isActive,
            createdBy: coachId // Assign the coach who is creating the rule
        });

        // Save the rule to the database
        await newRule.save();

        console.log(`[AutomationRuleController] New automation rule created: "${newRule.name}" (ID: ${newRule._id}) by coach ${coachId}`);

        res.status(201).json({
            success: true,
            message: 'Automation rule created successfully.',
            data: newRule
        });

    } catch (error) {
        console.error('[AutomationRuleController] Error creating automation rule:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ')
            });
        }
        res.status(500).json({
            success: false,
            message: 'Server Error. Could not create automation rule.',
            error: error.message
        });
    }
};

// You can add more functions here for getRules, getRuleById, updateRule, deleteRule later
// For now, we'll just expose createAutomationRule
module.exports = {
    createAutomationRule
};
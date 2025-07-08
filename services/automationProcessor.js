// services/automationProcessor.js
const funnelseyeEventEmitter = require('./eventEmitterService'); // Adjust path as needed
const AutomationRule = require('../schema/AutomationRule'); // Adjust path as needed for your schema

// This function will be responsible for executing a single action
// We'll expand on this in the next mini-goal (Mini-Goal 2.4.4)
const executeAutomationAction = async (action, eventData) => {
    console.log(`[AutomationProcessor] Preparing to execute action: ${action.type}`);
    console.log(`[AutomationProcessor] Action config:`, action.config);
    console.log(`[AutomationProcessor] Event data:`, eventData);

    // TODO: In Mini-Goal 2.4.4, we will implement the actual logic for
    // different action types (e.g., SEND_WHATSAPP_MESSAGE, CREATE_TASK).
    // For now, this is a placeholder.
    switch (action.type) {
        case 'LEAD_CREATED':
            console.log(`[AutomationProcessor] Simulating sending WhatsApp message for lead: ${eventData.leadData ? eventData.leadData.firstName : 'N/A'}`);
            // Example of how you might pass data:
            // const whatsappService = require('./whatsappService');
            // await whatsappService.sendTemplateMessage(action.config.templateId, eventData.leadData.contactNumber, action.config.parameters, eventData);
            break;
        case 'CREATE_TASK':
            console.log(`[AutomationProcessor] Simulating creating task for coach related to lead: ${eventData.leadId}`);
            // Example:
            // const taskService = require('./taskService');
            // await taskService.createTask(action.config.description, action.config.assigneeId, eventData);
            break;
        case 'UPDATE_LEAD_STATUS':
             console.log(`[AutomationProcessor] Simulating updating lead status to: ${action.config.newStatus} for lead: ${eventData.leadId}`);
             // Example:
             // const leadService = require('./leadService'); // careful to avoid circular dependency
             // await leadService.updateLeadStatusDirectly(eventData.leadId, action.config.newStatus);
            break;
        // ... add more cases for other action types
        default:
            console.warn(`[AutomationProcessor] Unknown action type: ${action.type}. No action performed.`);
    }
};

// This is the main function that listens for events and processes rules
const initAutomationProcessor = () => {
    // Listen for all events that might be triggers
    // We use a wildcard listener for demonstration, but you could attach to specific events
    // funnelseyeEventEmitter.on('LEAD_CREATED', async (eventData) => { ... });
    // funnelseyeEventEmitter.on('FORM_SUBMITTED', async (eventData) => { ... });
    // ... or a single listener for all with eventName as first arg

    console.log('[AutomationProcessor] Initializing and listening for events...');

    // The 'eventName' will be the first argument passed by .emit()
    funnelseyeEventEmitter.on('LEAD_CREATED', async (eventName, eventData) => { // Using a simple pattern to catch all events
        console.log(`[AutomationProcessor] Event received: ${eventName}`);
        // console.log('Event Data:', eventData); // Uncomment for detailed debugging

        try {
            // Find active automation rules that match the emitted event
            const matchingRules = await AutomationRule.find({
                triggerEvent: eventName,
                isActive: true
            });

            if (matchingRules.length === 0) {
                console.log(`[AutomationProcessor] No active automation rules found for event: ${eventName}`);
                return;
            }

            console.log(`[AutomationProcessor] Found ${matchingRules.length} matching rules for event: ${eventName}`);

            // Process each matching rule
            for (const rule of matchingRules) {
                console.log(`[AutomationProcessor] Processing Rule: "${rule.name}"`);

                // TODO: Add logic here for 'conditions' if you implement them in schema
                // For now, it proceeds directly to actions

                // Execute each action defined in the rule
                for (const action of rule.actions) {
                    await executeAutomationAction(action, eventData); // Pass eventData for action configuration
                }
            }
        } catch (error) {
            console.error(`[AutomationProcessor] Error processing automation for event ${eventName}:`, error);
        }
    });

    // Special listener for all events for debugging (optional)
    // funnelseyeEventEmitter.on('newListener', (event, listener) => {
    //     console.log(`Event Listener Added: ${event}`);
    // });
};

module.exports = {
    initAutomationProcessor
};
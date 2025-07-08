// D:\PRJ_YCT_Final\services\automationProcessor.js
const funnelseyeEventEmitter = require('./eventEmitterService');
const AutomationRule = require('../schema/AutomationRule'); // Needed to find rules
const { sendCoachMessage, isClientConnected } = require('./whatsappManager'); // Your Baileys integration
const { parseTemplateString } = require('../utils/templateParser'); // The utility we just created
const Lead = require('../schema/Lead'); // Needed for UPDATE_LEAD_STATUS action

/**
 * Executes a single automation action based on its type and configuration.
 * This is where the actual work for each action (like sending a WhatsApp message) happens.
 *
 * @param {object} action - The action object from an AutomationRule (e.g., { type: 'SEND_WHATSAPP', config: { ... } }).
 * @param {object} eventData - The full event payload that triggered the automation (e.g., { eventType: 'LEAD_CREATED', leadData: { ... }, coachId: '...' }).
 */
const executeAutomationAction = async (action, eventData) => {
    console.log(`\n[AutomationProcessor] Preparing to execute action: ${action.type}`);
    console.log(`[AutomationProcessor] Action config:`, action.config);
    console.log(`[AutomationProcessor] Event data for context:`, eventData);

    try {
        switch (action.type) {
            case 'SEND_WHATSAPP': // <-- CORRECTED: This now matches your schema enum
                // Get the coachId from the eventData. This tells us which coach's WhatsApp to use.
                const coachId = eventData.coachId;
                if (!coachId) {
                    console.warn(`[AutomationProcessor] SEND_WHATSAPP: No 'coachId' found in eventData. Cannot determine which WhatsApp client to use. Skipping.`);
                    return;
                }

                // Check if the coach's Baileys client is currently connected and ready.
                if (!isClientConnected(coachId)) {
                    console.warn(`[AutomationProcessor] SEND_WHATSAPP: Coach ${coachId}'s WhatsApp client is not connected or ready. Skipping message sending.`);
                    // You might want to log this as a higher priority or trigger an alert in a real system.
                    return;
                }

                // Determine the recipient's phone number. 'recipientField' in config tells us where to find it.
                // Assuming 'leadData' exists and contains the phone field, defaulting to 'phone'
                const recipientPhoneField = action.config.recipientField || 'phone';
                const recipientPhoneNumber = eventData.leadData ? eventData.leadData[recipientPhoneField] : null;

                if (!recipientPhoneNumber) {
                    console.warn(`[AutomationProcessor] SEND_WHATSAPP: No phone number found in leadData.${recipientPhoneField} for lead ID: ${eventData.leadId}. Skipping.`);
                    return;
                }

                // Get the message body from the rule's config.
                if (!action.config.message) { // Changed from messageBody to message as per recent config
                    console.warn(`[AutomationProcessor] SEND_WHATSAPP: No 'message' defined in the automation rule's config for action type ${action.type}. Skipping.`);
                    return;
                }

                // Use the templateParser to replace variables in the message content.
                // It uses the full 'eventData' to resolve {{leadData.name}}, {{coachId}}, etc.
                const messageContent = parseTemplateString(action.config.message, eventData);

                console.log(`[AutomationProcessor] Attempting to send WhatsApp message via Baileys for coach ${coachId} to ${recipientPhoneNumber}: "${messageContent}"`);
                // Call the function from your whatsappManager to send the message.
                await sendCoachMessage(coachId, recipientPhoneNumber, messageContent);
                console.log(`[AutomationProcessor] Successfully sent WhatsApp message for coach ${coachId} to ${recipientPhoneNumber}.`);
                break;

            case 'CREATE_TASK':
                console.log(`[AutomationProcessor] Simulating creating task for lead: ${eventData.leadId}`);
                // Placeholder: In a real application, you'd add logic here to create a task in your database.
                // This would typically involve:
                // - Importing your Task model or a Task service.
                // - Extracting details like `taskTitle`, `description`, `assigneeId`, `priority` from `action.config`.
                // - Using `parseTemplateString` for dynamic task descriptions.
                // - Saving the new task to your database.
                break;

            case 'UPDATE_LEAD_STATUS':
                console.log(`[AutomationProcessor] Attempting to update lead status for lead: ${eventData.leadId}`);
                if (!eventData.leadId || !action.config.newStatus) {
                    console.warn(`[AutomationProcessor] UPDATE_LEAD_STATUS: Missing leadId in eventData or 'newStatus' in action config. Skipping.`);
                    return;
                }
                try {
                    const updatedLead = await Lead.findByIdAndUpdate(
                        eventData.leadId,
                        { status: action.config.newStatus },
                        { new: true, runValidators: true } // 'new: true' returns the updated doc; 'runValidators' ensures schema validation
                    );
                    if (updatedLead) {
                        console.log(`[AutomationProcessor] Successfully updated lead ${eventData.leadId} status to "${action.config.newStatus}".`);
                        // If this update itself should trigger other automations, you'd emit another event here:
                        // funnelseyeEventEmitter.emit('trigger', {
                        //     eventType: 'LEAD_STATUS_CHANGED',
                        //     leadId: updatedLead._id.toString(),
                        //     leadData: updatedLead.toObject(),
                        //     coachId: updatedLead.coachId.toString(),
                        //     previousStatus: eventData.leadData.status // Pass previous status if known
                        // });
                    } else {
                        console.warn(`[AutomationProcessor] UPDATE_LEAD_STATUS: Lead with ID ${eventData.leadId} not found. Status not updated.`);
                    }
                } catch (updateError) {
                    console.error(`[AutomationProcessor] Error updating lead status for ${eventData.leadId}:`, updateError.message);
                }
                break;

            case 'CREATE_EMAIL_MESSAGE':
                console.log(`[AutomationProcessor] Simulating sending email for lead: ${eventData.leadId}`);
                // Placeholder: Implement email sending integration here (e.g., using Nodemailer, SendGrid, Mailgun).
                break;

            case 'CREATE_SMS_MESSAGE':
                console.log(`[AutomationProcessor] Simulating sending SMS for lead: ${eventData.leadId}`);
                // Placeholder: Implement SMS sending integration here (e.g., using Twilio, MessageBird).
                break;

            case 'ASSIGN_LEAD_TO_COACH':
                console.log(`[AutomationProcessor] Simulating assigning lead ${eventData.leadId} to coach ${action.config.newCoachId}`);
                // Placeholder: Logic to update the lead's assigned coach.
                break;

            default:
                console.warn(`[AutomationProcessor] Unknown action type: ${action.type}. No action performed.`);
        }
    } catch (error) {
        console.error(`[AutomationProcessor] CRITICAL ERROR executing action ${action.type} for eventType ${eventData.eventType} (Lead ID: ${eventData.leadId}):`, error);
        // This is a crucial point for error handling in a production system.
        // You'd typically log this error to an external service (Sentry, New Relic)
        // and possibly send an alert to an administrator.
    }
};

/**
 * Initializes the automation processor. This function sets up the event listener
 * that will react to events emitted by other parts of your application.
 */
const initAutomationProcessor = () => {
    console.log('[AutomationProcessor] Initializing. Listening for generic "trigger" events...');

    // The 'trigger' event is designed as a universal entry point for all automations.
    // When any part of your app emits 'trigger' with an eventType, this listener activates.
    funnelseyeEventEmitter.on('trigger', async (payload) => {
        const eventName = payload.eventType; // e.g., 'LEAD_CREATED', 'LEAD_STATUS_CHANGED'
        const eventData = payload; // This is the full context data passed with the event

        if (!eventName) {
            console.warn('[AutomationProcessor] Received a "trigger" event without an "eventType" field in its payload. Skipping.');
            return;
        }

        console.log(`\n[AutomationProcessor] Generic 'trigger' event received. Specific eventType: ${eventName}`);

        try {
            // Find all active automation rules that are configured to trigger on this specific eventName.
            const matchingRules = await AutomationRule.find({
                triggerEvent: eventName,
                isActive: true // Only process active rules
            });

            if (matchingRules.length === 0) {
                console.log(`[AutomationProcessor] No active automation rules found for eventType: ${eventName}`);
                return;
            }

            console.log(`[AutomationProcessor] Found ${matchingRules.length} matching rules for eventType: ${eventName}`);

            // Iterate through each rule that matches the triggered event.
            for (const rule of matchingRules) {
                console.log(`[AutomationProcessor] Processing Rule: "${rule.name}" (ID: ${rule._id})`);

                // TODO: (Future Enhancement) Implement 'conditions' evaluation here.
                // If your AutomationRule schema has a 'conditions' field, you'd evaluate them here.
                // If conditions are not met, you would 'continue' to the next rule.
                // Example: if (!evaluateConditions(rule.conditions, eventData)) { console.log('Rule conditions not met. Skipping rule.'); continue; }

                // For each matching rule, execute all its defined actions.
                for (const action of rule.actions) {
                    await executeAutomationAction(action, eventData);
                }
                console.log(`[AutomationProcessor] Finished processing Rule: "${rule.name}".`);
            }
        } catch (error) {
            console.error(`[AutomationProcessor] CRITICAL ERROR during automation rule processing for eventType ${eventName}:`, error);
        }
    });

    console.log(`[AutomationProcessor] Automation processor is ready to process events.`);
};

module.exports = {
    initAutomationProcessor
};
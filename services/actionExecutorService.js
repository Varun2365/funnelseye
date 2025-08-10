// D:\PRJ_YCT_Final\services\actionExecutorService.js

// --- Imports for your Mongoose Schemas ---
const Lead = require('../schema/Lead');
const Coach = require('../schema/Coach');
const Task = require('../schema/Task');
const Funnel = require('../schema/Funnel');
const { sendWhatsappMessage } = require('./whatsappService'); // Assuming a dedicated service for WhatsApp
// --- Dummy or Placeholder Services ---
const emailService = require('./emailService'); // Assume a service for sending emails

/**
 * Sends a WhatsApp message to a lead.
 * @param {object} config - The action configuration from the rule (e.g., message template).
 * @param {object} eventPayload - The data from the triggering event.
 */
async function sendWhatsAppMessage(config, eventPayload) {
    const recipientNumber = eventPayload.lead.contactInfo?.whatsapp;
    if (!recipientNumber) {
        throw new Error('Recipient number not found in event payload.');
    }
    if (!config.templateName) {
        throw new Error('WhatsApp template name is required in action config.');
    }

    console.log(`[ActionService] Sending WhatsApp message to ${recipientNumber} using template "${config.templateName}".`);
    await sendWhatsappMessage({
        recipientNumber,
        templateName: config.templateName,
        // The eventPayload might contain template parameters, e.g., lead.name
        templateParameters: { name: eventPayload.lead.name } 
    });
    console.log('[ActionService] WhatsApp message sent successfully!');
}

/**
 * Sends an email to a lead.
 * @param {object} config - The action configuration from the rule (e.g., subject, body).
 * @param {object} eventPayload - The data from the triggering event.
 */
async function sendEmail(config, eventPayload) {
    const recipientEmail = eventPayload.lead.contactInfo?.email;
    if (!recipientEmail) {
        throw new Error('Recipient email not found in event payload.');
    }

    console.log(`[ActionService] Sending email to ${recipientEmail} with subject "${config.subject}".`);
    await emailService.sendEmail({
        to: recipientEmail,
        subject: config.subject,
        body: config.body
    });
    console.log('[ActionService] Email sent successfully!');
}

/**
 * Updates a lead's score in the database.
 * @param {object} config - The action configuration from the rule (e.g., score value).
 * @param {object} eventPayload - The data from the triggering event.
 */
async function updateLeadScore(config, eventPayload) {
    const leadId = eventPayload.lead._id;
    const { scoreIncrement } = config;

    if (!leadId) {
        throw new Error('Lead ID not found in the event payload.');
    }
    if (typeof scoreIncrement !== 'number') {
        throw new Error('Invalid configuration for update_lead_score. Missing or invalid scoreIncrement.');
    }
    
    console.log(`[ActionService] Updating lead score for lead with ID ${leadId} by ${scoreIncrement}...`);
    await Lead.findByIdAndUpdate(leadId, { $inc: { score: scoreIncrement } });

    console.log('[ActionService] Lead score updated successfully!');
}

/**
 * Moves a lead to a new funnel stage.
 * @param {object} config - The action configuration from the rule (e.g., new stage name).
 * @param {object} eventPayload - The data from the triggering event.
 */
async function moveLeadToFunnelStage(config, eventPayload) {
    const leadId = eventPayload.lead._id;
    const { newStage } = config;

    if (!leadId) {
        throw new Error('Lead ID not found in event payload.');
    }
    if (!newStage) {
        throw new Error('New funnel stage is required in action config.');
    }

    console.log(`[ActionService] Moving lead ${leadId} to funnel stage "${newStage}".`);
    await Lead.findByIdAndUpdate(leadId, { currentFunnelStage: newStage });

    console.log('[ActionService] Lead moved to new funnel stage successfully!');
}

/**
 * Creates a new task assigned to a coach for a specific lead.
 * @param {object} config - The action configuration from the rule.
 * @param {object} eventPayload - The data from the triggering event.
 */
async function createNewTask(config, eventPayload) {
    const { lead, coach } = eventPayload;
    const { taskName, taskDescription, dueDate } = config;

    if (!lead || !coach) {
        throw new Error('Required lead or coach data not found in event payload.');
    }

    console.log('[ActionExecutor] Creating a new task...');
    await Task.create({
        name: taskName,
        description: taskDescription,
        assignedTo: coach._id,
        relatedLead: lead._id,
        dueDate: dueDate
    });
    console.log('[ActionExecutor] New task created successfully!');
}

/**
 * Adds credits to a coach's account.
 * @param {object} config - The action configuration from the rule (e.g., credit amount).
 * @param {object} eventPayload - The data from the triggering event.
 */
async function addCoachCredits(config, eventPayload) {
    const coachId = eventPayload.coach._id;
    const { creditAmount } = config;

    if (!coachId) {
        throw new Error('Coach ID not found in event payload.');
    }
    if (typeof creditAmount !== 'number') {
        throw new Error('Invalid credit amount specified in action config.');
    }

    console.log(`[ActionService] Adding ${creditAmount} credits to coach ID ${coachId}.`);
    await Coach.findByIdAndUpdate(coachId, { $inc: { credits: creditAmount } });
    console.log('[ActionService] Coach credits updated successfully!');
}

/**
 * Main dispatcher to execute the correct action based on its type.
 * @param {object} payload - The message payload from the RabbitMQ actions queue.
 */
async function executeAutomationAction(payload) {
    const { actionType, config, payload: eventPayload } = payload;
    
    console.log(`[ActionExecutor] Dispatching action: ${actionType}`);

    switch (actionType) {
        case 'send_whatsapp_message':
            await sendWhatsAppMessage(config, eventPayload);
            break;
        
        case 'send_email':
            await sendEmail(config, eventPayload);
            break;

        case 'update_lead_score':
            await updateLeadScore(config, eventPayload);
            break;
        
        case 'move_lead_to_stage':
            await moveLeadToFunnelStage(config, eventPayload);
            break;
            
        case 'create_new_task':
            await createNewTask(config, eventPayload);
            break;
        
        case 'add_coach_credits':
            await addCoachCredits(config, eventPayload);
            break;
        
        default:
            console.error(`[ActionExecutor] Unknown action type: ${actionType}`);
            throw new Error(`Unknown action type: ${actionType}`); // Throwing an error here will NACK the message
    }
}

module.exports = {
    executeAutomationAction
};
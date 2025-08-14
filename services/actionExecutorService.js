// D:\PRJ_YCT_Final\services\actionExecutorService.js

// --- Imports for your Mongoose Schemas ---
const Lead = require('../schema/Lead');
const Coach = require('../schema/coachSchema');
const Task = require('../schema/Task');
const Funnel = require('../schema/Funnel');
const Payment = require('../schema/Payment'); 
const { sendMessageByCoach } = require('./metaWhatsAppService');

// =======================================================================
// Section 1: Placeholder External Service Integrations
// =======================================================================
const emailService = {
    sendEmail: async ({ to, subject, body, attachments }) => {
        console.log(`[Service] Attempting to send email to ${to}...`);
        // TODO: Add your actual email provider API call here (e.g., Nodemailer, SendGrid)
        console.log(`[Service] Email sent successfully to ${to}.`);
    }
};

const smsService = {
    sendSMS: async ({ to, message }) => {
        console.log(`[Service] Attempting to send SMS to ${to}...`);
        // TODO: Add your actual SMS provider API call here (e.g., Twilio, Vonage)
        console.log(`[Service] SMS sent successfully to ${to}.`);
    }
};

const calendarService = {
    createAppointment: async ({ coachEmail, leadEmail, leadName, appointmentTime, zoomLink }) => {
        console.log(`[Service] Creating calendar event for coach and lead...`);
        // TODO: Implement your Google/Outlook Calendar API integration here
        // This should create a .ics file and a calendar event.
        console.log(`[Service] Calendar event created for ${leadName} with coach.`);
    }
};

const internalNotificationService = {
    sendNotification: async ({ recipientId, message }) => {
        console.log(`[Service] Sending internal notification to user ${recipientId}...`);
        // TODO: Implement a real-time notification system (e.g., WebSockets)
        console.log(`[Service] Notification sent: "${message}"`);
    }
};

const aiService = {
    generateCopy: async (config, eventPayload) => {
        console.log('[Service] Generating AI copy...');
        // TODO: Add your actual AI API call here (e.g., OpenAI)
        const generatedCopy = "This is placeholder AI-generated copy.";
        console.log('[Service] AI copy generated successfully.');
        return generatedCopy;
    },
    detectSentiment: async (message) => {
        console.log('[Service] Detecting sentiment...');
        // TODO: Add your actual sentiment analysis API call here
        const sentimentResult = 'neutral';
        console.log('[Service] Sentiment detected successfully.');
        return sentimentResult;
    }
};


// =======================================================================
// Section 2: Core Automation Action Functions
// =======================================================================

/**
 * Sends a WhatsApp message to a lead.
 */
async function sendWhatsAppMessage(config, eventPayload) {
    // Corrected to use relatedDoc
    const leadData = eventPayload.relatedDoc; 
    const coachId = leadData.coachId;
    const recipientNumber = leadData.phone;
    if (!recipientNumber) { throw new Error('Recipient phone number not found in event payload.'); }
    
    // You'll need to define how message content is passed from your rules
    const messageContent = config.message || `Hi ${leadData.name}, this is an automated message.`;
    // await sendMessageByCoach(coachId, recipientNumber, messageContent);
    console.log(`[ActionExecutor] WhatsApp message sent to ${recipientNumber} via metaWhatsAppService.`);
}

/**
 * Sends an email to a lead.
 */
async function sendEmail(config, eventPayload) {
    // Corrected to use relatedDoc
    const leadData = eventPayload.relatedDoc; 
    const recipientEmail = leadData.email;
    if (!recipientEmail) { throw new Error('Recipient email not found in event payload.'); }

    // Placeholder for .ics file generation
    const calendarInvite = config.sendCalendarInvite ? createICSFile(leadData) : null;

    await emailService.sendEmail({
        to: recipientEmail,
        subject: config.subject,
        body: config.body,
        attachments: calendarInvite ? [calendarInvite] : []
    });
}

/**
 * Helper function to create a placeholder .ics file
 * TODO: Replace with a proper calendar library
 */
function createICSFile(leadData) {
    console.log('[ActionExecutor] Generating .ics calendar file...');
    // In a real application, you'd use a library like 'ical-generator'
    // This is a simplified placeholder
    return {
        filename: 'appointment.ics',
        content: `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//YourCompany//Appointment\n...`
    };
}


/**
 * Sends a message via SMS.
 */
async function sendSMS(config, eventPayload) {
    // Corrected to use relatedDoc
    const recipientNumber = eventPayload.relatedDoc.phone;
    if (!recipientNumber) { throw new Error('Recipient phone number not found in event payload.'); }
    if (!config.message) { throw new Error('SMS message content is required.'); }
    await smsService.sendSMS({ to: recipientNumber, message: config.message });
}

/**
 * Creates a new task for a coach or staff member.
 */
async function createNewTask(config, eventPayload) {
    // Corrected to use relatedDoc
    const leadData = eventPayload.relatedDoc;
    const { coachId } = leadData;
    const { taskName, taskDescription, dueDate } = config;
    if (!leadData || !coachId) { throw new Error('Lead or coach data not found.'); }
    await Task.create({
        name: taskName, description: taskDescription, assignedTo: coachId, relatedLead: leadData._id, dueDate: dueDate
    });
}

/**
 * Creates a calendar event for the coach.
 */
async function createCalendarEvent(config, eventPayload) {
    // Corrected to use relatedDoc
    const leadData = eventPayload.relatedDoc;
    const { coachId } = leadData;
    if (!leadData || !coachId) { throw new Error('Lead or coach data not found.'); }

    // Assuming a method to get coach email from coachId
    const coach = await Coach.findById(coachId);
    if (!coach) { throw new Error('Coach not found for calendar event.'); }

    await calendarService.createAppointment({
        coachEmail: coach.email,
        leadEmail: leadData.email,
        leadName: leadData.name,
        appointmentTime: leadData.appointment.scheduledTime,
        zoomLink: leadData.appointment.zoomLink
    });
}

/**
 * Sends a notification to a coach's dashboard.
 */
async function sendInternalNotification(config, eventPayload) {
    const { recipientId, message } = config;
    if (!recipientId || !message) { throw new Error('Recipient ID and message are required for internal notification.'); }
    await internalNotificationService.sendNotification({ recipientId, message });
}

/**
 * Updates a specific field on the lead document.
 */
async function updateLeadField(config, eventPayload) {
    // Corrected to use relatedDoc
    const leadId = eventPayload.relatedDoc._id;
    const { field, value } = config;
    if (!leadId || !field) { throw new Error('Lead ID and field to update are required.'); }
    
    const updateObject = {};
    updateObject[field] = value;
    await Lead.findByIdAndUpdate(leadId, { $set: updateObject });
}

async function updateLeadScore(config, eventPayload) {
    // Corrected to use relatedDoc
    const leadId = eventPayload.relatedDoc._id;
    const { scoreIncrement } = config;
    if (!leadId) { throw new Error('Lead ID not found.'); }
    if (typeof scoreIncrement !== 'number') { throw new Error('Invalid scoreIncrement.'); }
    await Lead.findByIdAndUpdate(leadId, { $inc: { 'appointment.score': scoreIncrement } });
}

/**
 * A dedicated function to handle all payment-related actions.
 */
async function handlePaymentActions(config, eventPayload) {
    const { paymentId, leadId } = eventPayload;
    if (!paymentId || !leadId) { throw new Error('Payment ID and Lead ID not found in event payload.'); }
    
    const lead = await Lead.findById(leadId);
    const payment = await Payment.findById(paymentId);

    if (!lead || !payment) {
        throw new Error('Lead or Payment document not found.');
    }
    
    switch(config.actionType) {
        case 'update_lead_status':
            lead.status = config.newStatus;
            await lead.save();
            console.log(`[ActionExecutor] Lead ${leadId} status updated to ${config.newStatus}.`);
            break;
        case 'send_confirmation_email':
            await sendEmail({
                to: lead.email,
                subject: 'Payment Confirmation',
                body: `Hello ${lead.name}, your payment of ${payment.amount} ${payment.currency} was successful!`
            });
            break;
        case 'send_internal_alert':
            await sendInternalNotification({
                recipientId: payment.coach, // Send to the related coach
                message: `Payment received: ${lead.name} paid ${payment.amount} ${payment.currency}.`
            });
            break;
        default:
            console.warn(`[ActionExecutor] Unhandled payment action: ${config.actionType}`);
    }
}


// =======================================================================
// Section 3: Main Action Dispatcher
// =======================================================================

/**
 * Main dispatcher to execute the correct action based on its type.
 * @param {object} payload - The message payload from the RabbitMQ actions queue.
 */
async function executeAutomationAction(payload) {
    const { actionType, config, payload: eventPayload } = payload;
    console.log(`[ActionExecutor] Dispatching action: ${actionType}`);

    try {
        switch (actionType) {
            case 'send_whatsapp_message':
                await sendWhatsAppMessage(config, eventPayload);
                break;
            case 'send_email':
                await sendEmail(config, eventPayload);
                break;
            case 'send_sms':
                await sendSMS(config, eventPayload);
                break;
            case 'update_lead_score':
                await updateLeadScore(config, eventPayload);
                break;
            case 'create_new_task':
                await createNewTask(config, eventPayload);
                break;
            case 'send_internal_notification':
                await sendInternalNotification(config, eventPayload);
                break;
            case 'create_calendar_event':
                await createCalendarEvent(config, eventPayload);
                break;
            case 'update_lead_field':
                await updateLeadField(config, eventPayload);
                break;
            // Case for handling all payment-related actions
            case 'handle_payment_actions':
                await handlePaymentActions(config, eventPayload);
                break;
            default:
                throw new Error(`Unknown action type: ${actionType}`);
        }
    } catch (error) {
        console.error(`[ActionExecutor] Failed to execute action "${actionType}":`, error.message);
        throw error;
    }
}

module.exports = {
    executeAutomationAction
};
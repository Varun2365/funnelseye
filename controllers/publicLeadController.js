// PRJ_YCT_Final/controllers/publicLeadController.js

const Lead = require('../schema/Lead');
const Funnel = require('../schema/Funnel');
const FormSubmissionMessage = require('../schema/FormSubmissionMessage'); // <-- Corrected path and schema name
const funnelseyeEventEmitter = require('../services/eventEmitterService');

/**
 * Helper function to determine lead temperature based on submitted data.
 * CUSTOMIZE THIS LOGIC HEAVILY based on your specific funnel forms and qualification criteria.
 *
 * @param {object} formData - The data submitted by the lead via the form (e.g., req.body).
 * @param {object} funnelInfo - The funnel document associated with the submission.
 * @returns {('Cold'|'Warm'|'Hot')} The determined lead temperature.
 */
function determineLeadTemperature(formData, funnelInfo) {
    const { email, phone, message, interestLevel, budget, timeline, source } = formData;

    let temperature = 'Warm'; // Start with schema default, then apply rules

    // --- Rules for "Hot" leads ---
    // Rule H1: Explicit High Interest Level (if collected by form, e.g., a dropdown value)
    if (interestLevel && ['very interested', 'ready to buy', 'high intent'].includes(interestLevel.toLowerCase())) {
        temperature = 'Hot';
    }

    // Rule H2: Strong Call to Action or Urgent Keywords in Message
    if (message && (
        message.toLowerCase().includes('schedule call') ||
        message.toLowerCase().includes('urgent') ||
        message.toLowerCase().includes('need help now') ||
        message.toLowerCase().includes('book a demo') ||
        message.toLowerCase().includes('pricing') ||
        message.toLowerCase().includes('quote')
    )) {
        temperature = 'Hot'; // Overrides previous if set to Warm/Cold
    }

    // Rule H3: Both Email and Phone provided AND some specific intent
    // This is a common indicator of a serious lead.
    if (email && phone && (temperature === 'Warm' || temperature === 'Cold') && (message || interestLevel)) {
         temperature = 'Hot'; // Upgrade to Hot if they provide both and show any intent
    }

    // Rule H4: Specific Funnel Type (e.g., a "Request a Quote" funnel implies high intent)
    if (funnelInfo && funnelInfo.name && funnelInfo.name.toLowerCase().includes('quote request')) {
        if (temperature !== 'Hot') { // Don't downgrade if already Hot
            temperature = 'Hot';
        }
    }


    // --- Rules for "Cold" leads ---
    // Rule C1: Minimal Information (Overrides Hot/Warm if it's truly minimal and no strong signals were met above)
    // If they didn't provide email OR phone, it's definitely cold for contact.
    if (!email && !phone) {
        temperature = 'Cold';
    }
    // If only one contact method, and message is short/generic, and no high interest
    else if ((!email || !phone) && (!message || message.length < 15) && (!interestLevel || ['just Browse', 'low'].includes(interestLevel.toLowerCase()))) {
        temperature = 'Cold';
    }

    // Rule C2: Explicit Low Interest Level
    if (interestLevel && ['just Browse', 'low'].includes(interestLevel.toLowerCase())) {
        // Only set to Cold if it wasn't set to Hot by other rules
        if (temperature !== 'Hot') {
            temperature = 'Cold';
        }
    }


    console.log(`[QUALIFICATION] Lead from ${funnelInfo.name || 'unknown funnel'} with email: ${email || 'N/A'}, phone: ${phone || 'N/A'}. Determined Temperature: ${temperature}`);
    return temperature;
}


/**
 * @desc    Captures a new lead from a public funnel form submission.
 * @route   POST /api/public/leads/capture
 * @access  Public (no authentication required)
 *
 * This endpoint expects a `funnelId` from the form to correctly associate the lead with a coach.
 * It also handles initial lead qualification and saving the form message.
 */
const captureLead = async (req, res) => {
    // Extract relevant fields from the incoming form submission
    const {
        funnelId,
        name,
        email,
        phone,
        message, // Initial message/inquiry from the form
        interestLevel, // Example: a custom field you might add to your forms
        budget,
        timeline,
        source, // Allow the form to specify source, e.g., 'WebsiteForm', 'FacebookAd'
        ...otherLeadData // Catch-all for any other custom fields like 'country', 'city'
    } = req.body;

    // Basic validation: A funnel ID is crucial, and at least one contact method is needed
    if (!funnelId || (!email && !phone)) {
        return res.status(400).json({ success: false, message: 'Funnel ID and either email or phone are required.' });
    }

    try {
        // 1. Validate the provided funnelId and retrieve the associated coachId
        const funnel = await Funnel.findById(funnelId);
        if (!funnel) {
            return res.status(404).json({ success: false, message: 'Funnel not found for the provided ID.' });
        }
        const coachId = funnel.coachId; // This links the lead to the coach who owns the funnel

        // 2. Determine the initial lead temperature based on submitted data and funnel info
        const initialLeadTemperature = determineLeadTemperature(req.body, funnel);
        const now = new Date();

        // 3. Check for existing leads by email or phone under this specific coach
        // We search within the coach's leads to avoid conflicts if different coaches have leads with the same email/phone
        let existingLead = await Lead.findOne({
            coachId: coachId,
            $or: [
                { email: email ? email.toLowerCase() : null }, // Use lowercase for email search
                { phone: phone || null }
            ]
        });

        if (existingLead) {
            // Lead already exists: Update their information
            console.log(`[PUBLIC_CAPTURE] Existing lead found for Coach ${coachId}, updating: ${existingLead.name || existingLead.email || existingLead.phone}`);

            // Update existing lead fields, prioritizing newer data or keeping existing if new is empty
            existingLead.name = name || existingLead.name;
            existingLead.email = email ? email.toLowerCase() : existingLead.email; // Always store email lowercase
            existingLead.phone = phone || existingLead.phone;
            existingLead.source = source || existingLead.source || 'Updated via Funnel Form';

            // Append new message to notes for quick overview
            const newNoteEntry = `Form Submission (${now.toLocaleString()} from ${funnel.name || 'Unknown Funnel'}): ${message || 'No specific message.'}`;
            existingLead.notes = existingLead.notes ? `${existingLead.notes}\n\n${newNoteEntry}` : newNoteEntry;

            // --- Lead Qualification Update Logic for Existing Leads ---
            // Only "upgrade" temperature; don't downgrade automatically on subsequent submissions
            // unless your business logic explicitly requires it.
            const currentTempRank = ['Cold', 'Warm', 'Hot'].indexOf(existingLead.leadTemperature);
            const newTempRank = ['Cold', 'Warm', 'Hot'].indexOf(initialLeadTemperature);

            if (newTempRank > currentTempRank) {
                existingLead.leadTemperature = initialLeadTemperature;
            }
            // If the status is 'New' and a message was provided, consider moving to 'Contacted'
            if (existingLead.status === 'New' && message) {
                existingLead.status = 'Contacted'; // Indicates initial interaction/data received
            }
            // --- End Qualification Update Logic ---

            // Update other relevant schema fields if present in the form data
            const allowedUpdates = ['country', 'city']; // Add any other fields from your Lead schema that public forms might update
            for (const key of allowedUpdates) {
                if (otherLeadData[key] !== undefined) {
                    existingLead[key] = otherLeadData[key];
                }
            }

            await existingLead.save();

            // Save the initial message as a separate FormSubmissionMessage document if provided
            if (message) {
                const initialFormMessage = new FormSubmissionMessage({
                    lead: existingLead._id,
                    coach: coachId,
                    content: message,
                    senderInfo: { // Store original sender info from form
                        name: name,
                        email: email,
                        phone: phone
                    },
                    timestamp: now
                });
                await initialFormMessage.save();
                console.log(`[PUBLIC_CAPTURE] Initial form submission message saved for existing lead: ${existingLead.name || existingLead.email}.`);
            }

            // Emit an event that the lead was updated via a form submission
            funnelseyeEventEmitter.emit('trigger', {
                eventType: 'LEAD_UPDATED_VIA_FORM',
                leadId: existingLead._id.toString(),
                leadData: existingLead.toObject(), // Send the updated lead data
                coachId: coachId.toString(),
                funnelId: funnelId.toString(),
                timestamp: now.toISOString()
            });

            return res.status(200).json({ success: true, message: 'Lead updated successfully.', leadId: existingLead._id });

        } else {
            // New lead: Create a brand new lead document
            const newLeadData = {
                coachId: coachId,
                funnelId: funnelId,
                funnelName: funnel.name,
                name: name || email || phone || `New Lead from ${funnel.name || 'Unknown Funnel'}`, // A default name if not provided
                email: email ? email.toLowerCase() : undefined, // Ensure lowercase and undefined if null
                phone: phone,
                source: source || 'Funnel Form', // Default source
                status: 'New', // Freshly captured lead starts as 'New'
                leadTemperature: initialLeadTemperature, // Set the qualified temperature
                country: otherLeadData.country,
                city: otherLeadData.city,
                notes: message ? `Initial Form Message (${now.toLocaleString()} from ${funnel.name || 'Unknown Funnel'}): ${message}` : `Lead captured via Funnel Form (${now.toLocaleString()} from ${funnel.name || 'Unknown Funnel'}).`
            };

            const newLead = new Lead(newLeadData);
            await newLead.save();
            console.log(`[PUBLIC_CAPTURE] New lead created for Coach ${coachId}: ${newLead.name} (ID: ${newLead._id}).`);

            // Save the initial message as a FormSubmissionMessage document for conversation history
            if (message) {
                const initialFormMessage = new FormSubmissionMessage({
                    lead: newLead._id,
                    coach: coachId,
                    content: message,
                    senderInfo: { // Store original sender info from form
                        name: name,
                        email: email,
                        phone: phone
                    },
                    timestamp: now
                });
                await initialFormMessage.save();
                console.log(`[PUBLIC_CAPTURE] Initial form submission message saved for new lead: ${newLead.name}.`);
            }

            // Emit an event that a new lead was created via a form submission
            funnelseyeEventEmitter.emit('trigger', {
                eventType: 'LEAD_CREATED_VIA_FORM', // A distinct event for public form captures
                leadId: newLead._id.toString(),
                leadData: newLead.toObject(),
                coachId: coachId.toString(),
                funnelId: funnelId.toString(),
                timestamp: now.toISOString()
            });

            res.status(201).json({ success: true, message: 'Lead captured successfully.', leadId: newLead._id });
        }

    } catch (error) {
        console.error('Error in publicLeadController.captureLead:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: `Validation Error: ${messages.join(', ')}` });
        }
        // Mongoose duplicate key error (if the partial unique index catches a real duplicate)
        if (error.code === 11000) {
            // You might want to log the specific duplicated key here (email or phone)
            return res.status(409).json({ success: false, message: 'A lead with this email or phone already exists for this coach.' });
        }
        res.status(500).json({ success: false, message: 'Server error during lead capture. Please try again.' });
    }
};

// Export using object syntax
module.exports = {
    captureLead
};
// D:\PRJ_YCT_Final\services\whatsappManager.js

// --- 1. Imports ---
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const pino = require('pino'); // Baileys' logger
const qrcode = require('qrcode-terminal'); // For displaying QR in console
const fs = require('fs').promises; // For file system operations (session deletion)
const path = require('path'); // For path manipulation
const { Boom } = require('@hapi/boom'); // For handling disconnect reasons gracefully
const mimeTypes = require('mime-types'); // For determining MIME types of local files

// --- 2. Global Variables ---
// Global map to store active Baileys socket instances
const clients = new Map();
// Global map to store QR codes temporarily (before scanning)
const qrCodes = new Map();
// Socket.IO instance for real-time communication
let ioInstance = null;

// Baileys logger instance (set to 'silent' to reduce console noise, 'info' or 'debug' for more)
const logger = pino({ level: 'silent' });

// --- 3. Database Models (Corrected paths and names) ---
const Lead = require('../schema/Lead'); // Corrected path
const Message = require('../schema/Message'); // Corrected path and name (was LeadMessage)

// --- 4. Helper Functions ---

/**
 * Helper Function to Delete Baileys Session Data
 */
async function deleteSession(coachId) {
    const sessionPath = path.join(__dirname, `../baileys_auth/${coachId}`); // Baileys stores sessions here
    try {
        await fs.rm(sessionPath, { recursive: true, force: true });
        console.log(`[SESSION] Baileys session data for coach ${coachId} deleted successfully.`);
    } catch (error) {
        console.error(`[SESSION ERROR] Failed to delete Baileys session data for coach ${coachId}:`, error);
    }
}

/**
 * Helper function to clean a JID for database storage, removing ephemeral suffixes
 * and ensuring it has a single @s.whatsapp.net suffix for user JIDs.
 * @param {string} jid The JID from Baileys (e.g., '1234567890:1@s.whatsapp.net', 'groupid@g.us')
 * @returns {string} Cleaned JID (e.g., '1234567890@s.whatsapp.net', 'groupid@g.us')
 */
function cleanJidForDb(jid) {
    if (!jid) return null;

    // Handle group JIDs - they typically don't have ephemeral suffixes and already end with @g.us
    if (jid.endsWith('@g.us')) {
        return jid;
    }

    // For user JIDs, remove anything after a colon (ephemeral ID suffix)
    let cleaned = jid.split(':')[0];

    // Ensure it ends with @s.whatsapp.net
    if (!cleaned.endsWith('@s.whatsapp.net')) {
        cleaned += '@s.whatsapp.net';
    }
    return cleaned;
}


/**
 * Helper Function to Handle Incoming Messages and Save to DB
 * This function needs adaptation for Baileys' message object structure
 */
async function handleIncomingMessage(coachId, msg) {
    // Baileys message object is different from whatsapp-web.js
    // Extracting relevant info:
    const from = msg.key.remoteJid; // The sender's JID (e.g., '1234567890@s.whatsapp.net' or 'groupid@g.us')
    const isGroup = from.endsWith('@g.us');
    // For groups, msg.key.participant is the actual sender's JID in the group.
    // For DMs, msg.key.remoteJid is the sender.
    const senderRawJid = msg.key.participant || msg.key.remoteJid; // The raw sender JID
    const messageId = msg.key.id;
    // Baileys timestamp is in seconds, convert to milliseconds for Date object
    const timestamp = msg.messageTimestamp ? new Date(msg.messageTimestamp * 1000) : new Date();

    let content = '';
    let messageType = 'unknown';

    if (msg.message) {
        if (msg.message.conversation) { // Standard text message
            content = msg.message.conversation;
            messageType = 'text';
        } else if (msg.message.extendedTextMessage?.text) { // Text message with preview/reply
            content = msg.message.extendedTextMessage.text;
            messageType = 'text';
        } else if (msg.message.imageMessage) { // Image message
            content = msg.message.imageMessage.caption || 'Image message';
            messageType = 'image';
            // TODO: Implement media download here if you want to store the actual file/URL
            // const buffer = await downloadContentFromMessage(msg.message.imageMessage, 'image');
            // Save buffer to a file and store the file path/URL in message.mediaUrl
        } else if (msg.message.videoMessage) { // Video message
            content = msg.message.videoMessage.caption || 'Video message';
            messageType = 'video';
            // TODO: Implement media download here
        } else if (msg.message.documentMessage) { // Document message
            content = msg.message.documentMessage.title || msg.message.documentMessage.fileName || 'Document message';
            messageType = 'document';
            // TODO: Implement media download here
        } else if (msg.message.audioMessage) { // Audio message (can be voice note or regular audio)
            content = 'Audio message';
            messageType = msg.message.audioMessage.ptt ? 'voice_note' : 'audio'; // PTT means push-to-talk (voice note)
            // TODO: Implement media download here
        }
        // Add more message types as needed (stickerMessage, contactMessage, locationMessage etc.)
    }

    console.log(`[MESSAGE IN] Coach ${coachId} received ${messageType} message from ${from} (${senderRawJid}): ${content}`);

    try {
        // Clean the JID to get a pure phone number for DB lookup/storage
        const phoneNumber = from.replace('@s.whatsapp.net', '').replace('@g.us', '');

        let lead = await Lead.findOne({
            coachId: coachId, // Use coachId as per your schema
            phone: phoneNumber // Assuming your schema has 'phone' field for contact number
        });

        if (!lead) {
            // Create a new lead if not found, populating all required fields
            lead = new Lead({
                coachId: coachId,
                phone: phoneNumber, // Map WhatsApp number to 'phone' field
                name: isGroup ? from : phoneNumber, // Use JID for group names, phone number for DMs
                email: `whatsapp_${phoneNumber}@yct.com`, // Generated placeholder email for required field
                status: 'New', // Default status for new leads
                source: 'WhatsApp', // Mark source as WhatsApp
                leadTemperature: 'Warm' // Default lead temperature
            });
            await lead.save();
            console.log(`[DB] Created new lead: ${lead.phoneNumber} (ID: ${lead._id})`);
        }

        // Save the incoming message
        const message = new Message({ // Changed to 'Message'
            lead: lead._id,
            coach: coachId,
            messageId: messageId,
            timestamp: timestamp,
            direction: 'inbound', // Mark as incoming
            type: messageType,
            content: content,
            sender: cleanJidForDb(senderRawJid), // Clean the sender JID
            // mediaUrl: // Populate this if you implement media download
        });
        await message.save();
        console.log(`[DB] Saved incoming message for lead ${lead.phoneNumber}: ${content}`);

        // Emit message to frontend via Socket.IO
        if (ioInstance) {
            ioInstance.to(coachId).emit('new-message', {
                coachId: coachId,
                leadPhoneNumber: lead.phoneNumber,
                message: {
                    id: messageId,
                    sender: cleanJidForDb(senderRawJid), // Emit the cleaned sender JID
                    text: content,
                    timestamp: timestamp.getTime() / 1000, // Convert to Unix timestamp (seconds)
                    type: messageType,
                    // mediaUrl: message.mediaUrl // Include if you store it
                }
            });
        }
    } catch (error) {
        console.error(`[DB ERROR] Error processing incoming message for coach ${coachId}:`, error);
    }
}


// --- 5. Main Baileys Client Management Functions ---

/**
 * Initializes a Baileys client for a given coach.
 */
async function initializeClient(coachId) {
    // If client already exists and is connected, just return it
    if (clients.has(coachId)) {
        const existingSock = clients.get(coachId);
        // Baileys 'sock.user' object exists when connected/authenticated
        if (existingSock.user && existingSock.user.id) {
            console.log(`Baileys client for coach ${coachId} already connected.`);
            return existingSock;
        }
    }

    console.log(`Attempting to initialize Baileys client for coach: ${coachId}`);

    // useMultiFileAuthState manages session data (creds, keys, etc.) in a local folder
    const { state, saveCreds } = await useMultiFileAuthState(`./baileys_auth/${coachId}`);
    // Fetch latest Baileys version to prevent issues with outdated clients
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys version: ${version.join('.')} (Latest: ${isLatest})`);

    const sock = makeWASocket({
        auth: state, // Authentication state for the client
        logger: logger, // Use the pino logger defined above
        printQRInTerminal: false, // We'll handle QR emitting via Socket.IO
        browser: ['MyWhatsAppApp', 'Chrome', '1.0'], // Custom browser info sent to WhatsApp
        version: version, // Ensure we use the fetched version
        // Add more options as needed, e.g., for history sync, presence
        syncFullHistory: true, // Fetch full message history on first connect
        getMessage: async (key) => {
            // Optional: Implement a message store for better stability and features.
            // This is crucial for replying to messages accurately, fetching messages by ID, etc.
            // For now, returning null means Baileys won't be able to retrieve old messages for certain operations.
            // For production, consider storing messages in your DB and retrieving them here.
            // Example: const msg = await Message.findOne({ messageId: key.id }); return msg ? msg.content : null;
            return null;
        }
    });

    // --- Baileys Event Listeners ---

    // Handles connection status updates (connecting, open, close)
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log(`[QR RECEIVED] Coach ${coachId} received QR code.`);
            qrcode.generate(qr, { small: true }); // Print in console for quick check
            qrCodes.set(coachId, qr); // Store QR code for frontend to fetch
            if (ioInstance) {
                ioInstance.to(coachId).emit('whatsapp-qr', { qrCodeData: qr, coachId: coachId });
                console.log(`Socket.IO: Emitted QR for coach ${coachId}.`);
            }
        }

        if (connection === 'close') {
            // Get the reason for disconnection (from @hapi/boom errors)
            let reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
            console.error(`Baileys Client for coach ${coachId} DISCONNECTED! Reason: ${reason || lastDisconnect?.error}`);

            // Decide whether to reconnect or clear session based on the reason
            if (reason === DisconnectReason.loggedOut) {
                console.log(`[LOGOUT] Coach ${coachId} explicitly logged out. Clearing session.`);
                await deleteSession(coachId); // Delete session data as it's a permanent logout
                clients.delete(coachId); // Remove from active clients map
                if (ioInstance) {
                    ioInstance.to(coachId).emit('whatsapp-status', { connected: false, message: 'Logged out. Please re-scan QR.', coachId: coachId });
                }
            } else {
                console.log(`[RECONNECT] Attempting to reconnect coach ${coachId}...`);
                qrCodes.delete(coachId); // Clear any lingering QR code if attempting reconnect
                // Attempt to reconnect by re-initializing the client after a short delay
                setTimeout(() => initializeClient(coachId), 5000); // Retry in 5 seconds
                if (ioInstance) {
                    ioInstance.to(coachId).emit('whatsapp-status', { connected: false, message: `Disconnected (${reason}). Reconnecting...`, coachId: coachId });
                }
            }
        } else if (connection === 'open') {
            console.log(`Baileys Client for coach ${coachId} is OPEN (CONNECTED)!`);
            clients.set(coachId, sock); // Set the active socket instance in the map
            qrCodes.delete(coachId); // Clear any lingering QR code

            if (ioInstance) {
                ioInstance.to(coachId).emit('whatsapp-status', { connected: true, coachId });
                console.log(`Socket.IO: Emitted whatsapp-status: connected for coach ${coachId}.`);
            }
        }
    });

    // Save credentials whenever they are updated (essential for session persistence)
    sock.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    sock.ev.on('messages.upsert', async (chatUpdate) => {
        // chatUpdate contains messages and their type ('notify' for new messages, 'append' for older messages)
        if (chatUpdate.type === 'notify') {
            for (const msg of chatUpdate.messages) {
                // Ignore messages sent by our own client (unless it's a message from an unsaved number)
                // Also ignore status updates or broadcast lists if you only care about direct messages
                if (!msg.key.fromMe && !msg.key.remoteJid.endsWith('@broadcast')) {
                    // Mark messages as read (optional, but good practice for sender)
                    await sock.readMessages([msg.key]);
                    await handleIncomingMessage(coachId, msg);
                }
            }
        }
    });

    // You can add more event listeners here for other events like:
    // sock.ev.on('presence.update', presenceUpdate => console.log(presenceUpdate));
    // sock.ev.on('chats.update', chatsUpdate => console.log(chatsUpdate));
    // sock.ev.on('contacts.update', contactsUpdate => console.log(contactsUpdate));

    // For the initial call, return the socket (it will connect asynchronously in the background)
    return sock;
}

// --- 6. Exported Functions ---

/**
 * Returns the QR code for a given coach.
 */
function getQrCode(coachId) {
    return qrCodes.get(coachId);
}

/**
 * Checks if a Baileys client is connected for a given coach.
 * Note: Baileys doesn't have a 'ready' status like whatsapp-web.js.
 * We check if the 'user' object exists on the socket, which indicates a connected and authenticated session.
 */
function isClientConnected(coachId) {
    const sock = clients.get(coachId);
    return sock && sock.user !== undefined && sock.user !== null;
}

/**
 * Logs out a Baileys client and deletes its session data.
 */
async function logoutClient(coachId) {
    const sock = clients.get(coachId);
    if (sock) {
        try {
            await sock.logout(); // This will trigger 'connection.update' event with DisconnectReason.loggedOut
            console.log(`Baileys client for coach ${coachId} logged out successfully.`);
            // The 'connection.update' handler will then call deleteSession and remove from map
            return true;
        } catch (error) {
            console.error(`Error logging out Baileys client for coach ${coachId}:`, error);
            // If logout fails for some reason, ensure session is deleted and client removed
            await deleteSession(coachId);
            clients.delete(coachId);
            return false;
        }
    }
    return false; // Client not found
}

/**
 * Sends a text message from a coach's Baileys client to a recipient.
 */
async function sendCoachMessage(coachId, recipientPhoneNumber, messageContent) {
    const sock = clients.get(coachId);
    console.log(`[SEND MESSAGE ATTEMPT] Coach: ${coachId}, Client exists in map: ${!!sock}, Current client.user: ${sock ? sock.user?.id : 'N/A'}`);

    if (!sock || !sock.user) { // Check if socket exists and is authenticated/connected
        throw new Error(`Baileys client for coach ${coachId} is not connected.`);
    }

    // Baileys requires recipient JID format (e.g., '1234567890@s.whatsapp.net')
    const recipientJid = `${recipientPhoneNumber}@s.whatsapp.net`;

    try {
        // Find the lead. If not found, create a new one.
        let lead = await Lead.findOne({
            coachId: coachId, // Use coachId as per your schema
            phone: recipientPhoneNumber // Assuming your schema has 'phone' field for contact number
        });

        if (!lead) {
            // Create a new lead if not found, populating all required fields
            lead = new Lead({
                coachId: coachId,
                phone: recipientPhoneNumber, // Map WhatsApp number to 'phone' field
                name: recipientPhoneNumber, // Use phone number as name for new lead
                email: `whatsapp_${recipientPhoneNumber}@yct.com`, // Generated placeholder email
                status: 'Contacted', // Mark as contacted since we are sending a message
                source: 'WhatsApp', // Source is WhatsApp
                leadTemperature: 'Warm' // Default temperature
            });
            await lead.save();
            console.log(`[DB] Created new lead for outgoing message: ${lead.phoneNumber} (ID: ${lead._id})`);
        }

        // sendMessage returns an object containing the key (id) of the sent message
        const sentMsg = await sock.sendMessage(recipientJid, { text: messageContent });
        console.log(`[MESSAGE OUT] Text message sent to ${recipientPhoneNumber} by coach ${coachId}. Message ID: ${sentMsg.key.id}`);

        // Save outgoing message to DB
        const message = new Message({ // Changed to 'Message'
            lead: lead._id, // Use the found or newly created lead's ID
            coach: coachId, // This should be coachId as per your Message schema
            messageId: sentMsg.key.id, // Store the message ID from Baileys
            timestamp: new Date(),
            direction: 'outbound', // Mark as outgoing
            type: 'text',
            content: messageContent,
            sender: cleanJidForDb(sock.user.id) // Clean the sender JID (your coach's JID)
        });
        await message.save();
        console.log(`[DB] Saved outgoing message for lead ${lead.phoneNumber}: ${messageContent}`);

        return true;
    } catch (error) {
        console.error(`Error sending text message for coach ${coachId} to ${recipientPhoneNumber}:`, error);
        throw error; // Re-throw to be caught by the route handler
    }
}

/**
 * Sends a media message from a coach's Baileys client to a recipient.
 * Supports local file paths or URLs for media.
 */
async function sendMediaMessage(coachId, recipientPhoneNumber, filePathOrUrl, caption) {
    const sock = clients.get(coachId);
    if (!sock || !sock.user) {
        throw new Error(`Baileys client for coach ${coachId} is not connected.`);
    }

    const recipientJid = `${recipientPhoneNumber}@s.whatsapp.net`;

    try {
        // Find the lead. If not found, create a new one.
        let lead = await Lead.findOne({
            coachId: coachId, // Use coachId as per your schema
            phone: recipientPhoneNumber // Assuming your schema has 'phone' field for contact number
        });

        if (!lead) {
            // Create a new lead if not found, populating all required fields
            lead = new Lead({
                coachId: coachId,
                phone: recipientPhoneNumber, // Map WhatsApp number to 'phone' field
                name: recipientPhoneNumber, // Use phone number as name for new lead
                email: `whatsapp_${recipientPhoneNumber}@yct.com`, // Generated placeholder email
                status: 'Contacted', // Mark as contacted since we are sending a message
                source: 'WhatsApp', // Source is WhatsApp
                leadTemperature: 'Warm' // Default temperature
            });
            await lead.save();
            console.log(`[DB] Created new lead for outgoing media message: ${lead.phoneNumber} (ID: ${lead._id})`);
        }

        let messageContent;
        if (filePathOrUrl.startsWith('http://') || filePathOrUrl.startsWith('https://')) {
            // If URL, Baileys can usually infer type. Explicitly check for common types.
            if (/\.(jpg|jpeg|png|gif)$/i.test(filePathOrUrl)) {
                messageContent = { image: { url: filePathOrUrl }, caption: caption };
            } else if (/\.(mp4|avi|mov)$/i.test(filePathOrUrl)) {
                messageContent = { video: { url: filePathOrUrl }, caption: caption };
            } else if (/\.(mp3|aac|ogg|wav)$/i.test(filePathOrUrl)) {
                messageContent = { audio: { url: filePathOrUrl, ptt: false } }; // ptt: true for voice note
            } else {
                // For other files, treat as document (Baileys needs mimetype and filename)
                messageContent = { document: { url: filePathOrUrl, mimetype: 'application/octet-stream', fileName: path.basename(filePathOrUrl) || 'document' } };
            }
        } else {
            // If local file path
            const mediaBuffer = await fs.readFile(filePathOrUrl); // Read file into buffer
            const mimeType = mimeTypes.lookup(filePathOrUrl); // Determine MIME type
            if (!mimeType) throw new Error(`Could not determine MIME type for local file: ${filePathOrUrl}`);

            if (mimeType.startsWith('image/')) {
                messageContent = { image: mediaBuffer, caption: caption };
            } else if (mimeType.startsWith('video/')) {
                messageContent = { video: mediaBuffer, caption: caption };
            } else if (mimeType.startsWith('audio/')) {
                messageContent = { audio: mediaBuffer, ptt: false };
            } else {
                messageContent = { document: mediaBuffer, mimetype: mimeType, fileName: path.basename(filePathOrUrl) };
            }
        }

        const sentMsg = await sock.sendMessage(recipientJid, messageContent);
        console.log(`[MESSAGE OUT] Media message sent to ${recipientPhoneNumber} by coach ${coachId}. Message ID: ${sentMsg.key.id}`);

        // Save outgoing media message to DB (similar to text message)
        const message = new Message({ // Changed to 'Message'
            lead: lead._id, // Use the found or newly created lead's ID
            coach: coachId, // This should be coachId as per your Message schema
            messageId: sentMsg.key.id,
            timestamp: new Date(),
            direction: 'outbound',
            // Refine type based on what was sent
            type: messageContent.image ? 'image' : messageContent.video ? 'video' : messageContent.audio ? 'audio' : messageContent.document ? 'document' : 'media',
            content: caption || 'Media message',
            mediaUrl: filePathOrUrl, // Store the URL or original path of the sent media
            sender: cleanJidForDb(sock.user.id) // Clean the sender JID (your coach's JID)
        });
        await message.save();
        console.log(`[DB] Saved outgoing media message for lead ${lead.phoneNumber}.`);

        return true;
    } catch (error) {
        console.error(`Error sending media message for coach ${coachId} to ${recipientPhoneNumber}:`, error);
        throw error;
    }
}

/**
 * Sets the Socket.IO instance for real-time communication.
 */
function setIoInstance(io) {
    ioInstance = io;
}

// --- 7. Module Exports (Must be at the very end of the file) ---
module.exports = {
    initializeClient,
    getQrCode,
    isClientConnected,
    logoutClient,
    sendCoachMessage,
    sendMediaMessage,
    setIoInstance,
    // You can export deleteSession too if you need to call it from outside
    // deleteSession
};
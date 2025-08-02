// D:\PRJ_YCT_Final\main.js

// 🚀 Load environment variables
require('dotenv').config();

// 📦 Core Node.js Modules
const express = require('express');
const http = require('http'); // Import http module for Socket.IO
const path = require('path'); // NEW: Import path module for serving static files

// 🌐 Socket.IO Imports
const { Server } = require('socket.io'); // Socket.IO server

// ⚙️ Configuration & Utilities
const { connectDB } = require('./config/db'); // Assuming connectDB is directly exported
const { initAutomationProcessor } = require('./services/automationProcessor'); // Your automation brain
const whatsappManager = require('./services/whatsappManager'); // Import whatsappManager

// 🛡️ Middleware Imports
const cors = require('cors'); // Import CORS middleware
// const errorHandler = require('./middleware/errorMiddleware'); // Global error handler - Uncomment if used

// 🛣️ Route Imports
const authRoutes = require('./routes/authRoutes.js');
const funnelRoutes = require('./routes/funnelRoutes');
const leadRoutes = require('./routes/leadRoutes.js');
const coachWhatsAppRoutes = require('./routes/coachWhatsappRoutes.js');
const automationRuleRoutes = require('./routes/automationRuleRoutes.js');
const uploadRoutes = require('./routes/uploadRoutes');
const webpageRenderRoutes = require('./routes/webpageRenderRoutes'); // <-- ADDED LINE FOR WEBPAGE RENDERER
// --- NEW: Import Daily Priority Feed Routes ---
const dailyPriorityFeedRoutes = require('./routes/dailyPriorityFeedRoutes');
// --- END NEW ---

// 🌐 Initialize Express App
// IMPORTANT: Initialize automation processor before starting the server
// so it's ready to listen for events immediately.
initAutomationProcessor();
console.log('Funnelseye Automation Processor initialized.');

const app = express();
// Create an HTTP server from your Express app (required for Socket.IO)
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5000", // IMPORTANT: Configure your frontend URL
        methods: ["GET", "POST"]
    }
});

// Pass the Socket.IO instance to the whatsappManager so it can emit events
whatsappManager.setIoInstance(io);

// ✨ Express Middleware Setup
// Increase the payload size limit for JSON and URL-encoded bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // Use extended: true as it's generally recommended with larger payloads
// Enable CORS for all routes (adjust options as needed for production)
app.use(cors({
origin: process.env.FRONTEND_URL || "http://localhost:5000", // Temporarily allow all origins, including 'null' for file:///
methods: ['GET', 'POST', 'PUT', 'DELETE'], // Be explicit about allowed methods
credentials: true // If you handle cookies or auth headers
}));

// --- NEW: Serve Static Files for Uploads ---
// This line makes files located in the 'public/uploads' directory accessible via '/uploads' URL path.
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// 🔗 Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/funnels', funnelRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/coach-whatsapp', coachWhatsAppRoutes);
app.use('/api/automation-rules', automationRuleRoutes);
app.use('/api/files', uploadRoutes);
app.use('/funnels', webpageRenderRoutes); // <-- ADDED LINE FOR WEBPAGE RENDERER (no '/api' prefix here)
// --- NEW: Mount Daily Priority Feed Routes ---
app.use('/api/coach', dailyPriorityFeedRoutes);
// --- END NEW ---

// 🏠 Basic Root Route (for testing if server is running)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>FunnelsEye API Status</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Poppins', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%); /* Vibrant gradient */
                    color: #fff;
                    text-align: center;
                    flex-direction: column;
                    overflow: hidden; /* Hide overflow from particles */
                }
                .background-particles {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    top: 0;
                    left: 0;
                    overflow: hidden;
                    z-index: 0;
                }
                .particle {
                    position: absolute;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: 50%;
                    animation: float 15s infinite ease-in-out alternate;
                }
                .particle:nth-child(1) { width: 30px; height: 30px; left: 10%; top: 20%; animation-duration: 18s; }
                .particle:nth-child(2) { width: 50px; height: 50px; left: 25%; top: 50%; animation-duration: 22s; }
                .particle:nth-child(3) { width: 20px; height: 20px; left: 40%; top: 10%; animation-duration: 15s; }
                .particle:nth-child(4) { width: 40px; height: 40px; left: 60%; top: 70%; animation-duration: 20s; }
                .particle:nth-child(5) { width: 35px; height: 35px; left: 80%; top: 30%; animation-duration: 17s; }
                .particle:nth-child(6) { width: 25px; height: 25px; left: 5%; top: 80%; animation-duration: 19s; }
                .particle:nth-child(7) { width: 45px; height: 45px; left: 90%; top: 60%; animation-duration: 21s; }
                .container {
                    background-color: rgba(255, 255, 255, 0.15); /* Semi-transparent white background */
                    backdrop-filter: blur(10px); /* Frosted glass effect */
                    padding: 40px 60px;
                    border-radius: 16px;
                    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
                    transform: translateY(0);
                    transition: transform 0.4s ease-in-out, box-shadow 0.4s ease;
                    z-index: 1; /* Ensure container is above particles */
                }
                .container:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
                }
                h1 {
                    color: #ffffff;
                    font-size: 3em;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }
                h1 .icon {
                    font-size: 1.2em;
                    margin: 0 15px;
                    animation: pulse 1.5s infinite alternate;
                }
                p {
                    font-size: 1.2em;
                    color: #e0e0e0;
                    line-height: 1.6;
                    max-width: 600px;
                    margin: 0 auto 30px;
                }
                .api-link {
                    margin-top: 30px;
                    font-size: 1.1em;
                }
                .api-link a {
                    color: #8aff8a; /* Bright green for links */
                    text-decoration: none;
                    font-weight: 600;
                    padding: 10px 20px;
                    border: 2px solid #8aff8a;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                    display: inline-block;
                }
                .api-link a:hover {
                    background-color: #8aff8a;
                    color: #2575fc; /* Dark blue on hover */
                    transform: translateY(-3px);
                    box-shadow: 0 5px 15px rgba(0, 255, 0, 0.2);
                }
                @keyframes pulse {
                    from { transform: scale(1); }
                    to { transform: scale(1.1); }
                }
                @keyframes float {
                    0% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.8; }
                    25% { transform: translateY(-20px) translateX(10px) rotate(5deg); opacity: 1; }
                    50% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.8; }
                    75% { transform: translateY(20px) translateX(-10px) rotate(-5deg); opacity: 1; }
                    100% { transform: translateY(0px) translateX(0px) rotate(0deg); opacity: 0.8; }
                }
            </style>
        </head>
        <body>
            <div class="background-particles">
                <div class="particle"></div>
                <div class="particle"></div>
                <div class="particle"></div>
                <div class="particle"></div>
                <div class="particle"></div>
                <div class="particle"></div>
                <div class="particle"></div>
            </div>
            <div class="container">
                <h1><span class="icon">🚀</span> FunnelsEye API is Soaring! <span class="icon">✨</span></h1>
                <p>Your API server is live, secure, and ready to power your funnel automation.</p>
                <p>Start building seamless user journeys and engaging experiences today.</p>
                <div class="api-link">
                    <p><a href="/api/auth/login">Explore API Endpoints</a></p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// --- ❌ 404 Not Found Handler (Modern, Minimalistic with Color) ---
// This middleware will be hit if no other route has handled the request.
app.use((req, res, next) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>404 - Page Not Found | FunnelsEye</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background-color: #f0f4f8; /* A very light blue-grey for a soft, modern feel */
                    color: #333;
                    text-align: center;
                    overflow: hidden;
                    position: relative;
                }
                .container-404 {
                    background-color: #ffffff;
                    padding: 60px 80px;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.08);
                    animation: fadeIn 0.8s ease-out;
                    z-index: 1;
                    max-width: 500px;
                    margin: 20px;
                    border: 1px solid #e0e6ed; /* Subtle border */
                }
                h1 {
                    font-size: 6em;
                    margin: 0;
                    font-weight: 700;
                    background: linear-gradient(90deg, #6a11cb 0%, #2575fc 100%); /* Blue-purple gradient for 404 */
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    letter-spacing: -2px;
                }
                h2 {
                    font-size: 2em;
                    margin-top: 10px;
                    color: #444; /* Slightly darker grey for heading */
                    font-weight: 600;
                }
                p {
                    font-size: 1.1em;
                    margin-top: 15px;
                    margin-bottom: 30px;
                    color: #666; /* Medium grey for body text */
                    line-height: 1.6;
                }
                a {
                    display: inline-block;
                    background: linear-gradient(90deg, #2575fc 0%, #6a11cb 100%); /* Reverse gradient for button */
                    color: #fff;
                    padding: 12px 28px;
                    border-radius: 8px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 1em;
                    transition: all 0.3s ease;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.15);
                }
                a:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.2);
                    opacity: 0.9;
                }

                /* Subtle background animation */
                .dot-grid {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background-image: radial-gradient(#d8dee9 1px, transparent 1px); /* Lighter dots */
                    background-size: 25px 25px; /* Slightly larger grid */
                    opacity: 0.5;
                    animation: pan-background 45s linear infinite; /* Slower pan */
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes pan-background {
                    0% { background-position: 0 0; }
                    100% { background-position: 250px 250px; }
                }
            </style>
        </head>
        <body>
            <div class="dot-grid"></div>
            <div class="container-404">
                <h1>404</h1>
                <h2>Page Not Found</h2>
                <p>The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.</p>
                <a href="/">Go to FunnelsEye Home</a>
            </div>
        </body>
        </html>
    `);
});


// ⚠️ IMPORTANT: Error Handling Middleware
// app.use(errorHandler); // Uncomment if you have this in place

// 🌍 Define Server Port
const PORT = process.env.PORT || 8080;


// --- Helper function to print API routes in a formatted table ---
function printApiTable(title, routes, baseUrl) {
    const METHOD_WIDTH = 8;
    const PATH_WIDTH = 75;
    const DESC_WIDTH = 45;

    const totalWidth = METHOD_WIDTH + PATH_WIDTH + DESC_WIDTH + 8;

    const hr = '─'.repeat(totalWidth);

    console.log(`\n\n${title}`);
    console.log(`╭${hr}╮`);
    console.log(`│ ${'Method'.padEnd(METHOD_WIDTH)} │ ${'URL'.padEnd(PATH_WIDTH)} │ ${'Description'.padEnd(DESC_WIDTH)} │`);
    console.log(`├${'─'.repeat(METHOD_WIDTH)}─┼─${'─'.repeat(PATH_WIDTH)}─┼─${'─'.repeat(DESC_WIDTH)}─┤`);

    routes.forEach(route => {
        const fullPath = `${baseUrl}${route.path}`;
        const method = route.method.padEnd(METHOD_WIDTH);
        const path = fullPath.padEnd(PATH_WIDTH);
        const desc = route.desc.padEnd(DESC_WIDTH);
        console.log(`│ ${method} │ ${path} │ ${desc} │`);
    });

    console.log(`╰${hr}╯`);
}
// -----------------------------------------------------------------


/**
 * Initializes the server by connecting to the database and starting the Express app.
 */
const startServer = async () => {
    try {
        await connectDB(); // Attempt to connect to MongoDB

        // 🚀 Start the HTTP server (which Express is built on)
        // This is crucial for Socket.IO to work alongside Express
        server.listen(PORT, () => {
            console.log(`\n\n✨ Server is soaring on port ${PORT}! ✨`);
            console.log(`Local Development Base URL: http://localhost:${PORT}/api`);

            // --- Define API Routes Data for Table Printing ---
            const authRoutesData = [
                { method: 'POST', path: '/signup', desc: 'User Registration' },
                { method: 'POST', path: '/verify-otp', desc: 'OTP Verification' },
                { method: 'POST', path: '/login', desc: 'User Login' },
                { method: 'GET', path: '/me', desc: 'Get Current User (if implemented)' },
            ];

            const funnelRoutesData = [
                { method: 'GET', path: '/coach/:coachId/funnels', desc: 'Get all Funnels for a Coach' },
                { method: 'GET', path: '/coach/:coachId/funnels/:funnelId', desc: 'Get Single Funnel Details' },
                { method: 'POST', path: '/coach/:coachId/funnels', desc: 'Create New Funnel' },
                { method: 'PUT', path: '/coach/:coachId/funnels/:funnelId', desc: 'Update Funnel' },
                { method: 'DELETE', path: '/coach/:coachId/funnel/:funnelId', desc: 'Delete Funnel' },
                { method: 'GET', path: '/coach/:coachId/funnels/:funnelId/stages/:stageType', desc: 'Get Stages by Type' },
                { method: 'POST', path: '/:funnelId/stages', desc: 'Add Stage to Funnel' },
                { method: 'PUT', path: '/:funnelId/stages/:stageSettingsId', desc: 'Update Stage Settings' },
                { method: 'POST', path: '/track', desc: 'Track Funnel Event' },
                { method: 'GET', path: '/:funnelId/analytics', desc: 'Get Funnel Analytics Data' },
            ];

            const leadRoutesData = [
                { method: 'POST', path: '', desc: 'Create New Lead' },
                { method: 'GET', path: '', desc: 'Get All Leads (filters/pagination)' },
                { method: 'GET', path: '/:id', desc: 'Get Single Lead by ID' },
                { method: 'PUT', path: '/:id', desc: 'Update Lead' },
                { method: 'DELETE', path: '/:id', desc: 'Delete Lead' },
                { method: 'POST', path: '/:id/followup', desc: 'Add Follow-up Note' },
                { method: 'GET', path: '/followups/upcoming', desc: 'Get Leads for Upcoming Follow-ups' },
            ];

            const automationRuleRoutesData = [
                { method: 'POST', path: '', desc: 'Create New Automation Rule' },
                // Add more if you implement GET, PUT, DELETE for rules in automationRuleController.js
            ];

            const whatsappRoutesData = [
                { method: 'GET', path: '/status', desc: 'Check WhatsApp connection status' },
                { method: 'POST', path: '/add-device', desc: 'Initiate WhatsApp device linking (QR)' },
                { method: 'GET', path: '/get-qr', desc: 'Retrieve WhatsApp QR code for linking' },
                { method: 'POST', path: '/logout-device', desc: 'Disconnect WhatsApp device' },
                { method: 'POST', path: '/send-message', desc: 'Send text message via WhatsApp' },
                { method: 'POST', path: '/send-media', desc: 'Send media message via WhatsApp' },
            ];

            const uploadRoutesData = [
                { method: 'POST', path: '/upload', desc: 'Upload a file (PDF, Doc, Video, Audio)' },
                // Add more if you implement GET, DELETE for files
            ];

            // --- NEW: Webpage Render Routes Data for the table ---
            const webpageRenderRoutesData = [
                { method: 'GET', path: '/:funnelSlug/:pageSlug', desc: 'Render a public funnel page' },
            ];

            // --- NEW: Daily Priority Feed Routes Data for the table ---
            const dailyPriorityFeedRoutesData = [
                { method: 'GET', path: '/daily-feed', desc: 'Get daily prioritized suggestions for coach' },
                // --- NEW CALENDAR ROUTES ADDED HERE ---
                { method: 'GET', path: '/:coachId/availability', desc: 'Get coach availability settings' },
                { method: 'POST', path: '/availability', desc: 'Set or update coach availability' },
                { method: 'GET', path: '/:coachId/available-slots', desc: 'Get bookable slots for a coach' },
                { method: 'POST', path: '/:coachId/book', desc: 'Book a new appointment' },
                { method: 'GET', path: '/:coachId/calendar', desc: 'Get Calendar of Coach' },
                // --- END OF NEW CALENDAR ROUTES ---
            ];
            // --- END NEW ---


            // --- Print API Endpoints Tables ---
            printApiTable('--- 🔑 Authentication Endpoints ---', authRoutesData, '/api/auth');
            printApiTable('--- 📈 Funnel Management & Analytics Endpoints ---', funnelRoutesData, '/api/funnels');
            printApiTable('--- 🎯 Lead Management (CRM) Endpoints ---', leadRoutesData, '/api/leads');
            printApiTable('--- ⚙️ Automation Rules Endpoints ---', automationRuleRoutesData, '/api/automation-rules');
            printApiTable('--- 💬 Coach WhatsApp Integration Endpoints ---', whatsappRoutesData, '/api/coach-whatsapp');
            printApiTable('--- 📁 File Upload Endpoints ---', uploadRoutesData, '/api/files');
            printApiTable('--- 🌐 Public Funnel Webpage Rendering Endpoints ---', webpageRenderRoutesData, '/funnels');
            // --- NEW: Print Daily Priority Feed Routes Table ---
            printApiTable('--- 💡 Daily Priority Feed & Calendar Endpoints ---', dailyPriorityFeedRoutesData, '/api/coach');
            // --- END NEW ---

            console.log('\n\n---------------------------------------\n\n');

        });
    } catch (error) {
        console.error(`\n❌ Server failed to start: ${error.message}\n`);
        process.exit(1); // Exit process with failure
    }
};

// Initiate the server startup process
startServer();
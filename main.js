// D:\PRJ_YCT_Final\main.js

// 🚀 Load environment variables
require('dotenv').config();

// 📦 Core Node.js Modules
const express = require('express');
const http = require('http');
const path = require('path');

// 🌐 Socket.IO Imports
const { Server } = require('socket.io');

// ⚙️ Configuration & Utilities
const { connectDB } = require('./config/db');
const { initAutomationProcessor } = require('./services/automationProcessor');
const whatsappManager = require('./services/whatsappManager');

// 🛡️ Middleware Imports
const cors = require('cors');

// 🛣️ Route Imports
const authRoutes = require('./routes/authRoutes.js');
const funnelRoutes = require('./routes/funnelRoutes');
const leadRoutes = require('./routes/leadRoutes.js');
const coachWhatsAppRoutes = require('./routes/coachWhatsappRoutes.js');
const automationRuleRoutes = require('./routes/automationRuleRoutes.js');
const uploadRoutes = require('./routes/uploadRoutes');
const webpageRenderRoutes = require('./routes/webpageRenderRoutes');
const dailyPriorityFeedRoutes = require('./routes/dailyPriorityFeedRoutes');
const mlmRoutes = require('./routes/mlmRoutes');
const coachRoutes = require('./routes/coachRoutes');
const checkInactiveCoaches = require('./tasks/checkInactiveCoaches'); // <-- ADDED: Inactivity Checker Task


// --- Define API Routes Data for both Console & HTML Table Generation ---
const allApiRoutes = {
    '🔑 Authentication': [
        { method: 'POST', path: '/api/auth/signup', desc: 'User Registration' },
        { method: 'POST', path: '/api/auth/verify-otp', desc: 'OTP Verification' },
        { method: 'POST', path: '/api/auth/login', desc: 'User Login' },
        { method: 'GET', path: '/api/auth/me', desc: 'Get Current User' },
    ],
    '📈 Funnel Management': [
        { method: 'GET', path: '/api/funnels/coach/:coachId/funnels', desc: 'Get all Funnels for a Coach' },
        { method: 'GET', path: '/api/funnels/coach/:coachId/funnels/:funnelId', desc: 'Get Single Funnel Details' },
        { method: 'POST', path: '/api/funnels/coach/:coachId/funnels', desc: 'Create New Funnel' },
        { method: 'PUT', path: '/api/funnels/coach/:coachId/funnels/:funnelId', desc: 'Update Funnel' },
        { method: 'DELETE', path: '/api/funnels/coach/:coachId/funnel/:funnelId', desc: 'Delete Funnel' },
        { method: 'GET', path: '/api/funnels/coach/:coachId/funnels/:funnelId/stages/:stageType', desc: 'Get Stages by Type' },
        { method: 'POST', path: '/api/funnels/:funnelId/stages', desc: 'Add Stage to Funnel' },
        { method: 'PUT', path: '/api/funnels/:funnelId/stages/:stageSettingsId', desc: 'Update Stage Settings' },
        { method: 'POST', path: '/api/funnels/track', desc: 'Track Funnel Event' },
        { method: 'GET', path: '/api/funnels/:funnelId/analytics', desc: 'Get Funnel Analytics Data' },
    ],
    '🎯 Lead Management (CRM)': [
        { method: 'POST', path: '/api/leads', desc: 'Create New Lead (PUBLIC)' },
        { method: 'GET', path: '/api/leads', desc: 'Get All Leads (filters/pagination)' },
        { method: 'GET', path: '/api/leads/:id', desc: 'Get Single Lead by ID' },
        { method: 'PUT', path: '/api/leads/:id', desc: 'Update Lead' },
        { method: 'DELETE', path: '/api/leads/:id', desc: 'Delete Lead' },
        { method: 'POST', path: '/api/leads/:id/followup', desc: 'Add Follow-up Note' },
        { method: 'GET', path: '/api/leads/followups/upcoming', desc: 'Get Leads for Upcoming Follow-ups' },
    ],
    // <--- UPDATED: MLM, Coach, and Performance Routes to the API Docs
    '📊 MLM Network': [
        { method: 'POST', path: '/api/mlm/downline', desc: 'Adds a new coach to the downline' },
        { method: 'GET', path: '/api/mlm/downline/:sponsorId', desc: 'Get a coaches direct downline' },
        { method: 'GET', path: '/api/mlm/hierarchy/:coachId', desc: 'Get the full downline hierarchy' },
    ],
    '💰 Performance & Commissions': [
        { method: 'POST', path: '/api/performance/record-sale', desc: 'Record a new sale for a coach' },
        { method: 'GET', path: '/api/performance/downline/:coachId', desc: 'Get total sales for downline coaches' },
    ],
    // --- END UPDATED ---
    '⚙️ Automation Rules': [
        { method: 'POST', path: '/api/automation-rules', desc: 'Create New Automation Rule' },
    ],
    '💬 Coach WhatsApp': [
        { method: 'GET', path: '/api/coach-whatsapp/status', desc: 'Check WhatsApp connection status' },
        { method: 'POST', path: '/api/coach-whatsapp/add-device', desc: 'Initiate WhatsApp device linking' },
        { method: 'GET', path: '/api/coach-whatsapp/get-qr', desc: 'Retrieve WhatsApp QR code' },
        { method: 'POST', path: '/api/coach-whatsapp/logout-device', desc: 'Disconnect WhatsApp device' },
        { method: 'POST', path: '/api/coach-whatsapp/send-message', desc: 'Send text message' },
        { method: 'POST', path: '/api/coach-whatsapp/send-media', desc: 'Send media message' },
    ],
    '📁 File Upload': [
        { method: 'POST', path: '/api/files/upload', desc: 'Upload a file' },
    ],
    '💡 Priority Feed & Calendar': [
        { method: 'GET', path: '/api/coach/daily-feed', desc: 'Get daily prioritized suggestions' },
        { method: 'GET', path: '/api/coach/:coachId/availability', desc: 'Get coach availability settings' },
        { method: 'POST', path: '/api/coach/availability', desc: 'Set or update coach availability' },
        { method: 'GET', path: '/api/coach/:coachId/available-slots', desc: 'Get bookable slots for a coach' },
        { method: 'POST', path: '/api/coach/:coachId/book', desc: 'Book a new appointment' },
        { method: 'GET', path: '/api/coach/:coachId/calendar', desc: 'Get Calendar of Coach' },
        { method: 'PUT', path: '/api/coach/:id/profile', desc: 'Update a coaches profile' },
    ],
    '🌐 Public Funnel Pages': [
        { method: 'GET', path: '/funnels/:funnelSlug/:pageSlug', desc: 'Render a public funnel page' },
    ],
};
// --- END ROUTES DATA ---

// 🌐 Initialize Express App
initAutomationProcessor();
console.log('Funnelseye Automation Processor initialized.');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5000",
        methods: ["GET", "POST"]
    }
});
whatsappManager.setIoInstance(io);

// ✨ Express Middleware Setup
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5000",
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));


// 🔗 Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/funnels', funnelRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/coach-whatsapp', coachWhatsAppRoutes);
app.use('/api/automation-rules', automationRuleRoutes);
app.use('/api/files', uploadRoutes);
app.use('/funnels', webpageRenderRoutes);
app.use('/api/coach', dailyPriorityFeedRoutes);
app.use('/api/mlm', mlmRoutes);
app.use('/api/coach', coachRoutes);


// 🏠 Dynamic Homepage Route (Landing page with a button)
app.get('/', (req, res) => {
    let routeTables = '';
    let sidebarLinks = '';

    for (const title in allApiRoutes) {
        const id = title.replace(/[^a-zA-Z0-9]/g, '');
        const isActive = Object.keys(allApiRoutes)[0] === title ? 'active' : '';

        sidebarLinks += `<a href="#${id}" class="tab-link ${isActive}">${title}</a>`;

        routeTables += `
            <div id="${id}" class="route-table-container tab-content ${isActive}">
                <h2>${title}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th>Endpoint</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        allApiRoutes[title].forEach(route => {
            routeTables += `
                <tr>
                    <td class="method method-${route.method.toLowerCase()}">${route.method}</td>
                    <td>${route.path}</td>
                    <td>${route.desc}</td>
                </tr>
            `;
        });
        routeTables += `
                    </tbody>
                </table>
            </div>
        `;
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>FunnelsEye API</title>
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet">
            <style>
                :root {
                    --bg-color: #f0f4f8;
                    --text-color: #343a40;
                    --table-bg: #ffffff;
                    --header-bg: #e9ecef;
                    --border-color: #dee2e6;
                    --sidebar-bg: #212529;
                    --sidebar-text: #adb5bd;
                    --sidebar-active-bg: #4f46e5;
                    --sidebar-active-text: #ffffff;
                    --primary-color: #4f46e5;
                }
                body {
                    font-family: 'Poppins', sans-serif;
                    background-color: var(--bg-color);
                    color: var(--text-color);
                    line-height: 1.6;
                    margin: 0;
                    padding: 0;
                }
                .wrapper {
                    display: none; /* Hidden by default */
                }
                .welcome-screen {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    text-align: center;
                    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
                    color: #fff;
                    padding: 20px;
                }
                .welcome-screen h1 {
                    font-size: 3rem;
                    margin-bottom: 0.5rem;
                }
                .welcome-screen p {
                    font-size: 1.2rem;
                    max-width: 600px;
                    margin-bottom: 2rem;
                    line-height: 1.5;
                }
                .explore-btn {
                    padding: 12px 25px;
                    font-size: 1rem;
                    font-weight: 600;
                    color: #fff;
                    background-color: var(--primary-color);
                    border: 2px solid var(--primary-color);
                    border-radius: 8px;
                    text-decoration: none;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                .explore-btn:hover {
                    background-color: transparent;
                    color: #fff;
                    border-color: #fff;
                }
                .sidebar {
                    width: 280px;
                    background-color: var(--sidebar-bg);
                    color: var(--sidebar-text);
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 2px 0 5px rgba(0,0,0,0.1);
                    position: sticky;
                    top: 0;
                    align-self: flex-start;
                }
                .sidebar h1 {
                    font-size: 1.5rem;
                    color: #fff;
                    text-align: center;
                    margin-bottom: 20px;
                }
                .sidebar a {
                    color: var(--sidebar-text);
                    text-decoration: none;
                    padding: 12px 15px;
                    margin-bottom: 5px;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                    font-weight: 400;
                }
                .sidebar a:hover {
                    background-color: #495057;
                    color: #fff;
                }
                .sidebar a.active {
                    background-color: var(--sidebar-active-bg);
                    color: var(--sidebar-active-text);
                    font-weight: 600;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                }
                .main-content {
                    flex-grow: 1;
                    padding: 40px;
                }
                h2 {
                    text-align: center;
                    color: var(--primary-color);
                    margin-bottom: 20px;
                }
                .route-table-container {
                    display: none;
                }
                .route-table-container.active {
                    display: block;
                    animation: fadeIn 0.5s ease-in-out;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    background-color: var(--table-bg);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    border-radius: 8px;
                    overflow: hidden;
                    text-align: left;
                    margin-bottom: 40px;
                }
                th, td {
                    padding: 15px;
                    border-bottom: 1px solid var(--border-color);
                }
                th {
                    background-color: var(--header-bg);
                    font-weight: 600;
                    color: #495057;
                    text-transform: uppercase;
                }
                tr:hover {
                    background-color: #f1f3f5;
                }
                .method {
                    font-weight: 600;
                    padding: 5px 10px;
                    border-radius: 5px;
                    color: #fff;
                    display: inline-block;
                }
                .method-get { background-color: #007bff; }
                .method-post { background-color: #28a745; }
                .method-put { background-color: #ffc107; color: #212529; }
                .method-delete { background-color: #dc3545; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes pan-background {
                    0% { background-position: 0 0; }
                    100% { background-position: 400px 400px; }
                }
            </style>
        </head>
        <body>
            <div class="welcome-screen" id="welcomeScreen">
                <h1>FunnelsEye API is Live!</h1>
                <p>Welcome to the API for FunnelsEye. Click the button below to view the documentation and start building your applications.</p>
                <button id="exploreBtn" class="explore-btn">Explore API Endpoints</button>
            </div>

            <div class="wrapper" id="docsWrapper">
                <div class="sidebar">
                    <h1>FunnelsEye API</h1>
                    ${sidebarLinks}
                </div>
                <div class="main-content">
                    <h1>API Endpoints</h1>
                    ${routeTables}
                </div>
            </div>
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const exploreBtn = document.getElementById('exploreBtn');
                    const welcomeScreen = document.getElementById('welcomeScreen');
                    const docsWrapper = document.getElementById('docsWrapper');
                    const tabLinks = document.querySelectorAll('.tab-link');
                    const tabContents = document.querySelectorAll('.tab-content');

                    // Show documentation on button click
                    exploreBtn.addEventListener('click', () => {
                        welcomeScreen.style.display = 'none';
                        docsWrapper.style.display = 'flex';
                    });
                    
                    // Logic for switching tabs
                    tabLinks.forEach(link => {
                        link.addEventListener('click', (e) => {
                            e.preventDefault();
                            tabLinks.forEach(l => l.classList.remove('active'));
                            tabContents.forEach(c => c.classList.remove('active'));

                            e.target.classList.add('active');
                            const targetId = e.target.getAttribute('href').substring(1);
                            document.getElementById(targetId).classList.add('active');
                        });
                    });
                });
            </script>
        </body>
        </html>
    `);
});


// --- ❌ 404 Not Found Handler (Enhanced with animations) ---
app.use((req, res, next) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>404 - Page Not Found</title>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background-color: #1a202c;
                    color: #e2e8f0;
                    text-align: center;
                    overflow: hidden;
                    position: relative;
                }
                .background-grid {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background-image: radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px);
                    background-size: 40px 40px;
                    opacity: 0.5;
                    animation: pan-background 30s linear infinite;
                    z-index: 0;
                }
                .container-404 {
                    background-color: rgba(30, 41, 59, 0.8);
                    backdrop-filter: blur(8px);
                    padding: 4rem 3rem;
                    border-radius: 1rem;
                    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
                    max-width: 500px;
                    border: 1px solid #4a5568;
                    animation: fadeIn 0.8s ease-out;
                    z-index: 1;
                }
                h1 {
                    font-size: 6rem;
                    font-weight: 700;
                    color: #4f46e5;
                    margin: 0;
                    letter-spacing: -0.1em;
                    animation: pulsate 2s infinite ease-in-out alternate;
                }
                h2 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-top: 0.5rem;
                    color: #cbd5e0;
                }
                p {
                    font-size: 1rem;
                    margin-top: 1rem;
                    color: #a0aec0;
                }
                a {
                    display: inline-block;
                    background-color: #4f46e5;
                    color: #ffffff;
                    padding: 0.75rem 1.5rem;
                    border-radius: 0.5rem;
                    text-decoration: none;
                    font-weight: 600;
                    margin-top: 2rem;
                    transition: all 0.3s ease;
                }
                a:hover {
                    background-color: #4338ca;
                    transform: translateY(-3px);
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes pulsate {
                    0% { transform: scale(1); }
                    100% { transform: scale(1.05); }
                }
                @keyframes pan-background {
                    0% { background-position: 0 0; }
                    100% { background-position: 400px 400px; }
                }
            </style>
        </head>
        <body>
            <div class="background-grid"></div>
            <div class="container-404">
                <h1>404</h1>
                <h2>Page Not Found</h2>
                <p>The URL you requested could not be found on this server. Please check the address or return to the homepage.</p>
                <a href="/">Go to Homepage</a>
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

    console.log(`\n\n--- ${title.toUpperCase()} ---`);
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
        await connectDB();
        server.listen(PORT, () => {
            console.log(`\n\n✨ Server is soaring on port ${PORT}! ✨`);
            console.log(`Local Development Base URL: http://localhost:${PORT}`);
            
            // --- ADDED: Start the scheduled task ---
            checkInactiveCoaches.start();

            // Print API Endpoints Tables to console
            for (const title in allApiRoutes) {
                printApiTable(title, allApiRoutes[title], '');
            }
            
            console.log('\n\n---------------------------------------\n\n');
        });
    } catch (error) {
        console.error(`\n❌ Server failed to start: ${error.message}\n`);
        process.exit(1);
    }
};

// Initiate the server startup process
startServer();
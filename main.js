// D:\PRJ_YCT_Final\main.js

// 🚀 Load environment variables from .env file
require('dotenv').config({ quiet: true });

// 📦 Core Node.js Modules
const express = require('express');
const http = require('http');
const path = require('path');

// 🌐 Socket.IO Imports
const { Server } = require('socket.io');

// ⚙️ Configuration & Utilities
const { connectDB } = require('./config/db');
const whatsappManager = require('./services/whatsappManager');
const checkInactiveCoaches = require('./tasks/checkInactiveCoaches');
const { init } = require('./services/rabbitmqProducer');

// 🛡️ Middleware Imports
const cors = require('cors');

// 🛣️ Route Imports
const authRoutes = require('./routes/authRoutes.js');
const funnelRoutes = require('./routes/funnelRoutes');
const leadRoutes = require('./routes/leadRoutes.js');
const automationRuleRoutes = require('./routes/automationRuleRoutes.js');
const uploadRoutes = require('./routes/uploadRoutes');
const webpageRenderRoutes = require('./routes/webpageRenderRoutes');
const dailyPriorityFeedRoutes = require('./routes/dailyPriorityFeedRoutes');
const mlmRoutes = require('./routes/mlmRoutes');
const coachRoutes = require('./routes/coachRoutes');
const metaRoutes = require('./routes/metaRoutes.js');
const paymentRoutes = require('./routes/paymentRoutes.js');
const staffRoutes = require('./routes/staffRoutes.js');

// --- Import the worker initialization functions ---
const initRulesEngineWorker = require('./workers/worker_rules_engine');
const initActionExecutorWorker = require('./workers/worker_action_executor');
const initScheduledExecutorWorker = require('./workers/worker_scheduled_action_executor');
const initPaymentProcessorWorker = require('./workers/worker_payment_processor');

// --- Define API Routes Data for both Console & HTML Table Generation ---
const allApiRoutes = {
    '🔑 Authentication': [
        { method: 'POST', path: '/api/auth/signup', desc: 'User Registration', sample: { name: 'John Doe', email: 'john@example.com', password: 'Passw0rd!', role: 'coach' } },
        { method: 'POST', path: '/api/auth/verify-otp', desc: 'OTP Verification', sample: { email: 'john@example.com', otp: '123456' } },
        { method: 'POST', path: '/api/auth/login', desc: 'User Login', sample: { email: 'john@example.com', password: 'Passw0rd!' } },
        { method: 'GET', path: '/api/auth/me', desc: 'Get Current User' },
    ],
    '📈 Funnel Management': [
        { method: 'GET', path: '/api/funnels/coach/:coachId/funnels', desc: 'Get all Funnels for a Coach' },
        { method: 'GET', path: '/api/funnels/coach/:coachId/funnels/:funnelId', desc: 'Get Single Funnel Details' },
        { method: 'POST', path: '/api/funnels/coach/:coachId/funnels', desc: 'Create New Funnel', sample: { name: 'My Funnel', description: 'Demo', funnelUrl: 'coach-1/demo-funnel', targetAudience: 'customer', stages: [] } },
        { method: 'PUT', path: '/api/funnels/coach/:coachId/funnels/:funnelId', desc: 'Update Funnel', sample: { name: 'Updated Funnel Name' } },
        { method: 'DELETE', path: '/api/funnels/coach/:coachId/funnel/:funnelId', desc: 'Delete Funnel' },
        { method: 'GET', path: '/api/funnels/coach/:coachId/funnels/:funnelId/stages/:stageType', desc: 'Get Stages by Type' },
        { method: 'POST', path: '/api/funnels/:funnelId/stages', desc: 'Add Stage to Funnel', sample: { pageId: 'landing-1', name: 'Landing', type: 'Landing', html: '<div>...</div>' } },
        { method: 'PUT', path: '/api/funnels/:funnelId/stages/:stageSettingsId', desc: 'Update Stage Settings', sample: { name: 'New name', isEnabled: true } },
        { method: 'POST', path: '/api/funnels/track', desc: 'Track Funnel Event', sample: { funnelId: '...', stageId: '...', eventType: 'PageView', sessionId: 'sess-123', metadata: { ref: 'ad' } } },
        { method: 'GET', path: '/api/funnels/:funnelId/analytics', desc: 'Get Funnel Analytics Data' },
    ],
    '🎯 Lead Management (CRM)': [
        { method: 'POST', path: '/api/leads', desc: 'Create New Lead (PUBLIC)', sample: { coachId: '...', funnelId: '...', name: 'Jane', email: 'jane@ex.com', phone: '+11234567890', source: 'Web Form' } },
        { method: 'GET', path: '/api/leads', desc: 'Get All Leads (filters/pagination)' },
        { method: 'GET', path: '/api/leads/:id', desc: 'Get Single Lead by ID' },
        { method: 'PUT', path: '/api/leads/:id', desc: 'Update Lead', sample: { status: 'Contacted', leadTemperature: 'Hot' } },
        { method: 'DELETE', path: '/api/leads/:id', desc: 'Delete Lead' },
        { method: 'POST', path: '/api/leads/:id/followup', desc: 'Add Follow-up Note', sample: { note: 'Called the lead', nextFollowUpAt: '2025-01-20T10:00:00Z' } },
        { method: 'GET', path: '/api/leads/followups/upcoming', desc: 'Get Leads for Upcoming Follow-ups' },
        { method: 'POST', path: '/api/leads/:id/ai-rescore', desc: 'AI Rescore a Lead' },
    ],
    '📊 MLM Network': [
        { method: 'POST', path: '/api/mlm/downline', desc: 'Adds a new coach to the downline', sample: { name: 'Coach B', email: 'b@ex.com', password: 'Passw0rd!', sponsorId: '...' } },
        { method: 'GET', path: '/api/mlm/downline/:sponsorId', desc: 'Get a coaches direct downline' },
        { method: 'GET', path: '/api/mlm/hierarchy/:coachId', desc: 'Get the full downline hierarchy' },
    ],
    '👥 Staff Management': [
        { method: 'POST', path: '/api/staff', desc: 'Create staff under coach', sample: { name: 'Assistant A', email: 'assistant@ex.com', password: 'Passw0rd!', permissions: ['leads:read','leads:update'] } },
        { method: 'GET', path: '/api/staff', desc: 'List staff of coach (admin can pass ?coachId=...)' },
        { method: 'PUT', path: '/api/staff/:id', desc: 'Update staff (name, permissions, isActive)', sample: { name: 'Assistant A2', permissions: ['leads:read'] } },
        { method: 'DELETE', path: '/api/staff/:id', desc: 'Deactivate staff' },
    ],
    '💰 Performance & Commissions': [
        { method: 'POST', path: '/api/performance/record-sale', desc: 'Record a new sale for a coach', sample: { coachId: '...', amount: 1000, currency: 'USD' } },
        { method: 'GET', path: '/api/performance/downline/:coachId', desc: 'Get total sales for downline coaches' },
    ],
    '⚙️ Automation Rules': [
        { method: 'POST', path: '/api/automation-rules', desc: 'Create New Automation Rule', sample: { name: 'Hot lead message', coachId: '...', triggerEvent: 'lead_temperature_changed', actions: [{ type: 'send_whatsapp_message', config: { message: 'Hi {{leadData.name}}' } }] } },
    ],
    '💬 WhatsApp Messaging (Meta API)': [
        { method: 'GET', path: '/api/whatsapp/webhook', desc: 'Webhook Verification (Meta)' },
        { method: 'POST', path: '/api/whatsapp/webhook', desc: 'Receive Incoming Messages (Meta)', sample: { entry: [{ changes: [{ value: { messages: [{ from: '911234567890', text: { body: 'Hi' }, type: 'text' }], metadata: { phone_number_id: '...' } } }] }] } },
        { method: 'POST', path: '/api/whatsapp/send-message', desc: 'Send Outbound Message', sample: { coachId: '...', recipientPhoneNumber: '911234567890', messageContent: 'Hello!' } },
    ],
    '📁 File Upload': [
        { method: 'POST', path: '/api/files/upload', desc: 'Upload a file' },
    ],
    '💡 Priority Feed & Calendar': [
        { method: 'GET', path: '/api/coach/daily-feed', desc: 'Get daily prioritized suggestions' },
        { method: 'GET', path: '/api/coach/:coachId/availability', desc: 'Get coach availability settings' },
        { method: 'POST', path: '/api/coach/availability', desc: 'Set or update coach availability', sample: { timeZone: 'Asia/Kolkata', workingHours: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }], unavailableSlots: [], slotDuration: 30, bufferTime: 0 } },
        { method: 'GET', path: '/api/coach/:coachId/available-slots', desc: 'Get bookable slots for a coach' },
        { method: 'POST', path: '/api/coach/:coachId/book', desc: 'Book a new appointment', sample: { leadId: '...', startTime: '2025-01-21T09:00:00Z', duration: 30, notes: 'Intro call', timeZone: 'Asia/Kolkata' } },
        { method: 'PUT', path: '/api/coach/appointments/:id/reschedule', desc: 'Reschedule an appointment', sample: { newStartTime: '2025-01-22T10:00:00Z', newDuration: 45 } },
        { method: 'DELETE', path: '/api/coach/appointments/:id', desc: 'Cancel an appointment' },
        { method: 'GET', path: '/api/coach/:coachId/calendar', desc: 'Get Calendar of Coach' },
        { method: 'PUT', path: '/api/coach/:id/profile', desc: 'Update a coaches profile' },
        { method: 'POST', path: '/api/coach/add-credits/:id', desc: 'Add credits to a coach account'}
    ],
    '💳 Payment Processing': [
        { method: 'POST', path: '/api/payments/receive', desc: 'Receive a new payment and trigger automations', sample: { paymentId: 'gw_123', leadId: '...', amount: 4999, currency: 'INR', status: 'successful', paymentMethod: 'card', gatewayResponse: { id: 'gw_123', sig: '...' } } },
    ],
    '🌐 Public Funnel Pages': [
        { method: 'GET', path: '/funnels/:funnelSlug/:pageSlug', desc: 'Render a public funnel page' },
    ],
};
// --- END ROUTES DATA ---

// 🌐 Initialize Express App
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
app.use('/api/automation-rules', automationRuleRoutes);
app.use('/api/files', uploadRoutes);
app.use('/funnels', webpageRenderRoutes);
app.use('/api/coach', dailyPriorityFeedRoutes);
app.use('/api/mlm', mlmRoutes);
app.use('/api/coach', coachRoutes);
app.use('/api/whatsapp', metaRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/staff', staffRoutes);


// 🏠 Dynamic Homepage Route with new UI
app.get('/', (req, res) => {
    let routeTables = '';
    let sidebarLinks = '';

    for (const title in allApiRoutes) {
        const id = title.replace(/[^a-zA-Z0-9]/g, '');
        sidebarLinks += `<a href="#${id}" class="tab-link">${title}</a>`;

        routeTables += `
            <div id="${id}" class="route-table-container">
                <h2>${title}</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Method</th>
                            <th>Endpoint</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        allApiRoutes[title].forEach(route => {
            routeTables += `
                <tr>
                    <td class="method method-${route.method.toLowerCase()}">${route.method}</td>
                    <td>${route.path}</td>
                    <td>
                        ${route.desc}
                        ${route.sample ? `<pre style="margin-top:8px;background:#0b1020;color:#d1e9ff;padding:10px;border-radius:6px;white-space:pre-wrap;">${JSON.stringify(route.sample, null, 2)}</pre>` : ''}
                    </td>
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
            <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
            <style>
                :root {
                    --bg-color: #0d1117;
                    --card-bg: rgba(22, 27, 34, 0.8);
                    --primary-color: #58a6ff;
                    --secondary-color: #f082ff;
                    --text-color: #c9d1d9;
                    --border-color: #30363d;
                    --button-bg: #238636;
                    --button-hover: #2ea043;
                }
                body, html {
                    margin: 0;
                    padding: 0;
                    font-family: 'Poppins', sans-serif;
                    background-color: var(--bg-color);
                    color: var(--text-color);
                    height: 100%;
                    overflow-x: hidden;
                    overflow-y: auto;
                }
                .background-bubbles {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    z-index: 0;
                }
                .bubble {
                    position: absolute;
                    bottom: -100px;
                    background-color: rgba(88, 166, 255, 0.1);
                    border-radius: 50%;
                    animation: floatUp 15s infinite ease-in;
                }
                .bubble:nth-child(1) { width: 60px; height: 60px; left: 10%; animation-duration: 12s; }
                .bubble:nth-child(2) { width: 40px; height: 40px; left: 20%; animation-duration: 15s; animation-delay: 2s; }
                .bubble:nth-child(3) { width: 80px; height: 80px; left: 35%; animation-duration: 18s; animation-delay: 1s; }
                .bubble:nth-child(4) { width: 50px; height: 50px; left: 50%; animation-duration: 11s; }
                .bubble:nth-child(5) { width: 70px; height: 70px; left: 65%; animation-duration: 16s; animation-delay: 3s; }
                .bubble:nth-child(6) { width: 90px; height: 90px; left: 80%; animation-duration: 20s; }
                .bubble:nth-child(7) { width: 65px; height: 65px; left: 90%; animation-duration: 13s; animation-delay: 2s; }
                .bubble:nth-child(8) { width: 55px; height: 55px; left: 25%; animation-duration: 17s; animation-delay: 4s; }
                .bubble:nth-child(9) { width: 75px; height: 75px; left: 45%; animation-duration: 14s; }
                .bubble:nth-child(10) { width: 100px; height: 100px; left: 70%; animation-duration: 22s; animation-delay: 5s; }

                @keyframes floatUp {
                    0% { transform: translateY(0) rotate(0deg); opacity: 0; border-radius: 50%; }
                    50% { opacity: 1; }
                    100% { transform: translateY(-1000px) rotate(720deg); opacity: 0; border-radius: 20%; }
                }

                .main-content {
                    position: relative;
                    z-index: 1;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    flex-direction: column;
                    transition: all 0.5s ease-in-out;
                    padding: 2rem;
                    box-sizing: border-box;
                }
                .main-content.collapsed {
                    justify-content: flex-start;
                    align-items: flex-start;
                    height: auto;
                    padding: 0;
                }
                .main-content.collapsed .header-section {
                    display: none;
                }
                .container {
                    background-color: var(--card-bg);
                    backdrop-filter: blur(10px);
                    border: 1px solid var(--border-color);
                    border-radius: 1rem;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    max-width: 1200px;
                    width: 90%;
                    display: flex;
                    flex-direction: column;
                    min-height: 80vh;
                    overflow: hidden;
                    transition: all 0.5s ease-in-out;
                }
                .header-section {
                    text-align: center;
                    padding: 4rem 2rem;
                    max-width: 800px;
                    animation: fadeIn 1.5s ease-in-out;
                }
                .header-section h1 {
                    font-size: 3rem;
                    font-weight: 700;
                    color: white;
                    margin: 0;
                    background: linear-gradient(45deg, var(--primary-color), var(--secondary-color));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    filter: drop-shadow(0 0 5px rgba(88, 166, 255, 0.3));
                }
                .header-section p {
                    margin-top: 1rem;
                    font-size: 1.1rem;
                    color: var(--text-color);
                }
                #show-endpoints-btn {
                    margin-top: 2rem;
                    padding: 12px 28px;
                    font-size: 1rem;
                    font-weight: 600;
                    color: white;
                    background-color: var(--button-bg);
                    border: none;
                    border-radius: 50px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px rgba(35, 134, 54, 0.4);
                }
                #show-endpoints-btn:hover {
                    background-color: var(--button-hover);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(46, 160, 67, 0.6);
                }
                .api-docs-container {
                    display: none;
                    flex: 1;
                    transition: all 0.5s ease-in-out;
                    max-height: calc(100vh - 40px);
                    overflow-y: auto;
                }
                .api-docs-container.visible {
                    display: flex;
                }
                .sidebar {
                    width: 280px;
                    padding: 2rem 1rem;
                    display: flex;
                    flex-direction: column;
                    border-right: 1px solid var(--border-color);
                    overflow-y: auto;
                    flex-shrink: 0;
                }
                .tabs {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                .tab-link {
                    display: block;
                    padding: 12px 15px;
                    color: var(--text-color);
                    text-decoration: none;
                    font-weight: 400;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                }
                .tab-link:hover, .tab-link.active {
                    background-color: rgba(88, 166, 255, 0.2);
                    color: var(--primary-color);
                    font-weight: 600;
                }
                .content-wrapper {
                    padding: 2rem;
                    flex-grow: 1;
                    overflow-y: auto;
                }
                .route-table-container {
                    display: none;
                    animation: fadeIn 0.5s ease-in-out;
                }
                .route-table-container.active {
                    display: block;
                }
                h2 {
                    font-size: 1.8rem;
                    color: var(--primary-color);
                    margin-top: 0;
                    margin-bottom: 1.5rem;
                }
                table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0;
                    background-color: rgba(0,0,0,0.1);
                    border-radius: 10px;
                    overflow: hidden;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                    margin-bottom: 2rem;
                }
                th, td {
                    padding: 15px;
                    text-align: left;
                    border-bottom: 1px solid var(--border-color);
                }
                th {
                    background-color: rgba(0,0,0,0.2);
                    color: var(--primary-color);
                    font-weight: 600;
                    text-transform: uppercase;
                }
                tr:last-child td { border-bottom: none; }
                tr:hover { background-color: rgba(255,255,255,0.05); }
                .method {
                    padding: 5px 10px;
                    border-radius: 5px;
                    color: white;
                    font-weight: bold;
                    font-size: 0.8rem;
                    text-transform: uppercase;
                }
                .method-get { background-color: #2da44e; }
                .method-post { background-color: #58a6ff; }
                .method-put { background-color: #e3b341; }
                .method-delete { background-color: #f85149; }
                
                /* Animations */
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @media (max-width: 768px) {
                    .container {
                        width: 95%;
                        min-height: 90vh;
                        flex-direction: column;
                    }
                    .main-content.collapsed {
                        height: 100%;
                    }
                    .api-docs-container.visible {
                        flex-direction: column;
                    }
                    .sidebar {
                        width: 100%;
                        border-right: none;
                        border-bottom: 1px solid var(--border-color);
                    }
                    .content-wrapper {
                        padding: 1rem;
                    }
                }
            </style>
        </head>
        <body>
            <div class="background-bubbles">
                <div class="bubble"></div><div class="bubble"></div><div class="bubble"></div><div class="bubble"></div><div class="bubble"></div>
                <div class="bubble"></div><div class="bubble"></div><div class="bubble"></div><div class="bubble"></div><div class="bubble"></div>
            </div>
            <div class="main-content" id="main-content">
                <div class="header-section" id="header-section">
                    <h1>✨ FunnelsEye API</h1>
                    <p>Your all-in-one backend for marketing funnels, lead management, and more.</p>
                    <button id="show-endpoints-btn">Show API Endpoints</button>
                </div>
                <div class="api-docs-container" id="api-docs-container">
                    <div class="sidebar">
                        <div class="tabs">
                            ${sidebarLinks}
                        </div>
                    </div>
                    <div class="content-wrapper">
                        <div id="docsWrapper">
                            ${routeTables}
                        </div>
                    </div>
                </div>
            </div>
            <script>
                document.addEventListener('DOMContentLoaded', () => {
                    const tabLinks = document.querySelectorAll('.tab-link');
                    const tabContents = document.querySelectorAll('.route-table-container');
                    const showBtn = document.getElementById('show-endpoints-btn');
                    const docsContainer = document.getElementById('api-docs-container');
                    const headerSection = document.getElementById('header-section');
                    const mainContent = document.getElementById('main-content');

                    showBtn.addEventListener('click', () => {
                        docsContainer.classList.add('visible');
                        mainContent.classList.add('collapsed');
                        
                        // Set the first tab as active by default
                        if (tabLinks.length > 0) {
                            tabLinks[0].classList.add('active');
                            tabContents[0].classList.add('active');
                        }
                    });

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


// ⚠️ IMPORTANT: Error Handling Middleware (This is commented out as requested)
// app.use(errorHandler);

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
 * It also starts all necessary worker processes.
 */
const startServer = async () => {
    try {
        await connectDB();
        await init();
        
        // --- Start all the worker processes here with await ---
        await initRulesEngineWorker();
        await initActionExecutorWorker();
        await initScheduledExecutorWorker();
        await initPaymentProcessorWorker();

        server.listen(PORT, () => {
            console.log(`\n\n✨ Server is soaring on port ${PORT}! ✨`);
            console.log(`Local Development Base URL: http://localhost:${PORT}`);
            
            // --- Start the scheduled task ---
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
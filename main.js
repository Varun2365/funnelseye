// D:\PRJ_YCT_Final\server.js

// 🚀 Load environment variables
require('dotenv').config();

// 📦 Core Node.js Modules
const express = require('express');

// ⚙️ Configuration & Utilities
const { connectDB } = require('./config/db');

// 🛡️ Middleware Imports
// const errorHandler = require('./middleware/errorMiddleware'); // Global error handler

// 🛣️ Route Imports
const authRoutes = require('./routes/authRoutes');
const funnelRoutes = require('./routes/funnelRoutes');
const leadRoutes = require('./routes/leadRoutes.js');

// 🌐 Initialize Express App
const app = express();

// ✨ Express Middleware Setup
app.use(express.json()); // Enable parsing of JSON request bodies

// 🔗 Mount API Routes
// Note: Base paths are '/api' for consistency

app.use('/api/auth', authRoutes);
app.use('/api/funnels', funnelRoutes); // Mounting funnel routes with /api/funnels base
app.use('/api/leads', leadRoutes);     // Mounting lead routes with /api/leads base

// 🏠 Basic Root Route (for testing if server is running)
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>FunnelsEye API Status</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    margin: 0;
                    background-color: #f0f4f8; /* Light blue-gray background */
                    color: #333;
                    text-align: center;
                    flex-direction: column;
                }
                .container {
                    background-color: #ffffff;
                    padding: 40px 60px;
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                    transform: translateY(-20px);
                    transition: transform 0.3s ease-in-out;
                }
                .container:hover {
                    transform: translateY(-25px);
                }
                h1 {
                    color: #2c3e50; /* Darker blue-gray */
                    font-size: 2.8em;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                h1 .icon {
                    font-size: 1.2em;
                    margin-right: 15px;
                    animation: bounce 1s infinite alternate;
                }
                p {
                    font-size: 1.2em;
                    color: #555;
                    line-height: 1.6;
                }
                .api-link {
                    margin-top: 30px;
                    font-size: 1.1em;
                }
                .api-link a {
                    color: #007bff;
                    text-decoration: none;
                    font-weight: bold;
                    transition: color 0.3s ease;
                }
                .api-link a:hover {
                    color: #0056b3;
                    text-decoration: underline;
                }
                @keyframes bounce {
                    from { transform: translateY(0); }
                    to { transform: translateY(-10px); }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1><span class="icon">🚀</span> FunnelsEye API is Online! <span class="icon">✨</span></h1>
                <p>Your API server is up and running perfectly.</p>
                <p>Access your API endpoints securely.</p>
                <div class="api-link">
                    <p>Go to your API: <a href="https://api.funnelseye.com/api/auth/login">https://api.funnelseye.com/api/auth/login</a></p>
                </div>
            </div>
        </body>
        </html>
    `);
});

// ⚠️ IMPORTANT: Error Handling Middleware


// 🌍 Define Server Port
const PORT = process.env.PORT || 8080;


// --- Helper function to print API routes in a formatted table ---
function printApiTable(title, routes, baseUrl) { // Removed 'port' parameter as it's no longer used for path construction
    const METHOD_WIDTH = 8;
    const PATH_WIDTH = 75; // Path width remains generous for complex routes
    const DESC_WIDTH = 45;

    const totalWidth = METHOD_WIDTH + PATH_WIDTH + DESC_WIDTH + 8; // Including padding and separators

    const hr = '─'.repeat(totalWidth); // Horizontal rule

    console.log(`\n\n${title}`);
    console.log(`╭${hr}╮`);
    console.log(`│ ${'Method'.padEnd(METHOD_WIDTH)} │ ${'URL'.padEnd(PATH_WIDTH)} │ ${'Description'.padEnd(DESC_WIDTH)} │`);
    console.log(`├${'─'.repeat(METHOD_WIDTH)}─┼─${'─'.repeat(PATH_WIDTH)}─┼─${'─'.repeat(DESC_WIDTH)}─┤`);

    routes.forEach(route => {
        // MODIFIED LINE: Construct path without http://localhost:{PORT}
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

        // 🚀 Start the Express app
        app.listen(PORT, () => {
            console.log(`\n\n✨ Server is soaring on port ${PORT}! ✨`);
            console.log(`Local Development Base URL: http://localhost:${PORT}/api`); // Added a clear base URL for reference


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
                { method: 'DELETE', path: '/coach/:coachId/funnels/:funnelId', desc: 'Delete Funnel' },
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

            // --- Print API Endpoints Tables ---
            // Removed 'PORT' from printApiTable calls as it's no longer used for path
            printApiTable('--- 🔑 Authentication Endpoints ---', authRoutesData, '/api/auth');
            printApiTable('--- 📈 Funnel Management & Analytics Endpoints ---', funnelRoutesData, '/api/funnels');
            printApiTable('--- 🎯 Lead Management (CRM) Endpoints ---', leadRoutesData, '/api/leads');

            console.log('\n\n---------------------------------------\n\n');

        });
    } catch (error) {
        console.error(`\n❌ Server failed to start: ${error.message}\n`);
        process.exit(1); // Exit process with failure
    }
};

// Initiate the server startup process
startServer();
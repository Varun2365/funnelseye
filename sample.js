const https = require('https');

const URL_TO_PING = 'https://pt-wifi.onrender.com';
const PING_INTERVAL_MS = 6 * 60 * 1000; // 6 minutes in milliseconds (for the actual ping)
const SCHEDULE_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds (for checking the time and managing pings)
const WORLD_TIME_API_URL = 'http://worldtimeapi.org/api/timezone/Asia/Kolkata';

// Define the "do not ping" window in 24-hour format
const NO_PING_START_HOUR = 0; // 12 AM (midnight)
const NO_PING_END_HOUR = 5;   // 5 AM

let pingIntervalId = null; // To store the interval ID for clearing

/**
 * Fetches the current hour in the Asia/Kolkata timezone from an API.
 * @returns {Promise<number|null>} A promise that resolves with the current hour (0-23)
 * or null if there's an error.
 */
async function getCurrentIndianHour() {
    try {
        return new Promise((resolve, reject) => {
            https.get(WORLD_TIME_API_URL, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const timeData = JSON.parse(data);
                            const datetimeString = timeData.datetime;
                            // new Date() correctly parses ISO 8601 strings and handles the timezone offset
                            const currentHour = new Date(datetimeString).getHours();
                            resolve(currentHour);
                        } catch (parseError) {
                            console.error(`[${new Date().toLocaleString()}] Error parsing API response: ${parseError.message}`);
                            resolve(null);
                        }
                    } else {
                        console.error(`[${new Date().toLocaleString()}] Failed to get time from API. Status: ${res.statusCode}`);
                        resolve(null);
                    }
                });
            }).on('error', (err) => {
                console.error(`[${new Date().toLocaleString()}] Error fetching time from API: ${err.message}`);
                resolve(null);
            });
        });
    } catch (err) {
        console.error(`[${new Date().toLocaleString()}] Unexpected error in getCurrentIndianHour: ${err.message}`);
        return null;
    }
}


/**
 * Checks if the current Indian time is within the active pinging hours.
 * @returns {Promise<boolean>} A promise that resolves to true if within ping hours, false otherwise.
 */
async function isWithinPingHours() {
    const currentHour = await getCurrentIndianHour();

    if (currentHour === null) {
        // If we can't get the time, default to pinging to avoid accidental spin-down.
        // You might consider adding more sophisticated error handling or a retry mechanism here.
        console.warn(`[${new Date().toLocaleString()}] Could not get current Indian hour. Defaulting to active hours to avoid spin-down.`);
        return true;
    }

    // Check if current time is within the "do not ping" window
    if (NO_PING_START_HOUR <= NO_PING_END_HOUR) {
        // Simple case: e.g., 00:00 to 05:00
        return !(currentHour >= NO_PING_START_HOUR && currentHour < NO_PING_END_HOUR);
    } else {
        // Case where end hour is before start hour (e.g., 22:00 to 06:00, spanning midnight)
        return !(currentHour >= NO_PING_START_HOUR || currentHour < NO_PING_END_HOUR);
    }
}

async function hitEndpoint() {
    const shouldPing = await isWithinPingHours();

    if (!shouldPing) {
        const nowHour = await getCurrentIndianHour(); // Get current hour again for logging
        console.log(`[${new Date().toLocaleString()}] Not pinging: Outside active hours (IST ${NO_PING_START_HOUR}:00 - ${NO_PING_END_HOUR}:00 is off-period). Current IST hour: ${nowHour !== null ? nowHour : 'N/A'}`);
        return; // Do not send a ping
    }

    console.log(`[${new Date().toLocaleString()}] Pinging ${URL_TO_PING}...`);

    https.get(URL_TO_PING, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            console.log(`[${new Date().toLocaleString()}] Response Status: ${res.statusCode}`);
        });

    }).on('error', (err) => {
        console.error(`[${new Date().toLocaleString()}] Error hitting ${URL_TO_PING}: ${err.message}`);
    });
}

// Function to manage the ping interval based on time
async function managePingSchedule() {
    const shouldPing = await isWithinPingHours();

    if (shouldPing) {
        // If within active hours and interval is not running, start it
        if (!pingIntervalId) {
            const currentHour = await getCurrentIndianHour(); // Get hour for logging
            console.log(`[${new Date().toLocaleString()}] Entering active ping hours (Current IST hour: ${currentHour !== null ? currentHour : 'N/A'}). Starting ping every ${PING_INTERVAL_MS / 1000 / 60} minutes.`);
            hitEndpoint(); // Ping immediately on entering active hours
            pingIntervalId = setInterval(hitEndpoint, PING_INTERVAL_MS);
        }
    } else {
        // If outside active hours and interval is running, stop it
        if (pingIntervalId) {
            const currentHour = await getCurrentIndianHour(); // Get hour for logging
            console.log(`[${new Date().toLocaleString()}] Entering off-hours (Current IST hour: ${currentHour !== null ? currentHour : 'N/A'}). Stopping continuous pings.`);
            clearInterval(pingIntervalId);
            pingIntervalId = null;
        }
        // Still call hitEndpoint once here to log that we are not pinging
        hitEndpoint();
    }
}

// Initial check and set up a check for every SCHEDULE_CHECK_INTERVAL_MS to manage the main ping interval
console.log(`Program started. Managing ping schedule for ${URL_TO_PING} based on Indian Standard Time (IST).`);
console.log(`Active pinging hours: All times except IST ${NO_PING_START_HOUR}:00 AM to ${NO_PING_END_HOUR}:00 AM.`);
console.log(`Checking time and schedule every ${SCHEDULE_CHECK_INTERVAL_MS / 1000 / 60} minutes.`);

// Run the manager immediately and then at the specified interval
managePingSchedule();
setInterval(managePingSchedule, SCHEDULE_CHECK_INTERVAL_MS); // Check every 5 minutes to start/stop pings
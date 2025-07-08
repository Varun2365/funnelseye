const https = require('https');
const http = require('http'); // Included for completeness, though WorldTimeAPI supports HTTPS

const URL_TO_PING = 'https://pt-wifi.onrender.com';
const PING_INTERVAL_MS = 6 * 60 * 1000;
const SCHEDULE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const WORLD_TIME_API_URL = 'https://worldtimeapi.org/api/timezone/Asia/Kolkata';

const NO_PING_START_HOUR = 0;
const NO_PING_END_HOUR = 5;

let pingIntervalId = null;

async function getCurrentIndianHour() {
    try {
        return new Promise((resolve, reject) => {
            const protocolModule = WORLD_TIME_API_URL.startsWith('https://') ? https : http;

            protocolModule.get(WORLD_TIME_API_URL, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        try {
                            const timeData = JSON.parse(data);
                            const datetimeString = timeData.datetime;
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

async function isWithinPingHours() {
    const currentHour = await getCurrentIndianHour();

    if (currentHour === null) {
        console.warn(`[${new Date().toLocaleString()}] Could not get current Indian hour. Defaulting to active hours to avoid spin-down.`);
        return true;
    }

    if (NO_PING_START_HOUR <= NO_PING_END_HOUR) {
        return !(currentHour >= NO_PING_START_HOUR && currentHour < NO_PING_END_HOUR);
    } else {
        return !(currentHour >= NO_PING_START_HOUR || currentHour < NO_PING_END_HOUR);
    }
}

async function hitEndpoint() {
    const shouldPing = await isWithinPingHours();

    if (!shouldPing) {
        const nowHour = await getCurrentIndianHour();
        console.log(`[${new Date().toLocaleString()}] Not pinging: Outside active hours (IST ${NO_PING_START_HOUR}:00 - ${NO_PING_END_HOUR}:00 is off-period). Current IST hour: ${nowHour !== null ? nowHour : 'N/A'}`);
        return;
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

async function managePingSchedule() {
    const shouldPing = await isWithinPingHours();

    if (shouldPing) {
        if (!pingIntervalId) {
            const currentHour = await getCurrentIndianHour();
            console.log(`[${new Date().toLocaleString()}] Entering active ping hours (Current IST hour: ${currentHour !== null ? currentHour : 'N/A'}). Starting ping every ${PING_INTERVAL_MS / 1000 / 60} minutes.`);
            hitEndpoint();
            pingIntervalId = setInterval(hitEndpoint, PING_INTERVAL_MS);
        }
    } else {
        if (pingIntervalId) {
            const currentHour = await getCurrentIndianHour();
            console.log(`[${new Date().toLocaleString()}] Entering off-hours (Current IST hour: ${currentHour !== null ? currentHour : 'N/A'}). Stopping continuous pings.`);
            clearInterval(pingIntervalId);
            pingIntervalId = null;
        }
        hitEndpoint();
    }
}

console.log(`Program started. Managing ping schedule for ${URL_TO_PING} based on Indian Standard Time (IST).`);
console.log(`Active pinging hours: All times except IST ${NO_PING_START_HOUR}:00 AM to ${NO_PING_END_HOUR}:00 AM.`);
console.log(`Checking time and schedule every ${SCHEDULE_CHECK_INTERVAL_MS / 1000 / 60} minutes.`);

managePingSchedule();
setInterval(managePingSchedule, SCHEDULE_CHECK_INTERVAL_MS);
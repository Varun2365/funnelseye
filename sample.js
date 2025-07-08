const https = require('https');

const URL_TO_PING = 'https://pt-wifi.onrender.com';
const PING_INTERVAL_MS = 6 * 60 * 1000;
const SCHEDULE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

const NO_PING_START_HOUR = 0;
const NO_PING_END_HOUR = 5;

let pingIntervalId = null;

function isWithinPingHours() {
    const now = new Date();
    const currentHour = now.getHours();

    if (NO_PING_START_HOUR <= NO_PING_END_HOUR) {
        return !(currentHour >= NO_PING_START_HOUR && currentHour < NO_PING_END_HOUR);
    } else {
        return !(currentHour >= NO_PING_START_HOUR || currentHour < NO_PING_END_HOUR);
    }
}

function hitEndpoint() {
    if (!isWithinPingHours()) {
        return; // Do not send a ping if outside active hours
    }

    https.get(URL_TO_PING, (res) => {
        // Consume response data to prevent connection from hanging
        res.on('data', () => {});
        res.on('end', () => {
            // Log "Hitted" on successful response
            console.log(`[${new Date().toLocaleString()}] Hitted`);
        });
    }).on('error', (err) => {
        // Keep error logging for network issues
        console.error(`[${new Date().toLocaleString()}] Error hitting ${URL_TO_PING}: ${err.message}`);
    });
}

function managePingSchedule() {
    if (isWithinPingHours()) {
        if (!pingIntervalId) {
            // Only ping immediately if entering active hours AND it's not already active
            hitEndpoint();
            pingIntervalId = setInterval(hitEndpoint, PING_INTERVAL_MS);
        }
    } else {
        if (pingIntervalId) {
            clearInterval(pingIntervalId);
            pingIntervalId = null;
        }
    }
}

// Initial setup to manage the schedule
managePingSchedule();
// Set interval to periodically check and manage the pinging schedule
setInterval(managePingSchedule, SCHEDULE_CHECK_INTERVAL_MS);


import { getOrCreateSessionId } from '../utils/sessionTracker';

// IMPORTANT: Replace with your actual backend API base URL
const API_BASE_URL = 'http://localhost:5000/api';

/**
 * Sends funnel event data to the backend tracking endpoint.
 */
export const trackFunnelEvent = async (funnelId, stageId, eventType, userId = null, metadata = {}) => {
    const sessionId = getOrCreateSessionId();

    try {
        const response = await fetch(`${API_BASE_URL}/funnels/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                funnelId,
                stageId,
                eventType,
                sessionId,
                userId,
                // metadata: metadata // Uncomment if you use metadata
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error(`Failed to track event ${eventType}:`, error.message);
        } else {
            console.log(`Event '${eventType}' tracked for funnel ${funnelId}.`);
        }
    } catch (error) {
        console.error(`Error tracking event ${eventType}:`, error);
    }
};
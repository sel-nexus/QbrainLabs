import axios from 'axios';
import { API_BASE_URL } from './config';

const TOKEN_KEY = 'hm_auth_token';
const PARTICIPANT_TOKEN_KEY = 'participant_token';

export const api = axios.create({
    baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 30000, // 30 second timeout
});



// Add auth token to all requests (facilitator or participant)
api.interceptors.request.use((config) => {
    // Only add Authorization header if not already set (allows explicit headers to take precedence)
    if (!config.headers.Authorization) {
        // Check for facilitator token first
        const facilitatorToken = localStorage.getItem(TOKEN_KEY);
        if (facilitatorToken) {
            config.headers.Authorization = `Bearer ${facilitatorToken}`;
        } else {
            // Fall back to participant token if no facilitator token
            const participantToken = localStorage.getItem(PARTICIPANT_TOKEN_KEY);
            if (participantToken) {
                config.headers.Authorization = `Bearer ${participantToken}`;
            }
        }
    }
    return config;
}, (error) => {
    // Handle request errors
    console.error('Request error:', error);
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => {
        const contentType = response.headers['content-type'];
        if (contentType && (contentType.includes('text/html') || contentType.includes('application/x-javascript'))) {
            const body = typeof response.data === 'string' ? response.data : '';
            console.error('[API] Received HTML response:', body.substring(0, 500));

            const lower = body.toLowerCase();
            let message: string;
            if (lower.includes('zscaler') || lower.includes('gateway.zscaler')) {
                message = 'Request intercepted by Zscaler. Comment out VITE_API_URL in .env and restart the client.';
            } else if (lower.includes('proxy') || lower.includes('firewall') || lower.includes('blocked') || lower.includes('access denied')) {
                message = 'Request intercepted by corporate proxy/firewall (got HTML instead of JSON). Comment out VITE_API_URL in .env and restart the client.';
            } else {
                message = 'API returned HTML instead of JSON — likely intercepted by a proxy. Check VITE_API_URL in .env or verify the backend is running.';
            }
            return Promise.reject(new Error(message));
        }
        return response;
    },
    (error) => {
        // Handle network errors (no response from server)
        if (!error.response) {
            if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                error.networkError = {
                    type: 'timeout',
                    message: 'Request timed out. Please check your connection and try again.',
                };
            } else if (error.code === 'ERR_NETWORK' || error.message.includes('Network Error') || error.code === 'ECONNREFUSED') {
                error.networkError = {
                    type: 'network',
                    message: `Cannot connect to server at ${API_BASE_URL}. The server is not running or unreachable.`,
                };
            } else {
                error.networkError = {
                    type: 'unknown',
                    message: 'Network error occurred. Please check your connection and try again.',
                };
            }
        }
        return Promise.reject(error);
    }
);

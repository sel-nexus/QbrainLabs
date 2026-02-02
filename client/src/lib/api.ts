import axios from 'axios';
import { API_BASE_URL } from './config';

const TOKEN_KEY = 'hm_auth_token';
const PARTICIPANT_TOKEN_KEY = 'participant_token';

export const api = axios.create({
    baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
    headers: {
        'Content-Type': 'application/json',
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

// Add response interceptor for better error handling
api.interceptors.response.use(
    (response) => response,
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
                    message: `Cannot connect to server at ${API_BASE_URL}. The server is not running. Please start the backend server first.`,
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

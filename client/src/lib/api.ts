import axios from 'axios';

const TOKEN_KEY = 'hm_auth_token';
const PARTICIPANT_TOKEN_KEY = 'participant_token';

// Use VITE_API_URL environment variable, fallback to detecting the current host
// This allows the app to work when accessed via IP address
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // If accessing via IP, use the same IP for API
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:8000`;
  }
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
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

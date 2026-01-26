
// Auto-detect API URL based on current hostname for network access
export const getApiBaseUrl = () => {
    // Allow overriding via environment variable
    if (import.meta.env.VITE_API_URL) {
        console.log('[Config] Using configured API URL:', import.meta.env.VITE_API_URL);
        return import.meta.env.VITE_API_URL;
    }

    // If accessing via IP, use the same IP for API
    // This supports accessing the app from other devices on the network
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        const networkApiUrl = `http://${hostname}:8000`;
        console.log(`[Config] Network access detected (${hostname}). using API URL:`, networkApiUrl);
        return networkApiUrl;
    }

    // Default to localhost for development
    console.log('[Config] Localhost access detected. Using default API URL: http://localhost:8000');
    return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

// Authentication configuration handling multiple environments/domains
export const authConfig = {
    // Auth0/OIDC domain from environment variables
    domain: import.meta.env.VITE_AUTH_DOMAIN,

    // Client ID from environment variables
    clientId: import.meta.env.VITE_AUTH_CLIENT_ID,

    // Dynamic redirect URI based on current window origin
    // This automatically handles localhost vs production domains
    redirectUri: `${window.location.origin}/callback`,
};

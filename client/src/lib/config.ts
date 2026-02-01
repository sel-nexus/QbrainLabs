
// Auto-detect API URL based on current hostname for network access
export const getApiBaseUrl = () => {
    // Allow overriding via environment variable
    // Note: Disabling this to force Proxy usage for Public IP fix
    /* if (import.meta.env.VITE_API_URL) {
        console.log('[Config] Using configured API URL:', import.meta.env.VITE_API_URL);
        return import.meta.env.VITE_API_URL;
    } */

    // If accessing via IP, use relative path to leverage Vite proxy
    // This supports accessing the app from other devices on the network via the frontend port (5173)
    // The Vite proxy will forward /api requests to the backend port (8000)
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        console.log(`[Config] Network access detected (${hostname}). Using relative API path for proxy.`);
        return '';
    }

    // Default to localhost for development
    // return 'http://localhost:8000';
    // Use relative path for localhost too to ensure consistent proxy usage
    console.log('[Config] Localhost access detected. Using relative API path.');
    return '';
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

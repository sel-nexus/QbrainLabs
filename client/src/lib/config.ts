
// Auto-detect API URL based on current hostname for network access
export const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    const envUrl = import.meta.env.VITE_API_URL;

    // When VITE_API_URL is set, only use it if it points to the same host we're
    // browsing from OR to localhost/127.0.0.1.  If the env var points to an
    // external/public IP but the user is on localhost, skip it — the Vite dev
    // proxy will forward /api to the backend safely without going through
    // corporate proxies (Zscaler, etc.) that would intercept the request.
    if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
        try {
            const envHost = new URL(envUrl).hostname;
            const isEnvLocal = envHost === 'localhost' || envHost === '127.0.0.1';
            const isBrowserLocal = hostname === 'localhost' || hostname === '127.0.0.1';
            const envMatchesBrowser = envHost === hostname;

            if (isEnvLocal || envMatchesBrowser) {
                console.log('[Config] Using configured API URL:', envUrl);
                return envUrl.replace(/\/$/, '');
            }

            if (isBrowserLocal) {
                console.log(
                    `[Config] VITE_API_URL points to external host (${envHost}) but ` +
                    `browsing from localhost — using relative path via Vite proxy to ` +
                    `avoid corporate proxy / Zscaler interception.`
                );
                return '';
            }

            // Non-localhost browser accessing non-matching VITE_API_URL — honour it
            console.log('[Config] Using configured API URL:', envUrl);
            return envUrl.replace(/\/$/, '');
        } catch {
            console.warn('[Config] Invalid VITE_API_URL, falling back to proxy:', envUrl);
        }
    }

    // No VITE_API_URL set (or it was invalid) — use relative path so the Vite
    // dev proxy (or nginx in production) forwards /api to the backend.
    if (hostname === '48.214.144.154' || hostname === 'qbrainlabs.com' || hostname === 'qbitzai.com' || hostname === 'www.qbrainlabs.com' || hostname === 'www.qbitzai.com') {
        console.log(`[Config] Public Domain/IP detected (${hostname}). Using relative path to leverage proxy.`);
        return '';
    }

    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
        console.log(`[Config] Network access detected (${hostname}). Using relative API path for proxy.`);
        return '';
    }

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

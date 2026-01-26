# Dynamic CORS IP Support

## Overview

The application now supports dynamic CORS (Cross-Origin Resource Sharing) that automatically accepts requests from origins matching the server's IP addresses, whether accessed via private or public IP addresses. This ensures the application works seamlessly regardless of which IP address is used to access it.

## Features

- **Automatic IP Detection**: The server automatically detects all network interfaces and their IP addresses (both private and public) at startup
- **Dynamic CORS**: CORS origins are automatically generated for all detected IP addresses
- **Backward Compatible**: Still supports manually configured CORS origins via `CORS_ORIGINS` environment variable
- **Socket.io Support**: WebSocket connections also use dynamic CORS origins

## How It Works

### Server-Side

1. **IP Detection**: On startup, the server detects all local IP addresses using:
   - `socket.gethostname()` and `socket.getaddrinfo()` to get hostname-associated IPs
   - Network interface enumeration (if `netifaces` is available)
   - Fallback method using socket connection to determine local IP

2. **Dynamic CORS Middleware**: The `DynamicCORSMiddleware` class:
   - Accepts origins matching any detected server IP address
   - Supports both HTTP and HTTPS protocols
   - Supports multiple ports (5173, 80, 443, 3000)
   - Always allows localhost/127.0.0.1 for local development

3. **Socket.io Integration**: Socket.io server also uses dynamic CORS origins for WebSocket connections

### Client-Side

The client already has logic to detect the current hostname and use it for API and Socket connections:
- If accessed via IP address (e.g., `http://172.31.33.5:5173`), it automatically uses the same IP for API calls
- Falls back to `localhost` if accessed locally

## Configuration

### Environment Variables

```bash
# Enable/disable dynamic CORS (default: true)
ENABLE_DYNAMIC_CORS=true

# Client port for generating CORS origins (default: 5173)
CLIENT_PORT=5173

# Additional CORS origins (comma-separated)
# These are added in addition to dynamically detected IPs
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://example.com:5173
```

### Disabling Dynamic CORS

To use only manually configured CORS origins:

```bash
ENABLE_DYNAMIC_CORS=false
CORS_ORIGINS=http://localhost:5173,http://192.168.1.100:5173
```

## Use Cases

### Scenario 1: Server with Private and Public IPs

**Server IPs:**
- Private IP: `172.31.33.5`
- Public IP: `18.191.118.132`

**Result:**
- Application accessible via `http://172.31.33.5:5173` ✅
- Application accessible via `http://18.191.118.132:5173` ✅
- Both work without manual CORS configuration ✅

### Scenario 2: Development Environment

**Server IPs:**
- Local IP: `192.168.1.100`
- Localhost: `127.0.0.1`

**Result:**
- Application accessible via `http://localhost:5173` ✅
- Application accessible via `http://192.168.1.100:5173` ✅
- Mobile devices on same network can access via IP ✅

## Implementation Details

### Files Created

1. **`server/app/core/network_utils.py`**
   - IP detection utilities
   - CORS origin generation functions
   - Origin matching logic

2. **`server/app/middleware/cors_dynamic.py`**
   - Dynamic CORS middleware implementation
   - Handles preflight OPTIONS requests
   - Adds CORS headers to responses

### Files Modified

1. **`server/app/main.py`**
   - Replaced standard CORS middleware with dynamic CORS middleware
   - Added configuration check for `ENABLE_DYNAMIC_CORS`

2. **`server/app/core/config.py`**
   - Added `ENABLE_DYNAMIC_CORS` setting
   - Added `CLIENT_PORT` setting

3. **`server/app/core/socket_manager.py`**
   - Updated Socket.io CORS configuration to use dynamic origins

4. **`.env.example`**
   - Added documentation for dynamic CORS configuration

## Security Considerations

- **IP-Based CORS**: Only accepts origins matching the server's actual IP addresses
- **No Wildcard**: Does not use wildcard (`*`) CORS, maintaining security
- **Configurable**: Can be disabled in favor of explicit CORS origins for stricter control
- **Production Ready**: Works in production environments with proper IP detection

## Troubleshooting

### Issue: CORS errors still occurring

**Solution:**
1. Check server logs for detected IP addresses
2. Verify `ENABLE_DYNAMIC_CORS=true` in `.env`
3. Ensure client is accessing via one of the detected IPs
4. Check that `CLIENT_PORT` matches the frontend port

### Issue: Socket.io connections failing

**Solution:**
1. Verify Socket.io is using dynamic CORS origins (check logs)
2. Ensure WebSocket path matches client configuration
3. Check firewall rules for WebSocket ports

### Issue: IP detection not working

**Solution:**
1. Install `netifaces` for better IP detection: `pip install netifaces`
2. Check network interface permissions
3. Verify server has network interfaces configured

## Testing

To test dynamic CORS:

1. **Start the server** and check logs for detected IPs:
   ```
   INFO: Detected server IP addresses: ['172.31.33.5', '18.191.118.132']
   INFO: Using dynamic CORS middleware - accepts origins matching server IP addresses
   ```

2. **Access application** via different IPs:
   - `http://localhost:5173` (should work)
   - `http://172.31.33.5:5173` (should work)
   - `http://18.191.118.132:5173` (should work)

3. **Check browser console** for CORS errors (should be none)

4. **Test WebSocket connections** - they should connect successfully from any detected IP

## Future Enhancements

- Support for domain-based CORS (e.g., `*.example.com`)
- CORS origin caching for performance
- Metrics/logging for CORS origin matching
- Support for IPv6 addresses

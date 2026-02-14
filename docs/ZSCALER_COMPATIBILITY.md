# Zscaler Compatibility Guide

## Overview

This document describes the fixes implemented to ensure the QBrain Labs application works correctly when accessed from corporate networks with Zscaler or similar SSL-inspecting proxies enabled.

## Issues Identified

When accessing the application through Zscaler, the following issues occurred:

1. **WebSocket Connection Failures**
   - Multiple `EIO=4&transport=websocket failed` errors
   - WebSocket connections were blocked by Zscaler's SSL inspection

2. **Authentication API Failures**
   - 403 Forbidden errors during login
   - API returning HTML instead of JSON (Zscaler interception page)

## Root Causes

1. **WebSocket Transport Priority**: Client attempted WebSocket connections first, which corporate proxies typically block
2. **Missing Proxy Headers**: Requests lacked headers that help them pass through corporate proxies
3. **Insufficient Timeouts**: Default timeouts were too short for proxy environments
4. **No Graceful Degradation**: WebSocket failures didn't fall back to polling properly

## Implemented Fixes

### Client-Side Changes

#### 1. Socket.IO Configuration (`client/src/lib/socket.ts`)

**Changes:**
- **Transport Priority**: Changed from `['websocket', 'polling']` to `['polling', 'websocket']`
  - Starts with HTTP long-polling (proxy-friendly)
  - Attempts upgrade to WebSocket only if possible
- **Increased Timeouts**: Extended from 20s to 30s for proxy latency
- **Upgrade Settings**:
  - `upgrade: true` - Allow transport upgrades
  - `rememberUpgrade: false` - Don't cache upgrade attempts (prevents stuck WebSocket attempts)
- **CORS Credentials**: Added `withCredentials: true` for proper CORS handling through proxies

**Why This Works:**
- HTTP long-polling works through all corporate proxies
- WebSocket upgrade is optional, not required
- Longer timeouts accommodate proxy latency

#### 2. Axios API Configuration (`client/src/lib/api.ts`)

**Changes:**
- **Proxy Headers**: Added `X-Requested-With: XMLHttpRequest` header
  - Helps proxies identify AJAX requests
  - Prevents HTML interception pages
- **Increased Timeout**: Extended from 30s to 60s
- **CORS Credentials**: Added `withCredentials: true`

**Why This Works:**
- `X-Requested-With` header signals to proxies this is an API request
- Longer timeout handles proxy processing delays
- Credentials support ensures cookies/auth work through proxies

### Server-Side Changes

#### 3. Socket.IO Server Configuration (`server/app/core/socket_manager.py`)

**Changes:**
- **Ping Settings**:
  - `ping_timeout=60` - Extended timeout for proxy environments
  - `ping_interval=25` - Keep connections alive through proxies
- **Buffer Size**: `max_http_buffer_size=1000000` (1MB) for proxy buffering
- **Compression**: `http_compression=True` for better proxy performance
- **Upgrades**: `allow_upgrades=True` to support transport upgrades

**Why This Works:**
- Longer ping intervals keep connections alive through proxy timeouts
- Larger buffers accommodate proxy buffering
- Compression reduces data transfer through proxies

#### 4. CORS Middleware (`server/app/middleware/cors_dynamic.py`)

**Changes:**
- **Explicit Headers**: Added explicit header list including `X-Requested-With`
- **Expose Headers**: Added `Access-Control-Expose-Headers` for response headers
- **Max Age**: Set `Access-Control-Max-Age: 3600` to cache preflight requests

**Why This Works:**
- Explicit header permissions prevent proxy blocking
- Exposed headers allow client to read response metadata
- Cached preflight reduces proxy overhead

## Testing Instructions

### Prerequisites
1. Access to a laptop with Zscaler enabled
2. VPN connection to corporate network (if required)
3. Application deployed and accessible

### Test Steps

1. **Restart Services**
   ```bash
   # Restart backend server
   cd server
   python -m app.run
   
   # Restart frontend (in separate terminal)
   cd client
   npm run dev
   ```

2. **Clear Browser Cache**
   - Open DevTools (F12)
   - Right-click refresh button → "Empty Cache and Hard Reload"
   - Or: Settings → Privacy → Clear browsing data

3. **Test Login Flow**
   - Navigate to facilitator login page
   - Open DevTools → Console tab
   - Enter credentials and click "Sign In"
   - **Expected**: Successful login without 403 errors
   - **Monitor**: Console should show polling transport, not websocket errors

4. **Test WebSocket Connection**
   - After login, open DevTools → Network tab
   - Filter by "WS" (WebSocket) and "Other"
   - **Expected**: 
     - Initial connection via polling (status 200)
     - Possible upgrade to WebSocket (optional)
     - No `EIO=4&transport=websocket failed` errors

5. **Test Real-Time Features**
   - Join a workshop as facilitator
   - Open same workshop as participant (different browser/incognito)
   - Submit a vote as participant
   - **Expected**: Vote appears in real-time on facilitator dashboard

### Troubleshooting

#### Still Seeing WebSocket Errors?
- **This is OK** if the errors are followed by successful polling connections
- Check for `transport=polling` requests with status 200
- Real-time features should still work via polling

#### 403 Forbidden Errors?
1. Check browser console for exact error message
2. Verify `X-Requested-With` header is present in request (Network tab → Headers)
3. Check if Zscaler is returning HTML (Response tab should show JSON, not HTML)
4. Contact IT to whitelist the application domain

#### Slow Performance?
- Expected in proxy environments due to:
  - SSL inspection overhead
  - Proxy routing latency
  - Polling instead of WebSocket
- Performance should still be acceptable for workshop use

## Configuration Options

### Disable WebSocket Entirely (If Needed)

If WebSocket causes issues even with polling fallback:

**Client (`client/src/lib/socket.ts`):**
```typescript
transports: ['polling'], // Remove 'websocket'
upgrade: false, // Disable upgrade attempts
```

**Server (`server/app/core/socket_manager.py`):**
```python
allow_upgrades=False,  # Disable transport upgrades
```

### Adjust Timeouts

If experiencing timeout issues:

**Client:**
```typescript
timeout: 60000, // Increase to 60s
reconnectionDelay: 2000, // Slower reconnection
```

**Server:**
```python
ping_timeout=120,  # Increase to 120s
ping_interval=30,  # Slower ping interval
```

## Performance Considerations

### Polling vs WebSocket

| Aspect | Polling | WebSocket |
|--------|---------|-----------|
| Latency | ~1-2s | ~100ms |
| Bandwidth | Higher | Lower |
| Proxy Compatibility | Excellent | Poor |
| Battery Usage | Higher | Lower |

**For Zscaler environments**: Polling is the recommended approach despite higher overhead.

### Network Usage

- **Polling**: ~1-5 KB/s per connection (idle)
- **WebSocket**: ~0.1-0.5 KB/s per connection (idle)
- **Impact**: Minimal for typical workshop sizes (10-50 participants)

## Additional Resources

- [Socket.IO Proxy Documentation](https://socket.io/docs/v4/reverse-proxy/)
- [Zscaler SSL Inspection](https://help.zscaler.com/zia/about-ssl-inspection)
- [CORS in Corporate Environments](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

## Support

If issues persist after implementing these fixes:

1. Collect browser console logs (DevTools → Console → Save)
2. Collect network logs (DevTools → Network → Export HAR)
3. Note exact error messages and timestamps
4. Contact development team with logs and environment details

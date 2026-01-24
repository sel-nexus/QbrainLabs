# User Story: Mobile App Experience & QR Code Integration

**As a** Workshop Participant or Facilitator,
**I want to** easily join or share sessions using QR codes and have a seamless native-like experience on my mobile device,
**So that** accessing workshops is frictionless and the interface feels responsive and tailored to my device.

## Acceptance Criteria

### 1. QR Code Generation (Facilitator)
*   **Generate QR:** The "Lobby" or "Workshop Details" page must display a unique QR code for the session.
*   **Deep Link:** The QR code encodes a URL containing the session PIN (e.g., `https://app.url/join?pin=123456`) to auto-connect users.
*   **Export:** Option to download the QR code as an image (PNG/SVG) for sharing in presentation slides, emails, or printed materials.
*   **Display:** Option to expand the QR code to full screen (Modal) for easy scanning from a distance in a meeting room.

### 2. Mobile-Friendly Hybrid / PWA Features
*   **Responsive Design:** All participant-facing screens (Voting, Idea Submission, Lobby) must be strictly optimized for mobile:
    *   Touch targets minimum 44px.
    *   No horizontal scrolling.
    *   Optimized input fields (correct keyboard types).
*   **Installability (PWA):**
    *   Include a valid `manifest.json` (name, icons, start_url).
    *   Allow users to "Add to Home Screen" for an app-like icon.
*   **Standalone Mode:** When launched from the home screen, the app runs in `standalone` mode (hiding browser address bars/UI) to simulate a native app experience.
*   **iOS/Android Compliance:** proper meta tags (e.g., `apple-mobile-web-app-capable`, `theme-color`, `viewport-fit=cover`).

### 3. Deep Linking & Onboarding
*   **Smart Redirect:**
    *   If a user visits `https://.../join?pin=XYZ`:
    *   If unauthenticated/guest: Redirect to "Enter Name" screen with "XYZ" pre-filled and locked.
    *   If authenticated: Join the workshop immediately.
*   **Link Sharing:** A "Copy Link" button alongside the QR code that copies the deep link to the clipboard.

## Scenarios

### Scenario A: Facilitator Sharing in a Conference Room
1.  Facilitator starts a new workshop and projects their screen.
2.  Clicks "Show Join Code/QR".
3.  A large modal displays the Session PIN and a giant QR code.
4.  Remote participants use the PIN; in-room participants scan the screen.

### Scenario B: Participant Joining via QR
1.  Participant scans the QR code with their iPhone/Android camera.
2.  Tap the notification to open the link.
3.  Browser opens directly to the "Enter Name" screen (PIN is pre-filled).
4.  Participant enters "Alice" and knocks/joins immediately without typing the code.

### Scenario C: Frequent Mobile User
1.  User attends multiple workshops.
2.  User taps "Share -> Add to Home Screen" on their phone.
3.  Later, user taps the "Hotspot Matrix" icon on their home screen.
4.  App opens without browser chrome (full screen).
5.  User feels like they are using a native app.

## Technical Notes
*   **QR Library:** Use a library like `qrcode.react` or `qrcode` for client-side generation.
*   **PWA:** Use `vite-plugin-pwa` (if using Vite) or manually configure `manifest.json` and service worker registrations in `index.html`.
*   **Meta Tags:** Ensure `viewport` is set to `width=device-width, initial-scale=1, maximum-scale=1` to prevent auto-zooming on inputs only if accessibility allows, or style inputs to prevent zoom (font-size >= 16px).
*   **Icons:** Need a set of app icons (192x192, 512x512) for the manifest.

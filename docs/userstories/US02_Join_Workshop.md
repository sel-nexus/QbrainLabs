# User Story: Simple Participant Onboarding

**As a** Business Stakeholder,
**I want to** join a workshop quickly using a PIN without a complex registration process,
**So that** I can focus on providing input rather than managing account credentials.

## Acceptance Criteria

### 1. Access Entry Points
* **Landing Page:** Simple, mobile-first page with a large numeric keypad/input for PIN.
* **Direct Link:** Opening `app.url/join/123456` auto-fills the PIN.
* **QR Code:** Scanning the code opens the Direct Link.

### 2. Identification
* **Display Name:** Required field (Max 20 chars).
* **Role (Optional):** Dropdown to select department (e.g., IT, Sales) if configured by Facilitator.
* **Avatar:** Randomly generated or user-selected emoji for fun/personalization.

### 3. Connection Feedback
* **Validation:** Check if PIN exists and Workshop is in `OPEN` or `IN_PROGRESS` state.
* **Error Handling:**
    * If PIN invalid: "Session not found."
    * If Workshop Closed: "This session has ended."
* **Waiting Room:** After joining, show a "Waiting for Facilitator to start..." screen with a pulsing animation or workshop details.

## Scenarios

### Scenario A: Successful Join
1. User scans QR code on the meeting room screen.
2. Phone opens browser to pre-filled PIN.
3. User enters name "Alice".
4. Taps "Join".
5. Screen shows: "Welcome Alice! Waiting for host..."

### Scenario B: Re-joining (Disconnection)
1. Alice's phone goes to sleep or refreshing page.
2. Browser reloads.
3. System checks `localStorage` for `session_token`.
4. Automatically reconnects Alice to the active session without asking for PIN/Name again.

### Scenario C: Name Conflict (Optional refinement)
1. User enters "Bob".
2. "Bob" is already taken in this session.
3. System suggests "Bob 2" or asks to differentiate ("Bob S.").

## Technical Notes:
* **Session Storage:** Use `localStorage` or `sessionStorage` to persist the JWT token.
* **Socket.io:** immediately establish WebSocket connection upon successful join to receive "START" event.
* **Security:** Rate limit PIN attempts to prevent brute-force guessing of active sessions.
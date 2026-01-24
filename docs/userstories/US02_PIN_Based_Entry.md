# US02: PIN-Based Participant Entry

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Workshop Administration & Access  
**Story Type:** Feature  
**Priority:** High  
**Story Points:** 5

---

## User Story

**As a** Business Stakeholder,  
**I want to** join a workshop via a simple access code,  
**So that** I don't have to create an enterprise account for a one-time session.

---

## Description

Business stakeholders need a frictionless way to join workshops without the overhead of account creation. Using a simple 6-digit PIN, participants can quickly access active workshops and begin submitting ideas.

---

## Requirements

### Functional Requirements

1. **Landing Page**
   - Clean, minimal design with "Join Workshop" section
   - Single input field for 6-digit PIN
   - "Join" button prominently displayed
   - Optional: "What's a PIN?" helper text

2. **PIN Validation Logic**
   - Check PIN exists in MongoDB `workshops` collection
   - Verify workshop status is "active"
   - Check workshop hasn't expired

3. **Session Generation**
   - Create temporary session for participant
   - Generate unique Session ID (UUID)
   - Store session data in memory or session storage
   - Associate session with workshop_pin

4. **Navigation**
   - Redirect to submission screen on successful validation
   - Display appropriate error messages for invalid PINs

### Non-Functional Requirements

- PIN validation must complete in < 1 second
- Support for 100+ concurrent participants per workshop
- Mobile-first responsive design
- Accessibility compliance (WCAG 2.1 Level AA)

---

## Acceptance Criteria

### Scenario 1: Successful Workshop Join
**Given** a participant has received a valid 6-digit PIN  
**When** they enter the PIN on the landing page  
**Then** the system validates the PIN against active workshops  
**And** creates a temporary session for the participant  
**And** redirects to the "Submission" screen

### Scenario 2: Invalid PIN Entry
**Given** a participant enters an incorrect PIN  
**When** they click the "Join" button  
**Then** the system displays "Workshop Not Found" alert  
**And** the input field is cleared and focused  
**And** no session is created

### Scenario 3: Expired Workshop
**Given** a participant enters a PIN for a completed workshop  
**When** the system validates the PIN  
**Then** the system displays "This workshop has ended"  
**And** suggests contacting the facilitator

### Scenario 4: PIN Format Validation
**Given** a participant is entering a PIN  
**When** they enter non-numeric characters or less than 6 digits  
**Then** the system provides real-time feedback  
**And** the "Join" button remains disabled

### Scenario 5: Session Restoration (Re-joining)
**Given** a participant has previously joined active session
**When** they refresh the page or return after the browser was closed
**Then** the system checks for an existing valid session token
**And** automatically reconnects them to the workshop without asking for PIN again
**And** restores their previous state (e.g., waiting room or current active slide)

---

## Technical Implementation

### Frontend Components
- `LandingPage.tsx` - Main landing page
- `PINInput.tsx` - Specialized 6-digit input component
- `SessionProvider.tsx` - Context for session management

### Backend Endpoints
```
POST /api/sessions/join
Request Body:
{
  "pin": "string (6 digits)"
}

Response (Success):
{
  "session_id": "string (UUID)",
  "workshop_id": "string",
  "workshop_title": "string",
  "redirect_url": "/submissions"
}

Response (Error):
{
  "error": "WORKSHOP_NOT_FOUND | WORKSHOP_EXPIRED | INVALID_PIN",
  "message": "string"
}
```

### Session Storage Schema
```json
{
  "session_id": "UUID",
  "workshop_pin": "string",
  "workshop_id": "string",
  "participant_id": "UUID (anonymous)",
  "joined_at": "timestamp",
  "expires_at": "timestamp"
}
```

---

## Dependencies

- US01: Workshop Initialization (PIN must exist)
- US06: MongoDB Atlas SaaS Integration
- Session management library (e.g., express-session or JWT)

---

## Testing Requirements

### Unit Tests
- PIN format validation (6 digits, numeric only)
- Session ID generation (UUID format)
- Error handling for various scenarios

### Integration Tests
- End-to-end PIN validation flow
- Session creation and storage
- Redirect logic

### UI Tests
- Input field behavior
- Error message display
- Loading states
- Mobile responsiveness

### Load Tests
- 100 concurrent PIN validations
- Session creation performance

---

## UI/UX Mockup Notes

### Landing Page Design
- Hero section with workshop branding
- Large, easy-to-see PIN input (6 boxes for digits)
- Clear visual feedback during validation
- Loading spinner while checking PIN
- Error states with actionable messages

### Input Component
- 6 separate boxes for each digit
- Auto-advance to next box on digit entry
- Paste support (auto-distribute digits)
- Clear/reset functionality

---

## Security Considerations

- Rate limiting: Max 5 attempts per IP per minute
- PIN validation should not reveal if PIN exists (timing attacks)
- Session tokens should be cryptographically secure
- XSS protection on all input fields
- HTTPS required for all communications

---

## Performance Considerations

- Cache active workshop PINs in Redis for faster lookup
- Implement connection pooling for database queries
- Optimize database index on PIN field
- Pre-fetch workshop data after successful validation

---

## Error Handling

### Error Types
1. **WORKSHOP_NOT_FOUND**
   - Message: "We couldn't find a workshop with that PIN. Please check and try again."
   
2. **WORKSHOP_EXPIRED**
   - Message: "This workshop has ended. Contact the facilitator for more information."
   
3. **INVALID_PIN_FORMAT**
   - Message: "Please enter a valid 6-digit PIN."
   
4. **RATE_LIMIT_EXCEEDED**
   - Message: "Too many attempts. Please wait a moment and try again."

---

## Accessibility Requirements

- Keyboard navigation support
- Screen reader announcements for errors
- High contrast mode support
- Focus management (auto-focus on PIN input)
- ARIA labels for all interactive elements

---

## Analytics & Monitoring

### Metrics to Track
- PIN validation success rate
- Average time to join workshop
- Number of failed PIN attempts
- Session creation rate
- User drop-off points

### Alerts
- High rate of failed PIN attempts (potential attack)
- Unusual spike in concurrent sessions
- Database connection failures

---

## Related User Stories

- US01: Workshop Initialization (provides PIN)
- US03: Digital Use Case Canvas (next step after joining)
- US04: Live Scoring Interface (session required)

---

## Questions/Clarifications

1. How long should participant sessions remain active?
2. Should participants be able to rejoin with the same PIN?
3. What happens if a workshop is cancelled after participants join?
4. Should there be a maximum participant limit per workshop?
5. Do we need to track unique participants vs. total sessions?

---

## Future Enhancements

- QR code generation for PIN (facilitator can display)
- SMS PIN delivery option
- Email invitation with embedded PIN link
- Participant name capture (optional)
- Remember last workshop PIN (local storage)

---

## Definition of Done

- [ ] Landing page implemented with PIN input
- [ ] PIN validation logic working correctly
- [ ] Session creation and management functional
- [ ] Redirection to submission screen working
- [ ] All error scenarios handled gracefully
- [ ] All acceptance criteria met
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] UI tests passing
- [ ] Security review completed
- [ ] Performance testing completed
- [ ] Accessibility audit passed
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Demo to stakeholders completed

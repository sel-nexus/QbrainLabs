# US04: Live Scoring Interface

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Collaborative Scoring Engine  
**Story Type:** Feature  
**Priority:** High  
**Story Points:** 13

---

## User Story

**As a** Participant,  
**I want to** rate use cases anonymously as they are presented by the facilitator,  
**So that** my honest feedback contributes to the consensus.

---

## Description

The Live Scoring Interface enables real-time, anonymous evaluation of submitted use cases. As the facilitator presents each idea, participants provide scores across multiple criteria using an intuitive slider interface. This collaborative approach ensures diverse perspectives while maintaining anonymity for honest feedback.

---

## Requirements

### Functional Requirements

1. **Real-Time Synchronization**
   - Facilitator controls which use case is actively being scored
   - All participant devices automatically update to show active use case
   - WebSocket or Server-Sent Events for push updates
   - Graceful fallback to polling if real-time unavailable

2. **Slide Deck View**
   - Display current use case details:
     - Title
     - Problem description
     - Target user
     - Expected KPI
     - AI category
     - Data readiness score
   - Navigation indicators (e.g., "Case 3 of 15")
   - Timer display (optional countdown)

3. **Scoring Sliders**
   - One slider per criterion (defined in workshop setup)
   - Scale: 1-10 for each criterion
   - Visual feedback as slider moves
   - Display current value next to slider
   - Tooltips explaining criteria
   - Pre-filled with neutral value (5)

4. **Submit Functionality**
   - "Submit Score" button
   - Score locking mechanism (no changes after submit)
   - Visual confirmation of submission
   - Disable sliders after submission
   - Show "Waiting for next case..." state

5. **Facilitator Dashboard**
   - Real-time vote count display
   - Progress indicator: "X of Y participants have voted"
   - Ability to push next/previous use case
   - Skip or revisit cases
   - End voting session
   - View preliminary results

### Non-Functional Requirements

- Real-time updates with < 500ms latency
- Support 100+ concurrent participants
- Offline score caching with auto-submit on reconnect
- Mobile-optimized slider controls
- Accessibility compliant controls

---

## Acceptance Criteria

### Scenario 1: Real-Time Use Case Display
**Given** a facilitator has started the scoring session  
**When** they push a use case to all participants  
**Then** all connected devices display the use case within 500ms  
**And** the scoring interface is enabled  
**And** sliders are reset to default values

### Scenario 2: Submit Score Successfully
**Given** a participant is viewing an active use case  
**When** they set values for all criteria and click "Submit Score"  
**Then** their scores are saved to the database with timestamp  
**And** the sliders become disabled  
**And** a "Score submitted" confirmation is displayed  
**And** they cannot change their scores for this case

### Scenario 3: Score Locking
**Given** a participant has submitted their score for a use case  
**When** they attempt to adjust the sliders  
**Then** the sliders remain disabled  
**And** a message "You've already scored this case" is displayed  
**And** no changes are saved to the database

### Scenario 4: Facilitator Vote Tracking
**Given** participants are scoring an active use case  
**When** a participant submits their score  
**Then** the facilitator dashboard increments the "Votes Received" count  
**And** displays "X of Y participants have voted"  
**And** updates in real-time without page refresh

### Scenario 5: Anonymous Scoring
**Given** participants are submitting scores  
**When** the facilitator views vote counts  
**Then** individual participant identities are not revealed  
**And** only aggregate statistics are shown  
**And** scores cannot be traced back to specific participants

---

## Technical Implementation

### Frontend Components

#### Participant View
- `ScoringInterface.tsx` - Main scoring container
- `UseCaseDisplay.tsx` - Current use case details
- `CriteriaSlider.tsx` - Individual criterion slider
- `ScoreSubmitButton.tsx` - Submit button with validation
- `VotingStatus.tsx` - Waiting/submitted state display

#### Facilitator View
- `FacilitatorDashboard.tsx` - Control panel
- `UseCaseNavigator.tsx` - Next/previous controls
- `VoteCounter.tsx` - Real-time vote tracking
- `ParticipantStatus.tsx` - Connection status monitor

### Backend Endpoints

```
GET /api/scoring/active/:workshop_pin
Response:
{
  "active_submission_id": "UUID",
  "submission_data": {...},
  "criteria": [...],
  "time_remaining": number (seconds)
}

POST /api/scoring/submit
Request Body:
{
  "session_id": "UUID",
  "submission_id": "UUID",
  "workshop_pin": "string",
  "scores": [
    {
      "criterion": "string",
      "value": number (1-10)
    }
  ]
}

Response:
{
  "score_id": "UUID",
  "locked": true,
  "timestamp": "ISODate"
}

PUT /api/scoring/set-active
Request Body:
{
  "workshop_pin": "string",
  "submission_id": "UUID",
  "facilitator_session": "UUID"
}

Response:
{
  "status": "success",
  "active_submission_id": "UUID",
  "notified_participants": number
}

GET /api/scoring/votes/:submission_id
Response:
{
  "total_votes": number,
  "total_participants": number,
  "percentage_complete": number
}
```

### WebSocket Events

```
// Server → Client
event: "active_submission_changed"
data: {
  "submission_id": "UUID",
  "submission_data": {...}
}

event: "vote_received"
data: {
  "submission_id": "UUID",
  "vote_count": number
}

event: "scoring_ended"
data: {
  "workshop_pin": "string",
  "next_action": "results|break"
}

// Client → Server
event: "vote_submit"
data: {
  "submission_id": "UUID",
  "scores": [...]
}
```

### Database Schema

```json
// scores collection
{
  "_id": ObjectId,
  "score_id": "UUID",
  "workshop_pin": "string",
  "submission_id": "UUID",
  "session_id": "UUID (anonymous participant)",
  "scores": [
    {
      "criterion": "string",
      "weight": number (from workshop config),
      "value": number (1-10)
    }
  ],
  "weighted_total": number (calculated),
  "submitted_at": "ISODate",
  "locked": boolean
}
```

---

## Dependencies

- US01: Workshop Initialization (criteria weights)
- US02: PIN-Based Participant Entry (session management)
- US03: Digital Use Case Canvas (submissions to score)
- US06: MongoDB Atlas SaaS Integration
- WebSocket library (Socket.IO or similar)

---

## Testing Requirements

### Unit Tests
- Score calculation logic
- Weighted average computation
- Slider value validation (1-10 range)
- Lock mechanism

### Integration Tests
- End-to-end scoring flow
- Real-time synchronization
- Score persistence
- Facilitator control actions

### Load Tests
- 100 concurrent participants
- Rapid submission handling
- WebSocket connection stability
- Database write performance

### UI Tests
- Slider interactions
- Submit button states
- Real-time updates
- Mobile touch gestures
- Network disconnection handling

---

## UI/UX Mockup Notes

### Participant Interface
- Full-screen card display for use case
- Sliders prominently placed
- Large, thumb-friendly controls for mobile
- Visual progress indicator
- Clear "Submit" CTA button
- Confirmation animation on submit

### Facilitator Dashboard
- Split view: use case preview + controls
- Large vote counter
- Progress bar showing completion percentage
- Quick navigation between cases
- Emergency "Reset" button
- Export results button

### Visual Design
- High contrast for readability
- Color-coded feedback (green for submitted, gray for pending)
- Smooth animations for transitions
- Loading states for network delays

---

## Security Considerations

- Validate session_id before accepting scores
- Prevent score tampering (server-side validation)
- Rate limiting on score submission
- Ensure true anonymity (no IP/device fingerprinting)
- Secure WebSocket connections (WSS)
- Facilitator authentication for control endpoints

---

## Performance Considerations

- Optimize WebSocket connections (connection pooling)
- Cache active submission data
- Batch database writes if possible
- Use Redis for real-time vote counts
- Implement connection retry logic
- Lazy load submission details

---

## Real-Time Architecture

### Technology Stack
- **WebSocket Server:** Socket.IO or AWS API Gateway WebSocket
- **Message Queue:** Redis Pub/Sub
- **Caching:** Redis for active session data
- **CDN:** For static assets

### Scalability Considerations
- Horizontal scaling of WebSocket servers
- Sticky sessions for participants
- Message broker for cross-server communication
- Database connection pooling

---

## Accessibility Requirements

- Keyboard-only slider control
- Screen reader announcements for score changes
- High contrast mode for sliders
- Focus management between sliders
- ARIA labels for all interactive elements
- Disabled state clearly indicated

---

## Analytics & Monitoring

### Metrics to Track
- Average time to submit scores
- Participant drop-off during scoring
- WebSocket connection reliability
- Score submission success rate
- Facilitator action frequency
- Consensus variance per use case

### Alerts
- WebSocket server issues
- High rate of failed submissions
- Participant disconnections spike
- Database write failures
- Unusual scoring patterns

---

## Error Handling

### Error Types
1. **CONNECTION_LOST**
   - Cache scores locally
   - Display "Reconnecting..." message
   - Auto-submit on reconnect
   
2. **ALREADY_SCORED**
   - Display "You've already scored this case"
   - Show previously submitted scores (read-only)
   
3. **SUBMISSION_NOT_ACTIVE**
   - Display "Waiting for facilitator..."
   - Disable scoring interface
   
4. **INVALID_SCORE_RANGE**
   - Prevent slider from exceeding 1-10
   - Display validation message

---

## Related User Stories

- US01: Workshop Initialization (defines criteria)
- US03: Digital Use Case Canvas (provides submissions)
- US05: Interactive Hotspot Matrix (uses scores)

---

## Questions/Clarifications

1. Should participants see how many others have voted?
2. Can facilitator see real-time average scores?
3. What happens if participant loses connection mid-scoring?
4. Should there be a time limit per use case?
5. Can facilitator override or delete scores?
6. Should participants be able to skip scoring a case?

---

## Future Enhancements

- Comparative scoring (rank ordering)
- Comment/feedback field per score
- Anonymous Q&A during presentations
- Heat map showing score distributions
- AI-powered outlier detection
- Integration with presentation software
- Voice command scoring
- Gamification elements (badges, leaderboard)

---

## Definition of Done

- [ ] Real-time synchronization working via WebSocket
- [ ] Participant scoring interface functional
- [ ] Facilitator dashboard operational
- [ ] Score locking mechanism implemented
- [ ] Vote counting accurate and real-time
- [ ] All acceptance criteria met
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Load tests passing (100+ participants)
- [ ] UI tests passing
- [ ] Accessibility audit passed
- [ ] Security review completed
- [ ] Performance testing completed
- [ ] Mobile testing completed
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Demo to stakeholders completed

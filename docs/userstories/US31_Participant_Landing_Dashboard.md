# US31: Participant Landing Dashboard

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Participant Experience  
**Story Type:** Feature  
**Priority:** Medium  
**Story Points:** 5  
**Status:** 📋 PLANNED - Future Sprint  
**Target Sprint:** Q1 2026

---

## Overview
When participants join a workshop session, they should be presented with a clean, intuitive landing dashboard featuring three action tiles. This provides clear navigation and immediate visibility into available activities.

## User Story
**As a** workshop participant  
**I want to** see a landing dashboard with clear action tiles when I join a session  
**So that** I can easily navigate between submitting use cases, prioritizing existing ones, and completing surveys

## Acceptance Criteria

### AC1: Landing Dashboard Display
- [ ] When a participant joins a workshop, they see a landing dashboard instead of a simple waiting room
- [ ] The dashboard displays three prominent action tiles in a responsive grid layout
- [ ] Each tile shows an icon, title, description, and relevant status/count
- [ ] The participant's name and workshop title are displayed at the top

### AC2: Submit Use Case Tile
- [ ] First tile: "Submit Use Case" with a lightbulb or plus icon
- [ ] Shows count of use cases already submitted by this participant
- [ ] Clicking opens a modal/drawer to submit a new use case
- [ ] Disabled when workshop phase doesn't allow submissions (e.g., scoring phase)

### AC3: Prioritize Use Cases Tile  
- [ ] Second tile: "Prioritize Use Cases" with a ranking/sort icon
- [ ] Shows total number of use cases available for prioritization
- [ ] Shows participant's voting/scoring progress (e.g., "3/10 scored")
- [ ] Clicking navigates to the scoring/prioritization interface
- [ ] Disabled when no use cases exist or workshop is not in scoring phase

### AC4: Active Survey Tile
- [ ] Third tile: "Complete Survey" with a clipboard/checklist icon
- [ ] Shows survey title and status (Active, Completed, None available)
- [ ] Visual indicator for incomplete vs completed surveys
- [ ] Clicking opens the survey modal for active surveys
- [ ] Shows "No surveys available" state when none exist
- [ ] Badge showing number of pending surveys if multiple

### AC5: Real-time Updates
- [ ] Dashboard updates in real-time via WebSocket when:
  - New use cases are added
  - Survey status changes (activated/closed)
  - Workshop phase transitions
- [ ] Tiles enable/disable based on current workshop phase

### AC6: Responsive Design
- [ ] Tiles stack vertically on mobile devices
- [ ] Tiles display in a row on tablet/desktop
- [ ] Consistent with existing light/dark theme support

## Technical Implementation

### Frontend Components
- `ParticipantDashboard.tsx` - Main dashboard page component
- `ActionTile.tsx` - Reusable tile component with icon, title, description, badge
- Update routing from `/lobby` to use new dashboard

### State Management
- Extend `SessionContext` if needed for dashboard state
- WebSocket listeners for real-time updates

### API Endpoints (existing)
- `GET /api/session/{participant_id}` - Already returns workshop info, use cases, surveys
- May need to extend to include participant's own submission count

### Routes
- `/lobby` - Participant landing dashboard (rename/refactor WaitingRoom)

## UI/UX Design

### Tile Layout
```
+------------------+------------------+------------------+
|   Submit Use     |   Prioritize     |    Complete      |
|     Case         |   Use Cases      |     Survey       |
|                  |                  |                  |
|   [+] Icon       |   [📊] Icon      |   [📋] Icon      |
|                  |                  |                  |
|   "Add your      |   "Vote on       |   "Pre-workshop  |
|    ideas"        |    priorities"   |    feedback"     |
|                  |                  |                  |
|   You: 2 added   |   5/12 scored    |   1 pending      |
+------------------+------------------+------------------+
```

### Visual States
- **Active**: Full color, hover effect, clickable
- **Disabled**: Grayed out, no hover, tooltip explaining why
- **Complete**: Green checkmark overlay, still clickable to view

## Dependencies
- US02: PIN-based entry (participants must join first)
- US03: Digital Use Case Canvas (use case submission)
- US04: Live Scoring Interface (prioritization)
- Survey system (already implemented)

## Out of Scope
- Multiple simultaneous surveys (show first active only, or badge count)
- Offline support
- Push notifications

## Testing Scenarios

### Scenario 1: Fresh Participant Join
1. Participant joins workshop via PIN
2. Dashboard displays with all three tiles
3. Submit tile shows "0 submitted"
4. Prioritize tile shows use case count
5. Survey tile shows active survey or "none available"

### Scenario 2: Phase-Based Tile States
1. Workshop in LOBBY phase → Submit enabled, Prioritize disabled
2. Workshop in INTAKE phase → Submit enabled, Prioritize disabled  
3. Workshop in SCORING phase → Submit disabled, Prioritize enabled
4. Survey ACTIVE → Survey tile clickable
5. Survey CLOSED → Survey tile shows "Completed" or "Closed"

### Scenario 3: Real-time Updates
1. Facilitator adds use case → Prioritize tile count updates
2. Facilitator activates survey → Survey tile becomes clickable
3. Phase changes → Tiles enable/disable accordingly

## Estimation
- **Story Points**: 5
- **Estimated Effort**: 1-2 days

## Notes
- This replaces the existing simple WaitingRoom component
- Maintains backward compatibility with existing session flow
- Consider adding tutorial/onboarding tooltips for first-time users

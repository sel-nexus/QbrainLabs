# US31: Participant Landing Dashboard

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Participant Experience  
**Story Type:** Feature  
**Priority:** Medium  
**Story Points:** 5  
**Status:** ✅ IMPLEMENTED  
**Implementation Date:** January 26, 2026

---

## Overview
When participants join a workshop session, they should be presented with a clean, intuitive landing dashboard featuring action tiles. When use cases already exist in the workshop, the dashboard displays four tiles: Use Cases (with count), Add a New Use Case, Survey (enable or disable), and Hotspot Prioritization. When no use cases exist, it shows three tiles for initial submission. This provides clear navigation and immediate visibility into available activities.

## User Story
**As a** workshop participant  
**I want to** see a landing dashboard with clear action tiles when I join a session  
**So that** I can easily navigate between submitting use cases, prioritizing existing ones, and completing surveys

## Acceptance Criteria

### AC1: Landing Dashboard Display
- [x] When a participant joins a workshop, they see a landing dashboard instead of a simple waiting room
- [x] When use cases exist: Dashboard displays four prominent action tiles in a 2x2 responsive grid layout
- [x] When no use cases exist: Dashboard displays three action tiles in a responsive grid layout
- [x] Each tile shows an icon, title, description, and relevant status/count
- [x] The participant's name and workshop title are displayed at the top

### AC2: Use Cases Tile (When Use Cases Exist)
- [x] First tile: "Use Cases" with a FileText icon
- [x] Shows total count of use cases in the workshop
- [x] Clicking scrolls smoothly to the use cases section below
- [x] Always enabled to allow viewing existing use cases

### AC3: Add a New Use Case Tile (When Use Cases Exist)
- [x] Second tile: "Add a New Use Case" with a Plus icon
- [x] Shows availability status ("Available" or "Closed")
- [x] Clicking opens a modal/drawer to submit a new use case
- [x] Disabled when workshop phase doesn't allow submissions (e.g., scoring phase)
- [x] Badge indicates current submission status

### AC4: Survey Tile
- [x] Third tile: "Survey" with a ClipboardCheck icon
- [x] Shows survey title and status (Active, Completed, None available)
- [x] Visual indicator for incomplete vs completed surveys
- [x] Clicking opens the survey modal for active surveys
- [x] Shows "No surveys available" state when none exist
- [x] Badge showing number of pending surveys if multiple
- [x] Disabled when no active surveys are available

### AC5: Hotspot Prioritization Tile (When Use Cases Exist)
- [x] Fourth tile: "Hotspot Prioritization" with a Target icon
- [x] Shows count of available use cases (e.g., "5 available") or "Not available"
- [x] Clicking navigates to the Strategic Matrix interface (/participant-matrix route)
- [x] Enabled whenever at least one use case exists in the workshop (regardless of phase)
- [x] Disabled only when no use cases exist
- [x] Badge shows availability based on use case count

### AC6: Submit Use Case Tile (When No Use Cases Exist)
- [x] First tile: "Submit Use Case" with a Lightbulb icon
- [x] Shows "0 submitted" badge
- [x] Clicking opens a modal/drawer to submit a new use case
- [x] Disabled when workshop phase doesn't allow submissions

### AC7: Prioritize Use Cases Tile (When No Use Cases Exist)
- [x] Second tile: "Prioritize Use Cases" with a BarChart3 icon
- [x] Shows "0 to review" badge
- [x] Always disabled when no use cases exist
- [x] Disabled reason clearly indicates "No use cases to prioritize"

### AC8: Real-time Updates
- [x] Dashboard updates in real-time via WebSocket when:
  - New use cases are added
  - Survey status changes (activated/closed)
  - Workshop phase transitions
- [x] Tiles enable/disable based on current workshop phase
- [x] Tile layout automatically switches between 4-tile and 3-tile layouts based on use case count

### AC9: Responsive Design
- [x] Tiles stack vertically on mobile devices
- [x] 4-tile layout displays in a 2x2 grid on tablet/desktop
- [x] 3-tile layout displays in a row on tablet/desktop
- [x] Consistent with existing light/dark theme support

## Technical Implementation

### Frontend Components
- `ParticipantDashboard.tsx` - Main dashboard page component with conditional 4-tile/3-tile layout
- `ActionTile.tsx` - Reusable tile component with icon, title, description, badge
- Conditional rendering based on `sessionInfo?.use_cases.length`
- Smooth scroll functionality for "Use Cases" tile
- Icons: FileText, Plus, ClipboardCheck, Target (4-tile layout)
- Icons: Lightbulb, BarChart3, ClipboardCheck (3-tile layout)

### State Management
- Extend `SessionContext` if needed for dashboard state
- WebSocket listeners for real-time updates

### API Endpoints (existing)
- `GET /api/session/{participant_id}` - Already returns workshop info, use cases, surveys
- May need to extend to include participant's own submission count

### Routes
- `/participant-dashboard` - Participant landing dashboard with tiles
- `/participant-matrix` - Strategic Matrix page for hotspot prioritization
- `/lobby` - Waiting room (legacy, redirects to dashboard)

## UI/UX Design

### Tile Layout (When Use Cases Exist - 4 Tiles)
```
+------------------+------------------+
|   Use Cases      |  Add a New       |
|                  |  Use Case        |
|   [📄] Icon      |   [+] Icon       |
|                  |                  |
|   "View all      |   "Share your    |
|    workshop      |    AI use case   |
|    use cases"    |    ideas"        |
|                  |                  |
|   5 total        |   Available      |
+------------------+------------------+
|   Survey         |  Hotspot         |
|                  |  Prioritization   |
|   [📋] Icon      |   [🎯] Icon      |
|                  |                  |
|   "Provide your  |   "Prioritize    |
|    feedback"     |    use cases on  |
|                  |    the matrix"   |
|                  |                  |
|   1 pending      |   Active         |
+------------------+------------------+
```

### Tile Layout (When No Use Cases Exist - 3 Tiles)
```
+------------------+------------------+------------------+
|   Submit Use     |   Prioritize     |    Complete      |
|     Case         |   Use Cases      |     Survey       |
|                  |                  |                  |
|   [💡] Icon       |   [📊] Icon      |   [📋] Icon      |
|                  |                  |                  |
|   "Add your      |   "Vote on       |   "Pre-workshop  |
|    ideas"        |    priorities"   |    feedback"     |
|                  |                  |                  |
|   0 submitted     |   0 to review    |   1 pending      |
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

### Scenario 1: Fresh Participant Join (No Use Cases)
1. Participant joins workshop via PIN
2. Dashboard displays with three tiles (2x2 grid on desktop, stacked on mobile)
3. Submit tile shows "0 submitted"
4. Prioritize tile shows "0 to review" and is disabled
5. Survey tile shows active survey or "none available"

### Scenario 1b: Participant Join (Use Cases Exist)
1. Participant joins workshop via PIN where use cases already exist
2. Dashboard displays with four tiles in a 2x2 grid layout
3. Use Cases tile shows total count (e.g., "5 total")
4. Add a New Use Case tile shows availability status
5. Survey tile shows survey status
6. Hotspot Prioritization tile shows availability based on phase

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

## Implementation Notes
- ✅ Implemented conditional 4-tile layout when use cases exist
- ✅ Implemented 3-tile layout when no use cases exist
- ✅ Smooth scroll functionality for Use Cases tile
- ✅ All tiles properly enable/disable based on workshop phase
- ✅ Real-time updates via WebSocket for use case additions
- ✅ Maintains backward compatibility with existing session flow
- ✅ Hotspot Prioritization tile enabled whenever use cases exist (not phase-dependent)
- ✅ Navigation to `/participant-matrix` route for Strategic Matrix interface

## Estimation
- **Story Points**: 5
- **Actual Effort**: 1 day
- **Completed**: January 26, 2026

## Notes
- This replaces the existing simple WaitingRoom component
- Maintains backward compatibility with existing session flow
- Consider adding tutorial/onboarding tooltips for first-time users
- The 4-tile layout provides better visibility when use cases exist, making it easier for participants to navigate between viewing, adding, surveying, and prioritizing

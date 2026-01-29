# US39: Remove Redundant Leave Button for Participants

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** User Interface & Navigation  
**Story Type:** UI Cleanup  
**Priority:** Low  
**Story Points:** 2  
**Status:** 📋 BACKLOG

---

## User Story

**As a** Workshop Participant,  
**I want to** see a clean interface without redundant navigation options,  
**So that** I can easily find the actions I need without confusion.

---

## Description

Remove the redundant "Leave" button from participant views since "Sign Out" option is available in the profile dropdown menu. This simplifies the UI and reduces confusion about which action to use when leaving a workshop.

---

## Requirements

### Functional Requirements

1. **Button Removal**
   - Remove Leave button from ParticipantDashboard
   - Remove Leave button from ParticipantMatrix
   - Remove Leave button from any other participant views
   - Ensure no broken references or handlers

2. **Sign Out Functionality**
   - Verify Sign Out in profile dropdown works correctly
   - Ensure Sign Out properly clears session
   - Confirm navigation after Sign Out works
   - Test that Sign Out handles workshop exit appropriately

3. **Navigation Logic**
   - Remove any Leave-specific navigation logic
   - Ensure Sign Out handles all necessary cleanup
   - Verify no functionality is lost

### Non-Functional Requirements

- UI should remain clean and uncluttered
- No broken functionality after removal
- Consistent navigation pattern across participant views

---

## Acceptance Criteria

### Scenario 1: Leave Button Removed
**Given** a participant is viewing ParticipantDashboard  
**When** they look at the navigation area  
**Then** there is no "Leave" button visible  
**And** only Sign Out is available in profile dropdown

### Scenario 2: Sign Out Works
**Given** a participant wants to exit the workshop  
**When** they click Sign Out from profile dropdown  
**Then** they are signed out successfully  
**And** their session is cleared  
**And** they are redirected appropriately

### Scenario 3: No Broken Functionality
**Given** Leave buttons have been removed  
**When** a participant uses the application  
**Then** all functionality works as expected  
**And** no errors occur related to Leave button

---

## Technical Implementation

### Files to Modify

- `client/src/pages/ParticipantDashboard.tsx` - Remove Leave button and handler
- `client/src/pages/ParticipantMatrix.tsx` - Remove Leave button and handler
- `client/src/components/ParticipantProfile.tsx` - Verify Sign Out functionality
- Any other participant views with Leave button

### Code Changes

#### ParticipantDashboard.tsx

```typescript
// Remove handleLeave function
// Remove Leave button from JSX
// Before:
<Button variant="ghost" onClick={handleLeave}>
    Leave
</Button>

// After: (removed)
```

#### ParticipantMatrix.tsx

```typescript
// Remove handleLeave function
// Remove Leave button from JSX
// Similar to ParticipantDashboard
```

#### ParticipantProfile.tsx

```typescript
// Verify Sign Out functionality
const handleSignOut = async () => {
    // Ensure this properly:
    // 1. Clears session
    // 2. Clears localStorage
    // 3. Redirects to appropriate page
    // 4. Handles workshop exit if needed
};
```

---

## Dependencies

- ParticipantProfile component with Sign Out functionality
- Session management system
- Navigation routing

---

## Testing Requirements

### Unit Tests
- Leave button removed from components
- Sign Out functionality works correctly
- No broken references or handlers

### Integration Tests
- Sign Out clears session properly
- Navigation after Sign Out works
- No errors when using participant views

### Manual Testing
- Verify Leave button is gone
- Test Sign Out functionality
- Verify all participant workflows still work
- Check for any UI inconsistencies

---

## UI Impact

### Before
- Leave button visible in header/navigation
- Sign Out in profile dropdown
- Two ways to exit (confusing)

### After
- Only Sign Out in profile dropdown
- Cleaner interface
- Single, clear exit path

---

## Definition of Done

- [ ] Leave button removed from ParticipantDashboard
- [ ] Leave button removed from ParticipantMatrix
- [ ] Leave button removed from other participant views
- [ ] Sign Out functionality verified
- [ ] No broken references or handlers
- [ ] All tests passing
- [ ] Manual testing completed
- [ ] Code review completed
- [ ] UI remains clean and functional

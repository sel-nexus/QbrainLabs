# US37: Poll Popup Theme Fix and Error Handling

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Real-Time Audience Interaction  
**Story Type:** Bug Fix  
**Priority:** High  
**Story Points:** 5  
**Status:** 📋 BACKLOG

---

## User Story

**As a** Workshop Participant,  
**I want to** interact with poll popups that respect my theme preference and handle errors gracefully,  
**So that** I can participate in polls without visual inconsistencies or frustrating error messages.

---

## Description

Fix theme mode support for poll popup window and resolve "failed to fetch" errors when participants interact with polls. The poll popup should respect the participant's selected theme (light/contrast mode) and provide clear error handling when API calls fail.

---

## Requirements

### Functional Requirements

1. **Theme Support**
   - Poll popup respects theme (light/contrast mode)
   - All popup elements use theme-aware styling
   - Consistent with rest of application theme
   - Theme toggle works while poll popup is visible

2. **Error Handling**
   - Fix API endpoint errors causing "failed to fetch"
   - Provide clear error messages to users
   - Retry mechanism for transient failures
   - Graceful degradation when polls unavailable

3. **API Reliability**
   - Proper error responses from backend
   - CORS headers correctly configured
   - Authentication headers properly sent
   - Network error handling

4. **User Feedback**
   - Loading states during poll operations
   - Success confirmations
   - Error messages are user-friendly
   - No silent failures

### Non-Functional Requirements

- Poll operations should complete in < 2 seconds
- Error messages should be clear and actionable
- No theme flashing on popup open
- Consistent error handling across all poll operations

---

## Acceptance Criteria

### Scenario 1: Theme Consistency in Poll Popup
**Given** a participant has selected Contrast mode  
**When** a poll popup appears  
**Then** the popup displays in Contrast theme  
**And** all text is readable  
**And** buttons and inputs use theme-aware styling

### Scenario 2: Successful Poll Interaction
**Given** a participant sees an active poll  
**When** they submit their response  
**Then** the API call succeeds  
**And** they see a success confirmation  
**And** the poll popup updates or closes appropriately

### Scenario 3: Error Handling
**Given** a participant attempts to vote on a poll  
**When** the API call fails  
**Then** they see a clear error message  
**And** they can retry the operation  
**And** the error is logged for debugging

### Scenario 4: Network Failure
**Given** a participant's network connection is unstable  
**When** they interact with a poll  
**Then** the system detects the failure  
**And** shows an appropriate message  
**And** allows retry when connection is restored

---

## Technical Implementation

### Files to Modify

- `client/src/components/polls/PollResponder.tsx` - Add theme support and error handling
- `server/app/api/polls.py` - Fix error handling and response format
- `client/src/lib/api/polls.ts` - Improve API error handling
- `client/src/components/polls/PollManager.tsx` - Ensure theme context usage

### Backend Changes

#### Error Handling in Poll Endpoints

```python
@router.post("/{poll_id}/vote")
async def vote_on_poll(
    poll_id: str,
    participant_id: str = Query(...),
    response_data: dict = Body(...),
    db: AsyncSession = Depends(get_db)
):
    try:
        # ... voting logic ...
        return {"success": True, "message": "Vote recorded"}
    except PollNotFound:
        raise HTTPException(status_code=404, detail="Poll not found")
    except PollClosed:
        raise HTTPException(status_code=400, detail="Poll is closed")
    except Exception as e:
        logger.error(f"Error voting on poll {poll_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to record vote")
```

#### CORS and Authentication

- Ensure CORS headers are properly configured
- Verify authentication middleware is applied
- Check API route registration

### Frontend Changes

#### Theme Support in PollResponder

```typescript
import { useTheme } from '../../context/ThemeContext';

export function PollResponder() {
    const { theme } = useTheme();
    
    return (
        <div className={`fixed bottom-24 right-4 w-80 max-w-[90vw] z-40 space-y-2`}>
            {activePolls.map(poll => (
                <motion.div
                    key={poll.id}
                    className={`theme-bg-primary theme-text-primary theme-border rounded-xl p-4`}
                    // ... rest of component
                >
                    {/* Poll content */}
                </motion.div>
            ))}
        </div>
    );
}
```

#### Error Handling in API Calls

```typescript
// polls.ts
export const PollService = {
    vote: async (pollId: string, participantId: string, responseData: any) => {
        try {
            const response = await api.post(
                `/polls/${pollId}/vote`,
                { response_data: responseData },
                { params: { participant_id: participantId } }
            );
            return response.data;
        } catch (error: any) {
            if (error.response) {
                // Server responded with error
                const message = error.response.data?.detail || 'Failed to submit vote';
                throw new Error(message);
            } else if (error.request) {
                // Request made but no response
                throw new Error('Network error. Please check your connection.');
            } else {
                // Something else happened
                throw new Error('An unexpected error occurred');
            }
        }
    }
};
```

---

## Dependencies

- US21: Live Polling & Reactions - partially implemented
- US14: Theme Switching - already implemented
- Poll API endpoints must exist

---

## Testing Requirements

### Unit Tests
- Theme context usage in PollResponder
- Error handling in API service
- Error message formatting
- Retry logic

### Integration Tests
- Poll voting with theme applied
- Error scenarios (network failure, API errors)
- Theme toggle during poll interaction
- Multiple poll popups with theme

### Error Scenarios to Test
- Network timeout
- 404 (poll not found)
- 400 (poll closed, invalid data)
- 500 (server error)
- CORS errors
- Authentication failures

---

## Error Messages

### User-Friendly Error Messages

- "Unable to connect. Please check your internet connection."
- "This poll is no longer active."
- "Failed to submit your vote. Please try again."
- "An error occurred. Your vote may not have been recorded."

### Developer Logging

- Log full error details server-side
- Include poll ID, participant ID, and error type
- Track error frequency for monitoring

---

## Definition of Done

- [ ] Poll popup respects theme (light/contrast mode)
- [ ] All API errors are properly handled
- [ ] User-friendly error messages displayed
- [ ] "Failed to fetch" errors resolved
- [ ] CORS and authentication issues fixed
- [ ] Error logging implemented
- [ ] Retry mechanism for transient failures
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Error scenarios tested
- [ ] Code review completed
- [ ] Documentation updated

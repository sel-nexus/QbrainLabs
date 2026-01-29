# US36: Survey Answer Persistence and Population

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Participant Workflow  
**Story Type:** Bug Fix  
**Priority:** High  
**Story Points:** 5  
**Status:** 📋 BACKLOG

---

## User Story

**As a** Workshop Participant,  
**I want to** see my previously selected answers automatically populated when I reopen a survey,  
**So that** I can continue where I left off without losing my progress.

---

## Description

Previously selected answers in surveys should be automatically populated when a participant reopens a survey, enabling them to continue where they left off. Currently, participants may lose their progress or have to re-enter answers when returning to a partially completed survey.

---

## Requirements

### Functional Requirements

1. **Answer Loading**
   - Load existing answers from `SurveyAnswer` table on survey open
   - Populate all form fields with saved answers
   - Support all question types (multiple choice, text, rating, etc.)
   - Handle both draft and completed states appropriately

2. **Auto-Save Integration**
   - Existing auto-save functionality should continue to work
   - Answers saved via auto-save should be loaded on reopen
   - Progress indicator shows which questions have been answered

3. **State Management**
   - Distinguish between new, draft, and completed surveys
   - Prevent editing of completed surveys (unless allowed)
   - Show appropriate UI based on survey state

4. **Data Integrity**
   - Answers are correctly associated with participant and survey
   - Handle cases where questions have been modified since last save
   - Validate loaded answers against current survey structure

### Non-Functional Requirements

- Answer loading should be fast (< 500ms)
- No data loss when reopening surveys
- Graceful handling of deleted or modified questions
- Support for surveys with many questions

---

## Acceptance Criteria

### Scenario 1: Load Previously Answered Questions
**Given** a participant has partially completed a survey  
**When** they reopen the survey  
**Then** all previously answered questions show their saved answers  
**And** unanswered questions remain empty  
**And** the progress indicator reflects completed questions

### Scenario 2: Continue from Last Position
**Given** a participant was on question 5 of 10  
**When** they reopen the survey  
**Then** they see question 5 (or last answered question)  
**And** can continue from that point  
**And** all previous answers are visible

### Scenario 3: Multiple Question Types
**Given** a survey with multiple question types  
**When** answers are loaded  
**Then** multiple choice selections are restored  
**And** text answers are populated  
**And** rating scale values are set  
**And** all question types display correctly

### Scenario 4: Completed Survey Handling
**Given** a participant has completed a survey  
**When** they reopen it  
**Then** all answers are displayed in read-only mode (if applicable)  
**Or** they can edit answers (if survey allows multiple submissions)

---

## Technical Implementation

### Files to Modify

- `client/src/components/survey/SurveyParticipant.tsx` - Add answer loading logic
- `server/app/api/surveys.py` - Modify `get_survey_for_participant` endpoint to include existing answers
- `server/app/api/surveys.py` - Ensure `save-progress` endpoint properly saves answers

### Backend Changes

#### Modify `get_survey_for_participant` Endpoint

```python
@router.get("/{survey_id}/participant")
async def get_survey_for_participant(
    survey_id: str,
    participant_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    # ... existing code ...
    
    # Load existing answers
    answers_result = await db.execute(
        select(SurveyAnswer).where(
            and_(
                SurveyAnswer.survey_response_id == existing_response.id,
                SurveyAnswer.survey_response_id.isnot(None)
            )
        )
    )
    existing_answers = answers_result.scalars().all()
    
    # Map answers to questions
    answers_map = {str(a.question_id): a.answer_data for a in existing_answers}
    
    return {
        # ... existing survey data ...
        "questions": [
            {
                # ... question data ...
                "existing_answer": answers_map.get(str(q.id))
            }
            for q in sorted(survey.questions, key=lambda x: x.order)
        ],
        "existing_answers": answers_map,
        "current_question_index": existing_response.current_question if existing_response else 0
    }
```

### Frontend Changes

```typescript
// SurveyParticipant.tsx
useEffect(() => {
    if (surveyId && participantId) {
        fetchSurvey();
    }
}, [surveyId, participantId]);

const fetchSurvey = async () => {
    // ... existing code ...
    
    if (data.existing_answers) {
        // Populate answers state with existing answers
        setAnswers(data.existing_answers);
        
        // Set current question index if available
        if (data.current_question_index !== undefined) {
            setCurrentIndex(data.current_question_index);
        }
    }
};
```

---

## Dependencies

- US12: Participant Dashboard & Survey Management - already implemented
- SurveyAnswer model must exist and be properly structured
- Auto-save functionality must be working

---

## Testing Requirements

### Unit Tests
- Answer loading from API response
- Answer population in form fields
- State management for draft vs completed surveys
- Handling of missing or invalid answers

### Integration Tests
- Survey reopen with existing answers
- Auto-save and reload cycle
- Multiple question types with answers
- Survey completion after loading answers

### Edge Cases
- Survey with no existing answers
- Survey with modified questions
- Participant switching between surveys
- Network failure during answer loading

---

## Database Considerations

- Ensure `SurveyAnswer` table properly stores answer data
- Verify foreign key relationships
- Check indexes for performance on answer queries
- Consider data migration if answer format has changed

---

## Definition of Done

- [ ] Backend endpoint returns existing answers
- [ ] Frontend loads and displays existing answers
- [ ] All question types support answer loading
- [ ] Auto-save continues to work correctly
- [ ] Progress indicator reflects loaded answers
- [ ] Edge cases handled gracefully
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Code review completed
- [ ] Documentation updated

# US12: Participant Dashboard & Survey Management

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Participant Experience & Survey Integration  
**Story Type:** Feature  
**Priority:** High  
**Story Points:** 13  
**Status:** ✅ IMPLEMENTED  
**Implementation Date:** January 24, 2026

### Implementation Summary
- ✅ Participant dashboard with use case management
- ✅ Survey participation interface with progress tracking
- ✅ Use case prioritization with 7-point criteria
- ✅ Real-time survey response submission
- ✅ Partial survey completion support with auto-save
- ✅ Survey review and completion flow

---

## User Story

**As a** Workshop Participant,  
**I want to** access a personalized dashboard showing my submitted use cases and active surveys,  
**So that** I can manage my submissions, prioritize use cases, and participate in facilitator-led surveys efficiently.

---

## Description

When participants join a workshop using a PIN, they need a centralized landing page that provides:
1. A complete view of all their submitted use cases
2. The ability to prioritize their use cases based on workshop criteria
3. Access to active surveys with progress tracking
4. A seamless experience for completing partial surveys

This dashboard serves as the participant's command center, enabling them to contribute effectively to the workshop while maintaining visibility of their contributions.

---

## Requirements

### Functional Requirements

#### 1. Participant Landing Page/Dashboard

**Use Case Submission Section:**
- Display all use cases submitted by the participant in the current workshop
- Show submission status (draft, submitted, prioritized)
- Provide quick access to submit new use cases
- Display empty state with CTA when no use cases exist

**Survey Section:**
- Display active surveys with status indicators
- Show survey completion progress (e.g., "3 of 10 questions completed")
- Highlight incomplete surveys requiring attention
- Display completed surveys with "View Results" option (if permitted)

#### 2. Use Case Management

**For Participants with No Submissions:**
- Display welcoming empty state message
- Prominent "Submit Your First Use Case" button
- Direct navigation to the Digital Use Case Canvas form
- Optional: Quick tips or examples

**For Participants with Existing Submissions:**
- List view of all submitted use cases with:
  - Use case title
  - Submission timestamp
  - Prioritization status
  - Edit/View actions (if workshop allows)
- Ability to submit additional use cases
- Filter/sort options (newest first, by status, etc.)

#### 3. Use Case Prioritization

**Prioritization Interface:**
- Display workshop's chosen prioritization criteria (from facilitator settings)
- For each submitted use case, provide scoring interface:
  - Sliders or Likert scales for each criterion
  - Tooltips explaining each criterion
  - Real-time validation
- Save prioritization scores independently for each use case
- Visual indicator showing which use cases have been prioritized
- Ability to update prioritization before workshop closes

**Supported Criteria Types:**
- 7-Point Comprehensive (Business Impact, Ease of Implementation, etc.)
- Custom criteria defined by facilitator
- Simple 2-axis (Value vs. Feasibility)

#### 4. Survey Participation

**Active Survey Display:**
- Show survey title and description
- Display question counter (e.g., "Question 3 of 10")
- Present questions with appropriate input types:
  - Multiple choice (radio buttons)
  - Multiple select (checkboxes)
  - Rating scales (1-5, 1-10)
  - Text input (short answer)
  - Text area (long answer)
- Navigation between questions (Next/Previous)
- Save progress automatically

**Partial Survey Completion:**
- Resume from last answered question
- Show completed questions with submitted answers (read-only or editable)
- Highlight remaining unanswered questions
- Progress bar showing completion percentage
- Auto-save responses every 30 seconds
- "Save & Continue Later" option

**Survey Completion:**
- Final review page showing all answers
- Submit confirmation
- Thank you message
- Return to dashboard

---

## Acceptance Criteria

### Scenario 1: First-Time Participant (No Submissions)
**Given** a participant joins a workshop for the first time  
**When** they enter the correct PIN and land on the dashboard  
**Then** they see an empty state message for use cases  
**And** a prominent "Submit Your First Use Case" button is displayed  
**And** the survey section shows any active surveys (if available)

### Scenario 2: Returning Participant (With Submissions)
**Given** a participant has previously submitted 3 use cases  
**When** they join the workshop and access the dashboard  
**Then** they see a list of all 3 use cases with titles and timestamps  
**And** each use case shows its prioritization status  
**And** they can click "Submit Another Use Case" to add more

### Scenario 3: Use Case Prioritization
**Given** a participant has submitted use cases and the workshop has prioritization criteria enabled  
**When** they click "Prioritize" on an unprioritized use case  
**Then** they see a form with all workshop criteria (e.g., 7-point scale)  
**And** they can rate each criterion using sliders or scales  
**And** tooltips explain each criterion  
**When** they submit the prioritization  
**Then** the use case is marked as "Prioritized"  
**And** the scores are saved to the database

### Scenario 4: Active Survey - New Participation
**Given** a facilitator has activated a survey for the workshop  
**When** a participant views their dashboard  
**Then** they see a "New Survey Available" notification  
**And** they can click to start the survey  
**When** they click to start  
**Then** they see the first question with appropriate input controls  
**And** they can submit their answer and proceed to the next question

### Scenario 5: Active Survey - Partial Completion
**Given** a participant has answered 4 out of 10 survey questions  
**When** they return to the dashboard later  
**Then** they see "Survey In Progress - 4/10 completed"  
**When** they click to continue  
**Then** they see questions 1-4 marked as completed  
**And** they are taken to question 5 to continue  
**And** they can navigate back to review previous answers

### Scenario 6: Survey Completion
**Given** a participant has answered all survey questions  
**When** they submit the final question  
**Then** they see a review page with all their answers  
**When** they confirm submission  
**Then** they see a "Thank you" confirmation  
**And** the survey status changes to "Completed"  
**And** they are returned to the dashboard

### Scenario 7: Multiple Surveys
**Given** a facilitator has created 2 surveys (one active, one completed)  
**When** a participant views their dashboard  
**Then** they see the active survey with "Start" or "Continue" button  
**And** they see the completed survey with "Completed ✓" status  
**And** optionally can view their submitted responses

---

## Technical Implementation

### Frontend Components

**Dashboard Components:**
- `ParticipantDashboard.tsx` - Main dashboard container
- `UseCaseList.tsx` - List of submitted use cases
- `UseCaseCard.tsx` - Individual use case display
- `EmptyStateUseCase.tsx` - Empty state when no submissions
- `SurveySection.tsx` - Survey list and status display
- `SurveyCard.tsx` - Individual survey card with status

**Prioritization Components:**
- `PrioritizationModal.tsx` - Modal for prioritizing use cases
- `CriteriaSlider.tsx` - Slider for each criterion
- `CriteriaTooltip.tsx` - Explanation tooltips
- `PrioritizationProgress.tsx` - Visual progress indicator

**Survey Components:**
- `SurveyInterface.tsx` - Main survey container
- `SurveyQuestion.tsx` - Individual question renderer
- `QuestionTypes/` - Folder with specific question type components:
  - `MultipleChoice.tsx`
  - `MultipleSelect.tsx`
  - `RatingScale.tsx`
  - `TextInput.tsx`
  - `TextArea.tsx`
- `SurveyProgress.tsx` - Progress bar and navigation
- `SurveyReview.tsx` - Final review before submission
- `SurveyCompletion.tsx` - Thank you/completion screen

### Backend Endpoints

```typescript
// Use Case Management
GET /api/workshops/:pin/participants/:session_id/use-cases
Response: {
  "use_cases": [
    {
      "id": "UUID",
      "title": "string",
      "submitted_at": "ISODate",
      "is_prioritized": boolean,
      "status": "draft|submitted|prioritized"
    }
  ]
}

// Use Case Prioritization
POST /api/workshops/:pin/use-cases/:use_case_id/prioritize
Request: {
  "session_id": "UUID",
  "scores": {
    "business_impact": number,
    "ease_of_implementation": number,
    "data_readiness": number,
    "strategic_alignment": number,
    "organizational_readiness": number,
    "risk_compliance": number,
    "scalability_value": number
  }
}
Response: {
  "success": true,
  "prioritization_id": "UUID"
}

GET /api/workshops/:pin/use-cases/:use_case_id/prioritization
Response: {
  "scores": {...},
  "created_at": "ISODate",
  "updated_at": "ISODate"
}

// Survey Management
GET /api/workshops/:pin/surveys
Response: {
  "surveys": [
    {
      "survey_id": "UUID",
      "title": "string",
      "description": "string",
      "status": "active|completed|inactive",
      "total_questions": number,
      "participant_progress": {
        "completed_questions": number,
        "last_answered_at": "ISODate"
      }
    }
  ]
}

GET /api/surveys/:survey_id
Response: {
  "survey_id": "UUID",
  "title": "string",
  "description": "string",
  "questions": [
    {
      "question_id": "UUID",
      "order": number,
      "text": "string",
      "type": "multiple_choice|multiple_select|rating|text|textarea",
      "options": ["string"] | null,
      "required": boolean
    }
  ]
}

POST /api/surveys/:survey_id/responses
Request: {
  "session_id": "UUID",
  "question_id": "UUID",
  "answer": "string|number|array"
}
Response: {
  "success": true,
  "progress": {
    "completed": number,
    "total": number
  }
}

GET /api/surveys/:survey_id/responses/:session_id
Response: {
  "responses": [
    {
      "question_id": "UUID",
      "answer": "any",
      "answered_at": "ISODate"
    }
  ],
  "completion_status": "in_progress|completed"
}

POST /api/surveys/:survey_id/submit
Request: {
  "session_id": "UUID"
}
Response: {
  "success": true,
  "submitted_at": "ISODate"
}
```

### Database Schema

**Use Case Prioritization:**
```json
{
  "_id": ObjectId,
  "prioritization_id": "UUID",
  "workshop_pin": "string",
  "use_case_id": "UUID",
  "session_id": "UUID",
  "scores": {
    "business_impact": number (1-10),
    "ease_of_implementation": number (1-10),
    "data_readiness": number (1-10),
    "strategic_alignment": number (1-10),
    "organizational_readiness": number (1-10),
    "risk_compliance": number (1-10),
    "scalability_value": number (1-10)
  },
  "composite_scores": {
    "value_impact": number,
    "feasibility_readiness": number
  },
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

**Survey Schema:**
```json
{
  "_id": ObjectId,
  "survey_id": "UUID",
  "workshop_pin": "string",
  "title": "string",
  "description": "string",
  "status": "active|inactive|completed",
  "questions": [
    {
      "question_id": "UUID",
      "order": number,
      "text": "string",
      "type": "multiple_choice|multiple_select|rating|text|textarea",
      "options": ["string"] | null,
      "required": boolean,
      "config": {
        "min": number,
        "max": number,
        "max_length": number
      }
    }
  ],
  "created_by": "UUID (facilitator)",
  "created_at": "ISODate",
  "activated_at": "ISODate",
  "closed_at": "ISODate"
}
```

**Survey Response Schema:**
```json
{
  "_id": ObjectId,
  "response_id": "UUID",
  "survey_id": "UUID",
  "workshop_pin": "string",
  "session_id": "UUID",
  "participant_id": "UUID",
  "responses": [
    {
      "question_id": "UUID",
      "answer": "any",
      "answered_at": "ISODate"
    }
  ],
  "status": "in_progress|completed",
  "started_at": "ISODate",
  "submitted_at": "ISODate",
  "last_updated": "ISODate"
}
```

---

## Dependencies

- US02: PIN-Based Participant Entry (session management)
- US03: Digital Use Case Canvas (use case submission)
- US10: Prioritization Matrix Criteria (criteria definitions)
- US13: Facilitator Survey Management (survey creation)
- MongoDB Atlas for data persistence
- Real-time updates (WebSocket/Socket.io) for survey status changes

---

## Testing Requirements

### Unit Tests
- Dashboard data fetching and display logic
- Use case list rendering with different states
- Prioritization score calculation
- Survey progress calculation
- Response auto-save functionality
- Form validation for survey answers

### Integration Tests
- Complete use case prioritization flow
- Survey start, pause, resume, and complete flow
- Multiple survey participation
- Data persistence across sessions
- Auto-save and recovery

### UI Tests
- Dashboard layout on mobile and desktop
- Empty state display
- Use case list interactions
- Prioritization modal functionality
- Survey navigation (next/previous)
- Progress bar accuracy
- Completion confirmation

### Accessibility Tests
- Keyboard navigation through dashboard
- Screen reader announcements for survey progress
- Focus management in modals
- ARIA labels for all interactive elements

---

## UI/UX Mockup Notes

### Dashboard Layout
- **Header:** Workshop title, participant name (if available), PIN
- **Main Content:**
  - Left column (60%): Use case section
  - Right column (40%): Survey section
- **Mobile:** Stacked layout with tabs

### Visual Design
- Card-based design for use cases and surveys
- Status badges (Submitted, Prioritized, In Progress, Completed)
- Progress indicators using circular or linear progress bars
- Color coding:
  - Green: Completed
  - Blue: In Progress
  - Gray: Not Started
  - Orange: Requires Attention

### Interactions
- Smooth transitions between dashboard and forms
- Loading states for all async operations
- Optimistic UI updates
- Toast notifications for success/error states
- Confirmation dialogs for important actions

---

## Security Considerations

- Validate session_id for all requests
- Ensure participants can only view/edit their own submissions
- Prevent survey response tampering
- Rate limiting on prioritization and survey endpoints
- Input sanitization for all text responses
- Validate workshop PIN before showing dashboard

---

## Performance Considerations

- Lazy load use case details
- Paginate use case list if > 20 submissions
- Cache survey questions on client
- Debounce auto-save (30 seconds)
- Optimize database queries with proper indexing
- Use WebSocket for real-time survey status updates

---

## Analytics & Monitoring

### Metrics to Track
- Average time spent on dashboard
- Use case prioritization completion rate
- Survey start vs. completion rate
- Average time to complete surveys
- Drop-off points in surveys
- Most common survey question types

### Alerts
- High survey abandonment rate
- Prioritization save failures
- Session expiration issues
- Database connection errors

---

## Accessibility Requirements

- WCAG 2.1 AA compliance
- Keyboard shortcuts for common actions
- Screen reader support for all dynamic content
- High contrast mode support
- Focus indicators on all interactive elements
- ARIA live regions for progress updates
- Alternative text for all icons and images

---

## Related User Stories

- US02: PIN-Based Participant Entry
- US03: Digital Use Case Canvas
- US10: Prioritization Matrix Criteria
- US13: Facilitator Survey Management
- US05: Interactive Hotspot Matrix (displays prioritized use cases)

---

## Questions/Clarifications

1. Can participants edit their prioritization scores after submission?
2. Should participants see aggregated survey results after completion?
3. Is there a deadline for completing prioritization?
4. Can participants skip optional survey questions?
5. Should the system send reminders for incomplete surveys?
6. Can participants delete their submitted use cases?

---

## Future Enhancements

- AI-powered suggestions for prioritization based on use case content
- Collaborative prioritization (team-based scoring)
- Survey templates with pre-built questions
- Export personal dashboard as PDF
- Gamification elements (badges, points for participation)
- Push notifications for new surveys
- Voice input for survey responses
- Offline mode with sync when online
- Multi-language support for surveys

---

## Definition of Done

- [ ] Participant dashboard implemented with all sections
- [ ] Use case list displays correctly (empty and populated states)
- [ ] Prioritization interface functional for all criteria types
- [ ] Survey interface supports all question types
- [ ] Partial survey completion and resume working
- [ ] Auto-save implemented for surveys
- [ ] Progress tracking accurate
- [ ] All API endpoints implemented and tested
- [ ] Database schemas created with proper indexes
- [ ] All acceptance criteria met
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] UI tests passing
- [ ] Accessibility audit passed
- [ ] Mobile responsive design verified
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Demo to stakeholders completed

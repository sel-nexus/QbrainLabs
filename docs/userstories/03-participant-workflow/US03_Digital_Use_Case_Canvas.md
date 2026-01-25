# US03: Digital Use Case Canvas

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Use Case Intake & Management  
**Story Type:** Feature  
**Priority:** High  
**Story Points:** 8

---

## User Story

**As a** Participant,  
**I want to** submit AI use case ideas using a standardized template,  
**So that** all entries are evaluated on a level playing field.

---

## Description

Participants need a structured, intuitive interface to submit their AI use case ideas. The digital canvas ensures consistency across all submissions, making it easier to compare and evaluate ideas during the scoring phase.

---

## Requirements

### Functional Requirements

1. **Standardized Input Form**
   - **Use Case Title**
     - Text input (required)
     - Max 80 characters
     - Auto-save draft
   
   - **Problem Description**
     - Text area (required)
     - Max 500 characters
     - Character counter
     - Rich text optional (bold, italics, bullet points)
   
   - **Target User**
     - Text input (required)
     - Max 200 characters
     - Examples/placeholder text provided
   
   - **Expected KPI**
     - Text area (required)
     - Max 300 characters
     - Suggested KPI templates available

2. **AI Category Selection**
   - Dropdown with predefined options:
     - Generative AI
     - Predictive Analytics
     - Process Automation
     - Computer Vision
     - Natural Language Processing
     - Other (with text field)

3. **Data Readiness Self-Assessment**
   - 5-point scale (1-5)
   - Visual representation (stars or slider)
   - Tooltips explaining each level:
     - 1: No data available
     - 2: Some data, unstructured
     - 3: Data exists, needs cleaning
     - 4: Clean data, some gaps
     - 5: Production-ready data

4. **Submission Workflow**
   - Save as draft functionality
   - Preview before submit
   - Edit capability before workshop starts
   - Final submission confirmation

### Non-Functional Requirements

- Form auto-saves every 30 seconds
- Submission must complete in < 3 seconds
- Support offline mode with sync on reconnect
- Mobile-optimized interface
- Real-time character count

---

## Acceptance Criteria

### Scenario 1: Successful Submission
**Given** a participant has joined an active workshop  
**When** they complete all required fields and click "Submit"  
**Then** the data is stored in the `submissions` collection with workshop_pin reference  
**And** a "Submission Received" animation is displayed  
**And** the participant sees a success confirmation message

### Scenario 2: Required Field Validation
**Given** a participant is filling out the canvas  
**When** they attempt to submit with missing required fields  
**Then** the system highlights the incomplete fields  
**And** displays "Please complete all required fields"  
**And** scrolls to the first incomplete field

### Scenario 3: Character Limit Enforcement
**Given** a participant is entering text in any field  
**When** they reach the character limit  
**Then** the system prevents additional input  
**And** displays a red character counter  
**And** optionally shows a warning message

### Scenario 4: Draft Auto-Save
**Given** a participant is working on a submission  
**When** 30 seconds have elapsed since last change  
**Then** the system automatically saves a draft  
**And** displays a "Draft saved" indicator  
**And** the draft is associated with their session_id

### Scenario 5: Multiple Submissions
**Given** a participant has successfully submitted a use case  
**When** they want to submit another idea  
**Then** they can click "Submit Another Use Case"  
**And** the form resets to empty state  
**And** previous submissions remain saved

---

## Technical Implementation

### Frontend Components
- `UseCaseCanvas.tsx` - Main canvas container
- `FormField.tsx` - Reusable form field component
- `CharacterCounter.tsx` - Character limit display
- `DataReadinessScale.tsx` - 5-point scale component
- `SubmissionSuccess.tsx` - Success animation modal
- `DraftManager.tsx` - Auto-save functionality

### Backend Endpoints
```
POST /api/submissions
Request Body:
{
  "session_id": "UUID",
  "workshop_pin": "string",
  "title": "string",
  "problem_description": "string",
  "target_user": "string",
  "expected_kpi": "string",
  "ai_category": "string",
  "data_readiness": number (1-5)
}

Response:
{
  "submission_id": "UUID",
  "status": "submitted",
  "timestamp": "ISODate"
}

POST /api/submissions/draft
Request Body: (same as above)
Response:
{
  "draft_id": "UUID",
  "status": "draft",
  "last_saved": "ISODate"
}

GET /api/submissions/drafts/:session_id
Response:
{
  "drafts": [
    {
      "draft_id": "UUID",
      "title": "string",
      "last_saved": "ISODate",
      "data": {...}
    }
  ]
}
```

### Database Schema
```json
{
  "_id": ObjectId,
  "submission_id": "UUID",
  "workshop_pin": "string",
  "session_id": "UUID",
  "participant_id": "UUID (anonymous)",
  "title": "string",
  "problem_description": "string",
  "target_user": "string",
  "expected_kpi": "string",
  "ai_category": "string",
  "data_readiness": number (1-5),
  "status": "draft|submitted",
  "created_at": "ISODate",
  "updated_at": "ISODate",
  "submitted_at": "ISODate"
}
```

---

## Dependencies

- US02: PIN-Based Participant Entry (session required)
- US06: MongoDB Atlas SaaS Integration
- React Hook Form or similar form library
- IndexedDB or LocalStorage for offline support

---

## Testing Requirements

### Unit Tests
- Form validation logic
- Character counting
- Draft save/load functionality
- Data serialization

### Integration Tests
- Submission flow end-to-end
- Draft persistence and retrieval
- Multiple submission handling
- Network failure recovery

### UI Tests
- Form field interactions
- Error message display
- Success animation
- Mobile responsiveness
- Offline mode

### Accessibility Tests
- Keyboard navigation
- Screen reader compatibility
- Error announcement
- Focus management

---

## UI/UX Mockup Notes

### Canvas Layout
- Card-based design with clear sections
- Progress indicator showing completion
- Sticky submit button (always visible)
- Collapsible help text for each field

### Visual Design
- Clean, professional appearance
- Ample whitespace
- Clear visual hierarchy
- Consistent spacing and typography
- Brand colors for CTAs

### Interactions
- Smooth animations for validation
- Celebratory animation on submit
- Loading states for save operations
- Haptic feedback on mobile

---

## Security Considerations

- Input sanitization for all text fields (XSS prevention)
- HTML tag stripping if rich text not needed
- Rate limiting on submission endpoint
- Validate session_id before accepting submission
- Maximum submissions per participant per workshop (e.g., 10)

---

## Performance Considerations

- Lazy load form components
- Debounce auto-save (30 seconds)
- Optimize MongoDB writes (batch if possible)
- Compress draft data in local storage
- Implement optimistic UI updates

---

## Validation Rules

### Title
- Required
- Min length: 10 characters
- Max length: 80 characters
- No special characters except ( ) - , .

### Problem Description
- Required
- Min length: 50 characters
- Max length: 500 characters

### Target User
- Required
- Min length: 10 characters
- Max length: 200 characters

### Expected KPI
- Required
- Min length: 20 characters
- Max length: 300 characters

### AI Category
- Required
- Must be from predefined list

### Data Readiness
- Required
- Must be integer between 1-5

---

## Error Handling

### Error Types
1. **VALIDATION_ERROR**
   - Display inline with field
   - Prevent submission
   
2. **NETWORK_ERROR**
   - Save draft locally
   - Retry automatically
   - Display "Working offline" message
   
3. **SESSION_EXPIRED**
   - Preserve form data
   - Prompt to rejoin workshop
   - Auto-restore form after rejoin

4. **SUBMISSION_LIMIT_REACHED**
   - Display friendly message
   - Show count of submissions
   - Disable submit button

---

## Analytics & Monitoring

### Metrics to Track
- Average time to complete canvas
- Most commonly used AI categories
- Average data readiness score
- Field completion rates
- Draft save frequency
- Drop-off points in form

### Alerts
- High rate of submission failures
- Unusual number of draft saves (UX issue?)
- Database write failures

---

## Accessibility Requirements

- All form fields have associated labels
- Error messages announced by screen readers
- Keyboard shortcuts for common actions
- High contrast mode support
- Focus indicators on all interactive elements
- ARIA live regions for dynamic content

---

## Related User Stories

- US02: PIN-Based Participant Entry (prerequisite)
- US04: Live Scoring Interface (uses submissions)
- US05: Interactive Hotspot Matrix (displays submissions)

---

## Questions/Clarifications

1. Can participants edit submissions after final submit?
2. Should submissions be anonymous to facilitator?
3. Is there a minimum number of submissions required?
4. Should we support file attachments (e.g., supporting docs)?
5. Can participants see other submissions before scoring?

---

## Feature: View Uploaded Use Cases for Prioritization

### User Story

**As a** Workshop Member (Participant),  
**I want to** view use cases that have been uploaded by the facilitator,  
**So that** I can review them and plot/prioritize them on the matrix based on their value and feasibility.

### Description

When a facilitator uploads pre-defined use cases for a workshop, participants need a way to view these use cases before plotting them on the prioritization matrix. This feature provides a dedicated interface for participants to browse, search, and review uploaded use cases, enabling informed decision-making during the prioritization exercise.

### Functional Requirements

#### 1. Uploaded Use Cases List View
- **List Display:**
  - Card-based view of all uploaded use cases
  - Grid or list toggle option
  - Show key fields: Title, AI Category, Data Readiness
  - Visual indicator for use case status (active/inactive)
  
- **Sorting Options:**
  - Alphabetical (A-Z, Z-A)
  - By AI Category
  - By Data Readiness score
  - Recently added

- **Filtering Options:**
  - Filter by AI Category
  - Filter by Data Readiness level
  - Show only unscored use cases
  - Show only my scored use cases

#### 2. Use Case Detail View
- **Full Information Display:**
  - Use Case Title
  - Problem Description
  - Target User
  - Expected KPI
  - AI Category (with icon)
  - Data Readiness (visual scale)
  - Additional Notes (if any)
  
- **Actions Available:**
  - "Plot on Matrix" button
  - "Score This Use Case" button
  - Mark as reviewed
  - Add to favorites/watchlist

#### 3. Search Functionality
- Full-text search across title and description
- Real-time search results
- Highlight matching terms
- Search history (recent searches)

#### 4. Integration with Prioritization Matrix
- Quick access to plot use case on matrix
- View current position on matrix (if already plotted)
- See aggregated scores from other participants
- Compare with participant-submitted use cases

### Acceptance Criteria

#### Scenario 1: View List of Uploaded Use Cases
**Given** a participant has joined a workshop with uploaded use cases  
**When** they navigate to "View Use Cases" or "Browse Use Cases"  
**Then** they see a list of all active uploaded use cases  
**And** each use case shows title, category, and data readiness  
**And** they can switch between card and list view

#### Scenario 2: View Use Case Details
**Given** a participant is viewing the use case list  
**When** they click on a use case card  
**Then** they see the full details in a modal or detail page  
**And** they see all available information about the use case  
**And** they have options to score or plot the use case

#### Scenario 3: Search and Filter Use Cases
**Given** a participant is viewing uploaded use cases  
**When** they enter a search term  
**Then** results filter in real-time  
**And** matching terms are highlighted  
**When** they apply category filter "Generative AI"  
**Then** only use cases in that category are shown

#### Scenario 4: Plot Use Case from List
**Given** a participant is viewing an uploaded use case  
**When** they click "Plot on Matrix"  
**Then** they are taken to the scoring/plotting interface  
**And** the use case details are pre-loaded  
**And** they can assign their priority scores

#### Scenario 5: Empty State
**Given** a participant joins a workshop  
**When** no use cases have been uploaded by the facilitator  
**Then** they see a message: "No use cases have been uploaded yet"  
**And** they see instructions to submit their own use cases

### Technical Implementation

#### Frontend Components
- `UploadedUseCasesList.tsx` - Main list container
- `UseCaseCard.tsx` - Individual use case card component
- `UseCaseDetailModal.tsx` - Detail view modal
- `UseCaseSearch.tsx` - Search input with filters
- `UseCaseFilters.tsx` - Filter sidebar/dropdown
- `ViewToggle.tsx` - Grid/List view toggle
- `PlotFromListButton.tsx` - Quick action to plot

#### Backend Endpoints
```typescript
// Get all uploaded use cases for participant view
GET /api/workshops/:pin/use-cases/participant
Query params: {
  "search": "string",
  "category": "string",
  "data_readiness": number,
  "sort_by": "title|category|data_readiness|created_at",
  "sort_order": "asc|desc",
  "page": number,
  "limit": number
}
Response: {
  "use_cases": [
    {
      "use_case_id": "UUID",
      "title": "string",
      "problem_description": "string",
      "target_user": "string",
      "expected_kpi": "string",
      "ai_category": "string",
      "data_readiness": number,
      "source": "uploaded",
      "has_my_score": boolean,
      "my_score": {
        "value_score": number,
        "feasibility_score": number
      } | null,
      "aggregate_scores": {
        "avg_value": number,
        "avg_feasibility": number,
        "total_scores": number
      }
    }
  ],
  "total": number,
  "page": number,
  "limit": number
}

// Get single use case details
GET /api/workshops/:pin/use-cases/:use_case_id
Response: {
  "use_case_id": "UUID",
  "title": "string",
  "problem_description": "string",
  "target_user": "string",
  "expected_kpi": "string",
  "ai_category": "string",
  "data_readiness": number,
  "additional_notes": "string",
  "source": "uploaded",
  "created_at": "ISODate",
  "my_score": {...} | null,
  "aggregate_scores": {...}
}

// Mark use case as reviewed
POST /api/workshops/:pin/use-cases/:use_case_id/reviewed
Request: {
  "session_id": "UUID"
}
Response: {
  "success": true,
  "reviewed_at": "ISODate"
}
```

### UI/UX Design Notes

#### List View Layout
- **Header:** Search bar + filter buttons + view toggle
- **Main Content:** Responsive grid (2-4 columns based on screen)
- **Cards:** Title, truncated description, category badge, data readiness stars
- **Pagination:** Load more button or infinite scroll

#### Detail Modal
- Full-width on mobile, centered modal on desktop
- Clear visual hierarchy
- Prominent CTA buttons
- Easy dismiss (X button, click outside, ESC key)

#### Visual Indicators
- **Category Badges:** Color-coded by AI category
- **Data Readiness:** Star rating display
- **Scored Status:** Checkmark icon if already scored
- **Source Badge:** "Uploaded" vs "Participant Submitted"

### Definition of Done (View Uploaded Use Cases)
- [ ] List view with card display implemented
- [ ] Detail view modal functional
- [ ] Search functionality working
- [ ] Filters working (category, data readiness)
- [ ] Sort options functional
- [ ] "Plot on Matrix" integration working
- [ ] Empty state displayed correctly
- [ ] Mobile responsive design verified
- [ ] Accessibility audit passed

---

## Future Enhancements

- AI-powered suggestions for KPIs based on problem description
- Similar use case detection (prevent duplicates)
- Collaborative submissions (multiple authors)
- Import from previous workshops
- Template library for different industries
- Voice-to-text input for mobile
- Real-time collaboration features

---

## Definition of Done

- [ ] Form implemented with all required fields
- [ ] Character limits enforced
- [ ] AI category dropdown functional
- [ ] Data readiness scale implemented
- [ ] Draft auto-save working
- [ ] Submission saved to MongoDB successfully
- [ ] Success animation displayed
- [ ] All validation rules implemented
- [ ] All acceptance criteria met
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] UI tests passing
- [ ] Accessibility audit passed
- [ ] Mobile testing completed
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Demo to stakeholders completed

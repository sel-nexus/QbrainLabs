# US01: Workshop Initialization (Admin Only)

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Workshop Administration & Access  
**Story Type:** Feature  
**Priority:** High  
**Story Points:** 8

---

## User Story

**As an** Administrator,  
**I want to** create a new workshop session with custom scoring weights,  
**So that** I can align the AI prioritization to specific business outcomes and then assign facilitators to manage the session.

---

## Access Control

**Workshop creation is restricted to Administrators only.**

| Role | Can Create Workshop | Can Manage Workshop | Can View Workshop |
|------|---------------------|---------------------|-------------------|
| Admin | ✅ Yes | ✅ Yes | ✅ Yes |
| Facilitator | ❌ No | ✅ Yes (if assigned) | ✅ Yes (if assigned) |
| Participant | ❌ No | ❌ No | ✅ Yes (via PIN) |

**Rationale:**
- Centralizes workshop governance under administrators
- Ensures proper resource allocation and approval workflow
- Facilitators can be assigned to workshops by admins via the Facilitator Management interface
- Maintains organizational control over workshop creation

---

## Description

The Administrator needs the ability to initialize a new workshop session with customizable scoring criteria and weights. This ensures that the AI-powered prioritization reflects the specific business context and strategic goals of each workshop. After creation, the admin can assign facilitators to manage the workshop session.

---

## Requirements

### Functional Requirements

1. **Workshop Configuration Form**
   - Input fields for:
     - Workshop Title (text, required, max 100 characters)
     - Department (dropdown or text, required)
     - Workshop Date (date picker, required)
   
2. **Dynamic Criteria Management**
   - Pre-defined criteria list:
     - **Business Value** (e.g., ROI, Customer Experience, Revenue Potential)
     - **Feasibility** (e.g., Technical Complexity, Data Availability, Talent Readiness)
     - **Strategic Fit** (e.g., Alignment with Goals, Time to Market)
   - Ability to add custom criteria (optional)
   
3. **Weight Slider UI**
   - Visual slider for each criterion
   - Real-time calculation showing remaining percentage
   - Visual indicator when total equals 100%
   - Constraint: Sum of all weights must equal exactly 100%
   
4. **Data Persistence**
   - Workshop configuration saved to MongoDB `workshops` collection
   - Generate unique 6-digit PIN upon creation
   - Store PIN with workshop metadata

### Non-Functional Requirements

- Form validation on client-side and server-side
- Response time < 2 seconds for workshop creation
- PIN generation must be unique and random
- Mobile-responsive design

---

## Acceptance Criteria

### Scenario 1: Successful Workshop Creation (Admin)
**Given** the admin is on the workshop creation page  
**When** they fill in all required fields and set weights totaling 100%  
**Then** the system creates the workshop and displays a unique 6-digit PIN  
**And** the workshop is saved to the database with status "active"

### Scenario 2: Invalid Weight Configuration
**Given** the admin has set criterion weights  
**When** the total weight does not equal 100%  
**Then** the system displays an error message "Weights must total exactly 100%"  
**And** the "Create Workshop" button remains disabled

### Scenario 3: Unique PIN Generation
**Given** a workshop is successfully created  
**When** the system generates a PIN  
**Then** the PIN must be exactly 6 digits  
**And** the PIN must be unique across all active workshops

### Scenario 4: Required Fields Validation
**Given** the admin is filling the form  
**When** they attempt to submit without completing required fields  
**Then** the system highlights missing fields  
**And** displays appropriate error messages

### Scenario 5: Non-Admin Access Denied
**Given** a facilitator (non-admin) attempts to access the workshop creation page  
**When** they navigate to `/facilitator/create`  
**Then** the system redirects them to their dashboard  
**And** the "New Workshop" button is not visible in their interface

---

## Technical Implementation

### Frontend Components
- `WorkshopCreationForm.tsx` - Main form component
- `WeightSlider.tsx` - Reusable weight slider component
- `PINDisplay.tsx` - PIN display modal

### Backend Endpoints
```
POST /api/workshops
Request Body:
{
  "title": string,
  "department": string,
  "date": date,
  "criteria": [
    {
      "name": string,
      "weight": number
    }
  ]
}

Response:
{
  "workshop_id": string,
  "pin": string (6 digits),
  "status": "active"
}
```

### Database Schema
```json
{
  "_id": ObjectId,
  "workshop_id": "string (UUID)",
  "pin": "string (6 digits)",
  "title": "string",
  "department": "string",
  "date": "ISODate",
  "criteria": [
    {
      "name": "string",
      "weight": "number"
    }
  ],
  "status": "active|completed|cancelled",
  "created_at": "ISODate",
  "created_by": "string"
}
```

---

## Dependencies

- MongoDB Atlas M0 cluster configured
- FastAPI backend with motor driver
- React frontend with form validation library

---

## Testing Requirements

### Unit Tests
- Weight calculation logic (sum must equal 100%)
- PIN generation (uniqueness and format)
- Form validation

### Integration Tests
- Workshop creation flow end-to-end
- MongoDB document creation
- PIN retrieval

### UI Tests
- Form field validation
- Weight slider interaction
- Error message display
- Responsive design on mobile devices

---

## UI/UX Mockup Notes

- Clean, modern interface with clear visual hierarchy
- Weight sliders with color coding (green when valid, red when invalid)
- Real-time percentage calculator visible
- Success modal with prominent PIN display
- Copy-to-clipboard functionality for PIN

---

## Security Considerations

- Rate limiting on workshop creation endpoint
- Input sanitization for all text fields
- PIN should not be guessable (cryptographically secure random)
- Workshop creator should be authenticated

---

## Performance Considerations

- Client-side weight calculation for instant feedback
- Debounced API calls during form filling
- Optimistic UI updates

---

## Related User Stories

- **US02:** PIN-Based Participant Entry (depends on PIN generation)
- **US29:** Supabase MCP Integration (database infrastructure - replaces US00)
- **US30:** User Roles & Access Control (defines who can create workshops)

---

## Relationship to Other Stories

**US01 vs US10 (Prioritization Matrix Criteria):**
- **US01** creates the workshop and generates the PIN
- **US10** configures the scoring criteria used within the workshop
- **Boundary:** US01 = "Create workshop"; US10 = "Configure how to score use cases"
- **Relationship:** US01 may include basic criteria setup, but US10 provides comprehensive criteria configuration
- **Dependency:** US10's criteria are used during workshop creation (US01) and scoring (US04)

**US01 vs US22 (Workshop Templates):**
- **US01** creates individual workshops from scratch
- **US22** provides reusable templates to accelerate workshop creation
- **Relationship:** US22 templates can be used during US01's workshop creation flow

---

---

## Questions/Clarifications

1. Should facilitators be able to edit workshop details after creation?
2. What is the PIN expiration policy?
3. Can criteria be added/removed after workshop creation?
4. Should there be a limit on the number of active workshops per facilitator?

---

## Definition of Done

- [ ] Form implemented with all required fields
- [ ] Weight slider UI functional with 100% constraint
- [ ] Workshop saved to MongoDB successfully
- [ ] Unique 6-digit PIN generated
- [ ] All acceptance criteria met
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Code review completed
- [ ] Documentation updated
- [ ] Demo to stakeholders completed

# US40: Use Case Detail Popup with Feedback Capability

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Use Case Management & Collaboration  
**Story Type:** Feature  
**Priority:** High  
**Story Points:** 13  
**Status:** 📋 BACKLOG

---

## User Story

**As a** Workshop Participant,  
**I want to** view detailed information about any workshop use case in a popup window,  
**So that** I can provide feedback on use cases submitted by others or edit my own submissions.

---

## Description

When participants click on any workshop use case, open a popup window displaying detailed information. If the use case was submitted by the participant, it should be editable. Otherwise, it should be read-only with an editable feedback text box. This enables collaboration and allows participants to provide input on use cases they didn't create.

---

## Requirements

### Functional Requirements

1. **Use Case Detail Popup**
   - Modal popup displays full use case information
   - Shows all use case fields (title, description, target user, KPI, category, data readiness)
   - Displays submission metadata (author, timestamp, status)
   - Responsive design for mobile and desktop

2. **Edit Mode (Own Use Cases)**
   - Participant's own use cases open in editable mode
   - All fields are editable
   - Save and Cancel buttons
   - Validation on save
   - Success/error feedback

3. **Read-Only Mode (Other Participants' Use Cases)**
   - Other participants' use cases display in read-only mode
   - All fields are non-editable
   - Visual distinction (grayed out or different styling)
   - Feedback text box is editable
   - Submit Feedback button

4. **Feedback Functionality**
   - Text area for feedback input
   - Character limit (e.g., 500 characters)
   - Save feedback to backend
   - Display existing feedback if available
   - Success confirmation on submission

5. **Visual Indicators**
   - Clear distinction between editable and read-only modes
   - Visual indicator showing use case ownership
   - Feedback submission status
   - Loading states during save operations

### Non-Functional Requirements

- Popup should open quickly (< 300ms)
- Smooth animations for popup open/close
- Mobile-responsive design
- Accessible (keyboard navigation, screen readers)
- Support for long use case descriptions (scrollable)

---

## Acceptance Criteria

### Scenario 1: View Own Use Case (Editable)
**Given** a participant clicks on their own use case  
**When** the popup opens  
**Then** all fields are editable  
**And** Save and Cancel buttons are visible  
**And** they can modify and save changes

### Scenario 2: View Other Participant's Use Case (Read-Only)
**Given** a participant clicks on another participant's use case  
**When** the popup opens  
**Then** all fields are read-only  
**And** a feedback text box is available  
**And** they can submit feedback

### Scenario 3: Submit Feedback
**Given** a participant is viewing another participant's use case  
**When** they enter feedback and click Submit  
**Then** the feedback is saved to the backend  
**And** they see a success message  
**And** the feedback is associated with the use case

### Scenario 4: Edit Own Use Case
**Given** a participant opens their own use case  
**When** they modify fields and click Save  
**Then** changes are validated  
**And** if valid, changes are saved  
**And** they see a success confirmation

---

## Technical Implementation

### Files to Create

- `client/src/components/usecases/UseCaseDetailModal.tsx` - Main modal component

### Files to Modify

- `client/src/pages/ParticipantDashboard.tsx` - Add click handler for use cases
- `client/src/pages/ParticipantMatrix.tsx` - Add click handler for use cases
- `server/app/api/usecases.py` - Add feedback endpoints
- `server/app/models/models.py` - Add UseCaseFeedback model if needed

### Frontend Implementation

#### UseCaseDetailModal Component

```typescript
interface UseCaseDetailModalProps {
    useCase: UseCase;
    participantId: string;
    isOwner: boolean;
    onClose: () => void;
    onUpdate?: () => void;
}

export function UseCaseDetailModal({
    useCase,
    participantId,
    isOwner,
    onClose,
    onUpdate
}: UseCaseDetailModalProps) {
    const [isEditing, setIsEditing] = useState(isOwner);
    const [formData, setFormData] = useState(useCase);
    const [feedback, setFeedback] = useState('');
    const [submitting, setSubmitting] = useState(false);
    
    const handleSave = async () => {
        // Save use case updates if owner
    };
    
    const handleSubmitFeedback = async () => {
        // Submit feedback if not owner
    };
    
    return (
        <Modal isOpen onClose={onClose}>
            {/* Use case details */}
            {isOwner ? (
                // Editable form
            ) : (
                // Read-only view with feedback box
            )}
        </Modal>
    );
}
```

### Backend Implementation

#### Use Case Feedback Model

```python
class UseCaseFeedback(Base):
    __tablename__ = "usecase_feedback"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    usecase_id = Column(GUID(), ForeignKey("usecases.id"), nullable=False)
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=False)
    feedback_text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    usecase = relationship("UseCase", backref="feedback")
    participant = relationship("Participant", backref="usecase_feedback")
```

#### API Endpoints

```python
@router.post("/{usecase_id}/feedback")
async def submit_usecase_feedback(
    usecase_id: str,
    participant_id: str = Query(...),
    feedback_text: str = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Submit feedback on a use case"""
    # Create feedback record
    # Return success

@router.get("/{usecase_id}/feedback")
async def get_usecase_feedback(
    usecase_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all feedback for a use case"""
    # Return feedback list
```

---

## Dependencies

- US03: Digital Use Case Canvas - already implemented
- UseCase model must exist
- Participant model must exist
- Modal component library

---

## UI/UX Design

### Modal Layout

```
┌─────────────────────────────────────┐
│ Use Case Details            [X]     │
├─────────────────────────────────────┤
│ Title: [Editable/Read-only]         │
│ Description: [Editable/Read-only]    │
│ Target User: [Editable/Read-only]    │
│ Expected KPI: [Editable/Read-only]  │
│ AI Category: [Editable/Read-only]   │
│ Data Readiness: [Editable/Read-only]│
│                                     │
│ [If not owner:]                     │
│ Feedback: [Text area]               │
│ [Submit Feedback]                   │
│                                     │
│ [If owner:]                         │
│ [Save] [Cancel]                    │
└─────────────────────────────────────┘
```

### Visual Indicators

- Owner's use case: Blue border or "Your Use Case" badge
- Other's use case: Gray border or "Submitted by [Name]" badge
- Editable fields: Normal styling
- Read-only fields: Slightly grayed or different background
- Feedback box: Highlighted or bordered

---

## Testing Requirements

### Unit Tests
- Modal opens with correct mode (editable/read-only)
- Form validation for editable mode
- Feedback submission
- Use case update functionality

### Integration Tests
- Click use case opens modal
- Owner can edit and save
- Non-owner can submit feedback
- Feedback is saved correctly
- Use case updates are saved

### Edge Cases
- Use case with very long description
- Multiple feedback submissions
- Network failure during save
- Invalid data in editable mode

---

## Database Schema

### UseCaseFeedback Table

- `id` (UUID, primary key)
- `usecase_id` (UUID, foreign key)
- `participant_id` (UUID, foreign key)
- `feedback_text` (Text)
- `created_at` (DateTime)

### Indexes

- Index on `usecase_id` for quick feedback retrieval
- Index on `participant_id` for user feedback queries

---

## Definition of Done

- [ ] UseCaseDetailModal component created
- [ ] Click handlers added to participant views
- [ ] Editable mode for own use cases
- [ ] Read-only mode for other use cases
- [ ] Feedback submission functionality
- [ ] Backend endpoints implemented
- [ ] Database model created (if needed)
- [ ] Visual indicators implemented
- [ ] Mobile-responsive design
- [ ] Accessibility features
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Code review completed
- [ ] Documentation updated

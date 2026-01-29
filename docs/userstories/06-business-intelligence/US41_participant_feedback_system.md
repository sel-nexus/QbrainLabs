# US41: Participant Feedback System with Admin Management

**Epic:** AI Hotspot Flow - Enterprise Backlog  
**Module:** Feedback & Support Management  
**Story Type:** Feature / Bug Fix  
**Priority:** High  
**Story Points:** 13  
**Status:** 📋 BACKLOG

---

## User Story

**As a** Workshop Participant,  
**I want to** submit feedback that is properly saved and tracked,  
**So that** I can report issues and suggestions, and receive updates on their resolution.

**As an** Administrator,  
**I want to** view, manage, and resolve participant feedback,  
**So that** I can address issues promptly and keep participants informed of progress.

---

## Description

Fix "failed to submit feedback" error and implement a complete feedback management system where admins can view, resolve, and inform participants about feedback progress. This includes fixing the existing feedback submission functionality and adding comprehensive admin tools for feedback management.

---

## Requirements

### Functional Requirements

1. **Feedback Submission (Participant)**
   - Fix feedback submission endpoint errors
   - Save feedback to database properly
   - Support multiple feedback types (bug, feature request, improvement, general)
   - Include context information (page URL, browser info)
   - Success/error feedback to user
   - Optional: Screenshot attachment

2. **Feedback Management (Admin)**
   - Admin dashboard to view all feedback
   - Filter by status, type, priority, date
   - Search functionality
   - Sort by various criteria
   - Bulk actions (mark as resolved, assign, etc.)

3. **Feedback Resolution**
   - Admin ability to resolve feedback
   - Admin ability to add responses/notes
   - Status tracking (new, in-progress, resolved, closed)
   - Priority assignment (low, medium, high, critical)
   - Assignment to team members

4. **Participant Notifications**
   - Notify participants of feedback status changes
   - Email notifications (optional)
   - In-app notifications
   - Status update messages

5. **Feedback Details**
   - View full feedback details
   - See submission history
   - View admin responses
   - Track resolution timeline

### Non-Functional Requirements

- Feedback submission should complete in < 2 seconds
- Admin dashboard should load quickly (< 1 second)
- Support for high volume of feedback
- Proper error handling and logging
- Secure admin access

---

## Acceptance Criteria

### Scenario 1: Submit Feedback Successfully
**Given** a participant wants to submit feedback  
**When** they fill out the feedback form and submit  
**Then** the feedback is saved to the database  
**And** they see a success message  
**And** they receive a confirmation

### Scenario 2: Admin Views Feedback
**Given** an admin accesses the feedback dashboard  
**When** they view the feedback list  
**Then** they see all feedback items  
**And** can filter and search  
**And** can see status and priority

### Scenario 3: Admin Resolves Feedback
**Given** an admin is viewing a feedback item  
**When** they add a response and mark as resolved  
**Then** the feedback status updates  
**And** the participant is notified  
**And** the resolution is recorded

### Scenario 4: Participant Receives Update
**Given** a participant has submitted feedback  
**When** an admin updates the status  
**Then** the participant receives a notification  
**And** can view the update in their feedback history

---

## Technical Implementation

### Files to Modify

- `client/src/components/feedback/FeedbackWidget.tsx` - Fix submission
- `server/app/api/feedback.py` - Fix errors, add admin endpoints
- `server/app/models/feedback.py` - Verify model structure
- `client/src/pages/AdminDashboard.tsx` - Add feedback management section

### Backend Changes

#### Fix Feedback Submission Endpoint

```python
@router.post("/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    feedback_in: FeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Submit a new feedback item"""
    try:
        feedback = Feedback(
            **feedback_in.dict(),
            user_id=current_user.id,
            page_url=feedback_in.page_url or None,
            browser_info=feedback_in.browser_info or None
        )
        db.add(feedback)
        await db.commit()
        await db.refresh(feedback)
        return feedback
    except Exception as e:
        logger.error(f"Error creating feedback: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")
```

#### Admin Endpoints

```python
@router.get("/admin/feedback", response_model=List[FeedbackResponse])
@require_admin
async def get_all_feedback(
    status: Optional[FeedbackStatus] = None,
    feedback_type: Optional[FeedbackType] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Admin: Get all feedback with filters"""
    query = select(Feedback)
    if status:
        query = query.where(Feedback.status == status)
    if feedback_type:
        query = query.where(Feedback.type == feedback_type)
    query = query.order_by(desc(Feedback.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.put("/admin/feedback/{feedback_id}", response_model=FeedbackResponse)
@require_admin
async def update_feedback(
    feedback_id: UUID,
    feedback_update: FeedbackUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Admin: Update feedback status and response"""
    result = await db.execute(select(Feedback).where(Feedback.id == feedback_id))
    feedback = result.scalar_one_or_none()
    
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    
    # Update fields
    for field, value in feedback_update.dict(exclude_unset=True).items():
        setattr(feedback, field, value)
    
    # Handle status changes
    if feedback_update.status == FeedbackStatus.RESOLVED and not feedback.resolved_at:
        feedback.resolved_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(feedback)
    
    # Notify participant
    await notify_participant_feedback_update(feedback)
    
    return feedback
```

### Frontend Changes

#### Fix FeedbackWidget

```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
        const response = await feedbackApi.submitFeedback({
            type: formData.type,
            title: formData.title,
            description: formData.description,
            category: formData.category,
            page_url: window.location.pathname,
            browser_info: {
                userAgent: navigator.userAgent,
                language: navigator.language
            }
        });
        
        toast.success('Feedback submitted successfully');
        onClose();
    } catch (error: any) {
        toast.error(error.message || 'Failed to submit feedback');
    } finally {
        setSubmitting(false);
    }
};
```

#### Admin Feedback Dashboard

```typescript
export function AdminFeedbackDashboard() {
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [filters, setFilters] = useState({ status: null, type: null });
    
    useEffect(() => {
        loadFeedback();
    }, [filters]);
    
    const loadFeedback = async () => {
        const data = await api.get('/admin/feedback', { params: filters });
        setFeedback(data.data);
    };
    
    return (
        <div>
            <FeedbackFilters filters={filters} onChange={setFilters} />
            <FeedbackList feedback={feedback} onUpdate={loadFeedback} />
        </div>
    );
}
```

---

## Dependencies

- Existing feedback infrastructure
- User authentication and authorization
- Admin role permissions
- Notification system (optional)

---

## Database Schema

### Feedback Table (Verify Structure)

- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `type` (Enum: bug, feature_request, improvement, general, critical)
- `status` (Enum: new, in_progress, resolved, closed)
- `title` (String, 200 chars)
- `description` (Text)
- `category` (String, 50 chars)
- `page_url` (String, 500 chars)
- `browser_info` (JSON)
- `priority` (Integer, 1-5)
- `admin_response` (Text)
- `admin_notes` (Text)
- `assigned_to` (UUID, foreign key)
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `resolved_at` (DateTime)

### Indexes

- Index on `status` for filtering
- Index on `type` for filtering
- Index on `user_id` for user feedback queries
- Index on `created_at` for sorting

---

## Notification System

### In-App Notifications

- Show notification when feedback status changes
- Display in participant's notification center
- Mark as read/unread

### Email Notifications (Optional)

- Send email when feedback is resolved
- Include admin response
- Link to view feedback details

---

## Testing Requirements

### Unit Tests
- Feedback submission endpoint
- Admin endpoints
- Feedback model validation
- Notification triggers

### Integration Tests
- Submit feedback flow
- Admin view and filter feedback
- Admin resolve feedback
- Participant receives notification

### Edge Cases
- Invalid feedback data
- Missing required fields
- Network failures
- Concurrent feedback submissions
- Large feedback descriptions

---

## Admin Dashboard Features

### Feedback List View

- Table/grid view of all feedback
- Columns: ID, Type, Title, Status, Priority, Submitted By, Date, Actions
- Sortable columns
- Pagination

### Filters

- Status filter (dropdown)
- Type filter (dropdown)
- Priority filter (dropdown)
- Date range filter
- Search by title/description

### Actions

- View details
- Update status
- Add response
- Assign to team member
- Mark as resolved
- Close feedback
- Delete (with confirmation)

---

## Definition of Done

- [ ] Feedback submission endpoint fixed
- [ ] Feedback saves to database correctly
- [ ] Admin dashboard displays all feedback
- [ ] Admin can filter and search feedback
- [ ] Admin can update feedback status
- [ ] Admin can add responses
- [ ] Participants receive notifications
- [ ] Feedback status tracking works
- [ ] Priority assignment works
- [ ] Assignment to team members works
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Admin dashboard tested
- [ ] Code review completed
- [ ] Documentation updated

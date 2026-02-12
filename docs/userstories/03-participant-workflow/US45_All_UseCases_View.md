# US45: All Use Cases View with Workshop Mappings

## Overview
Display all use cases across all workshops with their corresponding workshop information. Some use cases might be mapped to more than one workshop.

## User Story
**As a** facilitator  
**I want to** view all use cases across all workshops with their workshop mappings  
**So that** I can browse and manage use cases efficiently without navigating to individual workshops

## Acceptance Criteria
- [x] Display all use cases in a single view
- [x] Show workshop information for each use case
- [x] Support filtering by workshop
- [x] Support filtering by status
- [x] Support search functionality
- [x] Show use case details (title, description, proposed solution, KPI, target user, category)
- [x] Navigate to workshop when clicking on a use case
- [x] Responsive design for mobile and desktop

## Technical Implementation

### Backend Changes

#### API Endpoint
**File:** `server/app/api/usecases.py`

Added new endpoint:
```python
@router.get("/all/list", response_model=List[dict])
async def get_all_use_cases(
    authenticated_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
)
```

**Features:**
- Requires authentication
- Joins UseCase and Workshop tables
- Returns use cases with workshop information
- Ordered by creation date (newest first)

**Response Format:**
```json
[
  {
    "id": "uuid",
    "title": "Use Case Title",
    "description": "Problem statement",
    "proposed_solution": "Solution description",
    "kpi": "Success metrics",
    "target_user": "Target audience",
    "category": "AI category",
    "status": "PENDING|APPROVED|REJECTED",
    "created_at": "ISO datetime",
    "workshop": {
      "id": "uuid",
      "title": "Workshop Title",
      "status": "DRAFT|OPEN|IN_PROGRESS|COMPLETED",
      "current_phase": "intake|voting|discussion|results"
    }
  }
]
```

### Frontend Changes

#### New Page Component
**File:** `client/src/pages/AllUseCases.tsx`

**Features:**
- Search functionality (searches title, description, and workshop title)
- Filter by workshop
- Filter by status
- Displays use case count
- Shows detailed use case information
- Click to navigate to workshop
- Responsive card layout
- Dark mode support

#### Routing
**File:** `client/src/App.tsx`

Added route:
```tsx
<Route path="/facilitator/usecases" element={
  <AuthenticatedRoute title="All Use Cases">
    <AllUseCases />
  </AuthenticatedRoute>
} />
```

#### Dashboard Integration
**File:** `client/src/pages/FacilitatorDashboard.tsx`

Updated "Use Cases" tile to navigate to `/facilitator/usecases`

## UI/UX Design

### Layout
- **Header:** Title and description
- **Filters:** Search, workshop filter, status filter
- **Count:** Shows filtered count vs total count
- **Cards:** Each use case displayed in a card with:
  - Title and status badge
  - Description
  - Proposed solution (if available)
  - KPI (if available)
  - Target user (if available)
  - Category (if available)
  - Workshop name and creation date
  - "View Workshop" button

### Color Coding
- **Status Badges:**
  - APPROVED: Green
  - REJECTED: Red
  - PENDING: Yellow
  - Other: Gray

## Data Model

### UseCase Model
```python
class UseCase(Base):
    __tablename__ = "use_cases"
    
    id = Column(GUID(), primary_key=True)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"))
    participant_id = Column(GUID(), ForeignKey("participants.id"), nullable=True)
    title = Column(Text)
    description = Column(Text)
    proposed_solution = Column(Text)
    kpi = Column(Text)
    target_user = Column(String)
    category = Column(String)
    status = Column(String, default="PENDING")
    created_at = Column(DateTime)
    updated_at = Column(DateTime)
```

### Relationship
- Each use case belongs to **one** workshop (many-to-one relationship)
- The same use case title/content can exist in multiple workshops as separate records

## Testing

### Manual Testing Steps
1. Login as facilitator
2. Navigate to Facilitator Dashboard
3. Click on "Use Cases" tile
4. Verify all use cases are displayed
5. Test search functionality
6. Test workshop filter
7. Test status filter
8. Click on a use case card to navigate to workshop
9. Verify responsive design on mobile

### Test Script
**File:** `test_all_usecases.py`

Tests the `/api/usecases/all/list` endpoint with authentication.

## Security
- Requires authentication (JWT token)
- Only authenticated facilitators can access
- Returns only use cases from accessible workshops

## Performance Considerations
- Single database query with JOIN
- Ordered by creation date for efficient indexing
- Frontend filtering done in memory (acceptable for typical workshop sizes)

## Future Enhancements
- Pagination for large datasets
- Export functionality
- Bulk actions (approve/reject multiple use cases)
- Advanced filtering (by category, date range, etc.)
- Sort options (by title, date, workshop, status)

## Related User Stories
- US03: Digital Use Case Canvas
- US04: Live Scoring Interface
- US05: Interactive Hotspot Matrix
- US40: Bulk UseCase Addition

## Status
✅ **Implemented** - February 12, 2026

## Files Modified
1. `server/app/api/usecases.py` - Added `/all/list` endpoint
2. `client/src/pages/AllUseCases.tsx` - New page component
3. `client/src/App.tsx` - Added route
4. `client/src/pages/FacilitatorDashboard.tsx` - Updated navigation
5. `test_all_usecases.py` - Test script

## Notes
- Use cases are workshop-specific (one-to-many relationship)
- If the same use case concept appears in multiple workshops, they are separate database records
- The view shows all use cases the authenticated user has access to

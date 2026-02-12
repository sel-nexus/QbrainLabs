# Facilitator Role-Based Filtering

## Overview
This document describes the role-based filtering implementation that ensures facilitators only see use cases and workshops they are assigned to or own.

## Feature Description
When a facilitator logs in, they should only see:
- **Use Cases**: Only those attached to workshops where they are the owner or assigned facilitator
- **Workshop Dropdown**: Only workshops they own or are assigned to

Admins continue to see all use cases and workshops across the system.

## Implementation Details

### Backend Changes

#### API Endpoint: `/api/usecases/all/list`
**File**: `server/app/api/usecases.py`

The endpoint now implements role-based filtering:

1. **Admin Users**: See all use cases across all workshops
2. **Facilitators**: See only use cases from workshops they own or are assigned to

**Logic**:
```python
# For facilitators:
1. Get workshops owned by the facilitator (Workshop.facilitator_id == user.id)
2. Get workshops assigned to the facilitator (WorkshopFacilitator.facilitator_id == user.id)
3. Combine both lists (removing duplicates)
4. Filter use cases to only those from the combined workshop list
```

**Key Code Section** (lines 98-135):
- Checks if user is admin → returns all use cases
- For facilitators:
  - Queries owned workshops
  - Queries assigned workshops via `WorkshopFacilitator` table
  - Combines both lists
  - Returns use cases only from those workshops

### Frontend Changes

#### Page: All Use Cases
**File**: `client/src/pages/AllUseCases.tsx`

The frontend automatically adapts to the filtered data:

1. **Workshop Dropdown** (lines 107-118): 
   - Extracts unique workshops from the use cases returned by the API
   - Since the API already filters use cases by facilitator permissions, the dropdown automatically shows only relevant workshops
   - No additional filtering needed on the frontend

2. **Use Case Display**:
   - Shows only use cases returned by the API
   - Automatically filtered by backend based on user role

## Database Schema

### WorkshopFacilitator Table
**File**: `server/app/models/rbac.py`

Many-to-many relationship table that tracks workshop assignments:

```python
class WorkshopFacilitator(Base):
    __tablename__ = "workshop_facilitators"
    
    id = Column(GUID(), primary_key=True)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"))
    facilitator_id = Column(GUID(), ForeignKey("users.id"))
    assigned_by = Column(GUID(), ForeignKey("users.id"))
    assigned_at = Column(DateTime)
    can_edit = Column(Boolean, default=True)
    can_delete = Column(Boolean, default=False)
```

## Testing

### Test Script
**File**: `test_facilitator_filtering.py`

Run the test to verify filtering works correctly:

```bash
python test_facilitator_filtering.py
```

**Test Results** (as of implementation):
- ✅ Facilitators see only their assigned workshops' use cases
- ✅ Admins see all 27 use cases across all workshops
- ✅ Facilitators with no workshops see empty list
- ✅ Workshop dropdown shows only accessible workshops

### Example Test Output:
```
📋 Testing facilitator: ram.varikuti@gmail.com
   User ID: e40a1a4f-2923-4493-bd79-0d339206453e
   Owned workshops: 1
   Assigned workshops: 3
   Total accessible workshops: 4
   ✅ Accessible use cases: 8

   Use cases by workshop:
      - AI Immersion Day with WSP: 1 use case(s)
      - AI day with UHG: 4 use case(s)
      - AI Immersion Day with Enmax: 3 use case(s)

📋 Testing admin access:
   Admin: admin@hotspotmatrix.ai
   ✅ Admin can see all 27 use cases
```

## User Experience

### For Facilitators:
1. Login to the system
2. Navigate to "All Use Cases" page (`/facilitator/usecases`)
3. See only use cases from workshops they own or are assigned to
4. Workshop dropdown shows only their accessible workshops
5. Can filter and search within their accessible use cases

### For Admins:
1. Login to the system
2. Navigate to "All Use Cases" page
3. See all use cases across all workshops
4. Workshop dropdown shows all workshops in the system
5. Can filter and search across all use cases

## Security Considerations

1. **Backend Enforcement**: Filtering is enforced at the API level, not just the UI
2. **Database Queries**: Uses proper JOIN and WHERE clauses to ensure data isolation
3. **No Data Leakage**: Facilitators cannot access use cases from workshops they're not assigned to
4. **Admin Override**: Admins maintain full visibility for system management

## Related Files

### Backend:
- `server/app/api/usecases.py` - Use case API endpoints with filtering
- `server/app/api/workshops.py` - Workshop API with similar filtering
- `server/app/models/rbac.py` - WorkshopFacilitator model
- `server/app/models/models.py` - User, Workshop, UseCase models

### Frontend:
- `client/src/pages/AllUseCases.tsx` - All use cases page
- `client/src/pages/FacilitatorDashboard.tsx` - Facilitator dashboard

### Testing:
- `test_facilitator_filtering.py` - Automated test script

## Future Enhancements

1. **Bulk Assignment**: Allow admins to assign multiple facilitators to multiple workshops
2. **Permission Levels**: Implement granular permissions (view-only, edit, delete)
3. **Notification System**: Notify facilitators when assigned to new workshops
4. **Audit Trail**: Track when facilitators are assigned/removed from workshops

## Troubleshooting

### Issue: Facilitator sees no use cases
**Solution**: 
1. Verify facilitator is assigned to at least one workshop
2. Check `workshop_facilitators` table for assignments
3. Verify workshop has use cases

### Issue: Workshop not appearing in dropdown
**Solution**:
1. Ensure facilitator owns the workshop OR is assigned via `workshop_facilitators`
2. Check that workshop has at least one use case
3. Verify workshop status is not DELETED

### Issue: Admin sees limited use cases
**Solution**:
1. Verify user has `is_admin` flag set to `true` in database
2. Check authentication token is valid
3. Clear browser cache and re-login

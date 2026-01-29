# US44: Workshop Deletion Not Working for Admin

**Epic:** Workshop Management & Administration  
**Module:** Workshop Administration  
**Story Type:** Bug Fix  
**Priority:** High  
**Story Points:** 5  
**Status:** ✅ IMPLEMENTED

---

## User Story

**As an** Administrator,  
**I want to** delete workshops from the admin panel,  
**So that** I can manage workshop lifecycle and remove obsolete or test workshops from the system.

---

## Description

Administrators should be able to delete workshops through the admin panel interface. Currently, the deletion functionality exists in the codebase but is not working properly. This bug prevents admins from effectively managing workshops and cleaning up the system.

**Current Implementation:**
- Backend endpoint exists: `DELETE /api/admin/workshops/{workshop_id}`
- Frontend delete handler exists in `AdminWorkshops.tsx`
- Soft delete pattern implemented (sets status to "DELETED")

**Reported Issue:**
- Workshop deletion is not functioning for Admin users
- Delete action may be failing silently or not completing properly

---

## Requirements

### Functional Requirements

1. **Workshop Deletion Endpoint**
   - Endpoint: `DELETE /api/admin/workshops/{workshop_id}`
   - Must require admin authentication
   - Should perform soft delete (set status to "DELETED")
   - Should return appropriate HTTP status codes
   - Should handle errors gracefully

2. **Frontend Delete Handler**
   - Delete button should be visible for admins
   - Confirmation dialog before deletion
   - Success/error toast notifications
   - Workshop list should refresh after successful deletion
   - Deleted workshops should be filtered from the list

3. **Error Handling**
   - Clear error messages for failed deletions
   - Handle network errors gracefully
   - Handle authorization errors (403)
   - Handle not found errors (404)

### Non-Functional Requirements

- Deletion should complete within 2 seconds
- Proper error logging for debugging
- Audit trail for deletion actions (if applicable)

---

## Acceptance Criteria

### Scenario 1: Successful Workshop Deletion
**Given** an admin is viewing the workshops list  
**When** they click the delete button and confirm the deletion  
**Then** the workshop should be soft-deleted (status set to "DELETED")  
**And** a success message should be displayed  
**And** the workshop should disappear from the list  
**And** the API should return 204 No Content

### Scenario 2: Deletion Confirmation
**Given** an admin clicks the delete button  
**When** the confirmation dialog appears  
**And** they click "Cancel"  
**Then** the workshop should not be deleted  
**And** the dialog should close

### Scenario 3: Error Handling - Workshop Not Found
**Given** an admin attempts to delete a workshop that doesn't exist  
**When** the delete request is sent  
**Then** the API should return 404 Not Found  
**And** an error message should be displayed to the user

### Scenario 4: Error Handling - Unauthorized Access
**Given** a non-admin user attempts to delete a workshop  
**When** they make a delete request  
**Then** the API should return 403 Forbidden  
**And** an error message should be displayed

### Scenario 5: Network Error Handling
**Given** an admin attempts to delete a workshop  
**When** a network error occurs  
**Then** an error message should be displayed  
**And** the workshop should remain in the list

---

## Technical Implementation

### Investigation Steps

1. **Check Backend Endpoint**
   - Verify `DELETE /api/admin/workshops/{workshop_id}` is properly registered
   - Check if `require_admin` dependency is working correctly
   - Verify database transaction is committing properly
   - Check for any database constraints preventing status update

2. **Check Frontend Implementation**
   - Verify API endpoint URL is correct
   - Check authentication token is being sent properly
   - Verify response handling (204 No Content)
   - Check if workshop list filtering is excluding DELETED status

3. **Check Database Schema**
   - Verify Workshop model has status field
   - Check if "DELETED" is a valid status value
   - Verify no constraints preventing status change

### Potential Issues to Investigate

1. **Status Value Mismatch**
   - Backend sets status to "DELETED" but frontend might filter by different value
   - Check if status enum includes "DELETED"

2. **Response Handling**
   - Frontend might not handle 204 No Content correctly
   - Check if response.ok is true for 204 status

3. **Database Constraints**
   - Foreign key constraints might prevent deletion
   - Check if related records need to be handled

4. **Authentication Issues**
   - Token might be expired or invalid
   - Check if admin role is properly verified

### Fix Implementation

**Backend (`server/app/api/admin.py`):**
```python
@router.delete("/workshops/{workshop_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workshop(
    workshop_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a workshop (soft delete - marks as deleted)
    Admin can delete any workshop
    """
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    # Soft delete - change status to indicate deletion
    workshop.status = "DELETED"
    await db.commit()
    await db.refresh(workshop)
    
    return None
```

**Frontend (`client/src/pages/AdminWorkshops.tsx`):**
```typescript
const handleDeleteWorkshop = async (workshopId: string) => {
    if (!confirm('Are you sure you want to delete this workshop?')) return;

    try {
        const authToken = localStorage.getItem('hm_auth_token');
        const response = await fetch(`${API_BASE}/api/admin/workshops/${workshopId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Failed to delete workshop' }));
            throw new Error(errorData.detail || 'Failed to delete workshop');
        }

        toast.success('Workshop deleted successfully');
        fetchWorkshops();
    } catch (error) {
        console.error('Error deleting workshop:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to delete workshop');
    }
};
```

**Workshop List Filtering:**
- Ensure `fetchWorkshops()` filters out workshops with status "DELETED"
- Or update the backend endpoint to exclude DELETED workshops by default

---

## Testing Requirements

### Unit Tests

1. **Backend Tests**
   - Test admin can delete workshop
   - Test non-admin cannot delete workshop
   - Test deletion of non-existent workshop returns 404
   - Test workshop status is set to "DELETED"
   - Test database transaction commits properly

2. **Frontend Tests**
   - Test delete button click triggers confirmation
   - Test cancel in confirmation dialog prevents deletion
   - Test successful deletion refreshes list
   - Test error handling displays appropriate messages

### Integration Tests

1. **End-to-End Deletion Flow**
   - Admin logs in
   - Admin navigates to workshops list
   - Admin clicks delete on a workshop
   - Admin confirms deletion
   - Workshop is deleted and removed from list

2. **Error Scenarios**
   - Network failure during deletion
   - Invalid workshop ID
   - Unauthorized access attempt

---

## Related User Stories

- **US01:** Workshop Initialization (creates workshops that need deletion capability)
- **US30:** User Roles & Access Control (defines admin role)
- **US06:** Workshop Access Control (workshop management)

---

## Dependencies

- Admin authentication middleware (`require_admin`)
- Workshop model with status field
- Admin panel UI (`AdminWorkshops.tsx`)

---

## Questions/Clarifications

1. Should deletion be permanent or soft delete? (Currently soft delete)
2. Should deleted workshops be visible in a separate "Deleted" view?
3. Should there be a restore functionality for deleted workshops?
4. Should deletion cascade to related records (use cases, participants, etc.)?
5. Should there be a confirmation before permanent deletion if implementing hard delete?

---

## Definition of Done

- [x] Root cause of deletion failure identified - Missing DELETED status in WorkshopStatus enum
- [x] Backend endpoint verified and fixed - Added DELETED to enum, improved error handling
- [x] Frontend delete handler verified and fixed - Improved error handling and user feedback
- [x] Error handling improved with clear messages - Added specific error messages for different scenarios
- [x] Workshop list properly filters deleted workshops - Updated admin, facilitator, and general workshop list endpoints
- [ ] Unit tests written and passing
- [ ] Integration tests written and passing
- [ ] Manual testing completed successfully
- [x] Code review completed
- [x] Documentation updated - User story updated with implementation details
- [ ] Bug verified as fixed in production-like environment

---

## Notes

- This is a bug fix story, so investigation is the first step
- The issue might be in backend, frontend, or both
- Consider adding better error logging to help diagnose issues
- Consider adding audit logging for deletion actions

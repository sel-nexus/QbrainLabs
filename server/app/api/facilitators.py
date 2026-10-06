"""
Facilitator Management API
Implements US30: User Roles & Access Control System

Endpoints for:
- Admin: Manage facilitators (list, approve, enable/disable, assign to workshops)
- Facilitator: View assigned workshops, access workshop features
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.models.models import User, Workshop, Participant, UseCase, UserRole, AccountStatus, WorkshopStatus
from app.models.rbac import WorkshopFacilitator, RoleAuditLog
from app.middleware.rbac import (
    require_admin,
    require_facilitator,
    require_active_account,
    log_role_action,
    get_facilitator_workshop_ids
)
from app.schemas.rbac import (
    FacilitatorResponse,
    FacilitatorListResponse,
    FacilitatorStatusUpdate,
    FacilitatorApprovalRequest,
    WorkshopAssignmentRequest,
    WorkshopAssignmentResponse,
    FacilitatorWorkshopListItem,
    AccountStatusEnum,
    RegistrationRateLimitResponse,
    RateLimitStatus,
    RateLimitResetRequest,
    FacilitatorAccessRequestCreate,
    FacilitatorAccessRequestResponse,
    FacilitatorAccessRequestListResponse,
    FacilitatorAccessApproveRequest,
    FacilitatorAccessRejectRequest,
    FacilitatorAccessSubmitResponse,
    WorkshopFacilitatorsResponse,
    WorkshopBasicInfo,
    FacilitatorAssignedWorkshopsResponse,
    UpdateFacilitatorWorkshopsRequest
)

router = APIRouter(prefix="/api", tags=["facilitators"])


# ============== Admin: Facilitator Management ==============

@router.get("/admin/facilitators", response_model=FacilitatorListResponse)
async def list_facilitators(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all facilitators with their status and workshop counts.
    Admin only endpoint.
    """
    # Base query for facilitators (non-admin users)
    query = select(User).where(
        or_(User.role == UserRole.FACILITATOR.value, User.is_admin == False)
    )
    
    # Apply status filter
    if status_filter:
        query = query.where(User.status == status_filter)
    
    # Apply search filter
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                User.email.ilike(search_term),
                User.full_name.ilike(search_term),
                User.organization.ilike(search_term)
            )
        )
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get pending count
    pending_result = await db.execute(
        select(func.count(User.id)).where(
            User.role == UserRole.FACILITATOR.value,
            User.status == AccountStatus.PENDING.value
        )
    )
    pending_count = pending_result.scalar() or 0
    
    # Get paginated results
    result = await db.execute(
        query.offset(skip).limit(limit).order_by(User.created_at.desc())
    )
    users = result.scalars().all()
    
    # Build response with workshop counts
    facilitators = []
    for user in users:
        # Count workshops owned by this facilitator
        owned_count_result = await db.execute(
            select(func.count(Workshop.id)).where(Workshop.facilitator_id == user.id)
        )
        owned_count = owned_count_result.scalar() or 0
        
        # Count workshops assigned to this facilitator
        assigned_count_result = await db.execute(
            select(func.count(WorkshopFacilitator.id)).where(
                WorkshopFacilitator.facilitator_id == user.id
            )
        )
        assigned_count = assigned_count_result.scalar() or 0
        
        facilitators.append(FacilitatorResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name or "",
            organization=user.organization,
            role=user.role,
            status=user.status,
            created_at=user.created_at,
            last_login=user.last_login,
            workshop_count=owned_count + assigned_count
        ))
    
    return FacilitatorListResponse(
        facilitators=facilitators,
        total=total,
        pending_count=pending_count
    )


@router.get("/admin/facilitators/pending", response_model=List[FacilitatorResponse])
async def list_pending_facilitators(
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List facilitators pending approval.
    Admin only endpoint.
    """
    result = await db.execute(
        select(User).where(
            User.role == UserRole.FACILITATOR.value,
            User.status == AccountStatus.PENDING.value
        ).order_by(User.created_at.asc())
    )
    users = result.scalars().all()
    
    return [
        FacilitatorResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name or "",
            organization=user.organization,
            role=user.role,
            status=user.status,
            created_at=user.created_at,
            last_login=user.last_login,
            workshop_count=0
        )
        for user in users
    ]


@router.post("/admin/facilitators/{facilitator_id}/approve", response_model=FacilitatorResponse)
async def approve_facilitator(
    facilitator_id: str,
    approval: FacilitatorApprovalRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve or reject a pending facilitator registration.
    Admin only endpoint.
    """
    result = await db.execute(select(User).where(User.id == facilitator_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Facilitator not found")
    
    if user.status != AccountStatus.PENDING.value:
        raise HTTPException(
            status_code=400,
            detail=f"Facilitator is not pending approval. Current status: {user.status}"
        )
    
    old_status = user.status
    
    if approval.approved:
        user.status = AccountStatus.ACTIVE.value
        action = "facilitator_approved"
        details = f"Facilitator {user.email} approved by {admin.email}"
    else:
        user.status = AccountStatus.DISABLED.value
        action = "facilitator_rejected"
        details = f"Facilitator {user.email} rejected by {admin.email}"
        if approval.rejection_reason:
            details += f". Reason: {approval.rejection_reason}"
    
    await db.commit()
    await db.refresh(user)
    
    # Log the action
    await log_role_action(
        db=db,
        action=action,
        user_id=str(user.id),
        performed_by=str(admin.id),
        old_value={"status": old_status},
        new_value={"status": user.status},
        request=request,
        details=details
    )
    
    return FacilitatorResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name or "",
        organization=user.organization,
        role=user.role,
        status=user.status,
        created_at=user.created_at,
        last_login=user.last_login,
        workshop_count=0
    )


@router.post("/admin/facilitators/{facilitator_id}/enable", response_model=FacilitatorResponse)
async def enable_facilitator(
    facilitator_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Enable a disabled facilitator account.
    Admin only endpoint.
    """
    result = await db.execute(select(User).where(User.id == facilitator_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Facilitator not found")
    
    if user.status == AccountStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Facilitator is already active")
    
    old_status = user.status
    user.status = AccountStatus.ACTIVE.value
    user.disabled_at = None
    user.disabled_by = None
    
    await db.commit()
    await db.refresh(user)
    
    # Log the action
    await log_role_action(
        db=db,
        action="facilitator_enabled",
        user_id=str(user.id),
        performed_by=str(admin.id),
        old_value={"status": old_status},
        new_value={"status": user.status},
        request=request,
        details=f"Facilitator {user.email} enabled by {admin.email}"
    )
    
    return FacilitatorResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name or "",
        organization=user.organization,
        role=user.role,
        status=user.status,
        created_at=user.created_at,
        last_login=user.last_login,
        workshop_count=0
    )


@router.post("/admin/facilitators/{facilitator_id}/disable", response_model=FacilitatorResponse)
async def disable_facilitator(
    facilitator_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Disable a facilitator account.
    Admin only endpoint.
    """
    result = await db.execute(select(User).where(User.id == facilitator_id))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Facilitator not found")
    
    if user.is_admin_user:
        raise HTTPException(status_code=400, detail="Cannot disable an admin account")
    
    if str(user.id) == str(admin.id):
        raise HTTPException(status_code=400, detail="Cannot disable your own account")
    
    old_status = user.status
    user.status = AccountStatus.DISABLED.value
    user.disabled_at = datetime.utcnow()
    user.disabled_by = admin.id
    
    await db.commit()
    await db.refresh(user)
    
    # Log the action
    await log_role_action(
        db=db,
        action="facilitator_disabled",
        user_id=str(user.id),
        performed_by=str(admin.id),
        old_value={"status": old_status},
        new_value={"status": user.status},
        request=request,
        details=f"Facilitator {user.email} disabled by {admin.email}"
    )
    
    return FacilitatorResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name or "",
        organization=user.organization,
        role=user.role,
        status=user.status,
        created_at=user.created_at,
        last_login=user.last_login,
        workshop_count=0
    )


# ============== Admin: Workshop Assignment ==============

@router.post("/admin/workshops/{workshop_id}/assign", response_model=WorkshopAssignmentResponse)
async def assign_facilitator_to_workshop(
    workshop_id: str,
    assignment: WorkshopAssignmentRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Assign a facilitator to a workshop.
    US32: Enforces maximum of 10 facilitators per workshop.
    Admin only endpoint.
    """
    # Verify workshop exists
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = workshop_result.scalars().first()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    # US32: Check facilitator limit (max 10 including owner)
    facilitator_count_result = await db.execute(
        select(func.count(WorkshopFacilitator.id)).where(
            WorkshopFacilitator.workshop_id == workshop_id
        )
    )
    current_count = (facilitator_count_result.scalar() or 0) + 1  # +1 for owner
    
    if current_count >= 10:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum facilitators reached (10/10). Remove a facilitator before adding a new one."
        )
    
    # Verify facilitator exists and is active
    facilitator_result = await db.execute(select(User).where(User.id == assignment.facilitator_id))
    facilitator = facilitator_result.scalars().first()
    
    if not facilitator:
        raise HTTPException(status_code=404, detail="Facilitator not found")
    
    if facilitator.status != AccountStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Facilitator account is not active")
    
    # Check if already assigned
    existing_result = await db.execute(
        select(WorkshopFacilitator).where(
            WorkshopFacilitator.workshop_id == workshop_id,
            WorkshopFacilitator.facilitator_id == assignment.facilitator_id
        )
    )
    if existing_result.scalars().first():
        raise HTTPException(status_code=400, detail="Facilitator is already assigned to this workshop")
    
    # Create assignment
    new_assignment = WorkshopFacilitator(
        workshop_id=workshop_id,
        facilitator_id=assignment.facilitator_id,
        assigned_by=admin.id,
        can_edit=assignment.can_edit,
        can_delete=assignment.can_delete
    )
    
    db.add(new_assignment)
    await db.commit()
    await db.refresh(new_assignment)
    
    # Log the action
    await log_role_action(
        db=db,
        action="workshop_assignment_created",
        user_id=str(facilitator.id),
        performed_by=str(admin.id),
        new_value={
            "workshop_id": workshop_id,
            "workshop_title": workshop.title,
            "can_edit": assignment.can_edit,
            "can_delete": assignment.can_delete
        },
        request=request,
        details=f"Facilitator {facilitator.email} assigned to workshop '{workshop.title}' by {admin.email}"
    )
    
    return WorkshopAssignmentResponse(
        id=str(new_assignment.id),
        workshop_id=str(workshop.id),
        workshop_title=workshop.title,
        workshop_pin=workshop.pin,
        facilitator_id=str(facilitator.id),
        facilitator_name=facilitator.full_name or facilitator.email,
        facilitator_email=facilitator.email,
        assigned_by=admin.full_name or admin.email,
        assigned_at=new_assignment.assigned_at,
        can_edit=new_assignment.can_edit,
        can_delete=new_assignment.can_delete
    )


@router.delete("/admin/workshops/{workshop_id}/assign/{facilitator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_facilitator_assignment(
    workshop_id: str,
    facilitator_id: str,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a facilitator's assignment from a workshop.
    Admin only endpoint.
    """
    result = await db.execute(
        select(WorkshopFacilitator).where(
            WorkshopFacilitator.workshop_id == workshop_id,
            WorkshopFacilitator.facilitator_id == facilitator_id
        )
    )
    assignment = result.scalars().first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    # Get workshop and facilitator for logging
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = workshop_result.scalars().first()
    
    facilitator_result = await db.execute(select(User).where(User.id == facilitator_id))
    facilitator = facilitator_result.scalars().first()
    
    await db.delete(assignment)
    await db.commit()
    
    # Log the action
    await log_role_action(
        db=db,
        action="workshop_assignment_removed",
        user_id=str(facilitator_id),
        performed_by=str(admin.id),
        old_value={
            "workshop_id": workshop_id,
            "workshop_title": workshop.title if workshop else None
        },
        request=request,
        details=f"Facilitator {facilitator.email if facilitator else facilitator_id} removed from workshop by {admin.email}"
    )
    
    return None


@router.get("/admin/workshops/{workshop_id}/facilitators", response_model=List[WorkshopAssignmentResponse])
async def get_workshop_facilitators(
    workshop_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all facilitators assigned to a workshop.
    Admin only endpoint.
    """
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = workshop_result.scalars().first()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    result = await db.execute(
        select(WorkshopFacilitator, User)
        .join(User, WorkshopFacilitator.facilitator_id == User.id)
        .where(WorkshopFacilitator.workshop_id == workshop_id)
    )
    assignments = result.all()
    
    # Get assigner info
    assigner_ids = [a.WorkshopFacilitator.assigned_by for a in assignments]
    assigners = {}
    if assigner_ids:
        assigner_result = await db.execute(
            select(User).where(User.id.in_(assigner_ids))
        )
        for assigner in assigner_result.scalars().all():
            assigners[str(assigner.id)] = assigner
    
    return [
        WorkshopAssignmentResponse(
            id=str(a.WorkshopFacilitator.id),
            workshop_id=str(workshop.id),
            workshop_title=workshop.title,
            workshop_pin=workshop.pin,
            facilitator_id=str(a.User.id),
            facilitator_name=a.User.full_name or a.User.email,
            facilitator_email=a.User.email,
            assigned_by=assigners.get(str(a.WorkshopFacilitator.assigned_by), {}).full_name if assigners.get(str(a.WorkshopFacilitator.assigned_by)) else "Admin",
            assigned_at=a.WorkshopFacilitator.assigned_at,
            can_edit=a.WorkshopFacilitator.can_edit,
            can_delete=a.WorkshopFacilitator.can_delete
        )
        for a in assignments
    ]


# ============== Admin: Facilitator Workshop Assignments ==============

@router.get("/admin/facilitators/{facilitator_id}/workshops", response_model=FacilitatorAssignedWorkshopsResponse)
async def get_facilitator_assigned_workshops(
    facilitator_id: str,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all workshops assigned to a specific facilitator.
    Admin only endpoint.
    """
    # Get the facilitator
    facilitator_result = await db.execute(select(User).where(User.id == facilitator_id))
    facilitator = facilitator_result.scalars().first()
    
    if not facilitator:
        raise HTTPException(status_code=404, detail="Facilitator not found")
    
    # Get assigned workshops
    assigned_result = await db.execute(
        select(WorkshopFacilitator, Workshop)
        .join(Workshop, WorkshopFacilitator.workshop_id == Workshop.id)
        .where(WorkshopFacilitator.facilitator_id == facilitator_id)
    )
    assignments = assigned_result.all()
    
    assigned_workshops = [
        WorkshopBasicInfo(
            id=str(workshop.id),
            title=workshop.title,
            pin=workshop.pin,
            status=workshop.status
        )
        for assignment, workshop in assignments
    ]
    
    return FacilitatorAssignedWorkshopsResponse(
        facilitator_id=str(facilitator.id),
        facilitator_name=facilitator.full_name or "",
        facilitator_email=facilitator.email,
        assigned_workshops=assigned_workshops
    )


@router.put("/admin/facilitators/{facilitator_id}/workshops", response_model=FacilitatorAssignedWorkshopsResponse)
async def update_facilitator_workshops(
    facilitator_id: str,
    update_request: UpdateFacilitatorWorkshopsRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update workshop assignments for a facilitator (batch update).
    This replaces all current assignments with the new list.
    Admin only endpoint.
    """
    # Get the facilitator
    facilitator_result = await db.execute(select(User).where(User.id == facilitator_id))
    facilitator = facilitator_result.scalars().first()
    
    if not facilitator:
        raise HTTPException(status_code=404, detail="Facilitator not found")
    
    # Verify all workshop IDs exist
    for workshop_id in update_request.workshop_ids:
        workshop_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
        if not workshop_result.scalars().first():
            raise HTTPException(status_code=404, detail=f"Workshop {workshop_id} not found")
    
    # Get current assignments
    current_result = await db.execute(
        select(WorkshopFacilitator).where(WorkshopFacilitator.facilitator_id == facilitator_id)
    )
    current_assignments = current_result.scalars().all()
    current_workshop_ids = {str(a.workshop_id) for a in current_assignments}
    
    # Calculate workshops to add and remove
    new_workshop_ids = set(update_request.workshop_ids)
    to_add = new_workshop_ids - current_workshop_ids
    to_remove = current_workshop_ids - new_workshop_ids
    
    # Remove old assignments
    for assignment in current_assignments:
        if str(assignment.workshop_id) in to_remove:
            await db.delete(assignment)
    
    # Add new assignments
    for workshop_id in to_add:
        # Check facilitator limit for each workshop
        fac_count_result = await db.execute(
            select(func.count(WorkshopFacilitator.id)).where(
                WorkshopFacilitator.workshop_id == workshop_id
            )
        )
        current_count = (fac_count_result.scalar() or 0) + 1  # +1 for owner
        
        if current_count >= 10:
            raise HTTPException(
                status_code=400,
                detail=f"Workshop has reached maximum facilitator capacity (10)"
            )
        
        new_assignment = WorkshopFacilitator(
            workshop_id=workshop_id,
            facilitator_id=facilitator_id,
            assigned_by=admin.id,
            can_edit=True,
            can_delete=False
        )
        db.add(new_assignment)
    
    await db.commit()
    
    # Log the action
    await log_role_action(
        db=db,
        action="facilitator_workshops_updated",
        user_id=str(facilitator.id),
        performed_by=str(admin.id),
        old_value={"workshop_ids": list(current_workshop_ids)},
        new_value={"workshop_ids": list(new_workshop_ids)},
        request=request,
        details=f"Workshop assignments updated for {facilitator.email}: added {len(to_add)}, removed {len(to_remove)}"
    )
    
    # Get updated assignments
    updated_result = await db.execute(
        select(WorkshopFacilitator, Workshop)
        .join(Workshop, WorkshopFacilitator.workshop_id == Workshop.id)
        .where(WorkshopFacilitator.facilitator_id == facilitator_id)
    )
    updated_assignments = updated_result.all()
    
    assigned_workshops = [
        WorkshopBasicInfo(
            id=str(workshop.id),
            title=workshop.title,
            pin=workshop.pin,
            status=workshop.status
        )
        for assignment, workshop in updated_assignments
    ]
    
    return FacilitatorAssignedWorkshopsResponse(
        facilitator_id=str(facilitator.id),
        facilitator_name=facilitator.full_name or "",
        facilitator_email=facilitator.email,
        assigned_workshops=assigned_workshops
    )


# ============== Facilitator: Workshop Access ==============

def _completed_at(workshop):
    """When the workshop was marked completed (stored in config by /complete)."""
    raw = (workshop.config or {}).get("completed_at")
    try:
        return datetime.fromisoformat(raw) if raw else None
    except (TypeError, ValueError):
        return None


@router.get("/facilitator/workshops", response_model=List[FacilitatorWorkshopListItem])
async def get_facilitator_workshops(
    current_user: User = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all workshops the current facilitator can access.
    Includes owned workshops and assigned workshops.
    Pending facilitators see no workshops (defense-in-depth).
    """
    # US32: Pending facilitators should not see any workshops
    if current_user.status == AccountStatus.PENDING.value and not current_user.is_admin_user:
        return []
    
    workshops = []
    
    # Get owned workshops (excluding deleted)
    owned_result = await db.execute(
        select(Workshop).where(
            Workshop.facilitator_id == current_user.id,
            Workshop.status != WorkshopStatus.DELETED
        )
    )
    owned_workshops = owned_result.scalars().all()
    
    for workshop in owned_workshops:
        # Get counts
        participant_count = await db.execute(
            select(func.count(Participant.id)).where(Participant.workshop_id == workshop.id)
        )
        use_case_count = await db.execute(
            select(func.count(UseCase.id)).where(UseCase.workshop_id == workshop.id)
        )
        
        workshops.append(FacilitatorWorkshopListItem(
            id=str(workshop.id),
            title=workshop.title,
            pin=workshop.pin,
            status=workshop.status,
            current_phase=workshop.current_phase,
            participant_count=participant_count.scalar() or 0,
            use_case_count=use_case_count.scalar() or 0,
            created_at=workshop.created_at,
            completed_at=_completed_at(workshop),
            can_edit=True,  # Owners can always edit
            can_delete=True  # Owners can always delete
        ))
    
    # Get assigned workshops (if not admin)
    if not current_user.is_admin_user:
        assigned_result = await db.execute(
            select(WorkshopFacilitator, Workshop)
            .join(Workshop, WorkshopFacilitator.workshop_id == Workshop.id)
            .where(
                WorkshopFacilitator.facilitator_id == current_user.id,
                Workshop.status != WorkshopStatus.DELETED
            )
        )
        assigned = assigned_result.all()
        
        for assignment, workshop in assigned:
            # Skip if already in owned list
            if any(w.id == str(workshop.id) for w in workshops):
                continue
            
            # Get counts
            participant_count = await db.execute(
                select(func.count(Participant.id)).where(Participant.workshop_id == workshop.id)
            )
            use_case_count = await db.execute(
                select(func.count(UseCase.id)).where(UseCase.workshop_id == workshop.id)
            )
            
            workshops.append(FacilitatorWorkshopListItem(
                id=str(workshop.id),
                title=workshop.title,
                pin=workshop.pin,
                status=workshop.status,
                current_phase=workshop.current_phase,
                participant_count=participant_count.scalar() or 0,
                use_case_count=use_case_count.scalar() or 0,
                created_at=workshop.created_at,
                completed_at=_completed_at(workshop),
                can_edit=assignment.can_edit,
                can_delete=assignment.can_delete
            ))
    else:
        # Admins can see all workshops (excluding deleted)
        all_result = await db.execute(
            select(Workshop).where(
                Workshop.facilitator_id != current_user.id,
                Workshop.status != WorkshopStatus.DELETED
            )
        )
        all_workshops = all_result.scalars().all()
        
        for workshop in all_workshops:
            participant_count = await db.execute(
                select(func.count(Participant.id)).where(Participant.workshop_id == workshop.id)
            )
            use_case_count = await db.execute(
                select(func.count(UseCase.id)).where(UseCase.workshop_id == workshop.id)
            )
            
            workshops.append(FacilitatorWorkshopListItem(
                id=str(workshop.id),
                title=workshop.title,
                pin=workshop.pin,
                status=workshop.status,
                current_phase=workshop.current_phase,
                participant_count=participant_count.scalar() or 0,
                use_case_count=use_case_count.scalar() or 0,
                created_at=workshop.created_at,
                completed_at=_completed_at(workshop),
                can_edit=True,
                can_delete=True
            ))
    
    # Sort by created_at descending
    workshops.sort(key=lambda w: w.created_at, reverse=True)
    
    return workshops


@router.get("/facilitator/workshops/{workshop_id}", response_model=FacilitatorWorkshopListItem)
async def get_facilitator_workshop_detail(
    workshop_id: str,
    current_user: User = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """
    Get details of a specific workshop the facilitator can access.
    """
    # Get workshop
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = workshop_result.scalars().first()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    # Check access
    can_edit = False
    can_delete = False
    
    if current_user.is_admin_user:
        can_edit = True
        can_delete = True
    elif str(workshop.facilitator_id) == str(current_user.id):
        can_edit = True
        can_delete = True
    else:
        # Check assignment
        assignment_result = await db.execute(
            select(WorkshopFacilitator).where(
                WorkshopFacilitator.workshop_id == workshop_id,
                WorkshopFacilitator.facilitator_id == current_user.id
            )
        )
        assignment = assignment_result.scalars().first()
        
        if not assignment:
            raise HTTPException(
                status_code=403,
                detail="You are not assigned to this workshop"
            )
        
        can_edit = assignment.can_edit
        can_delete = assignment.can_delete
    
    # Get counts
    participant_count = await db.execute(
        select(func.count(Participant.id)).where(Participant.workshop_id == workshop.id)
    )
    use_case_count = await db.execute(
        select(func.count(UseCase.id)).where(UseCase.workshop_id == workshop.id)
    )
    
    return FacilitatorWorkshopListItem(
        id=str(workshop.id),
        title=workshop.title,
        pin=workshop.pin,
        status=workshop.status,
        current_phase=workshop.current_phase,
        participant_count=participant_count.scalar() or 0,
        use_case_count=use_case_count.scalar() or 0,
        created_at=workshop.created_at,
        completed_at=_completed_at(workshop),
        can_edit=can_edit,
        can_delete=can_delete
    )


# ============== US32: Admin Rate Limiting ==============

MAX_FACILITATORS_PER_WORKSHOP = 10

@router.get("/admin/registration-limits", response_model=RegistrationRateLimitResponse)
async def get_registration_limits(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current registration rate limit status.
    US32: Shows daily/weekly/monthly registration counts and limits.
    Admin only endpoint.
    """
    from app.services.rate_limiting import get_rate_limit_status
    
    status_data = await get_rate_limit_status(db)
    
    return RegistrationRateLimitResponse(
        daily=RateLimitStatus(
            count=status_data["daily"]["count"],
            limit=status_data["daily"]["limit"],
            reset_at=status_data["daily"]["reset_at"]
        ),
        weekly=RateLimitStatus(
            count=status_data["weekly"]["count"],
            limit=status_data["weekly"]["limit"],
            reset_at=status_data["weekly"]["reset_at"]
        ),
        monthly=RateLimitStatus(
            count=status_data["monthly"]["count"],
            limit=status_data["monthly"]["limit"],
            reset_at=status_data["monthly"]["reset_at"]
        )
    )


@router.post("/admin/registration-limits/reset")
async def reset_registration_limits(
    reset_request: RateLimitResetRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Reset rate limits (emergency use).
    US32: Allows admin to reset registration rate limits.
    Admin only endpoint.
    """
    from app.services.rate_limiting import reset_rate_limits
    
    await reset_rate_limits(db, reset_request.period)
    
    # Log the action
    await log_role_action(
        db=db,
        action="rate_limits_reset",
        performed_by=str(admin.id),
        new_value={"period": reset_request.period},
        request=request,
        details=f"Rate limits reset by {admin.email} for period: {reset_request.period}"
    )
    
    return {"success": True, "message": f"Rate limits reset successfully for period: {reset_request.period}"}


# ============== US32: Facilitator Access Requests ==============

from app.models.rbac import FacilitatorAccessRequest, FacilitatorAccessRequestStatus

def generate_request_id() -> str:
    """Generate a unique request ID in format FAR-YYYY-MMDD-NNN"""
    from datetime import datetime
    import random
    now = datetime.utcnow()
    date_part = now.strftime("%Y-%m%d")
    random_part = str(random.randint(1, 999)).zfill(3)
    return f"FAR-{date_part}-{random_part}"


@router.post("/workshops/{pin}/facilitator-request", response_model=FacilitatorAccessSubmitResponse)
async def submit_facilitator_request(
    pin: str,
    request_data: FacilitatorAccessRequestCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit a facilitator access request via PIN entry.
    US32: Join as Facilitator via PIN feature.
    Public endpoint (no auth required).
    """
    # Validate workshop exists and is active
    workshop_result = await db.execute(
        select(Workshop).where(Workshop.pin == pin.upper())
    )
    workshop = workshop_result.scalars().first()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    if workshop.status not in ["OPEN", "IN_PROGRESS"]:
        raise HTTPException(status_code=400, detail="Workshop is not accepting participants")
    
    # Check if workshop has reached facilitator limit
    facilitator_count_result = await db.execute(
        select(func.count(WorkshopFacilitator.id)).where(
            WorkshopFacilitator.workshop_id == workshop.id
        )
    )
    facilitator_count = facilitator_count_result.scalar() or 0
    # Add 1 for the workshop owner
    total_facilitators = facilitator_count + 1
    
    if total_facilitators >= MAX_FACILITATORS_PER_WORKSHOP:
        raise HTTPException(
            status_code=400,
            detail=f"Workshop has reached maximum facilitator capacity ({MAX_FACILITATORS_PER_WORKSHOP})"
        )
    
    # Generate unique request ID
    request_id = generate_request_id()
    
    # Create facilitator access request
    access_request = FacilitatorAccessRequest(
        request_id=request_id,
        workshop_id=workshop.id,
        requester_name=request_data.name,
        requester_email=request_data.email,
        requester_session_id=request_data.session_id,
        status=FacilitatorAccessRequestStatus.PENDING.value
    )
    
    db.add(access_request)
    await db.commit()
    await db.refresh(access_request)
    
    # Log the request
    await log_role_action(
        db=db,
        action="facilitator_access_requested",
        new_value={
            "request_id": request_id,
            "workshop_id": str(workshop.id),
            "requester_name": request_data.name,
            "requester_email": request_data.email
        },
        request=request,
        details=f"Facilitator access request for workshop '{workshop.title}' by {request_data.name}"
    )
    
    return FacilitatorAccessSubmitResponse(
        request_id=request_id,
        status="pending",
        message="Your request has been submitted for admin review"
    )


@router.get("/admin/facilitator-requests", response_model=FacilitatorAccessRequestListResponse)
async def list_facilitator_requests(
    status_filter: Optional[str] = None,
    workshop_id: Optional[str] = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List facilitator access requests.
    US32: Admin approval queue for facilitator access requests.
    Admin only endpoint.
    """
    query = select(FacilitatorAccessRequest, Workshop).join(
        Workshop, FacilitatorAccessRequest.workshop_id == Workshop.id
    )
    
    if status_filter:
        query = query.where(FacilitatorAccessRequest.status == status_filter)
    
    if workshop_id:
        query = query.where(FacilitatorAccessRequest.workshop_id == workshop_id)
    
    query = query.order_by(FacilitatorAccessRequest.created_at.desc())
    
    result = await db.execute(query)
    requests_data = result.all()
    
    # Get pending count
    pending_result = await db.execute(
        select(func.count(FacilitatorAccessRequest.id)).where(
            FacilitatorAccessRequest.status == FacilitatorAccessRequestStatus.PENDING.value
        )
    )
    pending_count = pending_result.scalar() or 0
    
    # Build response
    requests_list = []
    for access_request, workshop in requests_data:
        # Get facilitator count for this workshop
        fac_count_result = await db.execute(
            select(func.count(WorkshopFacilitator.id)).where(
                WorkshopFacilitator.workshop_id == workshop.id
            )
        )
        fac_count = (fac_count_result.scalar() or 0) + 1  # +1 for owner
        
        # Get reviewer name if reviewed
        reviewer_name = None
        if access_request.reviewed_by:
            reviewer_result = await db.execute(
                select(User).where(User.id == access_request.reviewed_by)
            )
            reviewer = reviewer_result.scalars().first()
            if reviewer:
                reviewer_name = reviewer.full_name or reviewer.email
        
        requests_list.append(FacilitatorAccessRequestResponse(
            id=str(access_request.id),
            request_id=access_request.request_id,
            workshop_id=str(workshop.id),
            workshop_title=workshop.title,
            workshop_pin=workshop.pin,
            requester_name=access_request.requester_name,
            requester_email=access_request.requester_email,
            status=access_request.status,
            created_at=access_request.created_at,
            reviewed_at=access_request.reviewed_at,
            reviewed_by_name=reviewer_name,
            rejection_reason=access_request.rejection_reason,
            current_facilitator_count=fac_count,
            max_facilitators=MAX_FACILITATORS_PER_WORKSHOP
        ))
    
    return FacilitatorAccessRequestListResponse(
        requests=requests_list,
        total=len(requests_list),
        pending_count=pending_count
    )


@router.post("/admin/facilitator-requests/{request_id}/approve")
async def approve_facilitator_request(
    request_id: str,
    approval: FacilitatorAccessApproveRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Approve a facilitator access request.
    US32: Admin approves PIN facilitator request.
    Admin only endpoint.
    """
    # Find the request
    result = await db.execute(
        select(FacilitatorAccessRequest).where(
            FacilitatorAccessRequest.request_id == request_id
        )
    )
    access_request = result.scalars().first()
    
    if not access_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if access_request.status != FacilitatorAccessRequestStatus.PENDING.value:
        raise HTTPException(status_code=400, detail=f"Request is not pending. Status: {access_request.status}")
    
    # Get workshop
    workshop_result = await db.execute(
        select(Workshop).where(Workshop.id == access_request.workshop_id)
    )
    workshop = workshop_result.scalars().first()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    # Check facilitator limit
    fac_count_result = await db.execute(
        select(func.count(WorkshopFacilitator.id)).where(
            WorkshopFacilitator.workshop_id == workshop.id
        )
    )
    fac_count = (fac_count_result.scalar() or 0) + 1  # +1 for owner
    
    if fac_count >= MAX_FACILITATORS_PER_WORKSHOP:
        raise HTTPException(
            status_code=400,
            detail=f"Workshop at maximum facilitator capacity ({MAX_FACILITATORS_PER_WORKSHOP}). Remove a facilitator first or reject the request."
        )
    
    # If requester has email, check for existing user account or create one
    facilitator_id = None
    if access_request.requester_email:
        user_result = await db.execute(
            select(User).where(User.email == access_request.requester_email)
        )
        existing_user = user_result.scalars().first()
        
        if existing_user:
            facilitator_id = existing_user.id
            # Ensure user is active or pending
            if existing_user.status == AccountStatus.DISABLED.value:
                raise HTTPException(status_code=400, detail="User account is disabled")
        else:
            # Create a new facilitator account (pending status for full access, but active for this workshop)
            from app.api.auth import hash_password
            import secrets
            temp_password = secrets.token_urlsafe(16)
            new_user = User(
                email=access_request.requester_email,
                password_hash=hash_password(temp_password),
                full_name=access_request.requester_name,
                role=UserRole.FACILITATOR.value,
                status=AccountStatus.PENDING.value,
                is_admin=False
            )
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            facilitator_id = new_user.id
    
    # If we have a facilitator_id, create the assignment
    if facilitator_id:
        # Check if already assigned
        existing_assignment = await db.execute(
            select(WorkshopFacilitator).where(
                WorkshopFacilitator.workshop_id == workshop.id,
                WorkshopFacilitator.facilitator_id == facilitator_id
            )
        )
        if not existing_assignment.scalars().first():
            new_assignment = WorkshopFacilitator(
                workshop_id=workshop.id,
                facilitator_id=facilitator_id,
                assigned_by=admin.id,
                can_edit=True,
                can_delete=False
            )
            db.add(new_assignment)
    
    # Update request status
    access_request.status = FacilitatorAccessRequestStatus.APPROVED.value
    access_request.reviewed_at = datetime.utcnow()
    access_request.reviewed_by = admin.id
    access_request.notes = approval.notes
    
    await db.commit()
    
    # Log the action
    await log_role_action(
        db=db,
        action="facilitator_access_approved",
        performed_by=str(admin.id),
        new_value={
            "request_id": request_id,
            "workshop_id": str(workshop.id),
            "facilitator_id": str(facilitator_id) if facilitator_id else None
        },
        request=request,
        details=f"Facilitator access approved for {access_request.requester_name} on workshop '{workshop.title}'"
    )
    
    return {
        "success": True,
        "message": "Facilitator access approved",
        "facilitator_id": str(facilitator_id) if facilitator_id else None,
        "workshop_id": str(workshop.id)
    }


@router.post("/admin/facilitator-requests/{request_id}/reject")
async def reject_facilitator_request(
    request_id: str,
    rejection: FacilitatorAccessRejectRequest,
    request: Request,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Reject a facilitator access request.
    US32: Admin rejects PIN facilitator request.
    Admin only endpoint.
    """
    # Find the request
    result = await db.execute(
        select(FacilitatorAccessRequest).where(
            FacilitatorAccessRequest.request_id == request_id
        )
    )
    access_request = result.scalars().first()
    
    if not access_request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    if access_request.status != FacilitatorAccessRequestStatus.PENDING.value:
        raise HTTPException(status_code=400, detail=f"Request is not pending. Status: {access_request.status}")
    
    # Update request status
    access_request.status = FacilitatorAccessRequestStatus.REJECTED.value
    access_request.reviewed_at = datetime.utcnow()
    access_request.reviewed_by = admin.id
    access_request.rejection_reason = rejection.reason
    
    await db.commit()
    
    # Log the action
    await log_role_action(
        db=db,
        action="facilitator_access_rejected",
        performed_by=str(admin.id),
        new_value={
            "request_id": request_id,
            "rejection_reason": rejection.reason
        },
        request=request,
        details=f"Facilitator access rejected for {access_request.requester_name}"
    )
    
    return {"success": True, "message": "Facilitator access request rejected"}

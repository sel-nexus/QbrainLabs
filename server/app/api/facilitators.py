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
from app.models.models import User, Workshop, Participant, UseCase, UserRole, AccountStatus
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
    AccountStatusEnum
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
    Admin only endpoint.
    """
    # Verify workshop exists
    workshop_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = workshop_result.scalars().first()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
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


# ============== Facilitator: Workshop Access ==============

@router.get("/facilitator/workshops", response_model=List[FacilitatorWorkshopListItem])
async def get_facilitator_workshops(
    current_user: User = Depends(require_facilitator),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all workshops the current facilitator can access.
    Includes owned workshops and assigned workshops.
    """
    workshops = []
    
    # Get owned workshops
    owned_result = await db.execute(
        select(Workshop).where(Workshop.facilitator_id == current_user.id)
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
            can_edit=True,  # Owners can always edit
            can_delete=True  # Owners can always delete
        ))
    
    # Get assigned workshops (if not admin)
    if not current_user.is_admin_user:
        assigned_result = await db.execute(
            select(WorkshopFacilitator, Workshop)
            .join(Workshop, WorkshopFacilitator.workshop_id == Workshop.id)
            .where(WorkshopFacilitator.facilitator_id == current_user.id)
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
                can_edit=assignment.can_edit,
                can_delete=assignment.can_delete
            ))
    else:
        # Admins can see all workshops
        all_result = await db.execute(
            select(Workshop).where(Workshop.facilitator_id != current_user.id)
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
        can_edit=can_edit,
        can_delete=can_delete
    )

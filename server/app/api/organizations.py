"""
Organization Management API Endpoints
Multi-tenancy support with organization-level management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime, timedelta
import uuid
import secrets
import re

from app.core.database import get_db
from app.models.models import User, Workshop, UseCase, Vote, Participant
from app.models.organization import (
    Organization, OrganizationMember, OrganizationInvitation,
    OrganizationWorkshop, OrganizationUsageLog, OrganizationRole, OrganizationTier
)
from app.schemas.organization import (
    OrganizationCreate, OrganizationUpdate, OrganizationResponse,
    OrganizationDetailResponse, OrganizationListResponse, OrganizationLimits,
    MemberCreate, MemberUpdate, MemberResponse, MemberListResponse, MemberPermissions,
    InvitationCreate, InvitationResponse, InvitationListResponse, InvitationAccept,
    OrganizationWorkshopCreate, OrganizationWorkshopResponse, OrganizationWorkshopListResponse,
    OrganizationUsageResponse, OrganizationAnalytics, UserOrganizationsResponse
)
from app.api.auth import get_current_user
from app.middleware.error_handler import NotFoundException, ValidationException, ConflictException

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from organization name"""
    slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    return slug[:100]


async def verify_org_access(
    org_id: str,
    user: User,
    db: AsyncSession,
    required_role: str = None
) -> tuple[Organization, OrganizationMember]:
    """Verify user has access to the organization"""
    result = await db.execute(
        select(Organization).where(Organization.id == org_id)
    )
    org = result.scalar_one_or_none()
    
    if not org:
        raise NotFoundException("Organization", org_id)
    
    # Check membership
    member_result = await db.execute(
        select(OrganizationMember).where(
            and_(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.user_id == user.id,
                OrganizationMember.is_active == True
            )
        )
    )
    member = member_result.scalar_one_or_none()
    
    if not member and not user.is_admin:
        raise HTTPException(status_code=403, detail="Not a member of this organization")
    
    # Check role hierarchy
    if required_role:
        role_hierarchy = {
            OrganizationRole.VIEWER: 0,
            OrganizationRole.MEMBER: 1,
            OrganizationRole.ADMIN: 2,
            OrganizationRole.OWNER: 3
        }
        if member and role_hierarchy.get(member.role, 0) < role_hierarchy.get(required_role, 0):
            raise HTTPException(status_code=403, detail=f"Requires {required_role} role or higher")
    
    return org, member


# ==================== Organization CRUD ====================

@router.post("", response_model=OrganizationResponse)
async def create_organization(
    data: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new organization"""
    # Generate slug
    slug = data.slug or generate_slug(data.name)
    
    # Check slug uniqueness
    result = await db.execute(
        select(Organization).where(Organization.slug == slug)
    )
    if result.scalar_one_or_none():
        raise ConflictException("Organization slug already exists")
    
    # Create organization
    org = Organization(
        id=uuid.uuid4(),
        name=data.name,
        slug=slug,
        description=data.description,
        industry=data.industry,
        contact_email=data.contact_email,
        website=data.website,
        tier=OrganizationTier.FREE,
        is_active=True
    )
    db.add(org)
    await db.flush()
    
    # Add creator as owner
    member = OrganizationMember(
        id=uuid.uuid4(),
        organization_id=org.id,
        user_id=current_user.id,
        role=OrganizationRole.OWNER,
        can_create_workshops=True,
        can_manage_templates=True,
        can_invite_members=True,
        can_view_analytics=True,
        can_export_data=True,
        is_active=True
    )
    db.add(member)
    
    await db.commit()
    await db.refresh(org)
    
    return OrganizationResponse(
        id=str(org.id),
        name=org.name,
        slug=org.slug,
        description=org.description,
        logo_url=org.logo_url,
        primary_color=org.primary_color,
        secondary_color=org.secondary_color,
        contact_email=org.contact_email,
        website=org.website,
        industry=org.industry,
        tier=org.tier,
        is_active=org.is_active,
        is_verified=org.is_verified,
        created_at=org.created_at,
        member_count=1,
        workshop_count=0
    )


@router.get("", response_model=OrganizationListResponse)
async def list_user_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List organizations the user belongs to"""
    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.organization))
        .where(
            and_(
                OrganizationMember.user_id == current_user.id,
                OrganizationMember.is_active == True
            )
        )
    )
    memberships = result.scalars().all()
    
    orgs = []
    for m in memberships:
        org = m.organization
        if org and org.is_active:
            # Count members
            member_count_result = await db.execute(
                select(func.count(OrganizationMember.id)).where(
                    and_(
                        OrganizationMember.organization_id == org.id,
                        OrganizationMember.is_active == True
                    )
                )
            )
            member_count = member_count_result.scalar() or 0
            
            # Count workshops
            workshop_count_result = await db.execute(
                select(func.count(OrganizationWorkshop.id)).where(
                    OrganizationWorkshop.organization_id == org.id
                )
            )
            workshop_count = workshop_count_result.scalar() or 0
            
            orgs.append(OrganizationResponse(
                id=str(org.id),
                name=org.name,
                slug=org.slug,
                description=org.description,
                logo_url=org.logo_url,
                primary_color=org.primary_color,
                secondary_color=org.secondary_color,
                contact_email=org.contact_email,
                website=org.website,
                industry=org.industry,
                tier=org.tier,
                is_active=org.is_active,
                is_verified=org.is_verified,
                created_at=org.created_at,
                member_count=member_count,
                workshop_count=workshop_count
            ))
    
    return OrganizationListResponse(organizations=orgs, total=len(orgs))


@router.get("/{org_id}", response_model=OrganizationDetailResponse)
async def get_organization(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get organization details"""
    org, member = await verify_org_access(org_id, current_user, db)
    
    # Count members
    member_count_result = await db.execute(
        select(func.count(OrganizationMember.id)).where(
            and_(
                OrganizationMember.organization_id == org.id,
                OrganizationMember.is_active == True
            )
        )
    )
    member_count = member_count_result.scalar() or 0
    
    # Count workshops
    workshop_count_result = await db.execute(
        select(func.count(OrganizationWorkshop.id)).where(
            OrganizationWorkshop.organization_id == org.id
        )
    )
    workshop_count = workshop_count_result.scalar() or 0
    
    # Get workshops this month
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    workshops_this_month_result = await db.execute(
        select(func.count(OrganizationWorkshop.id)).where(
            and_(
                OrganizationWorkshop.organization_id == org.id,
                OrganizationWorkshop.created_at >= start_of_month
            )
        )
    )
    workshops_this_month = workshops_this_month_result.scalar() or 0
    
    limits = OrganizationLimits(
        max_users=org.max_users,
        max_workshops_per_month=org.max_workshops_per_month,
        max_participants_per_workshop=org.max_participants_per_workshop,
        current_users=member_count,
        workshops_this_month=workshops_this_month
    )
    
    return OrganizationDetailResponse(
        id=str(org.id),
        name=org.name,
        slug=org.slug,
        description=org.description,
        logo_url=org.logo_url,
        primary_color=org.primary_color,
        secondary_color=org.secondary_color,
        contact_email=org.contact_email,
        website=org.website,
        industry=org.industry,
        tier=org.tier,
        is_active=org.is_active,
        is_verified=org.is_verified,
        created_at=org.created_at,
        member_count=member_count,
        workshop_count=workshop_count,
        limits=limits,
        features_enabled=org.features_enabled or [],
        settings=org.settings or {}
    )


@router.put("/{org_id}", response_model=OrganizationResponse)
async def update_organization(
    org_id: str,
    data: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update organization details"""
    org, member = await verify_org_access(org_id, current_user, db, required_role=OrganizationRole.ADMIN)
    
    # Update fields
    if data.name is not None:
        org.name = data.name
    if data.description is not None:
        org.description = data.description
    if data.logo_url is not None:
        org.logo_url = data.logo_url
    if data.primary_color is not None:
        org.primary_color = data.primary_color
    if data.secondary_color is not None:
        org.secondary_color = data.secondary_color
    if data.contact_email is not None:
        org.contact_email = data.contact_email
    if data.website is not None:
        org.website = data.website
    if data.industry is not None:
        org.industry = data.industry
    if data.settings is not None:
        org.settings = data.settings
    
    org.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(org)
    
    # Count for response
    member_count_result = await db.execute(
        select(func.count(OrganizationMember.id)).where(
            and_(
                OrganizationMember.organization_id == org.id,
                OrganizationMember.is_active == True
            )
        )
    )
    member_count = member_count_result.scalar() or 0
    
    workshop_count_result = await db.execute(
        select(func.count(OrganizationWorkshop.id)).where(
            OrganizationWorkshop.organization_id == org.id
        )
    )
    workshop_count = workshop_count_result.scalar() or 0
    
    return OrganizationResponse(
        id=str(org.id),
        name=org.name,
        slug=org.slug,
        description=org.description,
        logo_url=org.logo_url,
        primary_color=org.primary_color,
        secondary_color=org.secondary_color,
        contact_email=org.contact_email,
        website=org.website,
        industry=org.industry,
        tier=org.tier,
        is_active=org.is_active,
        is_verified=org.is_verified,
        created_at=org.created_at,
        member_count=member_count,
        workshop_count=workshop_count
    )


@router.delete("/{org_id}")
async def delete_organization(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an organization (owner only)"""
    org, member = await verify_org_access(org_id, current_user, db, required_role=OrganizationRole.OWNER)
    
    # Soft delete
    org.is_active = False
    org.updated_at = datetime.utcnow()
    await db.commit()
    
    return {"success": True, "message": "Organization deleted"}


# ==================== Member Management ====================

@router.get("/{org_id}/members", response_model=MemberListResponse)
async def list_members(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List organization members"""
    org, _ = await verify_org_access(org_id, current_user, db)
    
    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(
            and_(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.is_active == True
            )
        )
        .order_by(OrganizationMember.joined_at)
    )
    members = result.scalars().all()
    
    member_responses = []
    for m in members:
        if m.user:
            member_responses.append(MemberResponse(
                id=str(m.id),
                user_id=str(m.user_id),
                user_email=m.user.email,
                user_name=m.user.full_name or m.user.email,
                role=m.role,
                title=m.title,
                department=m.department,
                permissions=MemberPermissions(
                    can_create_workshops=m.can_create_workshops,
                    can_manage_templates=m.can_manage_templates,
                    can_invite_members=m.can_invite_members,
                    can_view_analytics=m.can_view_analytics,
                    can_export_data=m.can_export_data
                ),
                is_active=m.is_active,
                joined_at=m.joined_at,
                last_active_at=m.last_active_at
            ))
    
    return MemberListResponse(members=member_responses, total=len(member_responses))


@router.put("/{org_id}/members/{member_id}", response_model=MemberResponse)
async def update_member(
    org_id: str,
    member_id: str,
    data: MemberUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a member's role and permissions"""
    org, current_member = await verify_org_access(org_id, current_user, db, required_role=OrganizationRole.ADMIN)
    
    result = await db.execute(
        select(OrganizationMember)
        .options(selectinload(OrganizationMember.user))
        .where(OrganizationMember.id == member_id)
    )
    member = result.scalar_one_or_none()
    
    if not member:
        raise NotFoundException("Member", member_id)
    
    # Cannot demote owner
    if member.role == OrganizationRole.OWNER and data.role and data.role != OrganizationRole.OWNER:
        raise ValidationException("Cannot change owner role")
    
    # Update fields
    if data.role is not None:
        member.role = data.role
    if data.title is not None:
        member.title = data.title
    if data.department is not None:
        member.department = data.department
    if data.is_active is not None:
        member.is_active = data.is_active
    if data.permissions:
        member.can_create_workshops = data.permissions.can_create_workshops
        member.can_manage_templates = data.permissions.can_manage_templates
        member.can_invite_members = data.permissions.can_invite_members
        member.can_view_analytics = data.permissions.can_view_analytics
        member.can_export_data = data.permissions.can_export_data
    
    await db.commit()
    await db.refresh(member)
    
    return MemberResponse(
        id=str(member.id),
        user_id=str(member.user_id),
        user_email=member.user.email,
        user_name=member.user.full_name or member.user.email,
        role=member.role,
        title=member.title,
        department=member.department,
        permissions=MemberPermissions(
            can_create_workshops=member.can_create_workshops,
            can_manage_templates=member.can_manage_templates,
            can_invite_members=member.can_invite_members,
            can_view_analytics=member.can_view_analytics,
            can_export_data=member.can_export_data
        ),
        is_active=member.is_active,
        joined_at=member.joined_at,
        last_active_at=member.last_active_at
    )


@router.delete("/{org_id}/members/{member_id}")
async def remove_member(
    org_id: str,
    member_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a member from the organization"""
    org, current_member = await verify_org_access(org_id, current_user, db, required_role=OrganizationRole.ADMIN)
    
    result = await db.execute(
        select(OrganizationMember).where(OrganizationMember.id == member_id)
    )
    member = result.scalar_one_or_none()
    
    if not member:
        raise NotFoundException("Member", member_id)
    
    if member.role == OrganizationRole.OWNER:
        raise ValidationException("Cannot remove organization owner")
    
    member.is_active = False
    await db.commit()
    
    return {"success": True, "message": "Member removed"}


# ==================== Invitations ====================

@router.post("/{org_id}/invitations", response_model=InvitationResponse)
async def create_invitation(
    org_id: str,
    data: InvitationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invite a new member to the organization"""
    org, member = await verify_org_access(org_id, current_user, db, required_role=OrganizationRole.ADMIN)
    
    if not member.can_invite_members and member.role != OrganizationRole.OWNER:
        raise HTTPException(status_code=403, detail="No permission to invite members")
    
    # Check if already a member
    existing_user = await db.execute(
        select(User).where(User.email == data.email)
    )
    existing_user = existing_user.scalar_one_or_none()
    
    if existing_user:
        existing_member = await db.execute(
            select(OrganizationMember).where(
                and_(
                    OrganizationMember.organization_id == org_id,
                    OrganizationMember.user_id == existing_user.id
                )
            )
        )
        if existing_member.scalar_one_or_none():
            raise ConflictException("User is already a member")
    
    # Check for pending invitation
    existing_invite = await db.execute(
        select(OrganizationInvitation).where(
            and_(
                OrganizationInvitation.organization_id == org_id,
                OrganizationInvitation.email == data.email,
                OrganizationInvitation.status == "PENDING"
            )
        )
    )
    if existing_invite.scalar_one_or_none():
        raise ConflictException("Pending invitation already exists")
    
    # Create invitation
    invitation = OrganizationInvitation(
        id=uuid.uuid4(),
        organization_id=org.id,
        email=data.email,
        role=data.role,
        invited_by_id=current_user.id,
        invitation_token=secrets.token_urlsafe(32),
        status="PENDING",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(invitation)
    await db.commit()
    await db.refresh(invitation)
    
    return InvitationResponse(
        id=str(invitation.id),
        email=invitation.email,
        role=invitation.role,
        status=invitation.status,
        invited_by_name=current_user.full_name or current_user.email,
        created_at=invitation.created_at,
        expires_at=invitation.expires_at
    )


@router.get("/{org_id}/invitations", response_model=InvitationListResponse)
async def list_invitations(
    org_id: str,
    status: Optional[str] = "PENDING",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List organization invitations"""
    org, _ = await verify_org_access(org_id, current_user, db, required_role=OrganizationRole.ADMIN)
    
    query = select(OrganizationInvitation).options(
        selectinload(OrganizationInvitation.invited_by)
    ).where(OrganizationInvitation.organization_id == org_id)
    
    if status:
        query = query.where(OrganizationInvitation.status == status)
    
    result = await db.execute(query.order_by(OrganizationInvitation.created_at.desc()))
    invitations = result.scalars().all()
    
    invite_responses = []
    for inv in invitations:
        invite_responses.append(InvitationResponse(
            id=str(inv.id),
            email=inv.email,
            role=inv.role,
            status=inv.status,
            invited_by_name=inv.invited_by.full_name or inv.invited_by.email if inv.invited_by else "Unknown",
            created_at=inv.created_at,
            expires_at=inv.expires_at
        ))
    
    return InvitationListResponse(invitations=invite_responses, total=len(invite_responses))


@router.post("/invitations/accept")
async def accept_invitation(
    data: InvitationAccept,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Accept an organization invitation"""
    result = await db.execute(
        select(OrganizationInvitation)
        .options(selectinload(OrganizationInvitation.organization))
        .where(OrganizationInvitation.invitation_token == data.token)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise NotFoundException("Invitation", data.token)
    
    if invitation.status != "PENDING":
        raise ValidationException(f"Invitation is {invitation.status.lower()}")
    
    if invitation.expires_at < datetime.utcnow():
        invitation.status = "EXPIRED"
        await db.commit()
        raise ValidationException("Invitation has expired")
    
    if invitation.email != current_user.email:
        raise ValidationException("Invitation was sent to a different email")
    
    # Create membership
    member = OrganizationMember(
        id=uuid.uuid4(),
        organization_id=invitation.organization_id,
        user_id=current_user.id,
        role=invitation.role,
        is_active=True
    )
    db.add(member)
    
    invitation.status = "ACCEPTED"
    invitation.accepted_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "success": True,
        "organization_id": str(invitation.organization_id),
        "organization_name": invitation.organization.name if invitation.organization else "Unknown"
    }


@router.delete("/{org_id}/invitations/{invitation_id}")
async def revoke_invitation(
    org_id: str,
    invitation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Revoke a pending invitation"""
    org, _ = await verify_org_access(org_id, current_user, db, required_role=OrganizationRole.ADMIN)
    
    result = await db.execute(
        select(OrganizationInvitation).where(OrganizationInvitation.id == invitation_id)
    )
    invitation = result.scalar_one_or_none()
    
    if not invitation:
        raise NotFoundException("Invitation", invitation_id)
    
    if invitation.status != "PENDING":
        raise ValidationException("Can only revoke pending invitations")
    
    invitation.status = "REVOKED"
    await db.commit()
    
    return {"success": True, "message": "Invitation revoked"}


# ==================== Workshop Management ====================

@router.post("/{org_id}/workshops", response_model=OrganizationWorkshopResponse)
async def link_workshop_to_org(
    org_id: str,
    data: OrganizationWorkshopCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Link a workshop to the organization"""
    org, member = await verify_org_access(org_id, current_user, db)
    
    if not member.can_create_workshops:
        raise HTTPException(status_code=403, detail="No permission to link workshops")
    
    # Verify workshop exists and user owns it
    workshop_result = await db.execute(
        select(Workshop).where(Workshop.id == data.workshop_id)
    )
    workshop = workshop_result.scalar_one_or_none()
    
    if not workshop:
        raise NotFoundException("Workshop", data.workshop_id)
    
    if str(workshop.facilitator_id) != str(current_user.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not the workshop facilitator")
    
    # Check if already linked
    existing = await db.execute(
        select(OrganizationWorkshop).where(
            and_(
                OrganizationWorkshop.organization_id == org_id,
                OrganizationWorkshop.workshop_id == data.workshop_id
            )
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictException("Workshop already linked to this organization")
    
    # Create link
    org_workshop = OrganizationWorkshop(
        id=uuid.uuid4(),
        organization_id=org.id,
        workshop_id=workshop.id,
        department=data.department,
        project=data.project,
        tags=data.tags
    )
    db.add(org_workshop)
    await db.commit()
    await db.refresh(org_workshop)
    
    # Get counts
    participant_count = await db.execute(
        select(func.count(Participant.id)).where(Participant.workshop_id == workshop.id)
    )
    use_case_count = await db.execute(
        select(func.count(UseCase.id)).where(UseCase.workshop_id == workshop.id)
    )
    
    return OrganizationWorkshopResponse(
        id=str(org_workshop.id),
        workshop_id=str(workshop.id),
        workshop_title=workshop.title,
        workshop_status=workshop.status,
        department=org_workshop.department,
        project=org_workshop.project,
        tags=org_workshop.tags or [],
        created_at=org_workshop.created_at,
        participant_count=participant_count.scalar() or 0,
        use_case_count=use_case_count.scalar() or 0
    )


@router.get("/{org_id}/workshops", response_model=OrganizationWorkshopListResponse)
async def list_org_workshops(
    org_id: str,
    department: Optional[str] = None,
    project: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List workshops linked to the organization"""
    org, _ = await verify_org_access(org_id, current_user, db)
    
    query = select(OrganizationWorkshop).options(
        selectinload(OrganizationWorkshop.workshop)
    ).where(OrganizationWorkshop.organization_id == org_id)
    
    if department:
        query = query.where(OrganizationWorkshop.department == department)
    if project:
        query = query.where(OrganizationWorkshop.project == project)
    
    result = await db.execute(query.order_by(OrganizationWorkshop.created_at.desc()))
    org_workshops = result.scalars().all()
    
    workshop_responses = []
    for ow in org_workshops:
        if ow.workshop:
            participant_count = await db.execute(
                select(func.count(Participant.id)).where(Participant.workshop_id == ow.workshop_id)
            )
            use_case_count = await db.execute(
                select(func.count(UseCase.id)).where(UseCase.workshop_id == ow.workshop_id)
            )
            
            workshop_responses.append(OrganizationWorkshopResponse(
                id=str(ow.id),
                workshop_id=str(ow.workshop_id),
                workshop_title=ow.workshop.title,
                workshop_status=ow.workshop.status,
                department=ow.department,
                project=ow.project,
                tags=ow.tags or [],
                created_at=ow.created_at,
                participant_count=participant_count.scalar() or 0,
                use_case_count=use_case_count.scalar() or 0
            ))
    
    return OrganizationWorkshopListResponse(workshops=workshop_responses, total=len(workshop_responses))


# ==================== Analytics ====================

@router.get("/{org_id}/analytics", response_model=OrganizationAnalytics)
async def get_org_analytics(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get organization-wide analytics"""
    org, member = await verify_org_access(org_id, current_user, db)
    
    if not member.can_view_analytics:
        raise HTTPException(status_code=403, detail="No permission to view analytics")
    
    # Get all org workshops
    workshops_result = await db.execute(
        select(OrganizationWorkshop.workshop_id).where(
            OrganizationWorkshop.organization_id == org_id
        )
    )
    workshop_ids = [w[0] for w in workshops_result.fetchall()]
    
    if not workshop_ids:
        return OrganizationAnalytics(
            total_workshops=0,
            total_participants=0,
            total_use_cases=0,
            total_votes=0,
            active_members=0,
            usage_trend=[],
            top_contributors=[],
            department_breakdown=[]
        )
    
    # Total participants
    participants_result = await db.execute(
        select(func.count(Participant.id)).where(Participant.workshop_id.in_(workshop_ids))
    )
    total_participants = participants_result.scalar() or 0
    
    # Total use cases
    use_cases_result = await db.execute(
        select(func.count(UseCase.id)).where(UseCase.workshop_id.in_(workshop_ids))
    )
    total_use_cases = use_cases_result.scalar() or 0
    
    # Total votes
    votes_result = await db.execute(
        select(func.count(Vote.id))
        .join(UseCase, Vote.use_case_id == UseCase.id)
        .where(UseCase.workshop_id.in_(workshop_ids))
    )
    total_votes = votes_result.scalar() or 0
    
    # Active members
    active_members_result = await db.execute(
        select(func.count(OrganizationMember.id)).where(
            and_(
                OrganizationMember.organization_id == org_id,
                OrganizationMember.is_active == True
            )
        )
    )
    active_members = active_members_result.scalar() or 0
    
    # Department breakdown
    dept_result = await db.execute(
        select(
            OrganizationWorkshop.department,
            func.count(OrganizationWorkshop.id)
        )
        .where(OrganizationWorkshop.organization_id == org_id)
        .group_by(OrganizationWorkshop.department)
    )
    department_breakdown = [
        {"department": dept or "Uncategorized", "count": count}
        for dept, count in dept_result.fetchall()
    ]
    
    return OrganizationAnalytics(
        total_workshops=len(workshop_ids),
        total_participants=total_participants,
        total_use_cases=total_use_cases,
        total_votes=total_votes,
        active_members=active_members,
        usage_trend=[],
        top_contributors=[],
        department_breakdown=department_breakdown
    )

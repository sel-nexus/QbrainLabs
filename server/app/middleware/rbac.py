"""
Role-Based Access Control Middleware
Implements US30: User Roles & Access Control System

Provides dependencies for role-based route protection:
- require_admin: Admin-only routes
- require_facilitator: Facilitator routes (includes admins)
- require_active_account: Any active registered user
- require_workshop_access: Checks if user can access a specific workshop
- require_member_session: Valid member session for workshop
"""
from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List
import secrets
from datetime import datetime, timedelta

from app.core.database import get_db
from app.api.auth import get_current_user
from app.models.models import User, UserRole, AccountStatus, Workshop
from app.models.rbac import WorkshopFacilitator, MemberSession, Permission, RoleAuditLog


# ============== Role Dependencies ==============

async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that requires the current user to be an admin.
    Raises 403 Forbidden if user is not an admin.
    """
    if not current_user.is_admin_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required. You do not have permission to access this resource."
        )
    
    # Check account is active
    if current_user.status != AccountStatus.ACTIVE.value and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not active. Please contact an administrator."
        )
    
    return current_user


async def require_active_account(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that requires the current user to have an active account.
    Used for any authenticated route that needs an active user.
    """
    # Admin users bypass status check
    if current_user.is_admin_user:
        return current_user
    
    if current_user.status != AccountStatus.ACTIVE.value:
        status_messages = {
            AccountStatus.PENDING.value: "Your account is pending approval. Please wait for administrator approval.",
            AccountStatus.DISABLED.value: "Your account has been disabled. Please contact your administrator.",
            AccountStatus.SUSPENDED.value: "Your account has been suspended. Please contact your administrator.",
        }
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=status_messages.get(current_user.status, "Your account is not active.")
        )
    
    return current_user


async def require_facilitator(current_user: User = Depends(require_active_account)) -> User:
    """
    Dependency that requires the current user to be a facilitator or admin.
    Admins have implicit facilitator access.
    """
    if current_user.role not in [UserRole.ADMIN.value, UserRole.FACILITATOR.value] and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Facilitator access required."
        )
    return current_user


# ============== Workshop Access Dependencies ==============

class WorkshopAccessChecker:
    """
    Dependency class to check if a user can access a specific workshop.
    Admins can access all workshops.
    Facilitators can only access workshops they are assigned to.
    """
    
    def __init__(self, workshop_id_param: str = "workshop_id", allow_owner: bool = True):
        self.workshop_id_param = workshop_id_param
        self.allow_owner = allow_owner
    
    async def __call__(
        self,
        request: Request,
        current_user: User = Depends(require_facilitator),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        # Get workshop_id from path or query params
        workshop_id = request.path_params.get(self.workshop_id_param) or \
                      request.query_params.get(self.workshop_id_param)
        
        if not workshop_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workshop ID is required"
            )
        
        # Admins can access all workshops
        if current_user.is_admin_user:
            return current_user
        
        # Check if user is the workshop owner
        if self.allow_owner:
            result = await db.execute(
                select(Workshop).where(
                    Workshop.id == workshop_id,
                    Workshop.facilitator_id == current_user.id
                )
            )
            if result.scalars().first():
                return current_user
        
        # Check if user is assigned to the workshop
        result = await db.execute(
            select(WorkshopFacilitator).where(
                WorkshopFacilitator.workshop_id == workshop_id,
                WorkshopFacilitator.facilitator_id == current_user.id
            )
        )
        assignment = result.scalars().first()
        
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not assigned to this workshop"
            )
        
        return current_user


# Factory function for workshop access dependency
def require_workshop_access(workshop_id_param: str = "workshop_id", allow_owner: bool = True):
    """Create a workshop access checker dependency"""
    return WorkshopAccessChecker(workshop_id_param, allow_owner)


# ============== Member Session Dependencies ==============

async def get_member_session(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> Optional[MemberSession]:
    """
    Get member session from Authorization header or cookie.
    Returns None if no valid session found (for optional auth).
    """
    # Try to get session token from header
    auth_header = request.headers.get("Authorization", "")
    session_token = None
    
    if auth_header.startswith("Member "):
        session_token = auth_header[7:]
    elif auth_header.startswith("Bearer "):
        # Could be a member token
        session_token = auth_header[7:]
    
    # Also check cookies
    if not session_token:
        session_token = request.cookies.get("member_session")
    
    if not session_token:
        return None
    
    # Look up session
    result = await db.execute(
        select(MemberSession).where(
            MemberSession.session_token == session_token,
            MemberSession.is_active == True
        )
    )
    session = result.scalars().first()
    
    if not session:
        return None
    
    # Check expiration
    if session.expires_at and session.expires_at < datetime.utcnow():
        session.is_active = False
        await db.commit()
        return None
    
    # Update last active
    session.last_active = datetime.utcnow()
    await db.commit()
    
    return session


async def require_member_session(
    request: Request,
    db: AsyncSession = Depends(get_db)
) -> MemberSession:
    """
    Dependency that requires a valid member session.
    Raises 401 if no valid session.
    """
    session = await get_member_session(request, db)
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid member session required. Please join a workshop with a PIN.",
            headers={"WWW-Authenticate": "Member"}
        )
    
    return session


# ============== Permission Checking ==============

async def check_permission(
    role: str,
    resource: str,
    action: str,
    db: AsyncSession
) -> bool:
    """
    Check if a role has permission to perform an action on a resource.
    Uses database permissions table with fallback to defaults.
    """
    result = await db.execute(
        select(Permission).where(
            Permission.role == role,
            Permission.resource == resource,
            Permission.action == action
        )
    )
    permission = result.scalars().first()
    
    if permission:
        return permission.allowed
    
    # Default: admins have all permissions, others don't
    return role == UserRole.ADMIN.value


class RequirePermission:
    """
    Dependency class to check specific permission.
    """
    
    def __init__(self, resource: str, action: str):
        self.resource = resource
        self.action = action
    
    async def __call__(
        self,
        current_user: User = Depends(require_active_account),
        db: AsyncSession = Depends(get_db)
    ) -> User:
        # Admins bypass permission checks
        if current_user.is_admin_user:
            return current_user
        
        allowed = await check_permission(
            current_user.role,
            self.resource,
            self.action,
            db
        )
        
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {self.action} on {self.resource}"
            )
        
        return current_user


def require_permission(resource: str, action: str):
    """Create a permission checker dependency"""
    return RequirePermission(resource, action)


# ============== Audit Logging ==============

async def log_role_action(
    db: AsyncSession,
    action: str,
    user_id: Optional[str] = None,
    performed_by: Optional[str] = None,
    old_value: Optional[dict] = None,
    new_value: Optional[dict] = None,
    request: Optional[Request] = None,
    details: Optional[str] = None
):
    """
    Log a role-related action to the audit log.
    """
    ip_address = None
    user_agent = None
    
    if request:
        # Get client IP
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip_address = forwarded.split(",")[0].strip()
        else:
            ip_address = request.headers.get("X-Real-IP") or \
                        (request.client.host if request.client else None)
        user_agent = request.headers.get("User-Agent")
    
    log_entry = RoleAuditLog(
        user_id=user_id,
        action=action,
        performed_by=performed_by,
        old_value=old_value,
        new_value=new_value,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details
    )
    
    db.add(log_entry)
    await db.commit()


# ============== Session Management ==============

def generate_session_token() -> str:
    """Generate a secure session token for member sessions"""
    return secrets.token_urlsafe(32)


async def create_member_session(
    db: AsyncSession,
    workshop_id: str,
    display_name: str,
    participant_id: str,
    request: Optional[Request] = None,
    expires_hours: int = 24
) -> MemberSession:
    """
    Create a new member session for workshop access.
    """
    ip_address = None
    user_agent = None
    
    if request:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip_address = forwarded.split(",")[0].strip()
        else:
            ip_address = request.headers.get("X-Real-IP") or \
                        (request.client.host if request.client else None)
        user_agent = request.headers.get("User-Agent")
    
    session = MemberSession(
        workshop_id=workshop_id,
        display_name=display_name,
        session_token=generate_session_token(),
        participant_id=participant_id,
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=datetime.utcnow() + timedelta(hours=expires_hours)
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return session


async def get_facilitator_workshop_ids(
    user_id: str,
    db: AsyncSession
) -> List[str]:
    """
    Get list of workshop IDs that a facilitator can access.
    Includes workshops they own and workshops they are assigned to.
    """
    workshop_ids = []
    
    # Get owned workshops
    result = await db.execute(
        select(Workshop.id).where(Workshop.facilitator_id == user_id)
    )
    workshop_ids.extend([str(row[0]) for row in result.all()])
    
    # Get assigned workshops
    result = await db.execute(
        select(WorkshopFacilitator.workshop_id).where(
            WorkshopFacilitator.facilitator_id == user_id
        )
    )
    workshop_ids.extend([str(row[0]) for row in result.all()])
    
    return list(set(workshop_ids))  # Remove duplicates

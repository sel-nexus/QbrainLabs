"""
Authentication and Authorization Guards
Provides dependencies for route-level access control
"""
from fastapi import Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.auth import get_current_user
from app.core.database import get_db
from app.models.models import User, Workshop


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that requires the current user to be an admin.
    Raises 403 Forbidden if user is not an admin.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required"
        )
    return current_user


async def require_facilitator(
    workshop_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency that requires the current user to be the facilitator of the workshop.
    Raises 403 Forbidden if user is not the facilitator.
    
    Usage:
        @router.post("/{workshop_id}/phase")
        async def update_phase(
            workshop_id: str,
            facilitator: User = Depends(require_facilitator)
        ):
            pass
    """
    result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    workshop = result.scalars().first()
    
    if not workshop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workshop not found"
        )
    
    # Admins can access any workshop
    if current_user.is_admin:
        return current_user
    
    # Check if user is the facilitator
    if workshop.facilitator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be the workshop facilitator to perform this action"
        )
    
    return current_user


def get_workshop_access_checker(allow_participants: bool = False):
    """
    Factory function to create a workshop access checker dependency.
    
    Args:
        allow_participants: If True, allows any participant to access the workshop
    """
    async def check_access(
        workshop_id: str,
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ) -> Workshop:
        result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
        workshop = result.scalars().first()
        
        if not workshop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workshop not found"
            )
        
        # Admins can access any workshop
        if current_user.is_admin:
            return workshop
        
        # Facilitator can access their workshop
        if workshop.facilitator_id == current_user.id:
            return workshop
        
        if not allow_participants:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        return workshop
    
    return check_access


# Pre-configured checkers
require_workshop_facilitator = get_workshop_access_checker(allow_participants=False)
require_workshop_access = get_workshop_access_checker(allow_participants=True)

"""
Admin authorization middleware
Provides decorators and dependencies for admin-only routes
"""
from fastapi import Depends, HTTPException, status
from app.api.auth import get_current_user
from app.models.models import User


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency that requires the current user to be an admin.
    Raises 403 Forbidden if user is not an admin.
    
    Usage:
        @router.get("/admin/something")
        async def admin_only_route(admin: User = Depends(require_admin)):
            # Only admins can access this
            pass
    """
    if not current_user.is_admin_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required. You do not have permission to access this resource."
        )
    return current_user


def is_admin(user: User) -> bool:
    """
    Helper function to check if a user is an admin.
    
    Args:
        user: User instance to check
        
    Returns:
        True if user is an admin, False otherwise
    """
    return user.is_admin if user else False

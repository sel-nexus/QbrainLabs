"""
Middleware package for authorization and other cross-cutting concerns
"""
from .admin_auth import require_admin, is_admin

__all__ = ['require_admin', 'is_admin']

"""
Rate Limiting Service for Facilitator Registration
US32: Registration Rate Limiting (10/day, 20/week, 50/month)
US33: Database-driven rate limit configuration
"""
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, delete
from fastapi import HTTPException, status, Request
from typing import Tuple, Optional

from app.models.rbac import FacilitatorRegistrationLog
from app.services.settings_service import get_rate_limit


# Fallback rate limit constants (used if DB settings not available)
# These are now read from the database via settings_service
DEFAULT_DAILY_LIMIT = 10
DEFAULT_WEEKLY_LIMIT = 20
DEFAULT_MONTHLY_LIMIT = 50


class RateLimitExceeded(Exception):
    """Exception raised when rate limit is exceeded"""
    def __init__(self, limit_type: str, limit: int, current_count: int, reset_at: datetime):
        self.limit_type = limit_type
        self.limit = limit
        self.current_count = current_count
        self.reset_at = reset_at
        self.next_available_in_seconds = int((reset_at - datetime.utcnow()).total_seconds())
        super().__init__(f"Rate limit exceeded: {limit_type}")


async def get_registration_count(db: AsyncSession, since: datetime) -> int:
    """Get count of registrations since a given timestamp"""
    result = await db.execute(
        select(func.count(FacilitatorRegistrationLog.id)).where(
            FacilitatorRegistrationLog.registration_timestamp >= since
        )
    )
    return result.scalar() or 0


async def get_rate_limit_status(db: AsyncSession) -> dict:
    """Get current rate limit status for all time windows"""
    now = datetime.utcnow()
    
    # Get rate limits from database settings
    daily_limit = await get_rate_limit(db, "daily")
    weekly_limit = await get_rate_limit(db, "weekly")
    monthly_limit = await get_rate_limit(db, "monthly")
    
    # Calculate time boundaries
    daily_start = now - timedelta(hours=24)
    weekly_start = now - timedelta(days=7)
    monthly_start = now - timedelta(days=30)
    
    # Get counts
    daily_count = await get_registration_count(db, daily_start)
    weekly_count = await get_registration_count(db, weekly_start)
    monthly_count = await get_registration_count(db, monthly_start)
    
    # Calculate reset times (next available slot)
    daily_reset = now + timedelta(hours=24)
    weekly_reset = now + timedelta(days=7)
    monthly_reset = now + timedelta(days=30)
    
    # If we have registrations, calculate more accurate reset time based on oldest entry
    if daily_count >= daily_limit:
        oldest_result = await db.execute(
            select(FacilitatorRegistrationLog.registration_timestamp)
            .where(FacilitatorRegistrationLog.registration_timestamp >= daily_start)
            .order_by(FacilitatorRegistrationLog.registration_timestamp.asc())
            .limit(1)
        )
        oldest = oldest_result.scalar()
        if oldest:
            daily_reset = oldest + timedelta(hours=24)
    
    return {
        "daily": {
            "count": daily_count,
            "limit": daily_limit,
            "reset_at": daily_reset
        },
        "weekly": {
            "count": weekly_count,
            "limit": weekly_limit,
            "reset_at": weekly_reset
        },
        "monthly": {
            "count": monthly_count,
            "limit": monthly_limit,
            "reset_at": monthly_reset
        }
    }


async def check_registration_rate_limit(db: AsyncSession) -> bool:
    """
    Check if registration is allowed based on rate limits.
    Raises RateLimitExceeded if any limit is reached.
    Returns True if registration is allowed.
    
    Rate limits are now read from database settings (US33).
    """
    now = datetime.utcnow()
    
    # Get rate limits from database settings
    daily_limit = await get_rate_limit(db, "daily")
    weekly_limit = await get_rate_limit(db, "weekly")
    monthly_limit = await get_rate_limit(db, "monthly")
    
    # Check daily limit
    daily_start = now - timedelta(hours=24)
    daily_count = await get_registration_count(db, daily_start)
    if daily_count >= daily_limit:
        # Find oldest registration to calculate reset time
        oldest_result = await db.execute(
            select(FacilitatorRegistrationLog.registration_timestamp)
            .where(FacilitatorRegistrationLog.registration_timestamp >= daily_start)
            .order_by(FacilitatorRegistrationLog.registration_timestamp.asc())
            .limit(1)
        )
        oldest = oldest_result.scalar()
        reset_at = oldest + timedelta(hours=24) if oldest else now + timedelta(hours=24)
        raise RateLimitExceeded("daily", daily_limit, daily_count, reset_at)
    
    # Check weekly limit
    weekly_start = now - timedelta(days=7)
    weekly_count = await get_registration_count(db, weekly_start)
    if weekly_count >= weekly_limit:
        oldest_result = await db.execute(
            select(FacilitatorRegistrationLog.registration_timestamp)
            .where(FacilitatorRegistrationLog.registration_timestamp >= weekly_start)
            .order_by(FacilitatorRegistrationLog.registration_timestamp.asc())
            .limit(1)
        )
        oldest = oldest_result.scalar()
        reset_at = oldest + timedelta(days=7) if oldest else now + timedelta(days=7)
        raise RateLimitExceeded("weekly", weekly_limit, weekly_count, reset_at)
    
    # Check monthly limit
    monthly_start = now - timedelta(days=30)
    monthly_count = await get_registration_count(db, monthly_start)
    if monthly_count >= monthly_limit:
        oldest_result = await db.execute(
            select(FacilitatorRegistrationLog.registration_timestamp)
            .where(FacilitatorRegistrationLog.registration_timestamp >= monthly_start)
            .order_by(FacilitatorRegistrationLog.registration_timestamp.asc())
            .limit(1)
        )
        oldest = oldest_result.scalar()
        reset_at = oldest + timedelta(days=30) if oldest else now + timedelta(days=30)
        raise RateLimitExceeded("monthly", monthly_limit, monthly_count, reset_at)
    
    return True


async def log_registration(
    db: AsyncSession,
    email: str,
    request: Optional[Request] = None
) -> FacilitatorRegistrationLog:
    """Log a facilitator registration for rate limiting tracking"""
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
    
    log_entry = FacilitatorRegistrationLog(
        email=email,
        ip_address=ip_address,
        user_agent=user_agent,
        registration_timestamp=datetime.utcnow()
    )
    
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)
    
    return log_entry


async def reset_rate_limits(db: AsyncSession, period: str) -> bool:
    """
    Reset rate limits by deleting registration log entries.
    Period can be: daily, weekly, monthly, or all
    """
    now = datetime.utcnow()
    
    if period == "all":
        await db.execute(delete(FacilitatorRegistrationLog))
    elif period == "daily":
        daily_start = now - timedelta(hours=24)
        await db.execute(
            delete(FacilitatorRegistrationLog).where(
                FacilitatorRegistrationLog.registration_timestamp >= daily_start
            )
        )
    elif period == "weekly":
        weekly_start = now - timedelta(days=7)
        await db.execute(
            delete(FacilitatorRegistrationLog).where(
                FacilitatorRegistrationLog.registration_timestamp >= weekly_start
            )
        )
    elif period == "monthly":
        monthly_start = now - timedelta(days=30)
        await db.execute(
            delete(FacilitatorRegistrationLog).where(
                FacilitatorRegistrationLog.registration_timestamp >= monthly_start
            )
        )
    
    await db.commit()
    return True

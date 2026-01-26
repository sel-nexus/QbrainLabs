"""
Redis Client Configuration
Provides Redis connection for distributed rate limiting and caching
"""
import redis.asyncio as redis
from typing import Optional
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("redis")

# Global Redis client instance
_redis_client: Optional[redis.Redis] = None
# Track if Redis is unavailable to avoid repeated connection attempts and warnings
_redis_unavailable: bool = False


async def get_redis_client() -> Optional[redis.Redis]:
    """
    Get Redis client instance.
    Returns None if Redis is not available (graceful degradation).
    Caches the unavailable state to avoid repeated connection attempts.
    """
    global _redis_client, _redis_unavailable
    
    # If Redis was already determined to be unavailable, return None immediately
    if _redis_unavailable:
        return None
    
    # If client already exists, return it
    if _redis_client is not None:
        return _redis_client
    
    try:
        # Parse Redis URL
        redis_url = settings.REDIS_URL
        if not redis_url:
            _redis_unavailable = True
            logger.info("Redis URL not configured, using in-memory rate limiting")
            return None
        
        # Try to create and test connection
        test_client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2
        )
        await test_client.ping()
        await test_client.aclose()
        
        # Connection successful, create persistent client
        _redis_client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            retry_on_timeout=True,
            health_check_interval=30
        )
        
        # Test connection again
        await _redis_client.ping()
        logger.info("Redis client connected successfully")
        return _redis_client
        
    except Exception as e:
        # Mark Redis as unavailable to avoid repeated attempts
        _redis_unavailable = True
        logger.info(f"Redis not available ({str(e)[:50]}...), using in-memory rate limiting. "
                   f"To enable Redis, install and start Redis server or set REDIS_URL to a valid Redis instance.")
        return None


def reset_redis_availability():
    """Reset Redis availability flag (useful for testing or reconnection attempts)"""
    global _redis_unavailable, _redis_client
    _redis_unavailable = False
    _redis_client = None


async def close_redis_client():
    """Close Redis client connection"""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis client closed")

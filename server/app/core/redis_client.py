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


async def get_redis_client() -> Optional[redis.Redis]:
    """
    Get Redis client instance.
    Returns None if Redis is not available (graceful degradation).
    """
    global _redis_client
    
    if _redis_client is not None:
        return _redis_client
    
    try:
        # Parse Redis URL
        redis_url = settings.REDIS_URL
        if not redis_url or redis_url == "redis://localhost:6379/0":
            # Check if Redis is actually available
            try:
                test_client = redis.from_url(redis_url, decode_responses=True)
                await test_client.ping()
                await test_client.aclose()
            except Exception:
                logger.warning("Redis not available, using in-memory rate limiting")
                return None
        
        _redis_client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            retry_on_timeout=True,
            health_check_interval=30
        )
        
        # Test connection
        await _redis_client.ping()
        logger.info("Redis client connected successfully")
        return _redis_client
        
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}. Using in-memory rate limiting.")
        return None


async def close_redis_client():
    """Close Redis client connection"""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None
        logger.info("Redis client closed")

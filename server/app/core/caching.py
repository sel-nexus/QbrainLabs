"""
Caching utilities for query result caching
Uses Redis when available, falls back to in-memory cache
"""
import json
import hashlib
from typing import Optional, Any, Callable
from functools import wraps
from app.core.logging import get_logger

logger = get_logger("caching")

# In-memory cache fallback
_memory_cache: dict = {}


def _get_cache_key(func_name: str, args: tuple, kwargs: dict) -> str:
    """Generate cache key from function name and arguments"""
    key_data = f"{func_name}:{str(args)}:{str(sorted(kwargs.items()))}"
    return hashlib.md5(key_data.encode()).hexdigest()


async def get_from_cache(key: str) -> Optional[Any]:
    """Get value from cache (Redis or memory)"""
    # Try Redis first
    try:
        from app.core.redis_client import get_redis_client
        redis_client = await get_redis_client()
        if redis_client:
            cached = await redis_client.get(f"cache:{key}")
            if cached:
                return json.loads(cached)
    except Exception as e:
        logger.debug(f"Redis cache miss: {e}")
    
    # Fallback to memory cache
    if key in _memory_cache:
        return _memory_cache[key]
    
    return None


async def set_cache(key: str, value: Any, ttl: int = 300):
    """Set value in cache (Redis or memory)"""
    try:
        from app.core.redis_client import get_redis_client
        redis_client = await get_redis_client()
        if redis_client:
            await redis_client.setex(
                f"cache:{key}",
                ttl,
                json.dumps(value, default=str)
            )
            return
    except Exception as e:
        logger.debug(f"Redis cache set failed: {e}")
    
    # Fallback to memory cache (with size limit)
    if len(_memory_cache) > 1000:
        # Clear oldest 100 entries
        keys_to_remove = list(_memory_cache.keys())[:100]
        for k in keys_to_remove:
            del _memory_cache[k]
    
    _memory_cache[key] = value


def cache_result(ttl: int = 300):
    """
    Decorator for caching function results.
    
    Usage:
        @cache_result(ttl=600)  # Cache for 10 minutes
        async def get_workshop(workshop_id: str):
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = _get_cache_key(func.__name__, args, kwargs)
            
            # Try to get from cache
            cached = await get_from_cache(cache_key)
            if cached is not None:
                logger.debug(f"Cache hit: {func.__name__}")
                return cached
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Store in cache
            await set_cache(cache_key, result, ttl)
            logger.debug(f"Cache set: {func.__name__}")
            
            return result
        return wrapper
    return decorator

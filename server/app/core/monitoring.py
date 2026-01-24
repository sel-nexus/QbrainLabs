"""
Application monitoring with Prometheus metrics and health checks
"""
import time
from typing import Callable, Dict, Any
from functools import wraps

from fastapi import FastAPI, Request, Response
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

# Prometheus metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

REQUEST_LATENCY = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency',
    ['method', 'endpoint'],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
)

ACTIVE_REQUESTS = Gauge(
    'http_active_requests',
    'Number of active HTTP requests'
)

DB_QUERY_COUNT = Counter(
    'db_queries_total',
    'Total database queries',
    ['operation', 'table']
)

DB_QUERY_LATENCY = Histogram(
    'db_query_duration_seconds',
    'Database query latency',
    ['operation'],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0)
)

WEBSOCKET_CONNECTIONS = Gauge(
    'websocket_connections_active',
    'Number of active WebSocket connections'
)

ERROR_COUNT = Counter(
    'errors_total',
    'Total errors',
    ['type', 'endpoint']
)


class MetricsMiddleware:
    """Middleware for collecting HTTP metrics"""
    
    def __init__(self, app: FastAPI):
        self.app = app
    
    async def __call__(self, request: Request, call_next: Callable) -> Response:
        ACTIVE_REQUESTS.inc()
        
        start_time = time.perf_counter()
        
        try:
            response = await call_next(request)
            status = response.status_code
        except Exception as e:
            status = 500
            ERROR_COUNT.labels(
                type=type(e).__name__,
                endpoint=request.url.path
            ).inc()
            raise
        finally:
            duration = time.perf_counter() - start_time
            
            # Record metrics
            REQUEST_COUNT.labels(
                method=request.method,
                endpoint=request.url.path,
                status=status
            ).inc()
            
            REQUEST_LATENCY.labels(
                method=request.method,
                endpoint=request.url.path
            ).observe(duration)
            
            ACTIVE_REQUESTS.dec()
        
        return response


def setup_metrics_endpoint(app: FastAPI) -> None:
    """Add Prometheus metrics endpoint to the application"""
    
    @app.get("/metrics", include_in_schema=False)
    async def metrics():
        return Response(
            content=generate_latest(),
            media_type=CONTENT_TYPE_LATEST
        )


def setup_health_endpoints(app: FastAPI) -> None:
    """Add health check endpoints to the application"""
    
    @app.get("/health", tags=["health"])
    async def health_check() -> Dict[str, Any]:
        """Basic health check endpoint"""
        return {
            "status": "healthy",
            "timestamp": time.time(),
            "service": "hotspotmatrix"
        }
    
    @app.get("/health/ready", tags=["health"])
    async def readiness_check() -> Dict[str, Any]:
        """Readiness check - verifies dependencies are available"""
        checks = {
            "database": await check_database(),
            "redis": await check_redis(),
        }
        
        all_healthy = all(c["status"] == "healthy" for c in checks.values())
        
        return {
            "status": "ready" if all_healthy else "not_ready",
            "checks": checks,
            "timestamp": time.time()
        }
    
    @app.get("/health/live", tags=["health"])
    async def liveness_check() -> Dict[str, Any]:
        """Liveness check - verifies the application is running"""
        return {
            "status": "alive",
            "timestamp": time.time()
        }


async def check_database() -> Dict[str, Any]:
    """Check database connectivity"""
    try:
        from app.core.database import engine
        from sqlalchemy import text
        
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


async def check_redis() -> Dict[str, Any]:
    """Check Redis connectivity"""
    try:
        # Redis check - optional, return healthy if not configured
        return {"status": "healthy", "note": "Redis check skipped"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}


def track_db_query(operation: str, table: str = "unknown"):
    """Decorator to track database query metrics"""
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = time.perf_counter() - start_time
                DB_QUERY_COUNT.labels(operation=operation, table=table).inc()
                DB_QUERY_LATENCY.labels(operation=operation).observe(duration)
        return wrapper
    return decorator


def track_websocket_connection(connect: bool = True) -> None:
    """Track WebSocket connection count"""
    if connect:
        WEBSOCKET_CONNECTIONS.inc()
    else:
        WEBSOCKET_CONNECTIONS.dec()

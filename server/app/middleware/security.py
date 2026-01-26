"""
Security middleware for request hardening
"""
import time
from typing import Callable

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.security import SECURITY_HEADERS, rate_limiter, get_client_ip
from app.core.logging import request_logger, audit_logger


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Add security headers
        for header, value in SECURITY_HEADERS.items():
            response.headers[header] = value
        
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log all HTTP requests"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()
        
        # Get client info
        client_ip = get_client_ip(request)
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        # Log the request
        request_logger.log_request(
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
            client_ip=client_ip,
        )
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Apply rate limiting to requests"""
    
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/health/ready", "/health/live", "/metrics"]:
            return await call_next(request)
        
        client_ip = get_client_ip(request)
        
        # Use async rate limiter (supports Redis)
        if not await rate_limiter.is_allowed(client_ip):
            return Response(
                content='{"error": "Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
                headers={
                    "Retry-After": str(self.window_seconds),
                    "X-RateLimit-Limit": str(self.max_requests),
                    "X-RateLimit-Remaining": "0",
                }
            )
        
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = await rate_limiter.get_remaining(client_ip)
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        
        return response


class SQLInjectionProtectionMiddleware(BaseHTTPMiddleware):
    """Basic SQL injection protection"""
    
    SUSPICIOUS_PATTERNS = [
        "' OR '1'='1",
        "'; DROP TABLE",
        "UNION SELECT",
        "1=1--",
        "' OR 1=1--",
    ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Check query parameters
        query_string = str(request.url.query).upper()
        
        for pattern in self.SUSPICIOUS_PATTERNS:
            if pattern.upper() in query_string:
                audit_logger.log_auth_event(
                    event_type="sql_injection_attempt",
                    user_id=None,
                    success=False,
                    ip_address=get_client_ip(request),
                    details={"pattern": pattern, "path": request.url.path}
                )
                return Response(
                    content='{"error": "Invalid request"}',
                    status_code=400,
                    media_type="application/json"
                )
        
        return await call_next(request)


def setup_security_middleware(app: FastAPI) -> None:
    """Register all security middleware with the application"""
    
    # Order matters - outermost middleware runs first
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
    app.add_middleware(SQLInjectionProtectionMiddleware)

"""
Dynamic CORS middleware that accepts origins matching server IP addresses.
This allows the application to work when accessed via either private or public IP addresses.
"""
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
from typing import List, Optional
import logging

from app.core.network_utils import (
    get_local_ip_addresses,
    get_cors_origins_for_ips,
    origin_matches_server_ip
)
from app.core.config import settings

logger = logging.getLogger(__name__)


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """
    Dynamic CORS middleware that:
    1. Accepts origins from CORS_ORIGINS environment variable
    2. Automatically accepts origins matching server IP addresses (private/public)
    3. Allows localhost/127.0.0.1 for local development
    """
    
    def __init__(self, app, client_port: int = 5173):
        super().__init__(app)
        self.client_port = client_port
        
        # Get server IP addresses at startup
        self.server_ips = get_local_ip_addresses()
        logger.info(f"Detected server IP addresses: {self.server_ips}")
        
        # Parse configured CORS origins
        self.configured_origins: List[str] = []
        if settings.CORS_ORIGINS:
            self.configured_origins = [
                origin.strip() 
                for origin in settings.CORS_ORIGINS.split(",") 
                if origin.strip()
            ]
        
        # Generate CORS origins for detected IPs
        self.dynamic_origins = get_cors_origins_for_ips(self.server_ips, self.client_port)
        
        # Combine configured and dynamic origins
        self.allowed_origins: set = set(self.configured_origins) | set(self.dynamic_origins)
        
        logger.info(f"Allowed CORS origins: {sorted(self.allowed_origins)}")
    
    def is_origin_allowed(self, origin: Optional[str]) -> bool:
        """Check if an origin is allowed."""
        if not origin:
            return False
        
        # Check configured origins (exact match)
        if origin in self.configured_origins:
            return True
        
        # Check if origin matches server IP addresses
        if origin_matches_server_ip(origin, self.server_ips, self.client_port):
            return True
        
        # Check dynamic origins (exact match)
        if origin in self.dynamic_origins:
            return True
        
        return False
    
    async def dispatch(self, request: Request, call_next):
        """Handle CORS headers dynamically."""
        origin = request.headers.get("origin")
        
        # Handle preflight OPTIONS request
        if request.method == "OPTIONS":
            if self.is_origin_allowed(origin):
                return StarletteResponse(
                    content="",
                    status_code=200,
                    headers=self._get_cors_headers(origin),
                )
            else:
                logger.warning(f"CORS blocked for origin: {origin}. Allowed origins: {sorted(self.allowed_origins)}")
                return StarletteResponse(
                    content="CORS not allowed",
                    status_code=403,
                )
        
        # Handle actual request
        response = await call_next(request)
        
        # Add CORS headers if origin is allowed
        if origin and self.is_origin_allowed(origin):
            for header, value in self._get_cors_headers(origin).items():
                response.headers[header] = value
        
        return response
    
    def _get_cors_headers(self, origin: Optional[str]) -> dict:
        """Generate CORS headers."""
        headers = {
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Expose-Headers": "X-Total-Extracted, X-Preview-Limit, X-Batch-Offset",
            "Access-Control-Max-Age": "3600",
        }
        
        if origin:
            headers["Access-Control-Allow-Origin"] = origin
        
        return headers

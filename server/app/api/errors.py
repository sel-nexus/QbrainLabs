"""
Error logging API endpoint for frontend error reporting
"""
from fastapi import APIRouter, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime

from app.core.logging import get_logger

router = APIRouter(prefix="/api/errors", tags=["errors"])
logger = get_logger("frontend-errors")


class ErrorReport(BaseModel):
    """Frontend error report schema"""
    message: str
    stack: Optional[str] = None
    componentStack: Optional[str] = None
    timestamp: Optional[str] = None
    url: Optional[str] = None
    userAgent: Optional[str] = None
    userId: Optional[str] = None
    extra: Optional[Dict[str, Any]] = None


@router.post("/log")
async def log_frontend_error(error: ErrorReport, request: Request):
    """
    Log frontend errors for monitoring
    """
    client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
    
    logger.error(
        "Frontend Error",
        message=error.message,
        stack=error.stack,
        component_stack=error.componentStack,
        url=error.url,
        user_agent=error.userAgent,
        user_id=error.userId,
        client_ip=client_ip,
        timestamp=error.timestamp or datetime.utcnow().isoformat()
    )
    
    return {"status": "logged", "timestamp": datetime.utcnow().isoformat()}

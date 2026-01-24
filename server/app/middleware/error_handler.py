"""
Global Error Handler Middleware for FastAPI
Provides consistent error responses and logging across the application
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError
import traceback
import logging
from datetime import datetime
from typing import Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("hotspotmatrix")


class AppException(Exception):
    """Custom application exception with structured error data"""
    def __init__(
        self,
        message: str,
        code: str = "APP_ERROR",
        status_code: int = 500,
        details: dict = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationException(AppException):
    """Validation error exception"""
    def __init__(self, message: str, details: dict = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=400,
            details=details
        )


class AuthenticationException(AppException):
    """Authentication error exception"""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            code="AUTH_ERROR",
            status_code=401
        )


class AuthorizationException(AppException):
    """Authorization error exception"""
    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            message=message,
            code="FORBIDDEN",
            status_code=403
        )


class NotFoundException(AppException):
    """Resource not found exception"""
    def __init__(self, resource: str = "Resource", identifier: str = None):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with id '{identifier}' not found"
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=404
        )


class ConflictException(AppException):
    """Conflict error exception"""
    def __init__(self, message: str):
        super().__init__(
            message=message,
            code="CONFLICT",
            status_code=409
        )


class RateLimitException(AppException):
    """Rate limit exceeded exception"""
    def __init__(self, message: str = "Rate limit exceeded. Please try again later."):
        super().__init__(
            message=message,
            code="RATE_LIMIT",
            status_code=429
        )


def create_error_response(
    status_code: int,
    code: str,
    message: str,
    details: dict = None,
    path: str = None
) -> JSONResponse:
    """Create a standardized error response"""
    error_body = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "timestamp": datetime.utcnow().isoformat(),
        }
    }
    
    if details:
        error_body["error"]["details"] = details
    
    if path:
        error_body["error"]["path"] = path
    
    return JSONResponse(
        status_code=status_code,
        content=error_body
    )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle custom application exceptions"""
    logger.warning(
        f"AppException: {exc.code} - {exc.message}",
        extra={"path": request.url.path, "details": exc.details}
    )
    return create_error_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
        path=request.url.path
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions"""
    code_map = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "CONFLICT",
        422: "UNPROCESSABLE_ENTITY",
        429: "RATE_LIMITED",
        500: "INTERNAL_ERROR",
    }
    
    logger.warning(
        f"HTTPException: {exc.status_code} - {exc.detail}",
        extra={"path": request.url.path}
    )
    
    return create_error_response(
        status_code=exc.status_code,
        code=code_map.get(exc.status_code, "HTTP_ERROR"),
        message=str(exc.detail),
        path=request.url.path
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle request validation errors"""
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(
        f"Validation error on {request.url.path}",
        extra={"errors": errors}
    )
    
    return create_error_response(
        status_code=422,
        code="VALIDATION_ERROR",
        message="Request validation failed",
        details={"errors": errors},
        path=request.url.path
    )


async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
    """Handle database errors"""
    logger.error(
        f"Database error: {str(exc)}",
        extra={"path": request.url.path, "traceback": traceback.format_exc()}
    )
    
    return create_error_response(
        status_code=500,
        code="DATABASE_ERROR",
        message="A database error occurred. Please try again later.",
        path=request.url.path
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all unhandled exceptions"""
    logger.error(
        f"Unhandled exception: {str(exc)}",
        extra={"path": request.url.path, "traceback": traceback.format_exc()}
    )
    
    return create_error_response(
        status_code=500,
        code="INTERNAL_ERROR",
        message="An unexpected error occurred. Please try again later.",
        path=request.url.path
    )


def register_exception_handlers(app):
    """Register all exception handlers with the FastAPI app"""
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(SQLAlchemyError, sqlalchemy_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)
    
    logger.info("Exception handlers registered")

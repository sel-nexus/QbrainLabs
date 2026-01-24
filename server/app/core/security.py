"""
Security utilities and hardening measures
"""
import secrets
import hashlib
import hmac
import re
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from functools import wraps

from fastapi import Request, HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


# Password hashing configuration
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Increased from default for better security
)


# Security headers
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
}


class PasswordValidator:
    """Password strength validator"""
    
    MIN_LENGTH = 8
    MAX_LENGTH = 128
    
    PATTERNS = {
        "uppercase": re.compile(r"[A-Z]"),
        "lowercase": re.compile(r"[a-z]"),
        "digit": re.compile(r"\d"),
        "special": re.compile(r"[!@#$%^&*(),.?\":{}|<>]"),
    }
    
    COMMON_PASSWORDS = {
        "password", "123456", "password123", "admin", "letmein",
        "welcome", "monkey", "dragon", "master", "qwerty"
    }
    
    @classmethod
    def validate(cls, password: str) -> Dict[str, Any]:
        """
        Validate password strength
        Returns dict with 'valid' bool and 'errors' list
        """
        errors = []
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters")
        
        if len(password) > cls.MAX_LENGTH:
            errors.append(f"Password must be at most {cls.MAX_LENGTH} characters")
        
        if not cls.PATTERNS["uppercase"].search(password):
            errors.append("Password must contain at least one uppercase letter")
        
        if not cls.PATTERNS["lowercase"].search(password):
            errors.append("Password must contain at least one lowercase letter")
        
        if not cls.PATTERNS["digit"].search(password):
            errors.append("Password must contain at least one digit")
        
        if password.lower() in cls.COMMON_PASSWORDS:
            errors.append("Password is too common")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "strength": cls._calculate_strength(password)
        }
    
    @classmethod
    def _calculate_strength(cls, password: str) -> str:
        """Calculate password strength score"""
        score = 0
        
        if len(password) >= 12:
            score += 2
        elif len(password) >= 8:
            score += 1
        
        for pattern in cls.PATTERNS.values():
            if pattern.search(password):
                score += 1
        
        if score >= 5:
            return "strong"
        elif score >= 3:
            return "medium"
        else:
            return "weak"


class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, list] = {}
    
    def is_allowed(self, identifier: str) -> bool:
        """Check if request is allowed for the given identifier"""
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=self.window_seconds)
        
        # Get existing requests for this identifier
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # Filter out old requests
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if req_time > window_start
        ]
        
        # Check if limit exceeded
        if len(self.requests[identifier]) >= self.max_requests:
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        return True
    
    def get_remaining(self, identifier: str) -> int:
        """Get remaining requests for the identifier"""
        if identifier not in self.requests:
            return self.max_requests
        
        now = datetime.utcnow()
        window_start = now - timedelta(seconds=self.window_seconds)
        
        current_count = len([
            req_time for req_time in self.requests[identifier]
            if req_time > window_start
        ])
        
        return max(0, self.max_requests - current_count)


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "jti": secrets.token_urlsafe(16)  # JWT ID for token revocation
    })
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token"""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def generate_secure_token(length: int = 32) -> str:
    """Generate a cryptographically secure random token"""
    return secrets.token_urlsafe(length)


def constant_time_compare(val1: str, val2: str) -> bool:
    """Compare two strings in constant time to prevent timing attacks"""
    return hmac.compare_digest(val1.encode(), val2.encode())


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent XSS"""
    # Basic HTML entity encoding
    replacements = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&#x27;",
    }
    for char, replacement in replacements.items():
        text = text.replace(char, replacement)
    return text


def get_client_ip(request: Request) -> str:
    """Extract client IP address from request"""
    # Check for forwarded headers (when behind proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"


# Global rate limiter instance
rate_limiter = RateLimiter()


def rate_limit(max_requests: int = 100, window_seconds: int = 60):
    """Decorator for rate limiting endpoints"""
    limiter = RateLimiter(max_requests, window_seconds)
    
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            client_ip = get_client_ip(request)
            
            if not limiter.is_allowed(client_ip):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please try again later."
                )
            
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

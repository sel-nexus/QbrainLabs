import asyncio
import base64
import json
from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import union
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from datetime import datetime, timedelta
from typing import Optional, List
import jwt

from app.core.database import get_db
from app.models.models import User, UserRole, AccountStatus, Workshop
from app.models.rbac import WorkshopFacilitator
from app.schemas.auth import UserCreate, UserLogin, UserResponse, Token
from app.schemas.rbac import (
    FacilitatorRegisterRequest,
    UserWithRoleResponse,
    TokenWithRoleResponse
)
from app.core.config import settings
# Use centralized password functions from security module
from app.core.security import hash_password, verify_password, PasswordValidator

router = APIRouter(prefix="/api/auth", tags=["authentication"])

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# JWT Configuration - Use single source of truth from settings
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token with role and status"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow()
    })
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_user_workshop_ids(user_id: str, db: AsyncSession) -> List[str]:
    """Get list of workshop IDs the user can access - optimized with UNION query"""
    # Use UNION to combine both queries in a single database round trip
    owned_query = select(Workshop.id).where(Workshop.facilitator_id == user_id)
    assigned_query = select(WorkshopFacilitator.workshop_id).where(
        WorkshopFacilitator.facilitator_id == user_id
    )
    
    # Execute union query
    result = await db.execute(union(owned_query, assigned_query))
    workshop_ids = [str(row[0]) for row in result.all()]
    
    return list(set(workshop_ids))  # Remove duplicates

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    """Get current authenticated user from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user


# Optional OAuth2 scheme that doesn't auto-raise on missing token
oauth2_scheme_optional = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get current authenticated user from JWT token, or None if not authenticated.
    Does not raise an exception if token is missing or invalid.
    """
    if not token:
        return None
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
    except jwt.PyJWTError:
        return None
    
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    return user

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Check if the current user is active (admins bypass this)"""
    if not current_user.is_admin_user and current_user.status != AccountStatus.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active"
        )
    return current_user

# Aliases for compatibility
get_optional_user = get_current_user_optional

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new facilitator account
    """
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user with pending status (requires admin approval)
    hashed_password = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
        full_name=user_data.full_name,
        organization=getattr(user_data, 'organization', None),  # Optional field
        role=UserRole.FACILITATOR.value,
        status=AccountStatus.PENDING.value,
        is_admin=False
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return UserResponse(
        id=str(new_user.id),
        email=new_user.email,
        full_name=new_user.full_name
    )

async def _authenticate_user(
    email: str,
    password: str,
    db: AsyncSession
) -> TokenWithRoleResponse:
    """Shared authentication logic used by both form-based and JSON login endpoints."""
    from app.core.logging import get_logger
    logger = get_logger("auth")

    masked_email = (email[:2] + "***@***.***") if "@" in email else "INVALID_EMAIL"
    logger.info(f"Login attempt for user: {masked_email}")

    try:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()

        if user:
            logger.info(f"User found: {masked_email} (ID: {user.id})")
        else:
            logger.warning(f"User not found: {masked_email}")

    except (SQLAlchemyError, OperationalError) as e:
        logger.error(f"Database error during login for {masked_email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection unavailable. Please try again later.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user:
        logger.warning(f"Failed login attempt for {masked_email}: user not found")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    verified, workshop_ids = await asyncio.gather(
        asyncio.to_thread(verify_password, password, user.password_hash),
        get_user_workshop_ids(str(user.id), db),
    )
    if not verified:
        logger.warning(f"Failed login attempt for {masked_email}: invalid password")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(f"Password verified for {masked_email}")

    if not user.is_admin_user:
        if user.status == AccountStatus.DISABLED.value:
            logger.warning(f"Login blocked: Account disabled for {masked_email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been disabled. Please contact your administrator."
            )
        elif user.status == AccountStatus.SUSPENDED.value:
            logger.warning(f"Login blocked: Account suspended for {masked_email}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been suspended. Please contact your administrator."
            )

    try:
        user.last_login = datetime.utcnow()
        await db.commit()
    except (SQLAlchemyError, OperationalError) as e:
        logger.error(f"Error updating login stats for {masked_email}: {str(e)}")
        try:
            await db.rollback()
        except Exception:
            pass

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
            "status": user.status,
            "user_id": str(user.id),
            "is_admin": user.is_admin_user
        },
        expires_delta=access_token_expires
    )

    logger.info(f"Login successful for {masked_email}. Token generated.")

    return TokenWithRoleResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserWithRoleResponse(
            id=str(user.id),
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            status=user.status,
            is_admin=user.is_admin_user,
            organization=user.organization,
            mfa_enabled=user.mfa_enabled,
            last_login=user.last_login
        ),
        assigned_workshops=workshop_ids
    )


@router.post("/login", response_model=TokenWithRoleResponse)
async def login(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Login with email and password.
    Accepts JSON (with optional Base64 encoding) and form-encoded bodies.
    The Base64-encoded JSON variant ({"data": "<b64>"}) prevents corporate DLP
    proxies (Zscaler, etc.) from pattern-matching credential field names.
    """
    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        body = await request.json()
        if "data" in body and isinstance(body["data"], str):
            try:
                decoded = json.loads(base64.b64decode(body["data"]).decode("utf-8"))
                email = decoded.get("email") or decoded.get("username") or ""
                password = decoded.get("password") or ""
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid encoded login payload.",
                )
        else:
            email = body.get("email") or body.get("username") or ""
            password = body.get("password") or ""
    else:
        form = await request.form()
        email = form.get("username") or form.get("email") or ""
        password = form.get("password") or ""

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email/username and password are required.",
        )

    return await _authenticate_user(str(email), str(password), db)

@router.get("/me", response_model=UserWithRoleResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current logged-in user information with role details
    """
    return UserWithRoleResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        status=current_user.status,
        is_admin=current_user.is_admin_user,
        organization=current_user.organization,
        mfa_enabled=current_user.mfa_enabled,
        last_login=current_user.last_login
    )

@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    current_password: str = Form(...),
    new_password: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Change password for the current authenticated user
    """
    # Verify current password
    if not verify_password(current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password using PasswordValidator
    validation_result = PasswordValidator.validate(new_password)
    if not validation_result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "Password validation failed",
                "errors": validation_result["errors"],
                "strength": validation_result["strength"]
            }
        )
    
    # Update password
    current_user.password_hash = hash_password(new_password)
    await db.commit()
    
    return {"message": "Password changed successfully"}


@router.post("/register", response_model=UserWithRoleResponse, status_code=status.HTTP_201_CREATED)
async def register_facilitator(
    registration: FacilitatorRegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new facilitator account.
    Account will be in 'pending' status until approved by an admin.
    US32: Includes rate limiting (10/day, 20/week, 50/month).
    """
    # US32: Check rate limits before registration
    from app.services.rate_limiting import (
        check_registration_rate_limit,
        log_registration,
        RateLimitExceeded
    )
    
    try:
        await check_registration_rate_limit(db)
    except RateLimitExceeded as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "REGISTRATION_RATE_LIMIT_EXCEEDED",
                "message": "Maximum facilitator registrations reached for this period.",
                "limit_type": e.limit_type,
                "limit": e.limit,
                "current_count": e.current_count,
                "reset_at": e.reset_at.isoformat(),
                "next_available_in_seconds": e.next_available_in_seconds
            }
        )
    
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == registration.email))
    existing_user = result.scalars().first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new facilitator (pending approval)
    hashed_password = hash_password(registration.password)
    new_user = User(
        email=registration.email,
        password_hash=hashed_password,
        full_name=registration.full_name,
        organization=registration.organization,
        role=UserRole.FACILITATOR.value,
        status=AccountStatus.PENDING.value,
        is_admin=False
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # US32: Log the registration for rate limiting
    await log_registration(db, registration.email, request)
    
    # Log the registration action
    from app.middleware.rbac import log_role_action
    await log_role_action(
        db=db,
        action="facilitator_registered",
        user_id=str(new_user.id),
        new_value={
            "email": new_user.email,
            "full_name": new_user.full_name,
            "organization": new_user.organization,
            "status": new_user.status
        },
        request=request,
        details=f"New facilitator registration: {new_user.email}"
    )
    
    return UserWithRoleResponse(
        id=str(new_user.id),
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        status=new_user.status,
        is_admin=False,
        organization=new_user.organization,
        mfa_enabled=False,
        last_login=None
    )


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Logout current session.
    Note: JWT tokens are stateless, so this primarily logs the action.
    Client should discard the token.
    """
    from app.middleware.rbac import log_role_action
    await log_role_action(
        db=db,
        action="user_logout",
        user_id=str(current_user.id),
        request=request,
        details=f"User {current_user.email} logged out"
    )
    
    return {"message": "Logged out successfully"}


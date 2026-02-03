"""
Participant Authentication API Endpoints
Supports both anonymous and registered participation modes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Form, Request, Header
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
import jwt

from app.core.database import get_db
from app.models.models import Participant, Workshop, UseCase, Vote
from app.models.participant_user import RegisteredParticipant, ParticipantWorkshopLink
from app.schemas.participant_auth import (
    ParticipantRegister, ParticipantLogin, ParticipantAnonymousJoin,
    ParticipantRegisteredJoin, ParticipantResponse, ParticipantToken,
    ParticipantProfile, ParticipantStats, ParticipantContribution, ParticipantMode
)
from app.core.config import settings
from app.middleware.error_handler import (
    NotFoundException, ValidationException, AuthenticationException, ConflictException
)

router = APIRouter(prefix="/api/participant-auth", tags=["participant-authentication"])

# OAuth2 scheme for participant token authentication
participant_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/participant-auth/login", auto_error=False)

# JWT Configuration
SECRET_KEY = settings.SECRET_KEY if hasattr(settings, 'SECRET_KEY') else "your-secret-key-change-in-production"
ALGORITHM = "HS256"
PARTICIPANT_TOKEN_EXPIRE_DAYS = 90


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def create_participant_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token for participants"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=PARTICIPANT_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "participant"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_participant_token_from_header(
    authorization: Optional[str] = Header(None)
) -> Optional[str]:
    """Extract Bearer token from Authorization header"""
    if not authorization:
        return None
    if authorization.startswith("Bearer "):
        return authorization[7:]
    return None


async def get_current_participant(
    token: Optional[str] = Depends(get_participant_token_from_header),
    db: AsyncSession = Depends(get_db)
) -> Optional[RegisteredParticipant]:
    """Get current authenticated participant from JWT token"""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "participant":
            return None
        participant_id = payload.get("sub")
        if not participant_id:
            return None
        
        result = await db.execute(
            select(RegisteredParticipant).where(RegisteredParticipant.id == participant_id)
        )
        return result.scalars().first()
    except jwt.PyJWTError as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"JWT decode error: {e}")
        return None


@router.post("/register", response_model=ParticipantToken, status_code=status.HTTP_201_CREATED)
async def register_participant(
    data: ParticipantRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new participant account.
    Allows participants to track their contributions across workshops.
    """
    # Check if email already exists
    result = await db.execute(
        select(RegisteredParticipant).where(RegisteredParticipant.email == data.email)
    )
    if result.scalars().first():
        raise ConflictException("Email already registered")
    
    # Create new registered participant
    hashed_password = hash_password(data.password)
    new_participant = RegisteredParticipant(
        email=data.email,
        password_hash=hashed_password,
        display_name=data.display_name,
        organization=data.organization
    )
    
    db.add(new_participant)
    await db.commit()
    await db.refresh(new_participant)
    
    # Create token
    access_token = create_participant_token({"sub": str(new_participant.id)})
    
    return ParticipantToken(
        access_token=access_token,
        participant=ParticipantResponse(
            id=str(new_participant.id),
            email=new_participant.email,
            display_name=new_participant.display_name,
            organization=new_participant.organization,
            is_registered=True,
            total_workshops_attended=0,
            total_use_cases_submitted=0,
            total_votes_cast=0
        ),
        mode=ParticipantMode.REGISTERED
    )


@router.post("/login", response_model=ParticipantToken)
async def login_participant(
    data: ParticipantLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Login an existing participant.
    """
    from app.core.logging import get_logger
    logger = get_logger("participant_auth")
    masked_email = data.email[:3] + "***" + data.email.split("@")[-1] if "@" in data.email else "INVALID"
    
    logger.info(f"Participant login attempt: {masked_email}")

    try:
        result = await db.execute(
            select(RegisteredParticipant).where(RegisteredParticipant.email == data.email)
        )
        participant = result.scalars().first()
        
        if not participant:
            logger.warning(f"Participant not found: {masked_email}")
        
    except Exception as e:
        logger.error(f"Database error during participant login {masked_email}: {str(e)}")
        raise

    if not participant or not verify_password(data.password, participant.password_hash):
        logger.warning(f"Invalid credentials for participant: {masked_email}")
        raise AuthenticationException("Invalid email or password")
    
    if not participant.is_active:
        logger.warning(f"Deactivated participant account: {masked_email}")
        raise AuthenticationException("Account is deactivated")
    
    # Update last login
    participant.last_login_at = datetime.utcnow()
    await db.commit()
    
    # Create token
    access_token = create_participant_token({"sub": str(participant.id)})
    
    logger.info(f"Participant logged in successfully: {masked_email}")
    
    return ParticipantToken(
        access_token=access_token,
        participant=ParticipantResponse(
            id=str(participant.id),
            email=participant.email,
            display_name=participant.display_name,
            organization=participant.organization,
            is_registered=True,
            total_workshops_attended=participant.total_workshops_attended,
            total_use_cases_submitted=participant.total_use_cases_submitted,
            total_votes_cast=participant.total_votes_cast
        ),
        mode=ParticipantMode.REGISTERED
    )


@router.post("/join-anonymous", response_model=ParticipantToken)
async def join_workshop_anonymous(
    data: ParticipantAnonymousJoin,
    db: AsyncSession = Depends(get_db)
):
    """
    Join a workshop anonymously (no account required).
    Creates a session-based participant.
    """
    from app.core.logging import get_logger
    logger = get_logger("participant_auth")
    
    logger.info(f"Anonymous join request for PIN: {data.workshop_pin} by '{data.display_name}'")

    # Find workshop by PIN
    result = await db.execute(
        select(Workshop).where(Workshop.pin == data.workshop_pin)
    )
    workshop = result.scalars().first()
    
    if not workshop:
        logger.warning(f"Workshop not found for PIN: {data.workshop_pin}")
        raise NotFoundException("Workshop", data.workshop_pin)
    
    if workshop.status not in ["OPEN", "IN_PROGRESS"]:
        logger.warning(f"Workshop {data.workshop_pin} not open. Status: {workshop.status}")
        raise ValidationException("Workshop is not accepting participants")
    
    try:
        # Create anonymous participant
        participant = Participant(
            workshop_id=workshop.id,
            display_name=data.display_name,
            role="PARTICIPANT"
        )
        
        db.add(participant)
        await db.commit()
        await db.refresh(participant)
        
        # Create token (short-lived for anonymous)
        access_token = create_participant_token(
            {"sub": str(participant.id), "workshop_id": str(workshop.id), "anonymous": True},
            expires_delta=timedelta(hours=24)
        )
        
        logger.info(f"Anonymous participant joined successfully. ID: {participant.id}")
        
        return ParticipantToken(
            access_token=access_token,
            participant=ParticipantResponse(
                id=str(participant.id),
                display_name=participant.display_name,
                is_registered=False
            ),
            mode=ParticipantMode.ANONYMOUS
        )
    except Exception as e:
        logger.error(f"Error joining anonymous participant: {str(e)}")
        raise


@router.post("/join-registered", response_model=ParticipantToken)
async def join_workshop_registered(
    data: ParticipantRegisteredJoin,
    registered_participant: Optional[RegisteredParticipant] = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db)
):
    """
    Join a workshop as a registered participant.
    Links the workshop participation to the registered account.
    """
    from app.core.logging import get_logger
    logger = get_logger("participant_auth")
    
    if not registered_participant:
        logger.warning("Unauthenticated registered join attempt")
        raise AuthenticationException("Authentication required. Please provide a valid participant token.")
    
    logger.info(f"Registered participant joining workshop {data.workshop_pin}. User: {registered_participant.email}")

    # Find workshop by PIN
    result = await db.execute(
        select(Workshop).where(Workshop.pin == data.workshop_pin)
    )
    workshop = result.scalars().first()
    
    if not workshop:
        logger.warning(f"Workshop not found for PIN: {data.workshop_pin}")
        raise NotFoundException("Workshop", data.workshop_pin)
    
    if workshop.status not in ["OPEN", "IN_PROGRESS"]:
        logger.warning(f"Workshop {data.workshop_pin} not accepting participants (Status: {workshop.status})")
        raise ValidationException("Workshop is not accepting participants")
    
    # Check if already joined this workshop
    existing_link = await db.execute(
        select(ParticipantWorkshopLink).where(
            ParticipantWorkshopLink.registered_participant_id == registered_participant.id,
            ParticipantWorkshopLink.workshop_id == workshop.id
        )
    )
    if existing_link.scalars().first():
        logger.info(f"Participant {registered_participant.email} already joined workshop {data.workshop_pin}")
        raise ConflictException("Already joined this workshop")
    
    try:
        # Create participant entry
        participant = Participant(
            workshop_id=workshop.id,
            display_name=registered_participant.display_name,
            role="PARTICIPANT"
        )
        db.add(participant)
        await db.flush()
        
        # Link to registered account
        link = ParticipantWorkshopLink(
            registered_participant_id=registered_participant.id,
            participant_id=participant.id,
            workshop_id=workshop.id
        )
        db.add(link)
        
        # Update statistics
        registered_participant.total_workshops_attended += 1
        
        await db.commit()
        await db.refresh(participant)
        
        # Create new token with workshop context
        access_token = create_participant_token({
            "sub": str(registered_participant.id),
            "participant_id": str(participant.id),
            "workshop_id": str(workshop.id)
        })
        
        logger.info(f"Registered participant successfully joined workshop {data.workshop_pin}")
        
        return ParticipantToken(
            access_token=access_token,
            participant=ParticipantResponse(
                id=str(participant.id),
                email=registered_participant.email,
                display_name=registered_participant.display_name,
                organization=registered_participant.organization,
                is_registered=True,
                total_workshops_attended=registered_participant.total_workshops_attended,
                total_use_cases_submitted=registered_participant.total_use_cases_submitted,
                total_votes_cast=registered_participant.total_votes_cast
            ),
            mode=ParticipantMode.REGISTERED
        )
    except Exception as e:
        logger.error(f"Error joining registered participant: {str(e)}")
        raise


@router.get("/me", response_model=ParticipantResponse)
async def get_participant_profile(
    registered_participant: RegisteredParticipant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current participant profile.
    """
    if not registered_participant:
        raise AuthenticationException("Invalid or expired token")
    
    return ParticipantResponse(
        id=str(registered_participant.id),
        email=registered_participant.email,
        display_name=registered_participant.display_name,
        organization=registered_participant.organization,
        is_registered=True,
        total_workshops_attended=registered_participant.total_workshops_attended,
        total_use_cases_submitted=registered_participant.total_use_cases_submitted,
        total_votes_cast=registered_participant.total_votes_cast
    )


@router.put("/profile", response_model=ParticipantResponse)
async def update_participant_profile(
    profile: ParticipantProfile,
    registered_participant: RegisteredParticipant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db)
):
    """
    Update participant profile.
    """
    if not registered_participant:
        raise AuthenticationException("Invalid or expired token")
    
    if profile.display_name:
        registered_participant.display_name = profile.display_name
    if profile.organization is not None:
        registered_participant.organization = profile.organization
    
    await db.commit()
    await db.refresh(registered_participant)
    
    return ParticipantResponse(
        id=str(registered_participant.id),
        email=registered_participant.email,
        display_name=registered_participant.display_name,
        organization=registered_participant.organization,
        is_registered=True,
        total_workshops_attended=registered_participant.total_workshops_attended,
        total_use_cases_submitted=registered_participant.total_use_cases_submitted,
        total_votes_cast=registered_participant.total_votes_cast
    )


@router.get("/stats", response_model=ParticipantStats)
async def get_participant_stats(
    registered_participant: RegisteredParticipant = Depends(get_current_participant),
    db: AsyncSession = Depends(get_db)
):
    """
    Get participant contribution statistics and history.
    """
    if not registered_participant:
        raise AuthenticationException("Invalid or expired token")
    
    # Get workshop participation history
    result = await db.execute(
        select(ParticipantWorkshopLink)
        .where(ParticipantWorkshopLink.registered_participant_id == registered_participant.id)
        .order_by(ParticipantWorkshopLink.joined_at.desc())
    )
    links = result.scalars().all()
    
    contributions = []
    for link in links:
        # Get workshop details
        workshop_result = await db.execute(
            select(Workshop).where(Workshop.id == link.workshop_id)
        )
        workshop = workshop_result.scalars().first()
        
        if workshop:
            contributions.append(ParticipantContribution(
                workshop_id=str(link.workshop_id),
                workshop_title=workshop.title,
                joined_at=link.joined_at.isoformat() if link.joined_at else "",
                use_cases_submitted=link.use_cases_submitted,
                votes_cast=link.votes_cast,
                role="PARTICIPANT"
            ))
    
    return ParticipantStats(
        total_workshops=registered_participant.total_workshops_attended,
        total_use_cases=registered_participant.total_use_cases_submitted,
        total_votes=registered_participant.total_votes_cast,
        contribution_history=contributions
    )

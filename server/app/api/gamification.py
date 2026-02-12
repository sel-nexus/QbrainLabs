from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, desc
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.models.gamification import ParticipantPoint, Badge, ParticipantBadge, BadgeRarity
from app.models.models import Participant, UseCase
from app.schemas.gamification import (
    PointsResponse, 
    BadgeResponse, 
    EarnedBadgeResponse, 
    LeaderboardResponse, 
    LeaderboardEntry,
    PointActionRequest,
    PointEarnedResponse
)
from app.core.socket_manager import sio
import uuid

router = APIRouter()

# Points values for different actions
POINTS_VALUES = {
    "submit_use_case": 100,
    "vote": 10,
    "first_to_submit": 50,
    "quality_bonus": 25,  # Base quality bonus, can be adjusted
    "speed_bonus": 15,
    "consistency_bonus": 20,
    "collaboration_bonus": 30,
    "session_completion": 150
}

async def check_and_award_badges(
    participant_id: str,
    workshop_id: str,
    action: str,
    db: AsyncSession,
    metadata: dict = None
) -> List[str]:
    """Check if participant qualifies for any badges and award them."""
    newly_earned = []
    
    # Get participant's stats
    use_case_count_result = await db.execute(
        select(func.count(UseCase.id))
        .where(UseCase.participant_id == participant_id)
        .where(UseCase.workshop_id == workshop_id)
    )
    use_case_count = use_case_count_result.scalar() or 0
    
    points_result = await db.execute(
        select(func.sum(ParticipantPoint.points))
        .where(ParticipantPoint.participant_id == participant_id)
        .where(ParticipantPoint.workshop_id == workshop_id)
    )
    total_points = points_result.scalar() or 0
    
    # Check for "First Contributor" badge
    if action == "submit_use_case":
        # Check if this is the first use case in the workshop
        first_use_case_result = await db.execute(
            select(UseCase)
            .where(UseCase.workshop_id == workshop_id)
            .order_by(UseCase.created_at)
            .limit(1)
        )
        first_use_case = first_use_case_result.scalar_one_or_none()
        if first_use_case and str(first_use_case.participant_id) == participant_id:
            badge_result = await db.execute(
                select(Badge).where(Badge.name == "First Contributor")
            )
            badge = badge_result.scalar_one_or_none()
            if badge:
                # Check if already earned
                existing_result = await db.execute(
                    select(ParticipantBadge)
                    .where(ParticipantBadge.participant_id == participant_id)
                    .where(ParticipantBadge.badge_id == badge.id)
                )
                if not existing_result.scalar_one_or_none():
                    participant_badge = ParticipantBadge(
                        id=uuid.uuid4(),
                        participant_id=participant_id,
                        badge_id=badge.id,
                        workshop_id=workshop_id
                    )
                    db.add(participant_badge)
                    newly_earned.append("First Contributor")
    
    # Check for "Idea Generator" badge (5+ use cases)
    if use_case_count >= 5:
        badge_result = await db.execute(
            select(Badge).where(Badge.name == "Idea Generator")
        )
        badge = badge_result.scalar_one_or_none()
        if badge:
            existing_result = await db.execute(
                select(ParticipantBadge)
                .where(ParticipantBadge.participant_id == participant_id)
                .where(ParticipantBadge.badge_id == badge.id)
            )
            if not existing_result.scalar_one_or_none():
                participant_badge = ParticipantBadge(
                    id=uuid.uuid4(),
                    participant_id=participant_id,
                    badge_id=badge.id,
                    workshop_id=workshop_id
                )
                db.add(participant_badge)
                newly_earned.append("Idea Generator")
    
    await db.commit()
    return newly_earned


async def service_award_points(
    participant_id: str,
    workshop_id: str,
    action: str,
    db: AsyncSession,
    metadata: dict = None
) -> PointEarnedResponse:
    """Internal service to award points and check badges."""
    # Determine points based on action
    base_points = POINTS_VALUES.get(action, 0)
    
    # Apply bonuses from metadata if present
    bonus_points = 0
    if metadata:
        if metadata.get("quality_bonus"):
            bonus_points += metadata.get("quality_bonus", 0)
        if metadata.get("speed_bonus"):
            bonus_points += POINTS_VALUES.get("speed_bonus", 0)
        if metadata.get("consistency_bonus"):
            bonus_points += POINTS_VALUES.get("consistency_bonus", 0)
        if metadata.get("collaboration_bonus"):
            bonus_points += POINTS_VALUES.get("collaboration_bonus", 0)
    
    total_points_earned = base_points + bonus_points
    
    if total_points_earned == 0:
        # No points for this action, but maybe badges? 
        # For now, if 0 points, we might still want to record it? 
        # But usually we only record if points > 0 or specific tracking.
        # Let's record it.
        pass

    # Create point record
    point_record = ParticipantPoint(
        id=uuid.uuid4(),
        participant_id=participant_id,
        workshop_id=workshop_id,
        points=total_points_earned,
        action=action,
        action_metadata=metadata
    )
    db.add(point_record)
    # We don't commit here, we let the caller handle transaction or we flush?
    # Actually, for async flows, it's better if we commit to ensure it's saved.
    # But if called from another transaction, we might want to join it.
    # For simplicity in this codebase, we will commit/flush.
    await db.commit()
    
    # Check for badges
    newly_earned_badges = await check_and_award_badges(
        participant_id,
        workshop_id,
        action,
        db,
        metadata
    )
    
    # Get new total
    total_result = await db.execute(
        select(func.sum(ParticipantPoint.points))
        .where(ParticipantPoint.participant_id == participant_id)
        .where(ParticipantPoint.workshop_id == workshop_id)
    )
    new_total = total_result.scalar() or 0
    
    # Broadcast via WebSocket
    try:
        if total_points_earned > 0:
            await sio.emit(
                'gamification:points_earned',
                {
                    'participant_id': str(participant_id),
                    'points': total_points_earned,
                    'new_total': new_total,
                    'action': action
                },
                room=str(workshop_id)
            )
        
        # Broadcast badge unlocks
        if newly_earned_badges:
            for badge_name in newly_earned_badges:
                await sio.emit(
                    'gamification:badge_unlocked',
                    {
                        'participant_id': str(participant_id),
                        'badge_name': badge_name
                    },
                    room=str(workshop_id)
                )
    except Exception as ws_error:
        print(f"WebSocket broadcast error: {ws_error}")
    
    return PointEarnedResponse(
        new_total=new_total,
        points_earned=total_points_earned,
        achievements_unlocked=newly_earned_badges
    )

@router.post("/points", response_model=PointEarnedResponse, status_code=status.HTTP_201_CREATED)
async def award_points(
    request: PointActionRequest,
    db: AsyncSession = Depends(get_db)
):
    """Award points to a participant for an action."""
    try:
        # Validate participant and workshop exist
        from app.models.models import Participant, Workshop
        
        # Check if participant exists
        participant_result = await db.execute(
            select(Participant).where(Participant.id == request.participant_id)
        )
        participant = participant_result.scalar_one_or_none()
        if not participant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Participant {request.participant_id} not found"
            )
        
        # Check if workshop exists
        workshop_result = await db.execute(
            select(Workshop).where(Workshop.id == request.workshop_id)
        )
        workshop = workshop_result.scalar_one_or_none()
        if not workshop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workshop {request.workshop_id} not found"
            )
        
        return await service_award_points(
            str(request.participant_id),
            str(request.workshop_id),
            request.action,
            db,
            request.metadata
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log the error and return a proper error response
        import traceback
        error_details = traceback.format_exc()
        print(f"Error awarding points: {str(e)}")
        print(error_details)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to award points: {str(e)}"
        )

@router.get("/points/{participant_id}", response_model=PointsResponse)
async def get_participant_points(
    participant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get points for a participant."""
    # Convert string uuid to UUID object if needed, though SQLAlchemy usually handles str
    
    # 1. Total Points (All time - simplified for now to Workshop specific logic mainly, but model supports all)
    # Actually, Points are linked to Workshop. If we want cross-workshop, we sum by participant link (which we don't have strictly unified yet for anonymous users)
    # Sticking to Workshop Session logic as per current MVP architecture where Participant is unique per workshop.
    
    result = await db.execute(
        select(func.sum(ParticipantPoint.points))
        .where(ParticipantPoint.participant_id == participant_id)
    )
    total_points = result.scalar() or 0
    
    # Breakdown
    history_result = await db.execute(
        select(ParticipantPoint)
        .where(ParticipantPoint.participant_id == participant_id)
        .order_by(desc(ParticipantPoint.created_at))
    )
    history = history_result.scalars().all()
    
    breakdown = [
        {
            "action": h.action,
            "points": h.points,
            "earned_at": h.created_at,
            "metadata": h.action_metadata
        }
        for h in history
    ]
    
    return PointsResponse(
        total_points=total_points,
        session_points=total_points, # Same for now as Participant is scoped to Workshop
        breakdown=breakdown
    )

@router.get("/badges", response_model=List[BadgeResponse])
async def get_all_badges(
    db: AsyncSession = Depends(get_db)
):
    """List all available badges."""
    result = await db.execute(select(Badge))
    return result.scalars().all()

@router.get("/badges/{participant_id}", response_model=List[EarnedBadgeResponse])
async def get_earned_badges(
    participant_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get badges earned by a participant."""
    result = await db.execute(
        select(ParticipantBadge, Badge)
        .join(Badge, ParticipantBadge.badge_id == Badge.id)
        .where(ParticipantBadge.participant_id == participant_id)
        .order_by(desc(ParticipantBadge.earned_at))
    )
    
    earned_badges = []
    for pb, badge in result.all():
        # Create response with nested badge
        earned_badges.append({
            "id": str(pb.id),
            "badge": {
                "id": str(badge.id),
                "name": badge.name,
                "icon": badge.icon or "🏅",
                "description": badge.description,
                "rarity": badge.rarity,
                "criteria": badge.criteria,
                "created_at": badge.created_at
            },
            "earned_at": pb.earned_at,
            "workshop_id": str(pb.workshop_id)
        })
    
    return earned_badges

@router.get("/workshops/{identifier}/leaderboard", response_model=LeaderboardResponse)
async def get_workshop_leaderboard(
    identifier: str,
    db: AsyncSession = Depends(get_db)
):
    """Get leaderboard for a workshop. Accepts PIN or workshop ID."""
    from app.models.models import Workshop
    import uuid
    
    # Try to parse as UUID first (workshop ID), otherwise treat as PIN
    try:
        workshop_id = uuid.UUID(identifier)
        w_result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
    except ValueError:
        w_result = await db.execute(select(Workshop).where(Workshop.pin == identifier))
    
    workshop = w_result.scalars().first()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
        
    # Aggregate points per participant in this workshop
    # Join with Participant to get display_name
    
    # Get points per participant
    points_stmt = (
        select(
            ParticipantPoint.participant_id,
            func.sum(ParticipantPoint.points).label("total_points")
        )
        .where(ParticipantPoint.workshop_id == workshop.id)
        .group_by(ParticipantPoint.participant_id)
    )
    points_results = await db.execute(points_stmt)
    points_dict = {str(p_id): points for p_id, points in points_results.all()}
    
    # Get badge counts per participant
    badges_stmt = (
        select(
            ParticipantBadge.participant_id,
            func.count(ParticipantBadge.id).label("badge_count")
        )
        .where(ParticipantBadge.workshop_id == workshop.id)
        .group_by(ParticipantBadge.participant_id)
    )
    badges_results = await db.execute(badges_stmt)
    badges_dict = {str(p_id): count for p_id, count in badges_results.all()}
    
    # Get all participants in workshop
    participants_result = await db.execute(
        select(Participant)
        .where(Participant.workshop_id == workshop.id)
    )
    participants = participants_result.scalars().all()
    
    # Build rankings
    rankings_data = []
    for p in participants:
        p_id_str = str(p.id)
        points = points_dict.get(p_id_str, 0)
        badges = badges_dict.get(p_id_str, 0)
        rankings_data.append({
            'participant_id': p.id,
            'display_name': p.display_name,
            'points': points,
            'badges': badges
        })
    
    # Sort by points descending
    rankings_data.sort(key=lambda x: x['points'], reverse=True)
    
    rankings = []
    for rank, data in enumerate(rankings_data, 1):
        rankings.append(LeaderboardEntry(
            rank=rank,
            participant_id=str(data['participant_id']),
            display_name=data['display_name'],
            points=data['points'],
            badges_count=data['badges']
        ))
        
    return LeaderboardResponse(rankings=rankings)

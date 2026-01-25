"""
Breakout Rooms API (US18)
Endpoints for creating and managing breakout rooms, collaborative activities, and results aggregation
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, and_, or_
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import uuid

from app.core.database import get_db
from app.models import User, Workshop, Participant
from app.models.breakout import (
    BreakoutRoom,
    BreakoutRoomStatus,
    RoomAssignment,
    CanvasItem,
    CanvasVote,
    RoomMessage
)
from app.api.auth import get_current_user

router = APIRouter()


# ==================== Schemas ====================

class BreakoutRoomCreate(BaseModel):
    room_count: Optional[int] = None  # Auto if None
    max_capacity: int = 8
    duration_minutes: int = 15
    assignment_method: str = "random"  # random, self_select, balanced, round_robin
    room_names: Optional[List[str]] = None
    activity_type: Optional[str] = None
    auto_return: bool = True


class BreakoutRoomResponse(BaseModel):
    id: str
    workshop_id: str
    name: str
    max_capacity: int
    activity_type: Optional[str]
    status: str
    started_at: Optional[str]
    ended_at: Optional[str]
    duration_minutes: Optional[int]
    assignment_method: Optional[str]
    auto_return: bool
    participant_count: int

    class Config:
        from_attributes = True


class RoomAssignmentResponse(BaseModel):
    id: str
    room_id: str
    participant_id: str
    participant_name: str
    joined_at: str

    class Config:
        from_attributes = True


class CanvasItemCreate(BaseModel):
    content: str
    item_type: str  # sticky, text, shape
    position: Optional[dict] = None
    color: Optional[str] = None
    category: Optional[str] = None


class CanvasItemResponse(BaseModel):
    id: str
    room_id: str
    participant_id: str
    participant_name: str
    content: str
    item_type: str
    position: Optional[dict]
    color: Optional[str]
    category: Optional[str]
    vote_count: int
    created_at: str

    class Config:
        from_attributes = True


class RoomMessageCreate(BaseModel):
    content: str


class RoomMessageResponse(BaseModel):
    id: str
    room_id: str
    participant_id: str
    participant_name: str
    content: str
    is_pinned: bool
    created_at: str

    class Config:
        from_attributes = True


class BroadcastRequest(BaseModel):
    message: str
    priority: str = "normal"  # normal, urgent


class ExtendTimeRequest(BaseModel):
    additional_minutes: int


class MoveParticipantRequest(BaseModel):
    participant_id: str
    from_room_id: str
    to_room_id: str


# ==================== Helper Functions ====================

async def verify_facilitator_access(workshop_id: str, user: User, db: AsyncSession) -> Workshop:
    """Verify user has facilitator access to workshop."""
    result = await db.execute(
        select(Workshop).where(Workshop.id == workshop_id)
    )
    workshop = result.scalar_one_or_none()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    if str(workshop.facilitator_id) != str(user.id) and not user.is_admin_user:
        raise HTTPException(status_code=403, detail="Not authorized to manage this workshop")
    
    return workshop


async def get_participant_count(room_id: str, db: AsyncSession) -> int:
    """Get current participant count for a room."""
    result = await db.execute(
        select(func.count(RoomAssignment.id)).where(
            and_(
                RoomAssignment.room_id == room_id,
                RoomAssignment.left_at.is_(None)
            )
        )
    )
    return result.scalar_one() or 0


# ==================== Room Management ====================

@router.post("/workshops/{workshop_id}/breakout-rooms", response_model=List[BreakoutRoomResponse])
async def create_breakout_rooms(
    workshop_id: str,
    request: BreakoutRoomCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create breakout rooms for a workshop."""
    workshop = await verify_facilitator_access(workshop_id, current_user, db)
    
    # Get all participants
    result = await db.execute(
        select(Participant).where(Participant.workshop_id == workshop_id)
    )
    participants = result.scalars().all()
    
    if not participants:
        raise HTTPException(status_code=400, detail="No participants in workshop")
    
    # Determine room count
    participant_count = len(participants)
    if request.room_count:
        room_count = request.room_count
    else:
        # Auto: 5-8 participants per room
        room_count = max(2, (participant_count + 6) // 7)
    
    # Create rooms
    rooms = []
    room_names = request.room_names or [f"Room {chr(65 + i)}" for i in range(room_count)]
    
    for i in range(room_count):
        room = BreakoutRoom(
            id=uuid.uuid4(),
            workshop_id=workshop.id,
            name=room_names[i] if i < len(room_names) else f"Room {i + 1}",
            max_capacity=request.max_capacity,
            activity_type=request.activity_type,
            duration_minutes=request.duration_minutes,
            assignment_method=request.assignment_method,
            auto_return=request.auto_return,
            status=BreakoutRoomStatus.PENDING
        )
        db.add(room)
        rooms.append(room)
    
    await db.flush()
    
    # Assign participants
    if request.assignment_method == "random":
        import random
        shuffled = list(participants)
        random.shuffle(shuffled)
        for i, participant in enumerate(shuffled):
            room_idx = i % room_count
            assignment = RoomAssignment(
                id=uuid.uuid4(),
                room_id=rooms[room_idx].id,
                participant_id=participant.id
            )
            db.add(assignment)
    elif request.assignment_method == "round_robin":
        for i, participant in enumerate(participants):
            room_idx = i % room_count
            assignment = RoomAssignment(
                id=uuid.uuid4(),
                room_id=rooms[room_idx].id,
                participant_id=participant.id
            )
            db.add(assignment)
    # For self_select, participants will join manually
    
    await db.commit()
    
    # Return rooms with participant counts
    room_responses = []
    for room in rooms:
        count = await get_participant_count(str(room.id), db)
        room_responses.append({
            **BreakoutRoomResponse.model_validate(room).model_dump(),
            "participant_count": count
        })
    
    return room_responses


@router.get("/workshops/{workshop_id}/breakout-rooms", response_model=List[BreakoutRoomResponse])
async def list_breakout_rooms(
    workshop_id: str,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """List all breakout rooms for a workshop."""
    workshop_result = await db.execute(
        select(Workshop).where(Workshop.id == workshop_id)
    )
    workshop = workshop_result.scalar_one_or_none()
    
    if not workshop:
        raise HTTPException(status_code=404, detail="Workshop not found")
    
    query = select(BreakoutRoom).where(BreakoutRoom.workshop_id == workshop_id)
    if status_filter:
        query = query.where(BreakoutRoom.status == status_filter)
    
    result = await db.execute(query)
    rooms = result.scalars().all()
    
    # Add participant counts
    room_responses = []
    for room in rooms:
        count = await get_participant_count(str(room.id), db)
        room_responses.append({
            **BreakoutRoomResponse.model_validate(room).model_dump(),
            "participant_count": count
        })
    
    return room_responses


@router.post("/breakout-rooms/{room_id}/join")
async def join_breakout_room(
    room_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Join a breakout room (for self-select mode)."""
    # Get room
    result = await db.execute(
        select(BreakoutRoom).where(BreakoutRoom.id == room_id)
    )
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Check capacity
    current_count = await get_participant_count(room_id, db)
    if current_count >= room.max_capacity:
        raise HTTPException(status_code=400, detail="Room is at capacity")
    
    # Get participant (for now, using session-based participant lookup)
    # In production, this would use participant_id from session
    # For MVP, we'll need to pass participant_id in request
    raise HTTPException(status_code=501, detail="Self-select join requires participant_id in request")


@router.post("/breakout-rooms/{room_id}/start")
async def start_breakout_room(
    room_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Start a breakout room session."""
    result = await db.execute(
        select(BreakoutRoom).where(BreakoutRoom.id == room_id)
    )
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    workshop = await verify_facilitator_access(str(room.workshop_id), current_user, db)
    
    room.status = BreakoutRoomStatus.ACTIVE
    room.started_at = datetime.utcnow()
    if room.duration_minutes:
        room.ended_at = room.started_at + timedelta(minutes=room.duration_minutes)
    
    await db.commit()
    
    return {"status": "started", "room_id": str(room.id), "end_time": room.ended_at.isoformat() if room.ended_at else None}


@router.post("/workshops/{workshop_id}/breakout-rooms/end")
async def end_all_breakout_rooms(
    workshop_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """End all active breakout rooms for a workshop."""
    workshop = await verify_facilitator_access(workshop_id, current_user, db)
    
    result = await db.execute(
        select(BreakoutRoom).where(
            and_(
                BreakoutRoom.workshop_id == workshop.id,
                BreakoutRoom.status == BreakoutRoomStatus.ACTIVE
            )
        )
    )
    rooms = result.scalars().all()
    
    for room in rooms:
        room.status = BreakoutRoomStatus.COMPLETED
        room.ended_at = datetime.utcnow()
    
    await db.commit()
    
    return {"rooms_closed": len(rooms), "outputs_collected": True}


# ==================== Room Activities ====================

@router.post("/breakout-rooms/{room_id}/canvas/items", response_model=CanvasItemResponse)
async def create_canvas_item(
    room_id: str,
    request: CanvasItemCreate,
    participant_id: str = Query(...),  # Required for now
    db: AsyncSession = Depends(get_db)
):
    """Create a canvas item (sticky note, text, shape) in a breakout room."""
    # Verify room exists and is active
    result = await db.execute(
        select(BreakoutRoom).where(BreakoutRoom.id == room_id)
    )
    room = result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    if room.status != BreakoutRoomStatus.ACTIVE:
        raise HTTPException(status_code=400, detail="Room is not active")
    
    # Verify participant is in room
    assignment_result = await db.execute(
        select(RoomAssignment).where(
            and_(
                RoomAssignment.room_id == room_id,
                RoomAssignment.participant_id == participant_id,
                RoomAssignment.left_at.is_(None)
            )
        )
    )
    if not assignment_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Participant not in room")
    
    # Create canvas item
    item = CanvasItem(
        id=uuid.uuid4(),
        room_id=room.id,
        participant_id=participant_id,
        content=request.content,
        item_type=request.item_type,
        position=request.position,
        color=request.color,
        category=request.category
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    # Get participant name
    participant_result = await db.execute(
        select(Participant).where(Participant.id == participant_id)
    )
    participant = participant_result.scalar_one()
    
    return {
        **CanvasItemResponse.model_validate(item).model_dump(),
        "participant_name": participant.display_name,
        "vote_count": 0
    }


@router.get("/breakout-rooms/{room_id}/canvas", response_model=List[CanvasItemResponse])
async def get_canvas_items(
    room_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all canvas items for a breakout room."""
    result = await db.execute(
        select(CanvasItem).where(CanvasItem.room_id == room_id).order_by(CanvasItem.created_at)
    )
    items = result.scalars().all()
    
    # Get participant names and vote counts
    item_responses = []
    for item in items:
        participant_result = await db.execute(
            select(Participant).where(Participant.id == item.participant_id)
        )
        participant = participant_result.scalar_one()
        
        vote_result = await db.execute(
            select(func.count(CanvasVote.id)).where(CanvasVote.item_id == item.id)
        )
        vote_count = vote_result.scalar_one() or 0
        
        item_responses.append({
            **CanvasItemResponse.model_validate(item).model_dump(),
            "participant_name": participant.display_name,
            "vote_count": vote_count
        })
    
    return item_responses


@router.post("/breakout-rooms/{room_id}/vote")
async def vote_on_canvas_item(
    room_id: str,
    item_id: str = Query(...),
    participant_id: str = Query(...),
    vote_type: str = Query("upvote"),
    db: AsyncSession = Depends(get_db)
):
    """Vote on a canvas item."""
    # Verify room and item
    room_result = await db.execute(
        select(BreakoutRoom).where(BreakoutRoom.id == room_id)
    )
    room = room_result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    item_result = await db.execute(
        select(CanvasItem).where(CanvasItem.id == item_id)
    )
    item = item_result.scalar_one_or_none()
    
    if not item or item.room_id != room.id:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Check if already voted
    existing_vote = await db.execute(
        select(CanvasVote).where(
            and_(
                CanvasVote.item_id == item_id,
                CanvasVote.participant_id == participant_id
            )
        )
    )
    if existing_vote.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already voted")
    
    # Create vote
    vote = CanvasVote(
        id=uuid.uuid4(),
        item_id=item.id,
        participant_id=participant_id,
        vote_type=vote_type
    )
    db.add(vote)
    await db.commit()
    
    # Get updated vote count
    vote_result = await db.execute(
        select(func.count(CanvasVote.id)).where(CanvasVote.item_id == item_id)
    )
    vote_count = vote_result.scalar_one() or 0
    
    return {"success": True, "item_id": str(item.id), "vote_count": vote_count}


# ==================== Room Chat ====================

@router.post("/breakout-rooms/{room_id}/messages", response_model=RoomMessageResponse)
async def create_room_message(
    room_id: str,
    request: RoomMessageCreate,
    participant_id: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Send a message in a breakout room."""
    # Verify room and participant
    room_result = await db.execute(
        select(BreakoutRoom).where(BreakoutRoom.id == room_id)
    )
    room = room_result.scalar_one_or_none()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    assignment_result = await db.execute(
        select(RoomAssignment).where(
            and_(
                RoomAssignment.room_id == room_id,
                RoomAssignment.participant_id == participant_id,
                RoomAssignment.left_at.is_(None)
            )
        )
    )
    if not assignment_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Participant not in room")
    
    # Create message
    message = RoomMessage(
        id=uuid.uuid4(),
        room_id=room.id,
        participant_id=participant_id,
        content=request.content
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    
    # Get participant name
    participant_result = await db.execute(
        select(Participant).where(Participant.id == participant_id)
    )
    participant = participant_result.scalar_one()
    
    return {
        **RoomMessageResponse.model_validate(message).model_dump(),
        "participant_name": participant.display_name
    }


@router.get("/breakout-rooms/{room_id}/messages", response_model=List[RoomMessageResponse])
async def get_room_messages(
    room_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get all messages for a breakout room."""
    result = await db.execute(
        select(RoomMessage).where(RoomMessage.room_id == room_id)
        .order_by(RoomMessage.is_pinned.desc(), RoomMessage.created_at)
    )
    messages = result.scalars().all()
    
    # Get participant names
    message_responses = []
    for message in messages:
        participant_result = await db.execute(
            select(Participant).where(Participant.id == message.participant_id)
        )
        participant = participant_result.scalar_one()
        
        message_responses.append({
            **RoomMessageResponse.model_validate(message).model_dump(),
            "participant_name": participant.display_name
        })
    
    return message_responses


# ==================== Facilitator Controls ====================

@router.post("/workshops/{workshop_id}/breakout-rooms/broadcast")
async def broadcast_to_rooms(
    workshop_id: str,
    request: BroadcastRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Broadcast a message to all breakout rooms."""
    workshop = await verify_facilitator_access(workshop_id, current_user, db)
    
    # Get all active rooms
    result = await db.execute(
        select(BreakoutRoom).where(
            and_(
                BreakoutRoom.workshop_id == workshop.id,
                BreakoutRoom.status == BreakoutRoomStatus.ACTIVE
            )
        )
    )
    rooms = result.scalars().all()
    
    return {
        "message": request.message,
        "priority": request.priority,
        "rooms_count": len(rooms),
        "sent_at": datetime.utcnow().isoformat()
    }


@router.post("/workshops/{workshop_id}/breakout-rooms/extend")
async def extend_breakout_time(
    workshop_id: str,
    request: ExtendTimeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Extend time for all active breakout rooms."""
    workshop = await verify_facilitator_access(workshop_id, current_user, db)
    
    result = await db.execute(
        select(BreakoutRoom).where(
            and_(
                BreakoutRoom.workshop_id == workshop.id,
                BreakoutRoom.status == BreakoutRoomStatus.ACTIVE
            )
        )
    )
    rooms = result.scalars().all()
    
    for room in rooms:
        if room.ended_at:
            room.ended_at = room.ended_at + timedelta(minutes=request.additional_minutes)
        room.duration_minutes = (room.duration_minutes or 0) + request.additional_minutes
    
    await db.commit()
    
    return {"extended_minutes": request.additional_minutes, "rooms_updated": len(rooms)}


@router.get("/workshops/{workshop_id}/breakout-rooms/results")
async def get_breakout_results(
    workshop_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aggregated results from all breakout rooms."""
    workshop = await verify_facilitator_access(workshop_id, current_user, db)
    
    result = await db.execute(
        select(BreakoutRoom).where(BreakoutRoom.workshop_id == workshop.id)
    )
    rooms = result.scalars().all()
    
    room_results = []
    all_items = []
    
    for room in rooms:
        # Get canvas items
        items_result = await db.execute(
            select(CanvasItem).where(CanvasItem.room_id == room.id)
        )
        items = items_result.scalars().all()
        
        # Get messages
        messages_result = await db.execute(
            select(RoomMessage).where(RoomMessage.room_id == room.id)
        )
        messages = messages_result.scalars().all()
        
        # Get top voted items
        top_items = []
        for item in items:
            vote_result = await db.execute(
                select(func.count(CanvasVote.id)).where(CanvasVote.item_id == item.id)
            )
            vote_count = vote_result.scalar_one() or 0
            top_items.append({
                "id": str(item.id),
                "content": item.content,
                "votes": vote_count,
                "author": item.participant_id
            })
        
        top_items.sort(key=lambda x: x["votes"], reverse=True)
        
        room_results.append({
            "room_id": str(room.id),
            "room_name": room.name,
            "items": top_items,
            "messages_count": len(messages),
            "participant_count": await get_participant_count(str(room.id), db)
        })
        
        all_items.extend(top_items)
    
    # Deduplicate similar items (simple content-based)
    seen_content = {}
    duplicates = []
    for item in all_items:
        content_lower = item["content"].lower().strip()
        if content_lower in seen_content:
            duplicates.append({
                "item1": seen_content[content_lower],
                "item2": item
            })
        else:
            seen_content[content_lower] = item
    
    # Top voted across all rooms
    all_items.sort(key=lambda x: x["votes"], reverse=True)
    
    return {
        "rooms": room_results,
        "merged": {
            "all_items": all_items[:20],  # Top 20
            "duplicates": duplicates,
            "top_voted": all_items[:10]  # Top 10
        }
    }

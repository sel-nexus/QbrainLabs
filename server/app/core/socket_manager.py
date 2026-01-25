import socketio
from app.core.config import settings

# For local dev without Redis, we use the default in-memory manager.
# In production, we would use a RedisManager:
# client_manager = socketio.AsyncRedisManager(settings.REDIS_URL)

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['http://localhost:5173', 'http://127.0.0.1:5173']
)

socket_app = socketio.ASGIApp(sio, socketio_path='socket.io')

class SocketManager:
    """Wrapper for Socket.io server to provide cleaner interface"""
    def __init__(self, sio):
        self.sio = sio
        
    async def broadcast_to_workshop(self, workshop_id: str, event: str, data: any):
        """Emit an event to all clients in a workshop room"""
        await self.sio.emit(event, data, room=str(workshop_id))
        
    async def emit_to_client(self, sid: str, event: str, data: any):
        """Emit an event to a specific client"""
        await self.sio.emit(event, data, to=sid)

manager = SocketManager(sio)

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def join_workshop(sid, data):
    # data expects {'workshop_id': '...'}
    workshop_id = data.get('workshop_id')
    if workshop_id:
        sio.enter_room(sid, workshop_id)
        await sio.emit('participant_joined', {'sid': sid}, room=workshop_id)
        print(f"SID {sid} joined room {workshop_id}")
        
        # Fetch current state to allow client restoration
        from app.core.database import AsyncSessionLocal
        from app.models.models import Workshop
        from sqlalchemy import select
        
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Workshop).where(Workshop.id == workshop_id))
            workshop = result.scalars().first()
            if workshop:
                await sio.emit('workshop_state_change', {
                    'phase': workshop.current_phase,
                    'active_use_case_id': str(workshop.active_use_case_id) if workshop.active_use_case_id else None
                }, to=sid)


# ==================== Survey WebSocket Events ====================

@sio.event
async def join_survey(sid, data):
    """Join a survey room for real-time updates"""
    survey_id = data.get('survey_id')
    if survey_id:
        sio.enter_room(sid, f"survey_{survey_id}")
        print(f"SID {sid} joined survey room {survey_id}")


@sio.event
async def leave_survey(sid, data):
    """Leave a survey room"""
    survey_id = data.get('survey_id')
    if survey_id:
        sio.leave_room(sid, f"survey_{survey_id}")
        print(f"SID {sid} left survey room {survey_id}")


async def emit_survey_response_submitted(survey_id: str, data: dict):
    """Emit when a participant submits a survey response"""
    await sio.emit('survey:response_submitted', data, room=f"survey_{survey_id}")


async def emit_survey_participant_started(survey_id: str, data: dict):
    """Emit when a participant starts a survey"""
    await sio.emit('survey:participant_started', data, room=f"survey_{survey_id}")


async def emit_survey_participant_completed(survey_id: str, data: dict):
    """Emit when a participant completes a survey"""
    await sio.emit('survey:participant_completed', data, room=f"survey_{survey_id}")


async def emit_survey_status_changed(survey_id: str, old_status: str, new_status: str):
    """Emit when survey status changes"""
    await sio.emit('survey:status_changed', {
        'survey_id': survey_id,
        'old_status': old_status,
        'new_status': new_status
    }, room=f"survey_{survey_id}")


async def emit_wordcloud_updated(survey_id: str, question_id: str, words: list):
    """Emit word cloud updates for real-time visualization"""
    await sio.emit('wordcloud:updated', {
        'survey_id': survey_id,
        'question_id': question_id,
        'words': words
    }, room=f"survey_{survey_id}")


# ==================== Breakout Rooms WebSocket Events (US18) ====================

@sio.event
async def join_breakout_room(sid, data):
    """Join a breakout room for real-time collaboration"""
    room_id = data.get('room_id')
    if room_id:
        sio.enter_room(sid, f"breakout_{room_id}")
        print(f"SID {sid} joined breakout room {room_id}")


@sio.event
async def leave_breakout_room(sid, data):
    """Leave a breakout room"""
    room_id = data.get('room_id')
    if room_id:
        sio.leave_room(sid, f"breakout_{room_id}")
        print(f"SID {sid} left breakout room {room_id}")


async def emit_breakout_room_created(workshop_id: str, rooms: list):
    """Emit when breakout rooms are created"""
    await sio.emit('breakout:room_created', {
        'workshop_id': workshop_id,
        'rooms': rooms
    }, room=workshop_id)


async def emit_breakout_assigned(workshop_id: str, participant_id: str, room_id: str, room_name: str):
    """Emit when a participant is assigned to a breakout room"""
    await sio.emit('breakout:assigned', {
        'participant_id': participant_id,
        'room_id': room_id,
        'room_name': room_name
    }, room=workshop_id)


async def emit_breakout_participant_joined(room_id: str, participant: dict):
    """Emit when a participant joins a breakout room"""
    await sio.emit('breakout:participant_joined', {
        'room_id': room_id,
        'participant': participant
    }, room=f"breakout_{room_id}")


async def emit_breakout_participant_left(room_id: str, participant_id: str):
    """Emit when a participant leaves a breakout room"""
    await sio.emit('breakout:participant_left', {
        'room_id': room_id,
        'participant_id': participant_id
    }, room=f"breakout_{room_id}")


async def emit_breakout_canvas_update(room_id: str, item: dict):
    """Emit when a canvas item is created or updated"""
    await sio.emit('breakout:canvas_update', {
        'room_id': room_id,
        'item': item
    }, room=f"breakout_{room_id}")


async def emit_breakout_vote_cast(room_id: str, item_id: str, vote_count: int):
    """Emit when a vote is cast on a canvas item"""
    await sio.emit('breakout:vote_cast', {
        'room_id': room_id,
        'item_id': item_id,
        'vote_count': vote_count
    }, room=f"breakout_{room_id}")


async def emit_breakout_chat_message(room_id: str, message: dict):
    """Emit when a chat message is sent"""
    await sio.emit('breakout:chat_message', {
        'room_id': room_id,
        'message': message
    }, room=f"breakout_{room_id}")


async def emit_breakout_broadcast(workshop_id: str, message: str, priority: str = "normal"):
    """Emit a broadcast message to all breakout rooms"""
    await sio.emit('breakout:broadcast', {
        'message': message,
        'priority': priority
    }, room=workshop_id)


async def emit_breakout_time_update(workshop_id: str, time_remaining: int, extended: bool = False):
    """Emit time updates for breakout rooms"""
    await sio.emit('breakout:time_update', {
        'time_remaining': time_remaining,
        'extended': extended
    }, room=workshop_id)


async def emit_breakout_rooms_ending(workshop_id: str, return_in_seconds: int):
    """Emit warning that breakout rooms are ending soon"""
    await sio.emit('breakout:rooms_ending', {
        'return_in_seconds': return_in_seconds
    }, room=workshop_id)


async def emit_breakout_rooms_closed(workshop_id: str):
    """Emit when all breakout rooms are closed"""
    await sio.emit('breakout:rooms_closed', {}, room=workshop_id)


async def emit_breakout_help_requested(room_id: str, participant_id: str):
    """Emit when a participant requests facilitator help"""
    await sio.emit('breakout:help_requested', {
        'room_id': room_id,
        'participant_id': participant_id
    }, room=f"breakout_{room_id}")


# ==================== AI Copilot WebSocket Events (US16) ====================

@sio.event
async def join_copilot(sid, data):
    """Join copilot room for real-time suggestions (facilitator only)"""
    workshop_id = data.get('workshop_id')
    if workshop_id:
        sio.enter_room(sid, f"copilot_{workshop_id}")
        print(f"SID {sid} joined copilot room for workshop {workshop_id}")


@sio.event
async def leave_copilot(sid, data):
    """Leave copilot room"""
    workshop_id = data.get('workshop_id')
    if workshop_id:
        sio.leave_room(sid, f"copilot_{workshop_id}")
        print(f"SID {sid} left copilot room for workshop {workshop_id}")


@sio.event
async def copilot_request_suggestions(sid, data):
    """Request suggestions from copilot (on-demand in reactive mode)"""
    workshop_id = data.get('workshop_id')
    if workshop_id:
        # This would trigger suggestion generation
        # For now, just acknowledge the request
        await sio.emit('copilot:suggestions_requested', {
            'workshop_id': workshop_id,
            'status': 'processing'
        }, to=sid)


async def emit_copilot_suggestion(workshop_id: str, suggestion: dict):
    """Emit a real-time suggestion to the facilitator"""
    await sio.emit('copilot:suggestion', {
        'workshop_id': workshop_id,
        'suggestion': suggestion
    }, room=f"copilot_{workshop_id}")


async def emit_copilot_engagement_alert(workshop_id: str, alert: dict):
    """Emit engagement alert to facilitator"""
    await sio.emit('copilot:engagement_alert', {
        'workshop_id': workshop_id,
        'alert': alert
    }, room=f"copilot_{workshop_id}")


async def emit_copilot_anomaly_detected(workshop_id: str, anomaly: dict):
    """Emit anomaly detection alert to facilitator"""
    await sio.emit('copilot:anomaly_detected', {
        'workshop_id': workshop_id,
        'anomaly': anomaly
    }, room=f"copilot_{workshop_id}")


async def emit_copilot_summary_ready(workshop_id: str, summary_id: str, format: str):
    """Emit notification when summary generation is complete"""
    await sio.emit('copilot:summary_ready', {
        'workshop_id': workshop_id,
        'summary_id': summary_id,
        'format': format
    }, room=f"copilot_{workshop_id}")


async def emit_copilot_variance_alert(workshop_id: str, use_case_id: str, variance_data: dict):
    """Emit high variance alert for a use case"""
    await sio.emit('copilot:variance_alert', {
        'workshop_id': workshop_id,
        'use_case_id': use_case_id,
        'variance_data': variance_data
    }, room=f"copilot_{workshop_id}")


async def emit_copilot_mode_changed(workshop_id: str, new_mode: str):
    """Emit when copilot mode is changed"""
    await sio.emit('copilot:mode_changed', {
        'workshop_id': workshop_id,
        'mode': new_mode
    }, room=f"copilot_{workshop_id}")

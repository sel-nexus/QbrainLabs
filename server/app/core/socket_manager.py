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

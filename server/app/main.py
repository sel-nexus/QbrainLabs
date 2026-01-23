from fastapi import FastAPI
from app.core.config import settings
from app.core.database import engine, Base
from app.api import workshops
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown

from fastapi.middleware.cors import CORSMiddleware
from app.core.socket_manager import socket_app

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS Policy
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Socket.IO
app.mount("/ws", socket_app)

from app.api import workshops, participants, usecases, votes, results

# ... (existing code)

app.include_router(workshops.router, prefix="/api/workshops", tags=["workshops"])
app.include_router(participants.router, prefix="/api", tags=["participants"])
app.include_router(usecases.router, prefix="/api/usecases", tags=["usecases"])
app.include_router(votes.router, prefix="/api/votes", tags=["votes"])
app.include_router(results.router, prefix="/api/results", tags=["results"])

@app.get("/")
def read_root():
    return {"message": "Hotspot Matrix API is running"}

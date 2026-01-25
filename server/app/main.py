from fastapi import FastAPI
from app.core.config import settings
from app.core.database import engine, Base
from app.api import workshops
from contextlib import asynccontextmanager
from app.middleware.error_handler import register_exception_handlers
from app.core.logging import setup_logging, get_logger
from app.core.monitoring import setup_metrics_endpoint, setup_health_endpoints
from app.middleware.security import setup_security_middleware

# Initialize logging
setup_logging(level="INFO", json_format=False)
logger = get_logger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables
    logger.info("Starting application...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")
    yield
    # Shutdown
    logger.info("Shutting down application...")

from fastapi.middleware.cors import CORSMiddleware
from app.core.socket_manager import socket_app

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Register global exception handlers
register_exception_handlers(app)

# Setup monitoring endpoints (health checks & metrics)
setup_metrics_endpoint(app)
setup_health_endpoints(app)

# Setup security middleware
setup_security_middleware(app)

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

from app.api import ai, auth, admin, knowledge_base, surveys, participant_auth, analytics, export, organizations, marketplace, errors, facilitators, members
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(errors.router, tags=["errors"])
app.include_router(auth.router, tags=["authentication"])
app.include_router(admin.router, tags=["admin"])
app.include_router(knowledge_base.router, tags=["knowledge-base"])
app.include_router(surveys.router, prefix="/api", tags=["surveys"])
app.include_router(participant_auth.router, tags=["participant-authentication"])
app.include_router(analytics.router, tags=["analytics"])
app.include_router(export.router, tags=["export"])
app.include_router(organizations.router, tags=["organizations"])
app.include_router(marketplace.router, tags=["marketplace"])
app.include_router(facilitators.router, tags=["facilitators"])
app.include_router(members.router, tags=["members"])


@app.get("/")
def read_root():
    return {"message": "Hotspot Matrix API is running"}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api import workshops
from contextlib import asynccontextmanager
from app.middleware.error_handler import register_exception_handlers
from app.core.logging import setup_logging, get_logger
from app.core.monitoring import setup_metrics_endpoint, setup_health_endpoints
from app.middleware.security import setup_security_middleware

# Initialize logging with centralized configuration
setup_logging()  # Uses settings.LOG_LEVEL and settings.LOG_FORMAT

# Trigger reload
logger = get_logger("main")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables (with timeout to prevent hanging)
    logger.info("Starting application...")
    try:
        import asyncio
        # Add timeout to database connection (5 seconds)
        async def create_tables():
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        
        await asyncio.wait_for(create_tables(), timeout=5.0)
        logger.info("Database tables created")
    except (asyncio.TimeoutError, Exception) as e:
        logger.warning(f"Database initialization skipped: {e}. Server will start but database operations may fail until connection is established.")
        # Continue startup - don't block server from starting
    yield
    # Shutdown
    logger.info("Shutting down application...")

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

# Add request ID tracking middleware (should be early in the stack)
from app.middleware.request_id import RequestIDMiddleware
app.add_middleware(RequestIDMiddleware)

# CORS Policy - Dynamic CORS that accepts origins matching server IP addresses
# This allows the application to work when accessed via either private or public IP addresses
from app.middleware.cors_dynamic import DynamicCORSMiddleware

# Use dynamic CORS middleware that automatically accepts origins matching server IPs
# Set ENABLE_DYNAMIC_CORS=false to use standard CORS middleware instead
if settings.ENABLE_DYNAMIC_CORS:
    # Dynamic CORS middleware - automatically accepts origins matching server IPs
    app.add_middleware(DynamicCORSMiddleware, client_port=settings.CLIENT_PORT)
    logger.info("Using dynamic CORS middleware - accepts origins matching server IP addresses")
else:
    # Fallback to standard CORS middleware
    # US32 FIX: Explicitly add public IP origins for CORS to handle direct access
    cors_origins = [
        origin.strip() 
        for origin in settings.CORS_ORIGINS.split(",") 
        if origin.strip()
    ] if settings.CORS_ORIGINS else []
    
    # Add production origins from environment variable (never hardcode IPs in source)
    if settings.PRODUCTION_CORS_ORIGINS:
        cors_origins.extend([
            o.strip()
            for o in settings.PRODUCTION_CORS_ORIGINS.split(",")
            if o.strip()
        ])

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    )
    logger.info(f"Using standard CORS middleware with origins: {cors_origins}")

# Mount Socket.IO
app.mount("/ws", socket_app)

# Mount Static Files for Reports
from fastapi.staticfiles import StaticFiles
import os
os.makedirs("static/reports", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

from app.api import workshops, participants, usecases, votes, results

# ... (existing code)

app.include_router(workshops.router, prefix="/api/workshops", tags=["workshops"])
app.include_router(participants.router, prefix="/api", tags=["participants"]) # For /join
app.include_router(participants.router, prefix="/api/participants", tags=["participants"]) # For /workshop/{id} match
app.include_router(usecases.router, prefix="/api/usecases", tags=["usecases"])
app.include_router(votes.router, prefix="/api/votes", tags=["votes"])
app.include_router(results.router, prefix="/api/results", tags=["results"])

from app.api import ai, auth, admin, knowledge_base, surveys, participant_auth, analytics, export, organizations, marketplace, errors, facilitators, members, settings, subscription, rag_admin
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(rag_admin.router, prefix="/api/knowledge-base", tags=["rag-admin"])
app.include_router(errors.router, tags=["errors"])
app.include_router(auth.router, tags=["authentication"])
app.include_router(admin.router, tags=["admin"])
app.include_router(settings.router, tags=["admin-settings"])
app.include_router(subscription.router, tags=["admin-subscription"])
app.include_router(knowledge_base.router, tags=["knowledge-base"])
app.include_router(surveys.router, prefix="/api", tags=["surveys"])
app.include_router(participant_auth.router, tags=["participant-authentication"])
app.include_router(analytics.router, tags=["analytics"])
app.include_router(export.router, tags=["export"])
app.include_router(organizations.router, tags=["organizations"])
app.include_router(marketplace.router, tags=["marketplace"])
app.include_router(facilitators.router, tags=["facilitators"])
app.include_router(members.router, tags=["members"])

from app.api import feedback, analytics_dashboard, polls, gamification
app.include_router(feedback.router, prefix="/api", tags=["feedback", "onboarding", "help"])
app.include_router(analytics_dashboard.router, prefix="/api/analytics", tags=["advanced-analytics", "reporting"])
app.include_router(polls.router, prefix="/api", tags=["polls"])
app.include_router(gamification.router, prefix="/api/gamification", tags=["gamification"])

from app.api import roi, templates, breakout, roadmap, challenge, copilot, knowledge_validation, notifications, data_sources
app.include_router(roi.router, tags=["roi"])
app.include_router(templates.router, prefix="/api/templates", tags=["templates"])
app.include_router(breakout.router, prefix="/api", tags=["breakout-rooms"])
app.include_router(roadmap.router, tags=["roadmaps"])
app.include_router(challenge.router, tags=["challenges"])
app.include_router(copilot.router, tags=["ai-copilot"])
app.include_router(knowledge_validation.router, tags=["knowledge-validation"])
app.include_router(notifications.router, tags=["notifications"])
app.include_router(data_sources.router, tags=["data-sources"])


@app.get("/")
def read_root():
    return {"message": "Qbrain AI Labs API is running"}


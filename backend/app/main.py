import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import Contract, Clause, Baseline  # noqa: F401 - ensure models are registered
from app.routers import contracts, analysis, compare, chat, baselines

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: create upload directory and database tables
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    Base.metadata.create_all(bind=engine)

    # Seed market-standard baselines (idempotent)
    try:
        from app.seed_baselines import seed_baselines
        db = SessionLocal()
        try:
            result = seed_baselines(db)
            logger.info(
                "Baselines seeded: %d inserted, %d updated",
                result["inserted"],
                result["updated"],
            )
        finally:
            db.close()
    except Exception as e:
        logger.warning("Baseline seeding skipped: %s", e)

    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title="Legal Document Intelligence System",
    description="AI-powered contract analysis, risk scoring, and clause extraction API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware (allow all origins for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(contracts.router)
app.include_router(analysis.router)
app.include_router(compare.router)
app.include_router(chat.router)
app.include_router(baselines.router)


@app.get("/api/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Legal Document Intelligence System",
        "version": "0.1.0",
    }

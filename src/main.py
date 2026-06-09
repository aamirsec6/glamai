"""GlamAI — AI Marketing Platform for Local Service Businesses.

Main FastAPI application entry point.
"""

from __future__ import annotations

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings
from src.api.v1.admin import router as admin_router
from src.api.v1.gbp import router as gbp_router
from src.api.v1.leads import router as leads_router
from src.api.v1.orgs import router as orgs_router
from src.api.v1.territory import router as territory_router
from src.api.v1.tracking import router as tracking_router
from src.services.whatsapp.webhook import router as whatsapp_webhook_router

settings = get_settings()

# ── Structured Logging ───────────────────────────────────────
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.dev.ConsoleRenderer() if settings.app_env == "development"
        else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)

logger = structlog.get_logger(__name__)


# ── FastAPI App ──────────────────────────────────────────────

app = FastAPI(
    title="GlamAI",
    description="AI Marketing Platform for Local Service Businesses",
    version="0.1.0",
    docs_url="/docs" if settings.app_env == "development" else None,
    redoc_url="/redoc" if settings.app_env == "development" else None,
)

# ── CORS ─────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.app_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API Routes ───────────────────────────────────────────────

app.include_router(orgs_router, prefix="/api")
app.include_router(leads_router, prefix="/api")
app.include_router(gbp_router, prefix="/api")
app.include_router(territory_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(tracking_router, prefix="/api")
app.include_router(whatsapp_webhook_router, prefix="/api/webhooks")


# ── Health Check ─────────────────────────────────────────────

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "environment": settings.app_env,
    }


# ── Startup / Shutdown ───────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Application startup tasks."""
    logger.info(
        "glamai_starting",
        environment=settings.app_env,
        version="0.1.0",
    )

    # In production: verify DB connection, warm up caches
    # await verify_database_connection()


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown tasks."""
    logger.info("glamai_shutting_down")


# ── Entry Point ──────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "src.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=settings.app_env == "development",
        workers=1 if settings.app_env == "development" else 4,
    )

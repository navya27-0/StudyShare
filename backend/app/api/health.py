import logging
import time
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.database import get_db_session

logger = logging.getLogger("studyshare.health")
router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health/live")
async def liveness_probe(
    settings: Settings = Depends(get_settings),
):
    """
    Lightweight Kubernetes/Render liveness probe.
    Confirms the application process is running and accepting HTTP requests.
    Does not touch backend databases to prevent cascade restarts during outages.
    """
    return {
        "status": "alive",
        "service": settings.APP_NAME,
        "timestamp": datetime.now(UTC).isoformat(),
    }


@router.get("/health")
@router.get("/health/ready")
async def health_check(
    response: Response,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
):
    """
    Readiness health probe verifying critical dependency connectivity (PostgreSQL).
    Sanitizes internal database exception details to avoid leaking connection metadata.
    """
    start_time = time.perf_counter()
    db_status = "connected"
    db_error = None

    try:
        # Ping database with lightweight query
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = "disconnected"
        db_error = "database_unavailable"
        logger.error("Database health check ping failed: %s", exc, exc_info=True)
        # Mark response as Service Unavailable if database is unreachable
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "0.1.0",
        "database": {
            "status": db_status,
            "latency_ms": latency_ms,
            "error": db_error,
        },
        "timestamp": datetime.now(UTC).isoformat(),
    }

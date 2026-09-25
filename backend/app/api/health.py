import time
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.database import get_db_session

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health")
async def health_check(
    response: Response,
    db: AsyncSession = Depends(get_db_session),
    settings: Settings = Depends(get_settings),
):
    start_time = time.perf_counter()
    db_status = "connected"
    db_error = None

    try:
        # Ping database with lightweight query
        await db.execute(text("SELECT 1"))
    except Exception as exc:
        db_status = "disconnected"
        db_error = str(exc)
        # Mark response as Service Unavailable if database is unreachable
        response.status_code = status.HTTP(503)

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

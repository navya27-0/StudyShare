import asyncio
import logging
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.health import router as health_router
from app.api.resources import router as resources_router
from app.api.users import router as users_router
from app.config import get_settings
from app.core.logging import setup_logging
from app.database import get_db_session
from app.models.resource import Resource, ResourceVersion

settings = get_settings()
logger = logging.getLogger("studyshare.observability")

# Minimal valid single-page PDF for seeded demo records when no physical file was uploaded yet
SEED_DEMO_PDF_BYTES = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R"
    b"/Resources<</Font<</F1 5 0 R>>>>>>endobj\n"
    b"4 0 obj<</Length 68>>stream\n"
    b"BT /F1 14 Tf 72 720 Td (StudyShare Verified Academic Resource Preview) Tj ET\n"
    b"endstream\nendobj\n"
    b"5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n"
    b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n"
    b"0000000101 00000 n \n0000000204 00000 n \n0000000321 00000 n \n"
    b"trailer<</Size 6/Root 1 0 R>>\nstartxref\n388\n%%EOF\n"
)


async def _periodic_security_cleanup_loop():
    """Background task to periodically prune expired security table records in production."""
    from app.core.rate_limit import cleanup_security_tables
    from app.database import async_session_maker

    interval = max(60, settings.SECURITY_CLEANUP_INTERVAL_SECONDS)
    while True:
        try:
            await asyncio.sleep(interval)
            async with async_session_maker() as session:
                await cleanup_security_tables(
                    session, login_retention_hours=settings.LOGIN_ATTEMPT_RETENTION_HOURS
                )
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning("Periodic background security table cleanup failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    upload_path = Path(settings.UPLOAD_DIR).resolve()
    upload_path.mkdir(parents=True, exist_ok=True)

    cleanup_task = None
    if settings.SCHEDULED_CLEANUP_ENABLED:
        cleanup_task = asyncio.create_task(_periodic_security_cleanup_loop())

    try:
        yield
    finally:
        if cleanup_task:
            cleanup_task.cancel()
            try:
                await cleanup_task
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)


@app.middleware("http")
async def add_security_and_observability_headers(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
    start_time = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start_time) * 1000

    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.2f}"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    if not request.url.path.startswith(("/docs", "/redoc", "/openapi.json")):
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'"
        )

    if elapsed_ms > 1000 or response.status_code >= 500:
        logger.warning(
            "request_id=%s method=%s path=%s status=%d duration_ms=%.2f",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
    return response


# CORS Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time-Ms"],
)

# Canonical API Namespace (/api/...)
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(resources_router, prefix="/api/resources")
app.include_router(users_router, prefix="/api/users")
app.include_router(admin_router, prefix="/api/admin")

# Backward-compatibility aliases (hidden from OpenAPI schema to prevent route duplication)
app.include_router(resources_router, prefix="/resources", include_in_schema=False, deprecated=True)
app.include_router(users_router, prefix="/users", include_in_schema=False, deprecated=True)
app.include_router(admin_router, prefix="/admin", include_in_schema=False, deprecated=True)


@app.get("/uploads/{file_key:path}", include_in_schema=False)
async def serve_governed_upload(
    file_key: str,
    db: Annotated[AsyncSession, Depends(get_db_session)],
):
    """
    Governed file access endpoint.
    Enforces directory containment, blocks access to soft-deleted/moderated resources,
    and attaches strict nosniff headers.
    """
    upload_dir = Path(settings.UPLOAD_DIR).resolve()
    normalized_key = file_key.lstrip("/")
    if not normalized_key or ".." in Path(normalized_key).parts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path.",
        )

    candidate = (upload_dir / normalized_key).resolve()
    try:
        candidate.relative_to(upload_dir)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path.",
        ) from exc

    upload_url = f"/uploads/{normalized_key}"

    # Verify whether the file belongs to a resource that has been soft-deleted by moderation
    stmt = (
        select(Resource)
        .outerjoin(ResourceVersion, ResourceVersion.resource_id == Resource.id)
        .where(or_(Resource.file_url == upload_url, ResourceVersion.file_url == upload_url))
    )
    matched_resources = (await db.execute(stmt)).scalars().all()
    if matched_resources and all(r.is_deleted for r in matched_resources):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This study material has been removed by moderation and is no longer accessible.",
        )

    if candidate.exists() and candidate.is_file():
        return FileResponse(
            path=candidate,
            headers={
                "X-Content-Type-Options": "nosniff",
                "Cache-Control": "private, max-age=3600",
            },
        )

    # If the resource is a valid active seeded demo record without a physical file on disk
    if matched_resources and any(not r.is_deleted for r in matched_resources):
        if normalized_key.lower().endswith(".pdf"):
            return Response(
                content=SEED_DEMO_PDF_BYTES,
                media_type="application/pdf",
                headers={
                    "X-Content-Type-Options": "nosniff",
                    "Cache-Control": "private, max-age=3600",
                },
            )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Requested file was not found.",
    )


@app.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "status": "online",
        "docs": "/docs" if settings.DEBUG else "disabled",
    }

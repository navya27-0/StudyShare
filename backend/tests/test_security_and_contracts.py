from datetime import UTC, datetime

import pytest
from httpx import AsyncClient

from app.core.ranking import PASSIVE_VIEW_CAP, compute_ranking_score
from app.core.rate_limit import LoginRateLimiter, RevokedTokenStore
from app.main import app


@pytest.mark.asyncio
async def test_openapi_canonical_api_namespace():
    """
    Verify that the OpenAPI schema only exposes canonical '/api/...' routes (plus '/')
    and does not duplicate routes under '/resources', '/users', or '/admin'.
    """
    schema = app.openapi()
    paths = list(schema.get("paths", {}).keys())
    assert len(paths) > 0
    for path in paths:
        assert path == "/" or path.startswith("/api/"), (
            f"Non-canonical route '{path}' leaked into OpenAPI schema"
        )


@pytest.mark.asyncio
async def test_security_and_correlation_headers(client: AsyncClient):
    """Verify security hardening headers and X-Request-ID propagation."""
    custom_req_id = "test-corr-id-9876"
    res = await client.get("/api/health", headers={"X-Request-ID": custom_req_id})
    assert res.status_code == 200
    assert res.headers.get("X-Request-ID") == custom_req_id
    assert res.headers.get("X-Content-Type-Options") == "nosniff"
    assert res.headers.get("X-Frame-Options") == "SAMEORIGIN"
    assert res.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "default-src 'self'" in res.headers.get("Content-Security-Policy", "")
    assert "X-Process-Time-Ms" in res.headers


@pytest.mark.asyncio
async def test_upload_magic_byte_validation_rejects_executables_and_spoofed_files(
    client: AsyncClient, auth_headers: dict
):
    """
    Verify that streaming upload validates magic-byte signatures:
    1. Rejects Windows PE/EXE ('MZ') disguised as a .pdf file with 415.
    2. Rejects ELF binary ('\\x7fELF') disguised as a .pdf file with 415.
    3. Rejects spoofed non-PDF bytes with .pdf extension with 415.
    """
    form_data = {
        "topic_id": "1",
        "type": "notes",
        "title": "Spoofed Binary Upload Test",
        "semester": "3",
    }

    # 1. Windows PE executable disguised as PDF
    pe_files = {"file": ("malicious.pdf", b"MZ\x90\x00\x03\x00\x00\x00", "application/pdf")}
    res_pe = await client.post(
        "/api/resources", data=form_data, files=pe_files, headers=auth_headers
    )
    assert res_pe.status_code == 415
    assert "Executable content" in res_pe.json()["detail"]

    # 2. ELF binary disguised as PDF
    elf_files = {"file": ("elf_binary.pdf", b"\x7fELF\x02\x01\x01\x00", "application/pdf")}
    res_elf = await client.post(
        "/api/resources", data=form_data, files=elf_files, headers=auth_headers
    )
    assert res_elf.status_code == 415

    # 3. Arbitrary non-PDF bytes with .pdf extension
    spoof_files = {"file": ("fake.pdf", b"Plain text pretending to be PDF", "application/pdf")}
    res_spoof = await client.post(
        "/api/resources", data=form_data, files=spoof_files, headers=auth_headers
    )
    assert res_spoof.status_code == 415
    assert "signature does not match" in res_spoof.json()["detail"]


@pytest.mark.asyncio
async def test_governed_uploads_blocks_soft_deleted_resources(
    client: AsyncClient, auth_headers: dict, admin_auth_headers: dict
):
    """
    Verify that /uploads/{file_key} is governed by moderation state:
    1. Active uploaded PDF is served with 200 OK and nosniff header.
    2. Once soft-deleted by an admin, /uploads/{file_key} returns 404 Not Found.
    3. Once restored by an admin, /uploads/{file_key} returns 200 OK again.
    """
    form_data = {
        "topic_id": "1",
        "type": "notes",
        "title": "Governed File Serving Test Notes",
        "semester": "3",
    }
    pdf_bytes = b"%PDF-1.4\n% Governed test document payload\n%%EOF"
    files = {"file": ("governed_notes.pdf", pdf_bytes, "application/pdf")}

    create_res = await client.post(
        "/api/resources", data=form_data, files=files, headers=auth_headers
    )
    assert create_res.status_code == 201
    created = create_res.json()
    resource_id = created["id"]
    file_url = created["file_url"]

    # 1. File is accessible when resource is active
    file_res_active = await client.get(file_url)
    assert file_res_active.status_code == 200
    assert file_res_active.headers.get("X-Content-Type-Options") == "nosniff"
    assert file_res_active.content.startswith(b"%PDF-1.4")

    # 2. Admin soft-deletes the resource
    rm_res = await client.post(
        f"/api/admin/resources/{resource_id}/remove",
        json={"note": "Testing governed upload revocation"},
        headers=admin_auth_headers,
    )
    assert rm_res.status_code == 200

    # 3. Direct file URL now returns 404 Not Found
    file_res_deleted = await client.get(file_url)
    assert file_res_deleted.status_code == 404

    # 4. Admin restores the resource -> file is accessible again
    restore_res = await client.post(
        f"/api/admin/resources/{resource_id}/restore",
        json={"note": "Restoring governed upload"},
        headers=admin_auth_headers,
    )
    assert restore_res.status_code == 200

    file_res_restored = await client.get(file_url)
    assert file_res_restored.status_code == 200


def test_ranking_anti_manipulation_view_cap():
    """
    Verify that passive views are capped at PASSIVE_VIEW_CAP and cannot outrank
    community-verified, upvoted resources.
    """
    now = datetime.now(UTC)

    score_at_cap = compute_ranking_score(
        rating_avg=3.5,
        rating_count=0,
        upvotes_count=0,
        downvotes_count=0,
        downloads_count=0,
        views_count=PASSIVE_VIEW_CAP,
        is_verified=False,
        created_at=now,
    )
    score_million_views = compute_ranking_score(
        rating_avg=3.5,
        rating_count=0,
        upvotes_count=0,
        downvotes_count=0,
        downloads_count=0,
        views_count=1_000_000,
        is_verified=False,
        created_at=now,
    )
    assert score_at_cap == score_million_views

    verified_community_score = compute_ranking_score(
        rating_avg=4.8,
        rating_count=15,
        upvotes_count=40,
        downvotes_count=1,
        downloads_count=25,
        views_count=60,
        is_verified=True,
        created_at=now,
    )
    assert verified_community_score > score_million_views


def test_rate_limiter_and_revoked_token_store_ttl_cleanup():
    """Verify TTL expiration and memory pruning in RevokedTokenStore and LoginRateLimiter."""
    store = RevokedTokenStore(default_ttl_seconds=60)
    store.revoke("tok-expired", ttl_seconds=-1)
    store.revoke("tok-valid", ttl_seconds=120)

    assert store.is_revoked("tok-expired") is False
    assert store.is_revoked("tok-valid") is True

    limiter = LoginRateLimiter(max_attempts=3, window_seconds=1)
    limiter.record_failure("ip:127.0.0.1")
    limiter.reset("ip:127.0.0.1")
    assert "ip:127.0.0.1" not in limiter._failures


def test_production_security_validation_fails_on_dev_secrets():
    """
    Verify that application configuration strictly prevents starting in production
    with default development JWT secret, weak secret, or dev database credentials.
    """
    from app.config import Settings

    # 1. Dev JWT secret in production must fail
    with pytest.raises(ValueError, match="Production Startup Security Violation"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="studyshare_jwt_secret_dev_key_change_in_production_9e4f01a2",
            DATABASE_URL="postgresql+asyncpg://produser:prodpass@db.example.com/db",
            DEBUG=False,
        )

    # 2. Short / weak secret in production must fail
    with pytest.raises(ValueError, match="at least 32 characters"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="too-short-secret",
            DATABASE_URL="postgresql+asyncpg://produser:prodpass@db.example.com/db",
            DEBUG=False,
        )

    # 3. Dev database credentials in production must fail
    with pytest.raises(ValueError, match="DATABASE_URL contains default development credentials"):
        Settings(
            ENVIRONMENT="production",
            JWT_SECRET_KEY="c" * 36,
            DATABASE_URL="postgresql+asyncpg://studyshare:studyshare_dev@localhost/db",
            DEBUG=False,
        )

    # 4. Valid production settings must pass
    valid_prod = Settings(
        ENVIRONMENT="production",
        JWT_SECRET_KEY="c" * 36,
        DATABASE_URL="postgresql+asyncpg://produser:prodpass@db.example.com/db",
        DEBUG=False,
    )
    assert valid_prod.ENVIRONMENT == "production"
    assert valid_prod.DEBUG is False


@pytest.mark.asyncio
async def test_upload_academic_code_and_doc_extensions(client: AsyncClient, auth_headers: dict):
    """
    Verify that academic programming files (.py) with valid text content are supported,
    while binary executables masquerading as .py are rejected.
    """
    form_data = {
        "topic_id": "1",
        "type": "lab_record",
        "title": "Data Structures Dijkstra Python Implementation",
        "semester": "3",
    }

    # 1. Valid python source code file
    py_content = b'def dijkstra(graph, start):\n    """Sample implementation"""\n    return {}\n'
    py_files = {"file": ("dijkstra.py", py_content, "text/x-python")}
    res_py = await client.post(
        "/api/resources", data=form_data, files=py_files, headers=auth_headers
    )
    assert res_py.status_code == 201, res_py.text
    created = res_py.json()
    assert created["file_url"].endswith(".py")

    # 2. Binary content with null bytes disguised as python code should be rejected
    bad_py = {"file": ("corrupt.py", b"def main():\x00\x00\x01\x02", "text/x-python")}
    res_bad = await client.post(
        "/api/resources", data=form_data, files=bad_py, headers=auth_headers
    )
    assert res_bad.status_code == 415
    assert "Binary content detected" in res_bad.json()["detail"]

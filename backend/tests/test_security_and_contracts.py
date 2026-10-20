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


@pytest.mark.asyncio
async def test_upload_cpp_and_java_academic_source(client: AsyncClient, auth_headers: dict):
    """Verify that .cpp and .java source code files upload cleanly."""
    form_data = {
        "topic_id": "1",
        "type": "lab_record",
        "title": "C++ Shortest Path Benchmark",
        "semester": "3",
    }
    cpp_content = b'#include <iostream>\nint main() { std::cout << "Path"; return 0; }\n'
    files = {"file": ("solution.cpp", cpp_content, "text/x-c++src")}
    res = await client.post("/api/resources", data=form_data, files=files, headers=auth_headers)
    assert res.status_code == 201
    assert res.json()["file_url"].endswith(".cpp")

    # Java upload
    java_content = b"public class Graph { public static void main(String[] args) {} }\n"
    java_files = {"file": ("Graph.java", java_content, "text/x-java")}
    form_data["title"] = "Java Graph Representation"
    res_java = await client.post(
        "/api/resources", data=form_data, files=java_files, headers=auth_headers
    )
    assert res_java.status_code == 201
    assert res_java.json()["file_url"].endswith(".java")


@pytest.mark.asyncio
async def test_storage_provider_s3_fallback_and_instantiation():
    """Verify StorageProvider S3 provider and graceful fallback."""
    from app.core.storage import S3StorageProvider, get_storage_provider

    provider = S3StorageProvider(
        bucket_name="test-bucket",
        access_key_id=None,
        secret_access_key=None,
    )
    assert provider.bucket_name == "test-bucket"

    # Save small test file via fallback
    res = await provider.save_file(
        b"%PDF-1.4 sample content",
        "doc.pdf",
        "application/pdf",
    )
    assert res.file_url.startswith("/uploads/")
    assert len(res.sha256) == 64

    # Default provider should return StorageProvider
    default_provider = get_storage_provider()
    assert default_provider is not None


def test_structured_logging_formatter():
    """Verify JSONFormatter formats logs as valid JSON."""
    import logging

    from app.core.logging import JSONFormatter

    formatter = JSONFormatter()
    record = logging.LogRecord(
        name="test_logger",
        level=logging.INFO,
        pathname="test.py",
        lineno=10,
        msg="Structured logging verification",
        args=(),
        exc_info=None,
    )
    record.request_id = "req-12345"
    formatted = formatter.format(record)
    import json

    parsed = json.loads(formatted)
    assert parsed["level"] == "INFO"
    assert parsed["message"] == "Structured logging verification"
    assert parsed["request_id"] == "req-12345"
    assert "timestamp" in parsed


def test_client_ip_extraction_and_proxy_spoofing_defense():
    """Verify X-Forwarded-For is only trusted when coming from a configured reverse proxy."""
    from unittest.mock import MagicMock

    from starlette.datastructures import Address

    from app.api.deps import get_client_ip

    # 1. Trusted proxy (localhost 127.0.0.1) -> trusts X-Forwarded-For
    req_trusted = MagicMock()
    req_trusted.client = Address("127.0.0.1", 50000)
    req_trusted.headers = {"X-Forwarded-For": "203.0.113.195, 10.0.0.1"}
    assert get_client_ip(req_trusted) == "203.0.113.195"

    # 2. Untrusted proxy (public client 198.51.100.22) -> rejects spoofed X-Forwarded-For
    req_untrusted = MagicMock()
    req_untrusted.client = Address("198.51.100.22", 50000)
    req_untrusted.headers = {"X-Forwarded-For": "203.0.113.195"}
    assert get_client_ip(req_untrusted) == "198.51.100.22"


@pytest.mark.asyncio
async def test_health_live_endpoint(client: AsyncClient):
    """Verify minimal /api/health/live liveness probe returns HTTP 200 without DB dependency."""
    res = await client.get("/api/health/live")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "alive"
    assert data["service"] == "StudyShare API"
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_deep_archive_validation_zip_slip_and_docx_integrity():
    """Verify deep structural archive validation defends against zip-slip and invalid docx."""
    import io
    import zipfile

    from fastapi import HTTPException

    from app.core.storage import LocalFileStorage

    storage = LocalFileStorage()

    # 1. Zip slip attempt with '..' path member
    buf_slip = io.BytesIO()
    with zipfile.ZipFile(buf_slip, "w") as zf:
        zf.writestr("../malicious_traversal.txt", b"evil payload")

    with pytest.raises(HTTPException) as exc_slip:
        await storage.save_file(
            file_content=buf_slip.getvalue(),
            filename="archive.zip",
            content_type="application/zip",
        )
    assert exc_slip.value.status_code == 415
    assert "unsafe relative, absolute, or drive-letter" in exc_slip.value.detail

    # 2. Valid zip but missing Word document marker (.docx requires word/ or [Content_Types].xml)
    buf_fake_docx = io.BytesIO()
    with zipfile.ZipFile(buf_fake_docx, "w") as zf:
        zf.writestr("random.txt", b"not a docx")

    with pytest.raises(HTTPException) as exc_docx:
        await storage.save_file(
            file_content=buf_fake_docx.getvalue(),
            filename="document.docx",
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    assert exc_docx.value.status_code == 415
    assert "lacks valid Word document structure" in exc_docx.value.detail


@pytest.mark.asyncio
async def test_distributed_rate_limiter_and_revocation_async():
    """Verify RevokedTokenStore and LoginRateLimiter async methods."""

    from app.core.rate_limit import LoginRateLimiter, RevokedTokenStore

    store = RevokedTokenStore()
    token = "test_raw_jwt_token_for_revocation"

    assert not await store.is_revoked_async(token)
    await store.revoke_async(token, ttl_seconds=900)
    assert await store.is_revoked_async(token)

    limiter = LoginRateLimiter(max_attempts=2, window_seconds=60)
    ip = "192.0.2.1"
    # Check passes without exception when under limit
    await limiter.check_async(ip)

    # Record failures to hit the limit
    await limiter.record_failure_async(ip)
    await limiter.record_failure_async(ip)

    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_limit:
        await limiter.check_async(ip)
    assert exc_limit.value.status_code == 429

    # Reset clears attempts
    await limiter.reset_async(ip)
    await limiter.check_async(ip)


@pytest.mark.asyncio
async def test_windows_drive_letter_and_null_byte_archive_defense():
    """Verify archive traversal defenses reject Windows drive letters, unusual separators, and null bytes."""
    import io
    import zipfile

    from fastapi import HTTPException

    from app.core.storage import LocalFileStorage

    storage = LocalFileStorage()

    # 1. Windows drive letter in member name
    buf_drive = io.BytesIO()
    with zipfile.ZipFile(buf_drive, "w") as zf:
        zf.writestr("C:/Windows/System32/calc.exe", b"fake binary")

    with pytest.raises(HTTPException) as exc_drive:
        await storage.save_file(
            file_content=buf_drive.getvalue(),
            filename="payload.zip",
            content_type="application/zip",
        )
    assert exc_drive.value.status_code == 415
    assert "unsafe relative, absolute, or drive-letter" in exc_drive.value.detail

    # 2. Windows backslash drive letter
    buf_win = io.BytesIO()
    with zipfile.ZipFile(buf_win, "w") as zf:
        zf.writestr("D:\\payload.txt", b"drive traversal")

    with pytest.raises(HTTPException) as exc_win:
        await storage.save_file(
            file_content=buf_win.getvalue(),
            filename="payload.zip",
            content_type="application/zip",
        )
    assert exc_win.value.status_code == 415
    assert "unsafe relative, absolute, or drive-letter" in exc_win.value.detail


@pytest.mark.asyncio
async def test_malformed_xml_docx_package_metadata_rejected():
    """Verify docx/pptx archives with corrupted XML package metadata are rejected."""
    import io
    import zipfile

    from fastapi import HTTPException

    from app.core.storage import LocalFileStorage

    storage = LocalFileStorage()

    buf_corrupt_xml = io.BytesIO()
    with zipfile.ZipFile(buf_corrupt_xml, "w") as zf:
        zf.writestr("[Content_Types].xml", b"<malformed xml without closing tags <<??")
        zf.writestr("word/document.xml", b"<w:document/>")

    with pytest.raises(HTTPException) as exc_xml:
        await storage.save_file(
            file_content=buf_corrupt_xml.getvalue(),
            filename="broken.docx",
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )
    assert exc_xml.value.status_code == 415
    assert "malformed [Content_Types].xml" in exc_xml.value.detail


@pytest.mark.asyncio
async def test_fail_closed_revocation_on_db_error():
    """Verify security verification fails closed with HTTP 503 if database lookup raises an error."""
    from unittest.mock import AsyncMock

    from fastapi import HTTPException

    from app.core.rate_limit import RevokedTokenStore

    store = RevokedTokenStore()
    mock_db = AsyncMock()
    mock_db.execute.side_effect = Exception("Database connection failure")
    mock_db.commit.side_effect = Exception("Database connection failure")

    # 1. is_revoked_async fails closed on DB error
    with pytest.raises(HTTPException) as exc_check:
        await store.is_revoked_async("test_token_string", db=mock_db)
    assert exc_check.value.status_code == 503
    assert "unavailable" in exc_check.value.detail

    # 2. consume_token_atomically fails closed on DB error
    with pytest.raises(HTTPException) as exc_consume:
        await store.consume_token_atomically("test_token_string", db=mock_db)
    assert exc_consume.value.status_code == 503
    assert "unavailable" in exc_consume.value.detail


@pytest.mark.asyncio
async def test_logout_and_login_limiter_db_outage_fails_closed():
    """
    Verify fail-closed policy across auth and rate limiting during persistent database outages:
    1. revoke_async fails closed with HTTP 503 if DB commit fails.
    2. login_rate_limiter.check_async fails closed with HTTP 503 if DB execute fails.
    3. login_rate_limiter.record_failure_async fails closed with HTTP 503 if DB commit fails.
    """
    from unittest.mock import AsyncMock, MagicMock

    from fastapi import HTTPException

    from app.core.rate_limit import LoginRateLimiter, RevokedTokenStore

    # 1. Logout persistent revocation DB failure
    store = RevokedTokenStore()
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit.side_effect = Exception("PostgreSQL down during logout commit")
    with pytest.raises(HTTPException) as exc_revoke:
        await store.revoke_async("test_token_logout", db=mock_db)
    assert exc_revoke.value.status_code == 503
    assert "persistent token revocation failed" in exc_revoke.value.detail

    # 2. Login check DB failure
    limiter = LoginRateLimiter(max_attempts=3, window_seconds=60)
    mock_db_check = AsyncMock()
    mock_db_check.execute.side_effect = Exception("PostgreSQL down during check_async")
    with pytest.raises(HTTPException) as exc_check:
        await limiter.check_async("127.0.0.1:test@example.com", db=mock_db_check)
    assert exc_check.value.status_code == 503
    assert "rate limit state could not be verified" in exc_check.value.detail

    # 3. Login record failure DB failure
    mock_db_rec = AsyncMock()
    mock_db_rec.add = MagicMock()
    mock_db_rec.commit.side_effect = Exception("PostgreSQL down during record_failure_async")
    with pytest.raises(HTTPException) as exc_rec:
        await limiter.record_failure_async("127.0.0.1:test@example.com", db=mock_db_rec)
    assert exc_rec.value.status_code == 503
    assert "login failure state could not be recorded" in exc_rec.value.detail

    # 4. Login reset DB failure fails closed & increments telemetry metric
    mock_db_reset = AsyncMock()
    mock_db_reset.commit.side_effect = Exception("PostgreSQL down during reset_async")
    assert limiter.reset_failure_count == 0
    with pytest.raises(HTTPException) as exc_reset:
        await limiter.reset_async("127.0.0.1:test@example.com", db=mock_db_reset)
    assert exc_reset.value.status_code == 503
    assert "login rate-limit state could not be cleared" in exc_reset.value.detail
    assert limiter.reset_failure_count == 1


@pytest.mark.asyncio
async def test_multi_worker_login_rate_limiting_shared_state():
    """
    Verify multi-worker login rate-limiting resilience:
    Independent worker instances without shared memory synchronize failure thresholds
    via the database backing store, locking out subsequent attempts across workers.
    """
    from unittest.mock import AsyncMock, MagicMock

    from fastapi import HTTPException

    from app.core.rate_limit import LoginRateLimiter

    worker1 = LoginRateLimiter(max_attempts=2, window_seconds=60)
    worker2 = LoginRateLimiter(max_attempts=2, window_seconds=60)

    key = "192.0.2.55:attacker@test.com"

    # Worker 1 records failures in DB
    mock_db1 = AsyncMock()
    await worker1.record_failure_async(key, db=mock_db1)
    await worker1.record_failure_async(key, db=mock_db1)

    # Worker 2 has empty local memory for this key
    assert key not in worker2._failures

    # Worker 2 queries DB and finds 2 recorded failures (>= max_attempts 2)
    mock_db2 = AsyncMock()
    mock_scalar = MagicMock()
    mock_scalar.scalar_one.return_value = 2
    mock_db2.execute.return_value = mock_scalar

    with pytest.raises(HTTPException) as exc_w2:
        await worker2.check_async(key, db=mock_db2)
    assert exc_w2.value.status_code == 429
    assert "Account temporarily locked" in exc_w2.value.detail


@pytest.mark.asyncio
async def test_upload_archive_entry_count_limit_exceeded():
    """Verify archive upload fails with 413 if entry count exceeds 5,000 files."""
    import io
    import zipfile

    from fastapi import HTTPException

    from app.core.storage import LocalFileStorage

    storage = LocalFileStorage()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for i in range(5001):
            zf.writestr(f"file_{i}.txt", b"x")

    with pytest.raises(HTTPException) as exc:
        await storage.save_file(
            file_content=buf.getvalue(),
            filename="massive.zip",
            content_type="application/zip",
        )
    assert exc.value.status_code == 413
    assert "too many entries" in exc.value.detail


@pytest.mark.asyncio
async def test_upload_archive_single_entry_size_limit_exceeded():
    """Verify archive upload fails with 413 if an entry's uncompressed header size exceeds 100 MB."""
    import io
    import zipfile

    from fastapi import HTTPException

    from app.core.storage import LocalFileStorage

    storage = LocalFileStorage()
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("test.txt", b"placeholder")

    data = bytearray(buf.getvalue())
    cd_idx = data.find(b"PK\x01\x02")
    assert cd_idx != -1
    # Patch central directory header uncompressed size (offset 24) to 105 MB
    data[cd_idx + 24 : cd_idx + 28] = (105 * 1024 * 1024).to_bytes(4, "little")

    with pytest.raises(HTTPException) as exc:
        await storage.save_file(
            file_content=bytes(data),
            filename="large.zip",
            content_type="application/zip",
        )
    assert exc.value.status_code == 413
    assert "exceeds safety size limit" in exc.value.detail


def test_canonical_origin_malformed_ports_handled_safely():
    """Verify _canonical_origin safely returns None without raising unhandled ValueError on malformed ports."""
    from app.api.auth import _canonical_origin

    # Non-numeric port
    assert _canonical_origin("http://example.com:notaport") is None
    assert _canonical_origin("http://example.com:abc") is None
    assert _canonical_origin("http://example.com:80a") is None

    # Out-of-range port (> 65535 or negative)
    assert _canonical_origin("http://example.com:99999999") is None
    assert _canonical_origin("http://example.com:-80") is None

    # Malformed URL / empty / non-string
    assert _canonical_origin("") is None
    assert _canonical_origin("not-a-valid-url") is None
    assert _canonical_origin(None) is None

    # Valid origins
    assert _canonical_origin("http://localhost:5173") == "http://localhost:5173"
    assert _canonical_origin("http://localhost:80") == "http://localhost"
    assert _canonical_origin("https://studyshare.pages.dev:443") == "https://studyshare.pages.dev"
    assert _canonical_origin("https://studyshare.pages.dev") == "https://studyshare.pages.dev"

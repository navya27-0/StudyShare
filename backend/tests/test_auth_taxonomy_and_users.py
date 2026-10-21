import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_signup_new_user_success_and_welcome_points(client: AsyncClient):
    """
    Test student registration lifecycle:
    1. Successfully register with academic details.
    2. ContributorProfile is automatically created with 10 welcome reputation points.
    3. Proper JWT access and refresh tokens are issued.
    """
    unique_email = f"student_{uuid.uuid4().hex[:8]}@univ.edu"
    payload = {
        "email": unique_email,
        "password": "Password123!",
        "display_name": "Test Contributor",
        "semester": 4,
        "department": "Information Science",
        "bio": "Interested in distributed computing and algorithms.",
    }
    res = await client.post("/api/auth/signup", json=payload)
    assert res.status_code == 201, f"Signup failed: {res.text}"
    data = res.json()

    assert "user" in data
    assert "tokens" in data
    user = data["user"]
    assert user["email"] == unique_email
    assert user["display_name"] == "Test Contributor"
    assert user["role"] == "student"

    # Profile assertions
    profile = user["contributor_profile"]
    assert profile is not None
    assert profile["reputation_points"] == 10
    assert profile["semester"] == 4
    assert profile["department"] == "Information Science"

    # Tokens assertions
    tokens = data["tokens"]
    assert tokens["access_token"]
    assert tokens.get("refresh_token") is None
    assert tokens["token_type"].lower() == "bearer"
    assert res.cookies.get("studyshare_refresh_token") is not None


@pytest.mark.asyncio
async def test_signup_duplicate_email_409(client: AsyncClient):
    """Test registering with an existing email returns 409 Conflict."""
    payload = {
        "email": "arvind.raman@student.univ.edu",  # Seed user
        "password": "AnyPassword123!",
        "display_name": "Arvind Duplicate",
    }
    res = await client.post("/api/auth/signup", json=payload)
    assert res.status_code == 409
    assert "already registered" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_invalid_credentials_401(client: AsyncClient):
    """Test logging in with invalid password or non-existent email returns 401."""
    # 1. Invalid password
    res1 = await client.post(
        "/api/auth/login",
        json={"email": "arvind.raman@student.univ.edu", "password": "WrongPassword!"},
    )
    assert res1.status_code == 401

    # 2. Non-existent email
    res2 = await client.post(
        "/api/auth/login",
        json={"email": "ghost.user@nonexistent.edu", "password": "Password123!"},
    )
    assert res2.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_lifecycle(client: AsyncClient):
    """Test exchanging a refresh token for new access and rotated refresh tokens."""
    # 1. Login to obtain initial tokens
    login_res = await client.post(
        "/api/auth/login",
        json={"email": "arvind.raman@student.univ.edu", "password": "StudyShare2024!"},
    )
    assert login_res.status_code == 200
    assert login_res.cookies.get("studyshare_refresh_token") is not None
    initial_tokens = login_res.json()["tokens"]
    assert initial_tokens.get("refresh_token") is None
    initial_cookie = login_res.cookies.get("studyshare_refresh_token")

    # 2. Request token refresh via HttpOnly cookie
    refresh_res = await client.post(
        "/api/auth/refresh",
        cookies={"studyshare_refresh_token": initial_cookie},
    )
    assert refresh_res.status_code == 200, refresh_res.text
    refreshed_data = refresh_res.json()
    assert refreshed_data["access_token"]
    assert refreshed_data.get("refresh_token") is None
    rotated_cookie = refresh_res.cookies.get("studyshare_refresh_token")
    assert rotated_cookie is not None
    assert rotated_cookie != initial_cookie

    # 3. Replay attack: attempting to reuse the consumed token fails with 401
    replay_res = await client.post(
        "/api/auth/refresh",
        cookies={"studyshare_refresh_token": initial_cookie},
    )
    assert replay_res.status_code == 401
    assert "consumed or revoked" in replay_res.json()["detail"].lower()

    # 4. Invalid token signature returns 401
    bad_res = await client.post(
        "/api/auth/refresh",
        cookies={"studyshare_refresh_token": "malformed.jwt.token"},
    )
    assert bad_res.status_code == 401


@pytest.mark.asyncio
async def test_concurrent_refresh_rotation_single_use_atomicity(client: AsyncClient):
    """
    Test two concurrent refresh requests using the exact same refresh token.
    Enforces atomic single-use rotation in PostgreSQL: exactly ONE request may succeed (200 OK);
    the other MUST encounter a unique constraint conflict and return 401 Unauthorized.
    """
    import asyncio

    # 1. Login to obtain a fresh token
    login_res = await client.post(
        "/api/auth/login",
        json={"email": "sneha.rao@student.univ.edu", "password": "StudyShare2024!"},
    )
    assert login_res.status_code == 200
    token = login_res.cookies.get("studyshare_refresh_token")
    assert token is not None

    # 2. Fire two concurrent refresh requests simultaneously
    req1 = client.post("/api/auth/refresh", cookies={"studyshare_refresh_token": token})
    req2 = client.post("/api/auth/refresh", cookies={"studyshare_refresh_token": token})

    res1, res2 = await asyncio.gather(req1, req2)

    statuses = [res1.status_code, res2.status_code]
    assert 200 in statuses, f"Expected one 200 OK, got: {statuses}"
    assert 401 in statuses, f"Expected one 401 Unauthorized, got: {statuses}"


@pytest.mark.asyncio
async def test_csrf_origin_rejection_on_cookie_endpoints(client: AsyncClient):
    """
    Verify strict CSRF origin validation on cookie-authenticated endpoints:
    1. Rejects untrusted arbitrary origins with 403 Forbidden.
    2. Rejects deceptive domain suffixes (e.g. https://studyshare.pages.dev.attacker.example) with 403.
    3. Rejects unexpected ports (e.g. http://localhost:5174 when 5173 is configured) with 403.
    4. Rejects requests with neither Origin nor Referer header with 403.
    5. Rejects deceptive Referer suffixes with 403.
    6. Accepts valid Referer without Origin header.
    7. Accepts exact configured Origin.
    """
    from httpx import ASGITransport, AsyncClient as BareAsyncClient

    from app.main import app

    # 1. Refresh with untrusted origin
    res_refresh = await client.post(
        "/api/auth/refresh",
        headers={"Origin": "https://malicious-attacker.com"},
        cookies={"studyshare_refresh_token": "any.token.value"},
    )
    assert res_refresh.status_code == 403
    assert "CSRF" in res_refresh.json()["detail"]

    # 2. Deceptive domain suffix on Origin
    res_suffix = await client.post(
        "/api/auth/refresh",
        headers={"Origin": "https://studyshare.pages.dev.attacker.example"},
        cookies={"studyshare_refresh_token": "any.token.value"},
    )
    assert res_suffix.status_code == 403
    assert "Untrusted origin" in res_suffix.json()["detail"]

    # 3. Unexpected port on Origin
    res_port = await client.post(
        "/api/auth/refresh",
        headers={"Origin": "http://localhost:5174"},
        cookies={"studyshare_refresh_token": "any.token.value"},
    )
    assert res_port.status_code == 403
    assert "Untrusted origin" in res_port.json()["detail"]

    # 3b. Malformed non-numeric port in Origin (must return clean 403 rather than 500 ValueError)
    res_nonnum_port = await client.post(
        "/api/auth/refresh",
        headers={"Origin": "http://localhost:invalidport"},
        cookies={"studyshare_refresh_token": "any.token.value"},
    )
    assert res_nonnum_port.status_code == 403
    assert "Untrusted origin" in res_nonnum_port.json()["detail"]

    # 3c. Malformed out-of-range port in Origin (> 65535, must return clean 403 rather than 500)
    res_range_port = await client.post(
        "/api/auth/refresh",
        headers={"Origin": "http://localhost:99999999"},
        cookies={"studyshare_refresh_token": "any.token.value"},
    )
    assert res_range_port.status_code == 403
    assert "Untrusted origin" in res_range_port.json()["detail"]

    # 4. Absent Origin and absent Referer
    async with BareAsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as bare_client:
        res_no_headers = await bare_client.post(
            "/api/auth/refresh",
            cookies={"studyshare_refresh_token": "any.token.value"},
        )
        assert res_no_headers.status_code == 403
        assert "Missing Origin or Referer" in res_no_headers.json()["detail"]

    # 5. Deceptive Referer suffix
    res_bad_ref = await client.post(
        "/api/auth/refresh",
        headers={"Origin": "", "Referer": "https://studyshare.pages.dev.attacker.example/evil"},
        cookies={"studyshare_refresh_token": "any.token.value"},
    )
    assert res_bad_ref.status_code == 403
    assert "Untrusted referer" in res_bad_ref.json()["detail"]

    # 5b. Malformed non-numeric port in Referer
    res_bad_ref_nonnum = await client.post(
        "/api/auth/refresh",
        headers={"Origin": "", "Referer": "http://localhost:invalidport/evil"},
        cookies={"studyshare_refresh_token": "any.token.value"},
    )
    assert res_bad_ref_nonnum.status_code == 403
    assert "Untrusted referer" in res_bad_ref_nonnum.json()["detail"]

    # 5c. Malformed out-of-range port in Referer
    res_bad_ref_range = await client.post(
        "/api/auth/refresh",
        headers={"Origin": "", "Referer": "http://localhost:99999999/evil"},
        cookies={"studyshare_refresh_token": "any.token.value"},
    )
    assert res_bad_ref_range.status_code == 403
    assert "Untrusted referer" in res_bad_ref_range.json()["detail"]

    # 6. Valid Referer without Origin succeeds CSRF validation (fails at token decoding if invalid token)
    res_good_ref = await client.post(
        "/api/auth/refresh",
        headers={"Origin": "", "Referer": "http://localhost:5173/dashboard"},
        cookies={"studyshare_refresh_token": "malformed.jwt.token"},
    )
    # Passes CSRF (403), proceeds to JWT decode (401)
    assert res_good_ref.status_code == 401
    assert "refresh token" in res_good_ref.json()["detail"].lower()

    # 7. Logout with untrusted origin
    res_logout = await client.post(
        "/api/auth/logout",
        headers={"Origin": "https://malicious-attacker.com"},
        cookies={"studyshare_refresh_token": "any.token.value"},
    )
    assert res_logout.status_code == 403
    assert "CSRF" in res_logout.json()["detail"]


@pytest.mark.asyncio
async def test_auth_logout_db_outage_fails_closed(client: AsyncClient):
    """Verify HTTP 503 Service Unavailable when DB connectivity drops during logout."""
    from unittest.mock import AsyncMock

    from app.database import get_db_session
    from app.main import app

    broken_db = AsyncMock()
    broken_db.commit.side_effect = Exception("PostgreSQL down during logout")

    async def override_broken_db():
        yield broken_db

    app.dependency_overrides[get_db_session] = override_broken_db
    try:
        res = await client.post(
            "/api/auth/logout",
            cookies={"studyshare_refresh_token": "sample.jwt.token"},
        )
        assert res.status_code == 503
        assert "temporarily unavailable" in res.json()["detail"].lower()
    finally:
        from tests.conftest import override_get_db_session

        app.dependency_overrides[get_db_session] = override_get_db_session


@pytest.mark.asyncio
async def test_production_environment_rejects_test_origin(client: AsyncClient):
    """
    Verify that in production environments (both 'production' and 'prod' aliases),
    synthetic test origin 'http://test' is strictly excluded from trusted origins
    and rejected with HTTP 403 Forbidden.
    """
    from app.config import get_settings

    settings = get_settings()
    original_env = settings.ENVIRONMENT
    for prod_alias in ("production", "prod", "PROD", " Production "):
        try:
            settings.ENVIRONMENT = prod_alias
            res = await client.post(
                "/api/auth/refresh",
                headers={
                    "Origin": "http://test",
                    "Cookie": "studyshare_refresh_token=any.token.value",
                },
            )
            assert res.status_code == 403, (
                f"Origin 'http://test' was unexpectedly allowed in ENVIRONMENT='{prod_alias}'"
            )
            assert "Untrusted origin" in res.json()["detail"]
        finally:
            settings.ENVIRONMENT = original_env


def test_refresh_cookie_secure_flag_in_production_and_prod():
    """Verify refresh cookie has secure=True under both 'production' and 'prod' aliases, and handles SameSite=none."""
    from fastapi import Response

    from app.api.auth import _clear_refresh_cookie, _set_refresh_cookie
    from app.config import get_settings

    settings = get_settings()
    original_env = settings.ENVIRONMENT
    original_samesite = settings.REFRESH_COOKIE_SAMESITE
    try:
        # 1. Default SameSite=lax in production receives Secure and HttpOnly
        for prod_alias in ("production", "prod", "PROD", " Production "):
            settings.ENVIRONMENT = prod_alias
            settings.REFRESH_COOKIE_SAMESITE = "lax"
            res = Response()
            _set_refresh_cookie(res, "sample_refresh_token")
            set_cookie_header = res.headers.get("set-cookie", "")
            assert "secure" in set_cookie_header.lower()
            assert "httponly" in set_cookie_header.lower()
            assert "samesite=lax" in set_cookie_header.lower()

        # 2. Cross-site SameSite=none receives Secure even in development
        settings.ENVIRONMENT = "development"
        settings.REFRESH_COOKIE_SAMESITE = "none"
        res_none = Response()
        _set_refresh_cookie(res_none, "sample_refresh_token")
        none_header = res_none.headers.get("set-cookie", "")
        assert "samesite=none" in none_header.lower()
        assert "secure" in none_header.lower()
        assert "httponly" in none_header.lower()

        # 3. Clear cookie uses matching SameSite=none and Secure
        res_clear = Response()
        _clear_refresh_cookie(res_clear)
        clear_header = res_clear.headers.get("set-cookie", "")
        assert "samesite=none" in clear_header.lower()
        assert "secure" in clear_header.lower()
        assert (
            "max-age=0" in clear_header.lower()
            or "expires=thu, 01 jan 1970" in clear_header.lower()
        )
    finally:
        settings.ENVIRONMENT = original_env
        settings.REFRESH_COOKIE_SAMESITE = original_samesite


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient, auth_headers: dict):
    """Test GET /api/auth/me returns current authenticated user and profile."""
    res = await client.get("/api/auth/me", headers=auth_headers)
    assert res.status_code == 200
    user = res.json()
    assert user["email"] == "arvind.raman@student.univ.edu"
    assert "contributor_profile" in user

    # Without auth headers, returns 401
    unauth_res = await client.get("/api/auth/me")
    assert unauth_res.status_code == 401


@pytest.mark.asyncio
async def test_create_unit_and_topic_inline(client: AsyncClient, auth_headers: dict):
    """
    Test curriculum hierarchy inline expansion:
    1. Create a new Unit under Subject 1 (CS201 Data Structures).
    2. Create a new Topic under that Unit.
    3. Verify validation error handling (404 on missing parent).
    """
    # 1. Create Unit
    unit_res = await client.post(
        "/api/resources/units",
        json={"subject_id": 1, "title": "Advanced Graph Theory and Network Flows"},
        headers=auth_headers,
    )
    assert unit_res.status_code == 201, unit_res.text
    unit = unit_res.json()
    unit_id = unit["id"]
    assert unit["subject_id"] == 1
    assert "Network Flows" in unit["title"]

    # 2. Create Topic under newly created Unit
    topic_res = await client.post(
        "/api/resources/topics",
        json={"unit_id": unit_id, "title": "Edmonds-Karp Maximum Bipartite Matching"},
        headers=auth_headers,
    )
    assert topic_res.status_code == 201, topic_res.text
    topic = topic_res.json()
    assert topic["unit_id"] == unit_id
    assert "Edmonds-Karp" in topic["title"]

    # 3. Create Unit with non-existent Subject ID returns 404
    missing_subj_res = await client.post(
        "/api/resources/units",
        json={"subject_id": 999999, "title": "Orphan Unit"},
        headers=auth_headers,
    )
    assert missing_subj_res.status_code == 404

    # 4. Create Topic with non-existent Unit ID returns 404
    missing_unit_res = await client.post(
        "/api/resources/topics",
        json={"unit_id": 999999, "title": "Orphan Topic"},
        headers=auth_headers,
    )
    assert missing_unit_res.status_code == 404


@pytest.mark.asyncio
async def test_user_profile_and_activity_feed(
    client: AsyncClient,
    auth_headers: dict,
    other_auth_headers: dict,
):
    """Test retrieving user public profile and activity log feed with privacy boundaries."""
    # 1. Lookup user by ID - must be public profile without PII
    res = await client.get("/api/users/1")
    assert res.status_code == 200
    user = res.json()
    assert user["id"] == 1
    assert user["display_name"]
    assert "contributor_profile" in user
    assert "email" not in user, "Public user profile must not leak email address"
    assert "is_active" not in user, (
        "Public user profile must not leak internal account active status"
    )

    # 2. Non-existent user returns 404
    res_404 = await client.get("/api/users/999999")
    assert res_404.status_code == 404

    # 3. Unauthenticated activity feed - returns public uploads only, omits bookmarks/ratings
    act_res = await client.get("/api/users/1/activity")
    assert act_res.status_code == 200
    act_data = act_res.json()
    assert "items" in act_data
    assert isinstance(act_data["items"], list)
    for item in act_data["items"]:
        assert item["action"] == "upload", (
            "Anonymous activity feed must only display public uploads"
        )

    # 4. Third-party authenticated activity feed - also omits bookmarks/ratings
    other_act_res = await client.get("/api/users/1/activity", headers=other_auth_headers)
    assert other_act_res.status_code == 200
    for item in other_act_res.json()["items"]:
        assert item["action"] == "upload", (
            "Third-party activity feed must only display public uploads"
        )

    # 5. Owner authenticated activity feed - includes activity feed
    owner_act_res = await client.get("/api/users/1/activity", headers=auth_headers)
    assert owner_act_res.status_code == 200


@pytest.mark.asyncio
async def test_user_bookmarks_list_endpoint(
    client: AsyncClient,
    auth_headers: dict,
    other_auth_headers: dict,
    admin_auth_headers: dict,
):
    """Test GET /api/users/{id}/bookmarks pagination, response schema, and access boundaries."""
    # 1. Unauthenticated request must return 401 Unauthorized
    unauth_res = await client.get("/api/users/1/bookmarks?page=1&page_size=10")
    assert unauth_res.status_code == 401

    # 2. Third-party authenticated user must return 403 Forbidden
    forbidden_res = await client.get(
        "/api/users/1/bookmarks?page=1&page_size=10",
        headers=other_auth_headers,
    )
    assert forbidden_res.status_code == 403

    # 3. Owner access succeeds with 200 OK
    res = await client.get(
        "/api/users/1/bookmarks?page=1&page_size=10",
        headers=auth_headers,
    )
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)
    for b in data["items"]:
        assert "resource" in b
        assert "id" in b["resource"]
        assert "breadcrumbs" in b["resource"]

    # 4. Admin access also succeeds with 200 OK
    admin_res = await client.get(
        "/api/users/1/bookmarks?page=1&page_size=10",
        headers=admin_auth_headers,
    )
    assert admin_res.status_code == 200

    # 5. 404 on missing user with admin authorization
    missing_res = await client.get("/api/users/999999/bookmarks", headers=admin_auth_headers)
    assert missing_res.status_code == 404


@pytest.mark.asyncio
async def test_create_link_resource_without_file(client: AsyncClient, auth_headers: dict):
    """Test publishing a link-type resource (external URL instead of file upload)."""
    form_data = {
        "topic_id": "1",
        "type": "link",
        "title": "Official RISC-V Architecture Specification",
        "description": "Standard instruction set manual and reference links.",
        "semester": "3",
        "external_url": "https://github.com/riscv/riscv-isa-manual",
        "changelog": "Initial link curation",
    }
    res = await client.post("/api/resources", data=form_data, headers=auth_headers)
    assert res.status_code == 201, f"Link resource failed: {res.text}"
    created = res.json()
    assert created["type"] == "link"
    assert created["file_url"] == "https://github.com/riscv/riscv-isa-manual"
    assert created["title"] == "Official RISC-V Architecture Specification"


@pytest.mark.asyncio
async def test_interaction_validation_bounds(client: AsyncClient, auth_headers: dict):
    """Test input validation bounds on rating and report endpoints."""
    # 1. Rating out of bounds (< 1 or > 5) should fail validation
    res_zero = await client.post(
        "/api/resources/1/rating",
        json={"stars": 0},
        headers=auth_headers,
    )
    assert res_zero.status_code == 422

    res_six = await client.post(
        "/api/resources/1/rating",
        json={"stars": 6},
        headers=auth_headers,
    )
    assert res_six.status_code == 422

    # 2. Rating non-existent resource should return 404
    res_404 = await client.post(
        "/api/resources/999999/rating",
        json={"stars": 5},
        headers=auth_headers,
    )
    assert res_404.status_code == 404

    # 3. Reporting non-existent resource should return 404
    rep_404 = await client.post(
        "/api/resources/999999/report",
        json={"reason": "Broken download link"},
        headers=auth_headers,
    )
    assert rep_404.status_code == 404

    # 4. Reporting with empty reason string should fail validation
    rep_empty = await client.post(
        "/api/resources/1/report",
        json={"reason": ""},
        headers=auth_headers,
    )
    assert rep_empty.status_code == 422


@pytest.mark.asyncio
async def test_external_url_validation_link_resources(client: AsyncClient, auth_headers: dict):
    """Test strict backend URL scheme and hostname validation on link resources."""
    base_data = {
        "topic_id": "1",
        "type": "link",
        "title": "URL Validation Test Resource",
        "semester": "3",
        "changelog": "Testing URL validation",
    }

    # 1. Reject dangerous and non-http(s) schemes
    for bad_url in [
        "javascript:alert(document.cookie)",
        "file:///etc/passwd",
        "data:text/html;base64,PHNjcmlwdD4=",
        "ftp://example.com/file.pdf",
        "http://",
        "https://",
        "just-a-plain-string",
        "http://[invalid-ipv6",
    ]:
        data = {**base_data, "external_url": bad_url}
        res = await client.post("/api/resources", data=data, headers=auth_headers)
        assert res.status_code == 422, (
            f"Expected 422 for bad URL '{bad_url}', got {res.status_code}"
        )

    # 2. Accept valid http/https URLs with hostnames
    valid_data = {**base_data, "external_url": "https://ocw.mit.edu/courses/electrical-engineering"}
    res_ok = await client.post("/api/resources", data=valid_data, headers=auth_headers)
    assert res_ok.status_code == 201
    created_id = res_ok.json()["id"]

    # 3. Reject invalid external_url on version updates
    bad_update = await client.put(
        f"/api/resources/{created_id}",
        data={"changelog": "Attempting invalid url", "external_url": "javascript:void(0)"},
        headers=auth_headers,
    )
    assert bad_update.status_code == 422

    # 4. Accept valid external_url on version updates
    good_update = await client.put(
        f"/api/resources/{created_id}",
        data={"changelog": "Valid url update", "external_url": "https://cs61c.org/resources"},
        headers=auth_headers,
    )
    assert good_update.status_code == 200
    assert good_update.json()["file_url"] == "https://cs61c.org/resources"

    # 5. Detail response must NOT return direct presigned_url (governed download enforcement)
    detail_res = await client.get(f"/api/resources/{created_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["presigned_url"] is None

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
    assert tokens["refresh_token"]
    assert tokens["token_type"].lower() == "bearer"


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
    initial_tokens = login_res.json()["tokens"]
    refresh_token = initial_tokens["refresh_token"]

    # 2. Request token refresh
    refresh_res = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200, refresh_res.text
    refreshed_data = refresh_res.json()
    assert refreshed_data["access_token"]
    assert refreshed_data["refresh_token"]

    # 3. Invalid token signature returns 401
    bad_res = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": "malformed.jwt.token"},
    )
    assert bad_res.status_code == 401


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
async def test_user_profile_and_activity_feed(client: AsyncClient):
    """Test retrieving user public profile and activity log feed."""
    # 1. Lookup user by ID
    res = await client.get("/api/users/1")
    assert res.status_code == 200
    user = res.json()
    assert user["id"] == 1
    assert user["display_name"]
    assert "contributor_profile" in user

    # 2. Non-existent user returns 404
    res_404 = await client.get("/api/users/999999")
    assert res_404.status_code == 404

    # 3. Activity feed
    act_res = await client.get("/api/users/1/activity")
    assert act_res.status_code == 200
    act_data = act_res.json()
    assert "items" in act_data
    assert isinstance(act_data["items"], list)
    if act_data["items"]:
        item = act_data["items"][0]
        assert "action" in item
        assert "resource_id" in item
        assert "timestamp" in item


@pytest.mark.asyncio
async def test_user_bookmarks_list_endpoint(client: AsyncClient):
    """Test GET /api/users/{id}/bookmarks pagination and response schema."""
    res = await client.get("/api/users/1/bookmarks?page=1&page_size=10")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "items" in data
    assert isinstance(data["items"], list)
    for b in data["items"]:
        assert "resource" in b
        assert "id" in b["resource"]
        assert "breadcrumbs" in b["resource"]

    # 404 on missing user
    missing_res = await client.get("/api/users/999999/bookmarks")
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

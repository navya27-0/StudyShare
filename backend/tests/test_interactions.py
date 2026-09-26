import pytest
from httpx import AsyncClient


async def _create_test_resource(client: AsyncClient, headers: dict) -> int:
    """Helper to create a fresh, unvoted resource for interaction tests."""
    form_data = {
        "topic_id": "1",
        "type": "notes",
        "title": "Interaction Test Notes",
        "description": "Test material for voting, rating, and bookmark lifecycle",
        "semester": "3",
        "changelog": "v1 initial",
    }
    files = {"file": ("interaction_test.pdf", b"%PDF-1.4 mock content", "application/pdf")}
    res = await client.post("/api/resources", data=form_data, files=files, headers=headers)
    assert res.status_code == 201, f"Failed to create test resource: {res.text}"
    return res.json()["id"]


@pytest.mark.asyncio
async def test_vote_lifecycle_toggle_and_switch(
    client: AsyncClient, auth_headers: dict, other_auth_headers: dict
):
    """
    Test the complete voting state machine:
    1. First vote 'up' creates vote (count: 1 up, 0 down).
    2. Same direction 'up' toggles off (removes) vote (count: 0 up, 0 down).
    3. Vote 'down' creates downvote (count: 0 up, 1 down).
    4. Opposite direction 'up' switches vote from down to up (count: 1 up, 0 down).
    5. Second user voting updates aggregate counts correctly (count: 2 up, 0 down).
    6. Second user switches to 'down' (count: 1 up, 1 down).
    7. Second user toggles off 'down' (count: 1 up, 0 down).
    8. First user toggles off 'up' (count: 0 up, 0 down).
    """
    resource_id = await _create_test_resource(client, auth_headers)

    # Verify initial clean state
    init_res = await client.get(f"/api/resources/{resource_id}")
    assert init_res.status_code == 200
    assert init_res.json()["upvotes_count"] == 0
    assert init_res.json()["downvotes_count"] == 0

    # --- Step 1: User 1 votes UP (Creation) ---
    v1_res = await client.post(
        f"/api/resources/{resource_id}/vote", json={"value": "up"}, headers=auth_headers
    )
    assert v1_res.status_code == 200, v1_res.text
    v1 = v1_res.json()
    assert v1["user_vote"] == "up"
    assert v1["action"] == "created"
    assert v1["upvotes_count"] == 1
    assert v1["downvotes_count"] == 0

    # --- Step 2: User 1 votes UP again (Toggle Off / Remove) ---
    v2_res = await client.post(
        f"/api/resources/{resource_id}/vote", json={"value": "up"}, headers=auth_headers
    )
    assert v2_res.status_code == 200, v2_res.text
    v2 = v2_res.json()
    assert v2["user_vote"] is None
    assert v2["action"] == "removed"
    assert v2["upvotes_count"] == 0
    assert v2["downvotes_count"] == 0

    # --- Step 3: User 1 votes DOWN (Creation) ---
    v3_res = await client.post(
        f"/api/resources/{resource_id}/vote", json={"value": "down"}, headers=auth_headers
    )
    assert v3_res.status_code == 200, v3_res.text
    v3 = v3_res.json()
    assert v3["user_vote"] == "down"
    assert v3["action"] == "created"
    assert v3["upvotes_count"] == 0
    assert v3["downvotes_count"] == 1

    # --- Step 4: User 1 votes UP (Switch from down to up) ---
    v4_res = await client.post(
        f"/api/resources/{resource_id}/vote", json={"value": "up"}, headers=auth_headers
    )
    assert v4_res.status_code == 200, v4_res.text
    v4 = v4_res.json()
    assert v4["user_vote"] == "up"
    assert v4["action"] == "switched"
    assert v4["upvotes_count"] == 1
    assert v4["downvotes_count"] == 0

    # --- Step 5: User 2 votes UP (Multi-user concurrency) ---
    v5_res = await client.post(
        f"/api/resources/{resource_id}/vote", json={"value": "up"}, headers=other_auth_headers
    )
    assert v5_res.status_code == 200, v5_res.text
    v5 = v5_res.json()
    assert v5["user_vote"] == "up"
    assert v5["action"] == "created"
    assert v5["upvotes_count"] == 2
    assert v5["downvotes_count"] == 0

    # --- Step 6: User 2 switches UP to DOWN ---
    v6_res = await client.post(
        f"/api/resources/{resource_id}/vote", json={"value": "down"}, headers=other_auth_headers
    )
    assert v6_res.status_code == 200, v6_res.text
    v6 = v6_res.json()
    assert v6["user_vote"] == "down"
    assert v6["action"] == "switched"
    assert v6["upvotes_count"] == 1
    assert v6["downvotes_count"] == 1

    # --- Step 7: User 2 toggles off DOWN ---
    v7_res = await client.post(
        f"/api/resources/{resource_id}/vote", json={"value": "down"}, headers=other_auth_headers
    )
    assert v7_res.status_code == 200, v7_res.text
    v7 = v7_res.json()
    assert v7["user_vote"] is None
    assert v7["action"] == "removed"
    assert v7["upvotes_count"] == 1
    assert v7["downvotes_count"] == 0

    # --- Step 8: User 1 toggles off UP ---
    v8_res = await client.post(
        f"/api/resources/{resource_id}/vote", json={"value": "up"}, headers=auth_headers
    )
    assert v8_res.status_code == 200, v8_res.text
    v8 = v8_res.json()
    assert v8["user_vote"] is None
    assert v8["action"] == "removed"
    assert v8["upvotes_count"] == 0
    assert v8["downvotes_count"] == 0

    # Verify final resource view state
    final_res = await client.get(f"/api/resources/{resource_id}")
    assert final_res.json()["upvotes_count"] == 0
    assert final_res.json()["downvotes_count"] == 0


@pytest.mark.asyncio
async def test_vote_input_validation_and_errors(client: AsyncClient, auth_headers: dict):
    """Test validation and error handling for vote endpoint."""
    # Invalid vote direction
    res = await client.post(
        "/api/resources/1/vote", json={"value": "sideways"}, headers=auth_headers
    )
    assert res.status_code == 422

    # Nonexistent resource
    res = await client.post(
        "/api/resources/999999/vote", json={"value": "up"}, headers=auth_headers
    )
    assert res.status_code == 404

    # Unauthenticated
    res = await client.post("/api/resources/1/vote", json={"value": "up"})
    assert res.status_code == 401


@pytest.mark.asyncio
async def test_rating_upsert_and_averages(
    client: AsyncClient, auth_headers: dict, other_auth_headers: dict
):
    """
    Test rating a fresh resource:
    - User 1 rates 5 stars -> avg 5.0, count 1
    - User 2 rates 3 stars -> avg 4.0, count 2
    - User 1 updates rating to 1 star (upsert) -> avg 2.0, count 2
    - Out of range stars validation (0, 6)
    """
    resource_id = await _create_test_resource(client, auth_headers)

    # 1. User 1 rates 5 stars
    r1 = await client.post(
        f"/api/resources/{resource_id}/rating", json={"stars": 5}, headers=auth_headers
    )
    assert r1.status_code == 200, r1.text
    data1 = r1.json()
    assert data1["user_stars"] == 5
    assert data1["rating_avg"] == 5.0
    assert data1["rating_count"] == 1

    # 2. User 2 rates 3 stars
    r2 = await client.post(
        f"/api/resources/{resource_id}/rating", json={"stars": 3}, headers=other_auth_headers
    )
    assert r2.status_code == 200, r2.text
    data2 = r2.json()
    assert data2["user_stars"] == 3
    assert data2["rating_avg"] == 4.0
    assert data2["rating_count"] == 2

    # 3. User 1 upserts rating to 1 star
    r3 = await client.post(
        f"/api/resources/{resource_id}/rating", json={"stars": 1}, headers=auth_headers
    )
    assert r3.status_code == 200, r3.text
    data3 = r3.json()
    assert data3["user_stars"] == 1
    assert data3["rating_avg"] == 2.0
    assert data3["rating_count"] == 2

    # 4. Out of range stars validation
    r_low = await client.post(
        f"/api/resources/{resource_id}/rating", json={"stars": 0}, headers=auth_headers
    )
    assert r_low.status_code == 422

    r_high = await client.post(
        f"/api/resources/{resource_id}/rating", json={"stars": 6}, headers=auth_headers
    )
    assert r_high.status_code == 422

    # 5. Nonexistent resource
    r_missing = await client.post(
        "/api/resources/999999/rating", json={"stars": 4}, headers=auth_headers
    )
    assert r_missing.status_code == 404


@pytest.mark.asyncio
async def test_bookmark_lifecycle_and_user_listing(client: AsyncClient, auth_headers: dict):
    """
    Test bookmarking workflow:
    - POST /resources/:id/bookmark
    - POST again (idempotent)
    - GET /users/:id/bookmarks verifies resource is present
    - DELETE /resources/:id/bookmark removes it
    - GET /users/:id/bookmarks verifies resource is no longer present
    """
    # Create fresh resource
    resource_id = await _create_test_resource(client, auth_headers)

    # Get current user ID from /api/auth/me
    me_res = await client.get("/api/auth/me", headers=auth_headers)
    assert me_res.status_code == 200
    user_id = me_res.json()["id"]

    # 1. Bookmark resource
    bm_res = await client.post(f"/api/resources/{resource_id}/bookmark", headers=auth_headers)
    assert bm_res.status_code == 200, bm_res.text
    assert bm_res.json()["bookmarked"] is True

    # 2. Duplicate bookmark (idempotent)
    bm_dup = await client.post(f"/api/resources/{resource_id}/bookmark", headers=auth_headers)
    assert bm_dup.status_code == 200
    assert bm_dup.json()["bookmarked"] is True

    # 3. GET /users/:id/bookmarks
    list_res = await client.get(f"/api/users/{user_id}/bookmarks")
    assert list_res.status_code == 200, list_res.text
    bookmarks_data = list_res.json()
    assert bookmarks_data["total"] >= 1
    resource_ids = [item["resource_id"] for item in bookmarks_data["items"]]
    assert resource_id in resource_ids

    # Verify resource item contains full breadcrumbs
    item = next(it for it in bookmarks_data["items"] if it["resource_id"] == resource_id)
    assert "resource" in item
    assert item["resource"]["id"] == resource_id
    assert item["resource"]["breadcrumbs"]["subject"] is not None

    # 4. DELETE /resources/:id/bookmark
    del_res = await client.delete(f"/api/resources/{resource_id}/bookmark", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["bookmarked"] is False

    # 5. Verify no longer in bookmarks
    list_after = await client.get(f"/api/users/{user_id}/bookmarks")
    assert resource_id not in [it["resource_id"] for it in list_after.json()["items"]]


@pytest.mark.asyncio
async def test_report_resource(client: AsyncClient, auth_headers: dict):
    """
    Test submitting a report for moderation:
    - Status defaults to 'open'
    - Reporter ID is authenticated user
    """
    resource_id = await _create_test_resource(client, auth_headers)

    me_res = await client.get("/api/auth/me", headers=auth_headers)
    user_id = me_res.json()["id"]

    report_payload = {
        "reason": "The uploaded notes contain outdated 2018 syllabus instead of 2024 revision."
    }
    rep_res = await client.post(
        f"/api/resources/{resource_id}/report", json=report_payload, headers=auth_headers
    )
    assert rep_res.status_code == 201, rep_res.text
    rep_data = rep_res.json()
    assert rep_data["resource_id"] == resource_id
    assert rep_data["reporter_id"] == user_id
    assert rep_data["status"] == "open"
    assert "outdated 2018 syllabus" in rep_data["reason"]

    # Nonexistent resource report
    missing_rep = await client.post(
        "/api/resources/999999/report",
        json={"reason": "Test report on missing resource"},
        headers=auth_headers,
    )
    assert missing_rep.status_code == 404


@pytest.mark.asyncio
async def test_root_path_aliases_without_api_prefix(client: AsyncClient, auth_headers: dict):
    """Verify that endpoints mounted without /api prefix work identically."""
    resource_id = await _create_test_resource(client, auth_headers)

    # Test POST /resources/:id/bookmark
    bm_res = await client.post(f"/resources/{resource_id}/bookmark", headers=auth_headers)
    assert bm_res.status_code == 200
    assert bm_res.json()["bookmarked"] is True

    # Test DELETE /resources/:id/bookmark
    del_res = await client.delete(f"/resources/{resource_id}/bookmark", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["bookmarked"] is False

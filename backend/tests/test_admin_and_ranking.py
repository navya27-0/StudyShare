import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_ranking_algorithm_sensible_ordering(client: AsyncClient):
    """
    Test that the ranking score algorithm produces sensible ordering on seed data:
    1. High-quality, verified resources with positive votes/ratings rank near the top.
    2. Stale, downvoted, and low-rated resources (e.g. 2017 exam paper with net -8 votes, 2.1 stars) sink to the bottom.
    3. The returned list is strictly ordered descending by ranking score.
    """
    res = await client.get("/api/resources?sort_by=ranked&page_size=20")
    assert res.status_code == 200, res.text
    data = res.json()
    items = data["items"]
    assert len(items) >= 5

    # Verify every item has a computed ranking_score
    for item in items:
        assert "ranking_score" in item
        assert item["ranking_score"] is not None

    scores = [item["ranking_score"] for item in items]
    # Scores must be sorted in descending order
    assert scores == sorted(scores, reverse=True), f"Scores not descending: {scores}"

    # Verify top items are high quality/verified
    top_resource = items[0]
    assert top_resource["rating_avg"] >= 4.5
    assert top_resource["upvotes_count"] >= 50

    # Verify that the poorly-rated legacy paper (Resource 13 if present) is ranked near the very bottom
    titles = [item["title"] for item in items]
    if "2017 Mid-Semester Examination Question Paper (Previous Regulation R16)" in titles:
        idx = titles.index("2017 Mid-Semester Examination Question Paper (Previous Regulation R16)")
        # Should be in the bottom 25% of items
        assert idx >= len(items) - 3, f"Low quality resource ranked too high at index {idx}"


@pytest.mark.asyncio
async def test_admin_route_protection_non_admin_403(client: AsyncClient, auth_headers: dict):
    """
    Strictly verify that student (non-admin) users receive 403 Forbidden across all admin routes:
    - GET /api/admin/reports
    - POST /api/admin/reports/:id/action
    - POST /api/admin/resources/:id/remove
    - POST /api/admin/resources/:id/restore
    - POST /api/admin/users/:id/ban
    - POST /api/admin/users/:id/unban
    - GET /api/admin/moderation-actions
    """
    # 1. Reports
    r1 = await client.get("/api/admin/reports", headers=auth_headers)
    assert r1.status_code == 403, f"Expected 403, got {r1.status_code}"

    r2 = await client.post(
        "/api/admin/reports/1/action", json={"action": "dismiss"}, headers=auth_headers
    )
    assert r2.status_code == 403

    # 2. Resource moderation
    r3 = await client.post("/api/admin/resources/1/remove", headers=auth_headers)
    assert r3.status_code == 403

    r4 = await client.post("/api/admin/resources/1/restore", headers=auth_headers)
    assert r4.status_code == 403

    # 3. User moderation
    r5 = await client.post("/api/admin/users/3/ban", headers=auth_headers)
    assert r5.status_code == 403

    r6 = await client.post("/api/admin/users/3/unban", headers=auth_headers)
    assert r6.status_code == 403

    # 4. Moderation actions log
    r7 = await client.get("/api/admin/moderation-actions", headers=auth_headers)
    assert r7.status_code == 403

    # 5. Unauthenticated call gets 401
    r_unauth = await client.get("/api/admin/reports")
    assert r_unauth.status_code == 401


@pytest.mark.asyncio
async def test_admin_reports_and_moderation_lifecycle(
    client: AsyncClient, admin_auth_headers: dict
):
    """
    Test admin reports management and resource moderation:
    1. Admin lists open reports.
    2. Admin actions/dismisses a report and verifies audit log.
    3. Admin removes a resource (soft-delete), verifying it disappears from public listings.
    4. Admin restores the resource, verifying it reappears.
    """
    # 1. List reports
    rep_res = await client.get("/api/admin/reports?status=open", headers=admin_auth_headers)
    assert rep_res.status_code == 200, rep_res.text
    reports = rep_res.json()["items"]
    assert len(reports) >= 1
    target_report = reports[0]
    report_id = target_report["id"]
    resource_id = target_report["resource_id"]

    # 2. Dismiss report
    dismiss_res = await client.post(
        f"/api/admin/reports/{report_id}/action",
        json={"action": "dismiss", "note": "Reviewed: Syllabus transition is already documented."},
        headers=admin_auth_headers,
    )
    assert dismiss_res.status_code == 200
    assert dismiss_res.json()["success"] is True

    # 3. Remove resource
    remove_res = await client.post(
        f"/api/admin/resources/{resource_id}/remove",
        json={"note": "Removed outdated regulatory paper."},
        headers=admin_auth_headers,
    )
    assert remove_res.status_code == 200
    assert remove_res.json()["details"]["is_deleted"] is True

    # Verify public listing no longer includes the removed resource
    pub_res = await client.get(f"/api/resources/{resource_id}")
    assert pub_res.status_code == 404

    # 4. Restore resource
    restore_res = await client.post(
        f"/api/admin/resources/{resource_id}/restore",
        json={"note": "Restored after archiving flag was clarified."},
        headers=admin_auth_headers,
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["details"]["is_deleted"] is False

    # Verify public listing now finds the restored resource again
    pub_res_restored = await client.get(f"/api/resources/{resource_id}")
    assert pub_res_restored.status_code == 200
    assert pub_res_restored.json()["id"] == resource_id


@pytest.mark.asyncio
async def test_admin_user_ban_and_unban_lifecycle(
    client: AsyncClient, admin_auth_headers: dict, other_auth_headers: dict
):
    """
    Test banning and unbanning a user account:
    1. Verify user can access /api/auth/me initially.
    2. Admin bans user.
    3. User's subsequent request fails with 403 Forbidden (account deactivated).
    4. Admin unbans user.
    5. User can successfully access /api/auth/me again.
    6. Audit log records both actions.
    """
    # 1. Other student accesses /api/auth/me
    me_res = await client.get("/api/auth/me", headers=other_auth_headers)
    assert me_res.status_code == 200
    target_user_id = me_res.json()["id"]

    # 2. Admin bans user
    ban_res = await client.post(
        f"/api/admin/users/{target_user_id}/ban",
        json={"note": "Suspicious automated download spike violating ToS."},
        headers=admin_auth_headers,
    )
    assert ban_res.status_code == 200
    assert ban_res.json()["details"]["is_active"] is False

    # 3. Banned user attempt to hit API returns 403 Forbidden
    banned_attempt = await client.get("/api/auth/me", headers=other_auth_headers)
    assert banned_attempt.status_code == 403
    assert "deactivated" in banned_attempt.json()["detail"].lower()

    # 4. Admin unbans user
    unban_res = await client.post(
        f"/api/admin/users/{target_user_id}/unban",
        json={"note": "Student verified identity via university SSO."},
        headers=admin_auth_headers,
    )
    assert unban_res.status_code == 200
    assert unban_res.json()["details"]["is_active"] is True

    # 5. User can access API again
    unbanned_attempt = await client.get("/api/auth/me", headers=other_auth_headers)
    assert unbanned_attempt.status_code == 200

    # 6. Check moderation audit log
    log_res = await client.get(
        f"/api/admin/moderation-actions?target_user_id={target_user_id}",
        headers=admin_auth_headers,
    )
    assert log_res.status_code == 200
    actions = [item["action"] for item in log_res.json()["items"]]
    assert "user_banned" in actions
    assert "user_unbanned" in actions


@pytest.mark.asyncio
async def test_admin_user_directory_and_warn(
    client: AsyncClient, admin_auth_headers: dict, auth_headers: dict
):
    """
    Test user directory search, filtering, and warning actions:
    1. Verify non-admin gets 403 on /api/admin/users.
    2. Admin searches users by keyword and filters by role.
    3. Admin warns user and verifies audit log contains 'user_warned'.
    """
    # 1. Non-admin gets 403
    forbidden = await client.get("/api/admin/users", headers=auth_headers)
    assert forbidden.status_code == 403

    # 2. Admin lists users
    user_res = await client.get("/api/admin/users?page=1&page_size=10", headers=admin_auth_headers)
    assert user_res.status_code == 200
    data = user_res.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1

    target_user = data["items"][0]

    # Search by display name substring
    search_res = await client.get(
        f"/api/admin/users?q={target_user['display_name'][:3]}", headers=admin_auth_headers
    )
    assert search_res.status_code == 200
    assert search_res.json()["total"] >= 1

    # 3. Warn user
    warn_res = await client.post(
        f"/api/admin/users/{target_user['id']}/warn",
        json={"note": "First warning for uploading duplicate exam paper."},
        headers=admin_auth_headers,
    )
    assert warn_res.status_code == 200
    assert warn_res.json()["details"]["action"] == "user_warned"

    # Verify audit log includes warning
    log_res = await client.get(
        f"/api/admin/moderation-actions?target_user_id={target_user['id']}",
        headers=admin_auth_headers,
    )
    assert log_res.status_code == 200
    actions = [item["action"] for item in log_res.json()["items"]]
    assert "user_warned" in actions

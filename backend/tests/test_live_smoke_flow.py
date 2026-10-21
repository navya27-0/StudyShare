"""
StudyShare Live Smoke Test Suite
End-to-end integration flow covering the complete user lifecycle:
1. Student account signup and initial authentication
2. Login credential verification with HttpOnly refresh cookie issuance
3. Fresh-tab session restoration using the refresh cookie without access token
4. Academic resource upload with PDF file validation and syllabus taxonomy
5. Governed resource file preview and download tracking
6. Faculty administrator moderation (user discovery, resource removal, restore, audit log)
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_live_smoke_user_journey_e2e(client: AsyncClient):
    """
    Execute full end-to-end smoke test covering:
    - Signup -> Login -> Fresh-tab session restoration
    - Resource Upload -> Preview & Governed Download
    - Faculty Moderator User Lookup -> Resource Soft-Delete -> Restore -> Audit Verification
    """
    unique_suffix = "smoke_99"
    email = f"student_{unique_suffix}@univ.edu"
    password = "SmokeTestPassword2026!"
    display_name = "Live Smoke Student"

    # =========================================================================
    # Step 1: Signup
    # =========================================================================
    signup_payload = {
        "email": email,
        "password": password,
        "display_name": display_name,
        "branch": "Computer Science & Engineering",
        "semester": 3,
    }
    signup_res = await client.post("/api/auth/signup", json=signup_payload)
    assert signup_res.status_code == 201, f"Signup failed: {signup_res.text}"
    signup_data = signup_res.json()
    assert signup_data["user"]["email"] == email
    assert signup_data["user"]["display_name"] == display_name
    student_user_id = signup_data["user"]["id"]
    assert student_user_id is not None

    # Verify public profile omits PII (email, is_active)
    public_profile_res = await client.get(f"/api/users/{student_user_id}")
    assert public_profile_res.status_code == 200
    public_profile = public_profile_res.json()
    assert "email" not in public_profile, "Public profile must not leak user email"
    assert "is_active" not in public_profile, "Public profile must not leak internal status"

    # =========================================================================
    # Step 2: Login
    # =========================================================================
    login_res = await client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    login_data = login_res.json()
    access_token_1 = login_data["tokens"]["access_token"]
    assert access_token_1 is not None

    # Verify refresh cookie was set in response
    refresh_cookie_1 = login_res.cookies.get("studyshare_refresh_token")
    assert refresh_cookie_1 is not None, "Login response must set 'studyshare_refresh_token' cookie"

    # Verify authenticated identity
    me_res_1 = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token_1}"},
    )
    assert me_res_1.status_code == 200
    assert me_res_1.json()["id"] == student_user_id

    # =========================================================================
    # Step 3: Fresh-Tab Session Restoration
    # Simulate a new tab opening: no Authorization header is present in memory,
    # but the browser automatically transmits the HttpOnly refresh token cookie.
    # =========================================================================
    fresh_tab_refresh_res = await client.post(
        "/api/auth/refresh",
        cookies={"studyshare_refresh_token": refresh_cookie_1},
    )
    assert fresh_tab_refresh_res.status_code == 200, (
        f"Fresh tab refresh failed: {fresh_tab_refresh_res.text}"
    )
    refreshed_body = fresh_tab_refresh_res.json()
    access_token_2 = refreshed_body["access_token"]
    assert access_token_2 is not None

    rotated_refresh_cookie = fresh_tab_refresh_res.cookies.get("studyshare_refresh_token")
    assert rotated_refresh_cookie is not None
    assert rotated_refresh_cookie != refresh_cookie_1, "Refresh token cookie must be rotated"

    # Verify consumed cookie cannot be replayed (single-use anti-replay defense)
    replay_res = await client.post(
        "/api/auth/refresh",
        cookies={"studyshare_refresh_token": refresh_cookie_1},
    )
    assert replay_res.status_code == 401

    # Verify the fresh session can query /api/auth/me seamlessly
    me_res_2 = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access_token_2}"},
    )
    assert me_res_2.status_code == 200
    assert me_res_2.json()["id"] == student_user_id

    student_auth_headers = {"Authorization": f"Bearer {access_token_2}"}

    # =========================================================================
    # Step 4: Academic Resource Upload
    # =========================================================================
    upload_form = {
        "topic_id": "1",
        "type": "notes",
        "title": "Smoke Test Operating Systems Lecture Summary",
        "description": "Comprehensive review of virtual memory paging and translation lookaside buffers.",
        "semester": "4",
        "changelog": "Initial verified student upload",
        "page_count": "12",
    }
    sample_pdf_bytes = b"%PDF-1.4\n%StudyShare Smoke Test Synthetic Academic Artifact\n%%EOF"
    upload_files = {
        "file": (
            "os_virtual_memory_smoke.pdf",
            sample_pdf_bytes,
            "application/pdf",
        )
    }

    create_res = await client.post(
        "/api/resources",
        data=upload_form,
        files=upload_files,
        headers=student_auth_headers,
    )
    assert create_res.status_code == 201, f"Resource creation failed: {create_res.text}"
    created_resource = create_res.json()
    resource_id = created_resource["id"]
    assert created_resource["title"] == upload_form["title"]
    assert created_resource["uploader_id"] == student_user_id
    assert created_resource["views_count"] == 0
    assert created_resource["downloads_count"] == 0

    # Verify the resource appears in the uploader's activity feed
    activity_res = await client.get(
        f"/api/users/{student_user_id}/activity",
        headers=student_auth_headers,
    )
    assert activity_res.status_code == 200
    activity_items = activity_res.json()["items"]
    assert any(
        it["action"] == "uploaded" and it["resource_id"] == resource_id for it in activity_items
    ), "Newly uploaded resource must appear in user's public activity timeline"

    # =========================================================================
    # Step 5: Resource Preview & Governed Download
    # =========================================================================
    # 5a. Detail view
    detail_res = await client.get(f"/api/resources/{resource_id}")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == resource_id

    # 5b. Governed preview stream (disposition=inline)
    preview_res = await client.get(f"/api/resources/{resource_id}/file?disposition=inline")
    assert preview_res.status_code == 200, f"Preview fetch failed: {preview_res.status_code}"
    assert "application/pdf" in preview_res.headers.get("content-type", "")
    assert "inline" in preview_res.headers.get("content-disposition", "")
    assert preview_res.content == sample_pdf_bytes

    # 5c. Governed attachment download (disposition=attachment)
    download_res = await client.get(f"/api/resources/{resource_id}/file?disposition=attachment")
    assert download_res.status_code == 200, f"Download fetch failed: {download_res.status_code}"
    assert "attachment" in download_res.headers.get("content-disposition", "")
    assert download_res.content == sample_pdf_bytes

    # 5d. Confirm engagement tracking incremented
    post_download_detail = await client.get(f"/api/resources/{resource_id}")
    assert post_download_detail.status_code == 200
    updated_metrics = post_download_detail.json()
    assert updated_metrics["views_count"] >= 1, "Preview must increment resource views count"
    assert updated_metrics["downloads_count"] >= 1, (
        "Attachment fetch must increment resource downloads count"
    )

    # =========================================================================
    # Step 6: Faculty Administrator Moderation
    # =========================================================================
    # 6a. Admin Login (Prof. Sharma)
    admin_login_res = await client.post(
        "/api/auth/login",
        json={"email": "prof.sharma@university.edu", "password": "StudyShare2024!"},
    )
    assert admin_login_res.status_code == 200
    admin_token = admin_login_res.json()["tokens"]["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 6b. Admin User Directory Lookup
    admin_users_res = await client.get("/api/admin/users?q=Live+Smoke", headers=admin_headers)
    assert admin_users_res.status_code == 200
    user_results = admin_users_res.json()["items"]
    assert any(u["id"] == student_user_id for u in user_results), (
        "Admin user directory must find the newly registered smoke test student"
    )

    # 6c. Admin Moderation: Soft-delete / Remove Resource
    remove_res = await client.post(
        f"/api/admin/resources/{resource_id}/remove",
        json={"reason": "Curriculum verification hold during live smoke test"},
        headers=admin_headers,
    )
    assert remove_res.status_code == 200
    assert remove_res.json()["success"] is True

    # 6d. Verify removed resource is excluded from public resource listings
    public_list_res = await client.get("/api/resources?limit=50")
    assert public_list_res.status_code == 200
    public_items = public_list_res.json()["items"]
    assert not any(r["id"] == resource_id for r in public_items), (
        "Soft-deleted resource must be excluded from public resource index"
    )

    # 6e. Governed download is blocked with 404 when resource is removed
    deleted_download_res = await client.get(f"/api/resources/{resource_id}/file")
    assert deleted_download_res.status_code == 404

    # 6f. Admin Moderation: Restore Resource
    restore_res = await client.post(
        f"/api/admin/resources/{resource_id}/restore",
        headers=admin_headers,
    )
    assert restore_res.status_code == 200
    assert restore_res.json()["success"] is True

    # 6g. Verify restored resource is visible in public index and downloadable again
    relisted_res = await client.get(f"/api/resources/{resource_id}")
    assert relisted_res.status_code == 200
    assert relisted_res.json()["is_deleted"] is False

    relisted_file_res = await client.get(f"/api/resources/{resource_id}/file")
    assert relisted_file_res.status_code == 200
    assert relisted_file_res.content == sample_pdf_bytes

    # 6h. Verify complete audit trail in moderation actions log
    actions_res = await client.get(
        f"/api/admin/moderation-actions?resource_id={resource_id}",
        headers=admin_headers,
    )
    assert actions_res.status_code == 200
    recorded_actions = [a["action"] for a in actions_res.json()["items"]]
    assert "remove_resource" in recorded_actions, "Audit log must record 'remove_resource'"
    assert "restore_resource" in recorded_actions, "Audit log must record 'restore_resource'"

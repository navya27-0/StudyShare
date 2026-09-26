import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_resources_all(client: AsyncClient):
    """Test retrieving list of resources without filters."""
    response = await client.get("/api/resources")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert data["total"] > 0
    assert len(data["items"]) > 0
    first = data["items"][0]
    assert "id" in first
    assert "title" in first
    assert "breadcrumbs" in first


@pytest.mark.asyncio
async def test_filter_by_subject_code(client: AsyncClient):
    """Test filtering resources by academic subject code (e.g. CS201)."""
    response = await client.get("/api/resources?subject_code=CS201")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert item["breadcrumbs"]["subject"]["code"].upper() == "CS201"


@pytest.mark.asyncio
async def test_filter_by_type(client: AsyncClient):
    """Test filtering resources by resource type enum."""
    response = await client.get("/api/resources?type=question_bank")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert item["type"] == "question_bank"


@pytest.mark.asyncio
async def test_filter_by_semester(client: AsyncClient):
    """Test filtering resources by curriculum semester."""
    response = await client.get("/api/resources?semester=3")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert item["semester"] == 3


@pytest.mark.asyncio
async def test_sort_by_most_upvoted(client: AsyncClient):
    """Test ordering resources by upvotes_count descending."""
    response = await client.get("/api/resources?sort_by=most_upvoted")
    assert response.status_code == 200
    data = response.json()
    items = data["items"]
    assert len(items) >= 2
    for i in range(len(items) - 1):
        assert items[i]["upvotes_count"] >= items[i + 1]["upvotes_count"]


@pytest.mark.asyncio
async def test_sort_by_highest_rated(client: AsyncClient):
    """Test ordering resources by rating_avg descending."""
    response = await client.get("/api/resources?sort_by=highest_rated")
    assert response.status_code == 200
    data = response.json()
    items = data["items"]
    assert len(items) >= 2
    for i in range(len(items) - 1):
        assert items[i]["rating_avg"] >= items[i + 1]["rating_avg"]


@pytest.mark.asyncio
async def test_full_text_search(client: AsyncClient):
    """Test full-text search against resource title and description."""
    response = await client.get("/api/resources?q=BCNF")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    titles = [item["title"] for item in data["items"]]
    assert any("BCNF" in t for t in titles)


@pytest.mark.asyncio
async def test_full_text_search_no_results(client: AsyncClient):
    """Test searching with an unrelated string returns 0 items cleanly."""
    response = await client.get("/api/resources?q=zyxquaternionquantumrandomnonexistent")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0


@pytest.mark.asyncio
async def test_get_single_resource_with_versions(client: AsyncClient):
    """Test single resource retrieval with version history and view count increment."""
    list_res = await client.get("/api/resources?page_size=1")
    resource_id = list_res.json()["items"][0]["id"]
    initial_views = list_res.json()["items"][0]["views_count"]

    detail_res = await client.get(f"/api/resources/{resource_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == resource_id
    assert "versions" in detail
    assert len(detail["versions"]) >= 1
    assert detail["views_count"] == initial_views + 1
    assert detail["current_version"] is not None


@pytest.mark.asyncio
async def test_create_and_version_update_resource(
    client: AsyncClient, auth_headers: dict, other_auth_headers: dict
):
    """Test creating a resource with file upload and updating it to create a new version."""
    # 1. Create Resource
    form_data = {
        "topic_id": "1",
        "type": "notes",
        "title": "Automated Test Notes for Data Structures",
        "description": "Test lecture notes covering recursion and pointer mechanics",
        "semester": "3",
        "changelog": "Initial test version",
        "page_count": "15",
    }
    file_content = b"%PDF-1.4 Mock PDF binary content for testing StudyShare"
    files = {"file": ("test_ds_notes.pdf", file_content, "application/pdf")}

    create_res = await client.post(
        "/api/resources",
        data=form_data,
        files=files,
        headers=auth_headers,
    )
    assert create_res.status_code == 201, f"Create failed: {create_res.text}"
    created = create_res.json()
    resource_id = created["id"]
    assert created["title"] == "Automated Test Notes for Data Structures"
    assert created["current_version"]["version_number"] == 1
    assert len(created["versions"]) == 1
    assert "/uploads/" in created["file_url"]

    # 2. Update Resource by Owner (Should create Version 2)
    update_form = {
        "title": "Automated Test Notes for Data Structures (Revised)",
        "changelog": "Added 5 practice numericals and corrected typo on page 4",
        "page_count": "18",
    }
    new_file_content = b"%PDF-1.4 Version 2 updated binary contents"
    update_files = {"file": ("test_ds_notes_v2.pdf", new_file_content, "application/pdf")}

    update_res = await client.put(
        f"/api/resources/{resource_id}",
        data=update_form,
        files=update_files,
        headers=auth_headers,
    )
    assert update_res.status_code == 200, f"Update failed: {update_res.text}"
    updated = update_res.json()
    assert updated["title"] == "Automated Test Notes for Data Structures (Revised)"
    assert updated["current_version"]["version_number"] == 2
    assert len(updated["versions"]) == 2
    version_numbers = [v["version_number"] for v in updated["versions"]]
    assert 1 in version_numbers and 2 in version_numbers

    # 3. Non-owner update should fail with 403 Forbidden
    forbidden_res = await client.put(
        f"/api/resources/{resource_id}",
        data={"changelog": "Unauthorized modification attempt"},
        headers=other_auth_headers,
    )
    assert forbidden_res.status_code == 403

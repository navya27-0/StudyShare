import io
from datetime import UTC
from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException, UploadFile

from app.core.storage import S3StorageProvider, StorageResult


@pytest.mark.asyncio
async def test_s3_fallback_when_credentials_omitted():
    """Verify provider falls back to local storage when access keys are missing."""
    provider = S3StorageProvider(
        bucket_name="test-bucket",
        access_key_id=None,
        secret_access_key=None,
    )
    result = await provider.save_file(
        file_content=b"%PDF-1.4\nAcademic PDF Test Content",
        filename="notes.pdf",
        content_type="application/pdf",
    )
    assert isinstance(result, StorageResult)
    assert result.file_url.startswith("/uploads/resources/")
    assert len(result.sha256) == 64

    # Deleting through fallback
    deleted = await provider.delete_file(result.storage_key)
    assert deleted is True

    # In production, missing credentials must fail-fast with HTTP 500
    with patch("app.core.storage.settings.ENVIRONMENT", "production"):
        with pytest.raises(HTTPException) as exc_info:
            await provider.save_file(
                file_content=b"%PDF-1.4\nProduction Test Content",
                filename="prod_notes.pdf",
                content_type="application/pdf",
            )
        assert exc_info.value.status_code == 500
        assert "Production object storage is misconfigured" in exc_info.value.detail


@pytest.mark.asyncio
async def test_s3_save_file_calls_put_object_and_computes_url():
    """Verify save_file uploads to S3 using boto3.client put_object."""
    mock_s3 = MagicMock()
    mock_s3.put_object.return_value = {"ETag": '"abcdef123456"'}

    with patch("boto3.client", return_value=mock_s3):
        provider = S3StorageProvider(
            bucket_name="my-academic-bucket",
            region_name="ap-south-1",
            access_key_id="mock_key",
            secret_access_key="mock_secret",
            public_domain="https://cdn.studyshare.edu",
        )
        content = b"%PDF-1.4\nS3 Upload Verification Stream"
        result = await provider.save_file(
            file_content=content,
            filename="lecture_notes.pdf",
            content_type="application/pdf",
            subfolder="cs301",
        )

        assert isinstance(result, StorageResult)
        assert result.file_url.startswith("https://cdn.studyshare.edu/cs301/")
        assert result.storage_key.startswith("cs301/")
        assert result.file_size_bytes == len(content)

        # Verify boto3 put_object called with accurate parameters
        mock_s3.put_object.assert_called_once()
        call_kwargs = mock_s3.put_object.call_args.kwargs
        assert call_kwargs["Bucket"] == "my-academic-bucket"
        assert call_kwargs["Key"] == result.storage_key
        assert call_kwargs["Body"] == content
        assert call_kwargs["ContentType"] == "application/pdf"


@pytest.mark.asyncio
async def test_s3_save_upload_file_streaming():
    """Verify save_upload_file streams UploadFile chunks and uploads to S3 using upload_fileobj."""
    mock_s3 = MagicMock()
    mock_s3.upload_fileobj.return_value = None

    with patch("boto3.client", return_value=mock_s3):
        provider = S3StorageProvider(
            bucket_name="my-academic-bucket",
            region_name="us-east-1",
            access_key_id="mock_key",
            secret_access_key="mock_secret",
        )

        pdf_bytes = b"%PDF-1.4\nBinary streaming payload bytes for unit test."
        upload = UploadFile(
            file=io.BytesIO(pdf_bytes),
            filename="unit1_summary.pdf",
            headers={"content-type": "application/pdf"},
        )

        result = await provider.save_upload_file(upload, subfolder="cs204")
        assert result.file_size_bytes == len(pdf_bytes)
        assert result.file_url.startswith(
            "https://my-academic-bucket.s3.us-east-1.amazonaws.com/cs204/"
        )
        mock_s3.upload_fileobj.assert_called_once()


@pytest.mark.asyncio
async def test_s3_upload_failure_triggers_502_and_cleanup():
    """Verify S3 exceptions are wrapped into HTTP 502 with tempfile cleanup."""
    mock_s3 = MagicMock()
    mock_s3.put_object.side_effect = Exception("AWS Service Unavailable (500)")
    mock_s3.upload_fileobj.side_effect = Exception("AWS Service Unavailable (500)")

    with patch("boto3.client", return_value=mock_s3):
        provider = S3StorageProvider(
            bucket_name="my-academic-bucket",
            access_key_id="mock_key",
            secret_access_key="mock_secret",
        )
        with pytest.raises(HTTPException) as exc_info:
            await provider.save_file(
                file_content=b"%PDF-1.4\nFailing content test",
                filename="fail.pdf",
                content_type="application/pdf",
            )
        assert exc_info.value.status_code == 502
        assert "failed to persist file" in exc_info.value.detail


@pytest.mark.asyncio
async def test_s3_delete_file_lifecycle():
    """Verify delete_file invokes delete_object and returns boolean status."""
    mock_s3 = MagicMock()
    mock_s3.delete_object.return_value = {}

    with patch("boto3.client", return_value=mock_s3):
        provider = S3StorageProvider(
            bucket_name="my-academic-bucket",
            access_key_id="mock_key",
            secret_access_key="mock_secret",
        )
        success = await provider.delete_file("resources/test_file.pdf")
        assert success is True
        mock_s3.delete_object.assert_called_once_with(
            Bucket="my-academic-bucket",
            Key="resources/test_file.pdf",
        )

        # Failure case
        mock_s3.delete_object.side_effect = Exception("Access Denied")
        failure = await provider.delete_file("resources/test_file.pdf")
        assert failure is False


def test_s3_presigned_url_generation():
    """Verify presigned GET URLs can be generated for private storage objects."""
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = (
        "https://my-academic-bucket.s3.amazonaws.com/key?Signature=XYZ"
    )

    with patch("boto3.client", return_value=mock_s3):
        provider = S3StorageProvider(
            bucket_name="my-academic-bucket",
            access_key_id="mock_key",
            secret_access_key="mock_secret",
        )
        url = provider.generate_presigned_url("resources/midterm.pdf", expires_in=1800)
        assert "Signature=XYZ" in url
        mock_s3.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={"Bucket": "my-academic-bucket", "Key": "resources/midterm.pdf"},
            ExpiresIn=1800,
        )


def test_s3_presigned_url_generation_from_full_url():
    """Verify presigned GET URLs can be generated when given full S3/CDN URLs."""
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = (
        "https://my-academic-bucket.s3.amazonaws.com/resources/midterm.pdf?Signature=XYZ"
    )

    with patch("boto3.client", return_value=mock_s3):
        provider = S3StorageProvider(
            bucket_name="my-academic-bucket",
            access_key_id="mock_key",
            secret_access_key="mock_secret",
        )
        # Passing full AWS S3 URL
        full_url = "https://my-academic-bucket.s3.us-east-1.amazonaws.com/resources/midterm.pdf"
        url = provider.generate_presigned_url(full_url, expires_in=3600)
        assert "Signature=XYZ" in url
        mock_s3.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={"Bucket": "my-academic-bucket", "Key": "resources/midterm.pdf"},
            ExpiresIn=3600,
        )


def test_s3_key_extraction_utility():
    """Verify _extract_storage_key correctly parses all variants of object references."""
    provider = S3StorageProvider(
        bucket_name="my-bucket",
        endpoint_url="http://localhost:9000",
    )
    assert provider._extract_storage_key("resources/abc.pdf") == "resources/abc.pdf"
    assert provider._extract_storage_key("/uploads/resources/abc.pdf") == "resources/abc.pdf"
    assert (
        provider._extract_storage_key(
            "https://my-bucket.s3.us-east-1.amazonaws.com/resources/abc.pdf"
        )
        == "resources/abc.pdf"
    )
    assert (
        provider._extract_storage_key("http://localhost:9000/my-bucket/resources/abc.pdf")
        == "resources/abc.pdf"
    )
    assert (
        provider._extract_storage_key("https://cdn.studyshare.edu/cs301/lecture.pdf")
        == "cs301/lecture.pdf"
    )
    assert provider._extract_storage_key("") == ""


def test_local_storage_generate_presigned_url():
    """Verify LocalFileStorage returns clean /uploads path from generate_presigned_url."""
    from app.core.storage import LocalFileStorage

    local = LocalFileStorage()
    assert local.generate_presigned_url("resources/demo.pdf") == "/uploads/resources/demo.pdf"
    assert (
        local.generate_presigned_url("/uploads/resources/demo.pdf") == "/uploads/resources/demo.pdf"
    )


def test_s3_file_url_sanitization_prevents_moderation_bypass():
    """
    Verify that _serialize_resource_item and _serialize_resource_detail sanitize
    direct remote S3/CDN object URLs to governed download endpoints for file-backed resources,
    preventing direct unauthenticated S3 scraping and moderation bypass.
    """
    from datetime import datetime
    from unittest.mock import MagicMock

    from app.api.resources import _serialize_resource_detail, _serialize_resource_item
    from app.models.enums import ResourceType, UserRole

    # Mock uploader
    uploader = MagicMock()
    uploader.id = 10
    uploader.display_name = "Academic Contributor"
    uploader.avatar_url = None
    uploader.role = UserRole.STUDENT.value

    # Mock resource with remote S3 storage URL
    s3_url = (
        "https://studyshare-academic-assets.s3.us-east-1.amazonaws.com/topic_1/secret_notes.pdf"
    )
    now = datetime.now(UTC)

    resource = MagicMock()
    resource.id = 42
    resource.topic_id = 1
    resource.type = ResourceType.NOTES
    resource.title = "Advanced Algorithms Notes"
    resource.description = "Full semester notes"
    resource.file_url = s3_url
    resource.file_size_bytes = 1048576
    resource.page_count = 24
    resource.semester = 4
    resource.current_version_id = 1
    resource.upvotes_count = 5
    resource.downvotes_count = 0
    resource.rating_avg = 4.8
    resource.rating_count = 10
    resource.views_count = 100
    resource.downloads_count = 25
    resource.is_verified = True
    resource.is_deleted = False
    resource.created_at = now
    resource.updated_at = now
    resource.uploader = uploader
    resource.topic = None

    # Version mocks
    ver1 = MagicMock()
    ver1.id = 101
    ver1.resource_id = 42
    ver1.version_number = 1
    ver1.file_url = s3_url
    ver1.download_url = None
    ver1.changelog = "Initial commit"
    ver1.file_size_bytes = 1048576
    ver1.page_count = 24
    ver1.uploaded_by = 10
    ver1.created_at = now

    resource.current_version = ver1
    resource.versions = [ver1]

    # 1. Test item serialization: direct S3 URL must be replaced with governed download endpoint
    item_serialized = _serialize_resource_item(resource)
    assert item_serialized.file_url == "/api/resources/42/file"
    assert item_serialized.download_url == "/api/resources/42/file"
    assert "s3.us-east-1.amazonaws.com" not in item_serialized.file_url

    # 2. Test detail serialization: versions must also be sanitized
    detail_serialized = _serialize_resource_detail(resource)
    assert detail_serialized.file_url == "/api/resources/42/file"
    assert detail_serialized.current_version.file_url == "/api/resources/42/versions/101/file"
    assert detail_serialized.current_version.download_url == "/api/resources/42/versions/101/file"
    assert detail_serialized.versions[0].file_url == "/api/resources/42/versions/101/file"
    assert "s3.us-east-1.amazonaws.com" not in detail_serialized.current_version.file_url

    # 3. For ResourceType.LINK, external URLs must be preserved
    link_resource = MagicMock()
    link_resource.id = 99
    link_resource.topic_id = 1
    link_resource.type = ResourceType.LINK
    link_resource.title = "Official Documentation"
    link_resource.description = "External documentation link"
    link_resource.file_url = "https://docs.python.org/3/"
    link_resource.file_size_bytes = 0
    link_resource.page_count = None
    link_resource.semester = 1
    link_resource.current_version_id = None
    link_resource.upvotes_count = 1
    link_resource.downvotes_count = 0
    link_resource.rating_avg = 5.0
    link_resource.rating_count = 1
    link_resource.views_count = 10
    link_resource.downloads_count = 2
    link_resource.is_verified = False
    link_resource.is_deleted = False
    link_resource.created_at = now
    link_resource.updated_at = now
    link_resource.uploader = uploader
    link_resource.topic = None

    link_item = _serialize_resource_item(link_resource)
    assert link_item.file_url == "https://docs.python.org/3/"
    assert link_item.download_url == "/api/resources/99/file"

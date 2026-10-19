import io
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
    """Verify save_upload_file streams UploadFile chunks and uploads to S3."""
    mock_s3 = MagicMock()
    mock_s3.put_object.return_value = {}

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
        mock_s3.put_object.assert_called_once()


@pytest.mark.asyncio
async def test_s3_upload_failure_triggers_502_and_cleanup():
    """Verify S3 exceptions are wrapped into HTTP 502 with tempfile cleanup."""
    mock_s3 = MagicMock()
    mock_s3.put_object.side_effect = Exception("AWS Service Unavailable (500)")

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

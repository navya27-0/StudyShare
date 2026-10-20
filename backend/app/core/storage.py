import asyncio
import hashlib
import logging
import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import get_settings

logger = logging.getLogger("studyshare.storage")
settings = get_settings()

CHUNK_SIZE = 64 * 1024  # 64 KB streaming chunk size

ALLOWED_CONTENT_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/msword": ".doc",
    "application/doc": ".doc",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "application/vnd.ms-powerpoint": ".ppt",
    "application/powerpoint": ".ppt",
    "application/x-mspowerpoint": ".ppt",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/x-markdown": ".md",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/pjpeg": ".jpg",
    "application/zip": ".zip",
    "application/x-zip-compressed": ".zip",
    "multipart/x-zip": ".zip",
    "text/x-python": ".py",
    "text/x-script.python": ".py",
    "application/x-python-code": ".py",
    "text/x-c": ".c",
    "text/x-csrc": ".c",
    "text/x-c++": ".cpp",
    "text/x-c++src": ".cpp",
    "text/x-chdr": ".cpp",
    "text/x-java-source": ".java",
    "text/x-java": ".java",
}

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".docx",
    ".doc",
    ".pptx",
    ".ppt",
    ".txt",
    ".md",
    ".png",
    ".jpg",
    ".jpeg",
    ".zip",
    ".py",
    ".c",
    ".cpp",
    ".java",
}

FORBIDDEN_SIGNATURES = (
    (b"MZ", "Windows PE/EXE executable"),
    (b"\x7fELF", "ELF binary executable"),
    (b"\xca\xfe\xba\xbe", "Mach-O / compiled class binary"),
)

EXPECTED_MAGIC_BYTES: dict[str, tuple[bytes, ...]] = {
    ".pdf": (b"%PDF-",),
    ".png": (b"\x89PNG\r\n\x1a\n",),
    ".jpg": (b"\xff\xd8\xff",),
    ".jpeg": (b"\xff\xd8\xff",),
    ".zip": (b"PK\x03\x04", b"PK\x05\x06"),
    ".docx": (b"PK\x03\x04",),
    ".pptx": (b"PK\x03\x04",),
    ".doc": (b"\xd0\xcf\x11\xe0",),
    ".ppt": (b"\xd0\xcf\x11\xe0",),
}

TEXT_CODE_EXTENSIONS = {".txt", ".md", ".py", ".c", ".cpp", ".java"}


def validate_file_signature(header_bytes: bytes, ext: str) -> None:
    """
    Validate file magic-byte signatures against declared extension and reject executables.
    """
    if not header_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    for sig, label in FORBIDDEN_SIGNATURES:
        if header_bytes.startswith(sig):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Executable content ({label}) is prohibited.",
            )

    ext_lower = ext.lower()
    expected_prefixes = EXPECTED_MAGIC_BYTES.get(ext_lower)
    if expected_prefixes and not any(header_bytes.startswith(p) for p in expected_prefixes):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File content signature does not match declared '{ext}' format.",
        )

    # For text and source code files, ensure no binary null-bytes in file header
    if ext_lower in TEXT_CODE_EXTENSIONS and b"\x00" in header_bytes[:32]:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Binary content detected in text file '{ext}'. Plain text/UTF-8 is required.",
        )


def validate_file_structure(file_path: Path, ext: str) -> None:
    """
    Perform deep structural validation on persisted file content:
    - ZIP / DOCX / PPTX: Verify container integrity via zipfile, check for path traversal (zip slip),
      and enforce zip-bomb decompression size limits.
    - Text / Code: Verify strict UTF-8 decodability.
    """
    ext_lower = ext.lower()

    if ext_lower in (".zip", ".docx", ".pptx"):
        import zipfile

        if not zipfile.is_zipfile(file_path):
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Malformed archive: file does not match valid '{ext}' container format.",
            )
        try:
            with zipfile.ZipFile(file_path, "r") as zf:
                bad_file = zf.testzip()
                if bad_file:
                    raise HTTPException(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        detail=f"Corrupted archive entry detected: {bad_file}",
                    )

                total_uncompressed = 0
                max_uncompressed_limit = 200 * 1024 * 1024  # 200 MB
                has_docx_marker = False
                has_pptx_marker = False

                for member in zf.infolist():
                    name = member.filename
                    if ".." in name or name.startswith(("/", "\\")):
                        raise HTTPException(
                            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            detail="Archive contains unsafe relative or absolute member path.",
                        )
                    total_uncompressed += member.file_size
                    if total_uncompressed > max_uncompressed_limit:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail="Archive uncompressed payload exceeds safe size limits (zip-bomb defense).",
                        )
                    if ext_lower == ".docx" and (
                        name.startswith("word/") or name == "[Content_Types].xml"
                    ):
                        has_docx_marker = True
                    elif ext_lower == ".pptx" and (
                        name.startswith("ppt/") or name == "[Content_Types].xml"
                    ):
                        has_pptx_marker = True

                if ext_lower == ".docx" and not has_docx_marker:
                    raise HTTPException(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        detail="File has .docx extension but lacks valid Word document structure.",
                    )
                if ext_lower == ".pptx" and not has_pptx_marker:
                    raise HTTPException(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        detail="File has .pptx extension but lacks valid PowerPoint presentation structure.",
                    )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Invalid or corrupted '{ext}' archive file.",
            ) from exc

    elif ext_lower in TEXT_CODE_EXTENSIONS:
        try:
            content = file_path.read_bytes()
            content.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"File declared as '{ext}' contains non-UTF-8 or binary encoding.",
            ) from exc


class StorageResult:
    """Result object returned after storing a file."""

    def __init__(
        self,
        file_url: str,
        file_size_bytes: int,
        storage_key: str,
        sha256: str = "",
    ):
        self.file_url = file_url
        self.file_size_bytes = file_size_bytes
        self.storage_key = storage_key
        self.sha256 = sha256


class StorageProvider(ABC):
    """
    Abstract Storage Interface.
    Allows seamless swapping between local disk storage in development
    and S3 / Cloudflare R2 / MinIO object storage in production.
    """

    @abstractmethod
    async def save_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        subfolder: str = "resources",
    ) -> StorageResult:
        """Persist a file and return its accessible URL, byte size, and SHA-256 digest."""
        pass

    @abstractmethod
    async def save_upload_file(
        self,
        upload_file: UploadFile,
        subfolder: str = "resources",
        max_size_bytes: int | None = None,
    ) -> StorageResult:
        """Stream an UploadFile to storage in chunks with size and magic-byte validation."""
        pass

    @abstractmethod
    async def delete_file(self, storage_key: str) -> bool:
        """Remove a file from storage if it exists."""
        pass


class LocalFileStorage(StorageProvider):
    """Local filesystem storage provider with path traversal and signature protection."""

    def __init__(self, base_dir: str | Path | None = None):
        self.base_dir = Path(base_dir or settings.UPLOAD_DIR).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_contained_path(self, relative_path: str | Path) -> Path:
        """Resolve path and strictly verify it stays within base_dir."""
        candidate = (self.base_dir / relative_path).resolve()
        try:
            candidate.relative_to(self.base_dir)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid storage path: directory traversal is not permitted.",
            ) from exc
        return candidate

    def _validate_extension(self, filename: str, content_type: str) -> str:
        ext = Path(filename).suffix.lower()
        if not ext and content_type in ALLOWED_CONTENT_TYPES:
            ext = ALLOWED_CONTENT_TYPES[content_type]
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    f"Unsupported file extension '{ext}'. "
                    f"Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
                ),
            )
        return ext

    async def save_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        subfolder: str = "resources",
    ) -> StorageResult:
        ext = self._validate_extension(filename, content_type)
        validate_file_signature(file_content[:32], ext)

        safe_subfolder = Path(subfolder).name or "resources"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        storage_key = f"{safe_subfolder}/{unique_name}"
        file_path = self._resolve_contained_path(storage_key)
        file_path.parent.mkdir(parents=True, exist_ok=True)

        file_path.write_bytes(file_content)
        try:
            validate_file_structure(file_path, ext)
        except Exception:
            if file_path.exists():
                file_path.unlink(missing_ok=True)
            raise

        digest = hashlib.sha256(file_content).hexdigest()
        file_url = f"/uploads/{storage_key}"

        return StorageResult(
            file_url=file_url,
            file_size_bytes=len(file_content),
            storage_key=storage_key,
            sha256=digest,
        )

    async def save_upload_file(
        self,
        upload_file: UploadFile,
        subfolder: str = "resources",
        max_size_bytes: int | None = None,
    ) -> StorageResult:
        filename = upload_file.filename or "resource.pdf"
        content_type = upload_file.content_type or "application/octet-stream"
        ext = self._validate_extension(filename, content_type)
        limit = max_size_bytes or settings.MAX_UPLOAD_SIZE_BYTES

        safe_subfolder = Path(subfolder).name or "resources"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        storage_key = f"{safe_subfolder}/{unique_name}"
        file_path = self._resolve_contained_path(storage_key)
        file_path.parent.mkdir(parents=True, exist_ok=True)

        hasher = hashlib.sha256()
        total_bytes = 0
        first_chunk = True

        try:
            with file_path.open("wb") as out_file:
                while True:
                    chunk = await upload_file.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    if first_chunk:
                        validate_file_signature(chunk[:32], ext)
                        first_chunk = False
                    total_bytes += len(chunk)
                    if total_bytes > limit:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File exceeds maximum allowed size of {limit // (1024 * 1024)} MB.",
                        )
                    hasher.update(chunk)
                    out_file.write(chunk)

            if first_chunk:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded file is empty.",
                )

            validate_file_structure(file_path, ext)
        except Exception:
            if file_path.exists():
                file_path.unlink(missing_ok=True)
            raise

        return StorageResult(
            file_url=f"/uploads/{storage_key}",
            file_size_bytes=total_bytes,
            storage_key=storage_key,
            sha256=hasher.hexdigest(),
        )

    async def delete_file(self, storage_key: str) -> bool:
        clean_key = storage_key.removeprefix("/uploads/").lstrip("/")
        target = self._resolve_contained_path(clean_key)
        if target.exists() and target.is_file():
            os.remove(target)
            return True
        return False


class S3StorageProvider(StorageProvider):
    """
    S3 / Cloudflare R2 / MinIO compatible object storage provider.
    Streams uploads directly to S3 bucket or falls back gracefully to local storage
    when credentials are unconfigured or in development environments.
    """

    def __init__(
        self,
        bucket_name: str | None = None,
        endpoint_url: str | None = None,
        region_name: str | None = None,
        access_key_id: str | None = None,
        secret_access_key: str | None = None,
        public_domain: str | None = None,
    ):
        self.bucket_name = bucket_name or settings.S3_BUCKET_NAME
        self.endpoint_url = endpoint_url or settings.S3_ENDPOINT_URL
        self.region_name = region_name or settings.S3_REGION_NAME
        self.access_key_id = access_key_id or settings.S3_ACCESS_KEY_ID
        self.secret_access_key = secret_access_key or settings.S3_SECRET_ACCESS_KEY
        self.public_domain = public_domain or settings.S3_PUBLIC_DOMAIN
        self._local_fallback = LocalFileStorage()
        self._client = None

    def _get_client(self):
        """Lazy-initialize boto3 S3 client with configured endpoint and credentials."""
        if self._client is None:
            import boto3

            client_kwargs: dict[str, str | None] = {
                "region_name": self.region_name,
            }
            if self.endpoint_url:
                client_kwargs["endpoint_url"] = self.endpoint_url
            if self.access_key_id and self.secret_access_key:
                client_kwargs["aws_access_key_id"] = self.access_key_id
                client_kwargs["aws_secret_access_key"] = self.secret_access_key
            self._client = boto3.client("s3", **client_kwargs)
        return self._client

    def _compute_url(self, storage_key: str) -> str:
        """Calculate publicly accessible URL or CDN endpoint for stored object."""
        if self.public_domain:
            return f"{self.public_domain.rstrip('/')}/{storage_key}"
        if self.endpoint_url:
            return f"{self.endpoint_url.rstrip('/')}/{self.bucket_name}/{storage_key}"
        return f"https://{self.bucket_name}.s3.{self.region_name}.amazonaws.com/{storage_key}"

    def _validate_extension(self, filename: str, content_type: str) -> str:
        ext = Path(filename).suffix.lower()
        if not ext and content_type in ALLOWED_CONTENT_TYPES:
            ext = ALLOWED_CONTENT_TYPES[content_type]
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=f"Unsupported file extension '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )
        return ext

    async def save_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        subfolder: str = "resources",
    ) -> StorageResult:
        ext = self._validate_extension(filename, content_type)
        validate_file_signature(file_content[:32], ext)
        if not (self.access_key_id and self.secret_access_key):
            if settings.ENVIRONMENT.lower() in ("production", "prod"):
                logger.critical(
                    "S3 storage backend configured in production but S3 credentials are missing."
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Production object storage is misconfigured: S3 credentials are required.",
                )
            return await self._local_fallback.save_file(
                file_content, filename, content_type, subfolder
            )

        safe_subfolder = Path(subfolder).name or "resources"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        storage_key = f"{safe_subfolder}/{unique_name}"
        digest = hashlib.sha256(file_content).hexdigest()

        temp_dir = Path(settings.UPLOAD_DIR) / "_temp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file_path = temp_dir / f"tmp_{uuid.uuid4().hex}{ext}"

        try:
            temp_file_path.write_bytes(file_content)
            validate_file_structure(temp_file_path, ext)

            client = self._get_client()
            await asyncio.to_thread(
                client.put_object,
                Bucket=self.bucket_name,
                Key=storage_key,
                Body=file_content,
                ContentType=content_type,
            )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(
                "Failed to upload file to S3 bucket %s key %s: %s",
                self.bucket_name,
                storage_key,
                exc,
            )
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Object storage service error: failed to persist file.",
            ) from exc
        finally:
            if temp_file_path.exists():
                temp_file_path.unlink(missing_ok=True)

        return StorageResult(
            file_url=self._compute_url(storage_key),
            file_size_bytes=len(file_content),
            storage_key=storage_key,
            sha256=digest,
        )

    async def save_upload_file(
        self,
        upload_file: UploadFile,
        subfolder: str = "resources",
        max_size_bytes: int | None = None,
    ) -> StorageResult:
        if not (self.access_key_id and self.secret_access_key):
            if settings.ENVIRONMENT.lower() in ("production", "prod"):
                logger.critical(
                    "S3 storage backend configured in production but S3 credentials are missing."
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Production object storage is misconfigured: S3 credentials are required.",
                )
            return await self._local_fallback.save_upload_file(
                upload_file, subfolder, max_size_bytes
            )

        filename = upload_file.filename or "resource.pdf"
        content_type = upload_file.content_type or "application/octet-stream"
        ext = self._validate_extension(filename, content_type)
        limit = max_size_bytes or settings.MAX_UPLOAD_SIZE_BYTES

        hasher = hashlib.sha256()
        total_bytes = 0
        first_chunk = True
        safe_subfolder = Path(subfolder).name or "resources"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        storage_key = f"{safe_subfolder}/{unique_name}"

        temp_dir = Path(settings.UPLOAD_DIR) / "_temp"
        temp_dir.mkdir(parents=True, exist_ok=True)
        temp_file_path = temp_dir / f"tmp_{uuid.uuid4().hex}{ext}"

        try:
            with open(temp_file_path, "wb") as buffer:
                while True:
                    chunk = await upload_file.read(CHUNK_SIZE)
                    if not chunk:
                        break
                    if first_chunk:
                        validate_file_signature(chunk[:32], ext)
                        first_chunk = False
                    total_bytes += len(chunk)
                    if total_bytes > limit:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File exceeds maximum allowed size of {limit // (1024 * 1024)} MB.",
                        )
                    hasher.update(chunk)
                    buffer.write(chunk)

            if first_chunk:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Uploaded file is empty.",
                )

            validate_file_structure(temp_file_path, ext)

            client = self._get_client()
            with open(temp_file_path, "rb") as body_stream:
                body_bytes = body_stream.read()
                await asyncio.to_thread(
                    client.put_object,
                    Bucket=self.bucket_name,
                    Key=storage_key,
                    Body=body_bytes,
                    ContentType=content_type,
                )
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Failed to stream upload to S3 key %s: %s", storage_key, exc)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Object storage service error: failed to stream file.",
            ) from exc
        finally:
            if temp_file_path.exists():
                temp_file_path.unlink(missing_ok=True)

        return StorageResult(
            file_url=self._compute_url(storage_key),
            file_size_bytes=total_bytes,
            storage_key=storage_key,
            sha256=hasher.hexdigest(),
        )

    async def delete_file(self, storage_key: str) -> bool:
        if not (self.access_key_id and self.secret_access_key):
            if settings.ENVIRONMENT.lower() in ("production", "prod"):
                logger.critical(
                    "S3 storage backend configured in production but S3 credentials are missing."
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Production object storage is misconfigured: S3 credentials are required.",
                )
            return await self._local_fallback.delete_file(storage_key)

        clean_key = storage_key.removeprefix("/uploads/").lstrip("/")
        try:
            client = self._get_client()
            await asyncio.to_thread(
                client.delete_object,
                Bucket=self.bucket_name,
                Key=clean_key,
            )
            return True
        except Exception as exc:
            logger.warning("Failed to delete S3 object key %s: %s", clean_key, exc)
            return False

    def generate_presigned_url(self, storage_key: str, expires_in: int = 3600) -> str:
        """Generate a secure, time-limited presigned GET URL for private buckets."""
        if not (self.access_key_id and self.secret_access_key):
            if settings.ENVIRONMENT.lower() in ("production", "prod"):
                logger.critical(
                    "S3 storage backend configured in production but S3 credentials are missing."
                )
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Production object storage is misconfigured: S3 credentials are required.",
                )
            return f"/uploads/{storage_key.removeprefix('/uploads/').lstrip('/')}"
        clean_key = storage_key.removeprefix("/uploads/").lstrip("/")
        client = self._get_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": clean_key},
            ExpiresIn=expires_in,
        )


_local_storage_singleton = LocalFileStorage()
_s3_storage_singleton: S3StorageProvider | None = None


def get_storage_provider() -> StorageProvider:
    """Dependency injection provider for StorageProvider (Local or S3/R2/MinIO)."""
    global _s3_storage_singleton
    if settings.STORAGE_BACKEND.lower() in ("s3", "r2", "minio"):
        if _s3_storage_singleton is None:
            _s3_storage_singleton = S3StorageProvider()
        return _s3_storage_singleton
    return _local_storage_singleton

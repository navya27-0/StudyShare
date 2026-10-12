import hashlib
import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.config import get_settings

settings = get_settings()

CHUNK_SIZE = 64 * 1024  # 64 KB streaming chunk size

ALLOWED_CONTENT_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "application/zip": ".zip",
}

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".txt", ".md", ".png", ".jpg", ".jpeg", ".zip"}

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
}


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

    expected_prefixes = EXPECTED_MAGIC_BYTES.get(ext.lower())
    if expected_prefixes and not any(header_bytes.startswith(p) for p in expected_prefixes):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"File content signature does not match declared '{ext}' format.",
        )


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
        validate_file_signature(file_content[:16], ext)

        safe_subfolder = Path(subfolder).name or "resources"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        storage_key = f"{safe_subfolder}/{unique_name}"
        file_path = self._resolve_contained_path(storage_key)
        file_path.parent.mkdir(parents=True, exist_ok=True)

        file_path.write_bytes(file_content)
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
                        validate_file_signature(chunk[:16], ext)
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


_storage_instance = LocalFileStorage()


def get_storage_provider() -> StorageProvider:
    """Dependency injection provider for StorageProvider."""
    return _storage_instance

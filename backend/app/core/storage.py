import os
import re
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

from app.config import get_settings

settings = get_settings()


@dataclass(frozen=True)
class StorageResult:
    file_url: str
    file_key: str
    file_size_bytes: int
    content_type: str
    original_filename: str


class StorageProvider(ABC):
    """Abstract storage interface allowing swapping between local disk and S3/R2/GCS."""

    @abstractmethod
    async def save_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        subfolder: str = "resources",
    ) -> StorageResult:
        """Save file bytes to the backing storage provider."""
        pass

    @abstractmethod
    async def delete_file(self, file_key: str) -> bool:
        """Delete file by storage key."""
        pass

    @abstractmethod
    def get_file_url(self, file_key: str) -> str:
        """Resolve public or downloadable URL for a given file key."""
        pass


def _sanitize_filename(name: str) -> str:
    """Sanitize filename to prevent path traversal or invalid characters."""
    base = os.path.basename(name)
    clean = re.sub(r"[^a-zA-Z0-9_.-]", "_", base)
    return clean[:120] if clean else "unnamed_file"


class LocalStorageProvider(StorageProvider):
    """Local filesystem storage implementation."""

    def __init__(self, base_directory: str | None = None):
        upload_path = base_directory or getattr(settings, "UPLOAD_DIR", "uploads")
        self.base_dir = Path(upload_path).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    async def save_file(
        self,
        file_content: bytes,
        filename: str,
        content_type: str,
        subfolder: str = "resources",
    ) -> StorageResult:
        target_dir = self.base_dir / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)

        safe_name = _sanitize_filename(filename)
        unique_prefix = uuid.uuid4().hex[:12]
        saved_filename = f"{unique_prefix}_{safe_name}"
        destination_path = target_dir / saved_filename

        # Write file contents
        destination_path.write_bytes(file_content)

        file_key = f"{subfolder}/{saved_filename}"
        file_url = f"/uploads/{file_key}"

        return StorageResult(
            file_url=file_url,
            file_key=file_key,
            file_size_bytes=len(file_content),
            content_type=content_type or "application/octet-stream",
            original_filename=safe_name,
        )

    async def delete_file(self, file_key: str) -> bool:
        file_path = self.base_dir / file_key
        try:
            if file_path.is_file():
                file_path.unlink()
                return True
        except OSError:
            pass
        return False

    def get_file_url(self, file_key: str) -> str:
        return f"/uploads/{file_key}"


# Singleton instance
_storage_instance: StorageProvider | None = None


def get_storage_provider() -> StorageProvider:
    """Dependency provider returning configured storage backend."""
    global _storage_instance
    if _storage_instance is None:
        _storage_instance = LocalStorageProvider()
    return _storage_instance

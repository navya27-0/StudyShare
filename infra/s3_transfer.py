"""
StudyShare S3 Transfer Utility for Database Backups & Point-in-Time Recovery
Supports AWS S3, Cloudflare R2, MinIO, and any S3-compatible object storage.
"""

import os
import sys
from pathlib import Path
from typing import Any

import boto3
from botocore.config import Config


def get_s3_client() -> Any:
    """Initialize authenticated S3 client supporting AWS, Cloudflare R2, and MinIO endpoints."""
    endpoint_url = os.environ.get("S3_ENDPOINT_URL") or os.environ.get("AWS_ENDPOINT_URL")
    region_name = (
        os.environ.get("S3_REGION_NAME")
        or os.environ.get("AWS_DEFAULT_REGION")
        or "us-east-1"
    )
    access_key = os.environ.get("S3_ACCESS_KEY_ID") or os.environ.get("AWS_ACCESS_KEY_ID")
    secret_key = os.environ.get("S3_SECRET_ACCESS_KEY") or os.environ.get("AWS_SECRET_ACCESS_KEY")

    client_kwargs: dict[str, Any] = {
        "region_name": region_name,
        "config": Config(
            signature_version="s3v4",
            retries={"max_attempts": 3, "mode": "standard"},
        ),
    }

    if endpoint_url:
        client_kwargs["endpoint_url"] = endpoint_url
    if access_key and secret_key:
        client_kwargs["aws_access_key_id"] = access_key
        client_kwargs["aws_secret_access_key"] = secret_key

    return boto3.client("s3", **client_kwargs)


def upload_backup(
    local_file_path: str,
    bucket: str,
    prefix: str = "database-backups",
) -> str:
    """Upload a local database backup archive to durable external object storage."""
    path = Path(local_file_path).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Local backup file not found: {local_file_path}")

    prefix_clean = prefix.strip("/")
    s3_key = f"{prefix_clean}/{path.name}" if prefix_clean else path.name

    s3 = get_s3_client()
    file_size_mb = round(path.stat().st_size / (1024 * 1024), 2)
    print(
        f"[INFO] Uploading {path.name} ({file_size_mb} MB) to durable storage: s3://{bucket}/{s3_key}"
    )

    s3.upload_file(str(path), bucket, s3_key)
    s3_uri = f"s3://{bucket}/{s3_key}"
    print(f"[SUCCESS] Uploaded {path.name} -> {s3_uri}")
    return s3_uri


def download_backup(s3_uri: str, destination_dir_or_file: str) -> str:
    """Download a database backup archive from an S3 URI to a local directory or target path."""
    if not s3_uri.startswith("s3://"):
        raise ValueError(
            f"Invalid S3 URI: '{s3_uri}'. Expected format: s3://bucket/path/to/backup.sql.gz"
        )

    without_scheme = s3_uri[5:]
    parts = without_scheme.split("/", 1)
    if len(parts) != 2 or not parts[0] or not parts[1]:
        raise ValueError(f"Malformed S3 URI: '{s3_uri}'. Must contain bucket and key.")

    bucket, s3_key = parts[0], parts[1]
    dest = Path(destination_dir_or_file).resolve()

    if dest.is_dir() or not dest.suffix:
        dest.mkdir(parents=True, exist_ok=True)
        dest_file = dest / Path(s3_key).name
    else:
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest_file = dest

    s3 = get_s3_client()
    print(f"[INFO] Downloading {s3_uri} to local file: {dest_file}")
    s3.download_file(bucket, s3_key, str(dest_file))
    size_info = f" ({dest_file.stat().st_size} bytes)" if dest_file.exists() else ""
    print(f"[SUCCESS] Downloaded {s3_uri} -> {dest_file}{size_info}")
    return str(dest_file)


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python s3_transfer.py upload <local_file> <bucket> [prefix]")
        print("       python s3_transfer.py download <s3_uri> <destination_dir_or_file>")
        sys.exit(1)

    action = sys.argv[1].strip().lower()

    try:
        if action == "upload":
            target_file = sys.argv[2]
            target_bucket = sys.argv[3]
            target_prefix = sys.argv[4] if len(sys.argv) > 4 else "database-backups"
            upload_backup(target_file, target_bucket, target_prefix)
        elif action == "download":
            target_uri = sys.argv[2]
            target_dest = sys.argv[3]
            download_backup(target_uri, target_dest)
        else:
            print(f"[ERROR] Unknown action: {action}. Use 'upload' or 'download'.")
            sys.exit(1)
    except Exception as exc:
        print(f"[ERROR] S3 transfer operation failed: {exc}", file=sys.stderr)
        sys.exit(1)

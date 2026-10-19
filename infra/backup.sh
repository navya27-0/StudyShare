#!/usr/bin/env bash
# ==============================================================================
# StudyShare Automated Database Backup & Retention Script
# Usage: ./infra/backup.sh [container_name] [backup_dir]
# ==============================================================================
set -euo pipefail

CONTAINER_NAME="${1:-studyshare-postgres}"
BACKUP_DIR="${2:-./backups}"
RETENTION_DAYS=14
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/studyshare_db_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup from container '${CONTAINER_NAME}'..."

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker exec "${CONTAINER_NAME}" pg_dump -U studyshare -d studyshare_db --clean --if-exists | gzip > "${BACKUP_FILE}"
    echo "[SUCCESS] Backup written to ${BACKUP_FILE} ($(du -h "${BACKUP_FILE}" | cut -f1))"
else
    echo "[WARN] Docker container '${CONTAINER_NAME}' is not running locally. Attempting pg_dump via DATABASE_URL if configured."
    if [ -n "${DATABASE_URL:-}" ]; then
        pg_dump "${DATABASE_URL}" --clean --if-exists | gzip > "${BACKUP_FILE}"
        echo "[SUCCESS] Backup written to ${BACKUP_FILE}"
    else
        echo "[ERROR] Cannot take backup: neither Docker container nor DATABASE_URL is available."
        exit 1
    fi
fi

# Rotate backups older than RETENTION_DAYS
echo "[INFO] Rotating backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "studyshare_db_*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} +
echo "[SUCCESS] Backup cycle completed successfully."

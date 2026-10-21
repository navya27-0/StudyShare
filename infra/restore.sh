#!/usr/bin/env bash
# ==============================================================================
# StudyShare Database Restore Script
# Usage: ./infra/restore.sh <backup_file.sql.gz> [container_name] [database_name]
#
# Environment Variables:
#   POSTGRES_CONTAINER - Target Docker container (default: auto-detected)
#   POSTGRES_DB        - Database name (default: auto-detected)
#   POSTGRES_USER      - Database user (default: studyshare)
#   DATABASE_URL       - Fallback direct connection URL if running outside Docker
# ==============================================================================
set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Usage: $0 <path_to_backup.sql.gz> [container_name] [database_name]"
    echo "Example: $0 ./backups/studyshare_prod_db_20261021_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "[ERROR] Backup file not found: ${BACKUP_FILE}"
    exit 1
fi

CONTAINER_NAME="${2:-${POSTGRES_CONTAINER:-}}"
if [ -z "$CONTAINER_NAME" ]; then
    if command -v docker >/dev/null 2>&1; then
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^studyshare-prod-postgres$'; then
            CONTAINER_NAME="studyshare-prod-postgres"
        elif docker ps --format '{{.Names}}' 2>/dev/null | grep -q '^studyshare-postgres$'; then
            CONTAINER_NAME="studyshare-postgres"
        else
            CONTAINER_NAME="studyshare-prod-postgres"
        fi
    else
        CONTAINER_NAME="studyshare-prod-postgres"
    fi
fi

DB_USER="${POSTGRES_USER:-studyshare}"
DB_NAME="${3:-${POSTGRES_DB:-}}"

if [ -z "$DB_NAME" ]; then
    if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
        DETECTED_DB=$(docker exec "${CONTAINER_NAME}" printenv POSTGRES_DB 2>/dev/null || true)
        if [ -n "$DETECTED_DB" ]; then
            DB_NAME="$DETECTED_DB"
        fi
        DETECTED_USER=$(docker exec "${CONTAINER_NAME}" printenv POSTGRES_USER 2>/dev/null || true)
        if [ -n "$DETECTED_USER" ]; then
            DB_USER="$DETECTED_USER"
        fi
    fi
fi

if [ -z "$DB_NAME" ]; then
    if [ "$CONTAINER_NAME" = "studyshare-prod-postgres" ]; then
        DB_NAME="studyshare_prod_db"
    else
        DB_NAME="studyshare_db"
    fi
fi

echo "[INFO] Restoring database '${DB_NAME}' (User: '${DB_USER}') from '${BACKUP_FILE}' via '${CONTAINER_NAME}'..."

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
    gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}"
    echo "[SUCCESS] Database '${DB_NAME}' restored successfully from ${BACKUP_FILE}."
else
    if [ -n "${DATABASE_URL:-}" ]; then
        echo "[INFO] Restoring via DATABASE_URL..."
        gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}"
        echo "[SUCCESS] Database restored successfully via DATABASE_URL."
    else
        echo "[ERROR] Cannot restore: Docker container '${CONTAINER_NAME}' is not running and DATABASE_URL is not set."
        exit 1
    fi
fi

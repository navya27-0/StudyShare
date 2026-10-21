#!/usr/bin/env bash
# ==============================================================================
# StudyShare Database Restore Script
# Usage: ./infra/restore.sh <backup_file.sql.gz | s3://bucket/key.sql.gz> [container_name] [database_name]
#
# Environment Variables:
#   POSTGRES_CONTAINER - Target Docker container (default: auto-detected)
#   POSTGRES_DB        - Database name (default: auto-detected)
#   POSTGRES_USER      - Database user (default: studyshare)
#   DATABASE_URL       - Fallback direct connection URL if running outside Docker
#   S3_ENDPOINT_URL    - Optional custom S3 / Cloudflare R2 endpoint
#   ALERT_WEBHOOK_URL  - Optional Slack/Discord/HTTP webhook URL for status alerts
# ==============================================================================
set -euo pipefail

send_alert() {
    local status="$1"
    local message="$2"
    if [ -n "${ALERT_WEBHOOK_URL:-}" ] && command -v curl >/dev/null 2>&1; then
        local payload
        payload=$(printf '{"status":"%s","service":"StudyShare-Database-Restore","message":"%s","timestamp":"%s"}' \
            "$status" "$message" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")")
        curl -s -X POST -H "Content-Type: application/json" -d "$payload" "${ALERT_WEBHOOK_URL}" >/dev/null 2>&1 || true
    fi
}

trap 'send_alert "FAILURE" "Restore script failed on line $LINENO."' ERR

if [ -z "${1:-}" ]; then
    echo "Usage: $0 <path_to_backup.sql.gz | s3://bucket/key.sql.gz> [container_name] [database_name]"
    echo "Example: $0 ./backups/studyshare_prod_db_20261021_120000.sql.gz"
    echo "         $0 s3://studyshare-backups/database-backups/studyshare_prod_db_20261021_120000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# 1. External S3 URI resolution
if echo "$BACKUP_FILE" | grep -qE '^s3://'; then
    echo "[INFO] External S3 URI detected: '${BACKUP_FILE}'. Fetching snapshot..."
    TMP_RESTORE_DIR="${TMPDIR:-/tmp}/studyshare_restore_cache"
    mkdir -p "${TMP_RESTORE_DIR}"

    PYTHON_CMD=""
    if command -v python3 >/dev/null 2>&1; then
        PYTHON_CMD="python3"
    elif command -v python >/dev/null 2>&1; then
        PYTHON_CMD="python"
    fi

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -n "$PYTHON_CMD" ] && [ -f "${SCRIPT_DIR}/s3_transfer.py" ]; then
        ${PYTHON_CMD} "${SCRIPT_DIR}/s3_transfer.py" download "${BACKUP_FILE}" "${TMP_RESTORE_DIR}"
        BACKUP_FILE="${TMP_RESTORE_DIR}/$(basename "${BACKUP_FILE}")"
    elif command -v aws >/dev/null 2>&1; then
        TARGET_FILE="${TMP_RESTORE_DIR}/$(basename "${BACKUP_FILE}")"
        ENDPOINT_FLAG=""
        if [ -n "${S3_ENDPOINT_URL:-${AWS_ENDPOINT_URL:-}}" ]; then
            ENDPOINT_FLAG="--endpoint-url ${S3_ENDPOINT_URL:-${AWS_ENDPOINT_URL}}"
        fi
        aws s3 cp "${BACKUP_FILE}" "${TARGET_FILE}" ${ENDPOINT_FLAG}
        BACKUP_FILE="${TARGET_FILE}"
    else
        echo "[ERROR] Cannot download '${BACKUP_FILE}': neither python (with boto3) nor aws-cli is installed."
        exit 1
    fi
fi

if [ ! -f "$BACKUP_FILE" ]; then
    # Fallback: normalize Windows drive letters if running under MSYS/Git Bash (e.g. C:/path -> /c/path)
    if echo "$BACKUP_FILE" | grep -qE '^[a-zA-Z]:[/\]'; then
        DRIVE_LETTER=$(echo "$BACKUP_FILE" | cut -c1 | tr '[:upper:]' '[:lower:]')
        REST_OF_PATH=$(echo "$BACKUP_FILE" | cut -c4- | tr '\\' '/')
        ALT_PATH="/${DRIVE_LETTER}/${REST_OF_PATH}"
        if [ -f "$ALT_PATH" ]; then
            BACKUP_FILE="$ALT_PATH"
        fi
    fi
fi

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
    gunzip -c "${BACKUP_FILE}" | docker exec -i "${CONTAINER_NAME}" psql -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}"
    echo "[SUCCESS] Database '${DB_NAME}' restored successfully from ${BACKUP_FILE}."
    send_alert "SUCCESS" "Database '${DB_NAME}' restored successfully from ${BACKUP_FILE}."
else
    if [ -n "${DATABASE_URL:-}" ]; then
        echo "[INFO] Restoring via DATABASE_URL..."
        TARGET_DB_URL=$(echo "${DATABASE_URL}" | sed -E 's/^postgresql\+[a-zA-Z0-9_]+:\/\//postgresql:\/\//')
        gunzip -c "${BACKUP_FILE}" | psql -v ON_ERROR_STOP=1 "${TARGET_DB_URL}"
        echo "[SUCCESS] Database restored successfully via DATABASE_URL."
        send_alert "SUCCESS" "Database restored successfully via DATABASE_URL from ${BACKUP_FILE}."
    else
        echo "[ERROR] Cannot restore: Docker container '${CONTAINER_NAME}' is not running and DATABASE_URL is not set."
        send_alert "FAILURE" "Restore failed: container '${CONTAINER_NAME}' not running and no DATABASE_URL."
        exit 1
    fi
fi

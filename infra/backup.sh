#!/usr/bin/env bash
# ==============================================================================
# StudyShare Automated Database Backup & Retention Script
# Usage: ./infra/backup.sh [container_name] [backup_dir] [database_name]
#
# Environment Variables:
#   POSTGRES_CONTAINER - Target Docker container (default: auto-detects
#                        studyshare-prod-postgres or studyshare-postgres)
#   POSTGRES_DB        - Database name (default: auto-detects from container or
#                        studyshare_prod_db / studyshare_db)
#   POSTGRES_USER      - Database user (default: studyshare)
#   DATABASE_URL       - Fallback direct connection URL if running outside Docker
#   BACKUP_DIR         - Directory to store compressed backups (default: ./backups)
#   RETENTION_DAYS     - Number of days to retain backup files (default: 14)
#   S3_BACKUP_BUCKET   - Optional durable S3 / Cloudflare R2 bucket for offsite snapshots
#   BACKUP_S3_PREFIX   - Prefix/folder inside S3 bucket (default: database-backups)
#   ALERT_WEBHOOK_URL  - Optional Slack/Discord/HTTP webhook URL for status alerts
# ==============================================================================
set -euo pipefail

send_alert() {
    local status="$1"
    local message="$2"
    if [ -n "${ALERT_WEBHOOK_URL:-}" ] && command -v curl >/dev/null 2>&1; then
        local payload
        payload=$(printf '{"status":"%s","service":"StudyShare-Database-Backup","message":"%s","timestamp":"%s"}' \
            "$status" "$message" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")")
        curl -s -X POST -H "Content-Type: application/json" -d "$payload" "${ALERT_WEBHOOK_URL}" >/dev/null 2>&1 || true
    fi
}

trap 'send_alert "FAILURE" "Backup script failed on line $LINENO."' ERR

# 1. Resolve container name
CONTAINER_NAME="${1:-${POSTGRES_CONTAINER:-}}"
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

# 2. Resolve database directory & retention
BACKUP_DIR="${2:-${BACKUP_DIR:-./backups}}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# 3. Resolve database user and name
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

BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
mkdir -p "${BACKUP_DIR}"

echo "[INFO] Starting database backup for '${DB_NAME}' (User: '${DB_USER}') via container '${CONTAINER_NAME}'..."

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${CONTAINER_NAME}$"; then
    docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" --clean --if-exists | gzip > "${BACKUP_FILE}"
    FILE_SIZE=$(du -h "${BACKUP_FILE}" 2>/dev/null | cut -f1 || echo "created")
    echo "[SUCCESS] Backup written to ${BACKUP_FILE} (${FILE_SIZE})"
    send_alert "SUCCESS" "Backup written to ${BACKUP_FILE} (${FILE_SIZE})"
else
    echo "[WARN] Docker container '${CONTAINER_NAME}' is not running locally. Attempting pg_dump via DATABASE_URL if configured."
    if [ -n "${DATABASE_URL:-}" ]; then
        TARGET_DB_URL=$(echo "${DATABASE_URL}" | sed -E 's/^postgresql\+[a-zA-Z0-9_]+:\/\//postgresql:\/\//')
        pg_dump "${TARGET_DB_URL}" --clean --if-exists | gzip > "${BACKUP_FILE}"
        echo "[SUCCESS] Backup written to ${BACKUP_FILE} via DATABASE_URL"
        send_alert "SUCCESS" "Backup succeeded via DATABASE_URL: ${BACKUP_FILE}"
    else
        echo "[ERROR] Cannot take backup: Docker container '${CONTAINER_NAME}' is not running and DATABASE_URL is not set."
        send_alert "FAILURE" "Backup failed: container '${CONTAINER_NAME}' not running and no DATABASE_URL."
        exit 1
    fi
fi

# 4. Rotate backups older than RETENTION_DAYS
echo "[INFO] Rotating backups older than ${RETENTION_DAYS} days in ${BACKUP_DIR}..."
find "${BACKUP_DIR}" -name "*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -exec rm -f {} + 2>/dev/null || true

# 5. External durable object storage upload (AWS S3, Cloudflare R2, MinIO)
TARGET_S3_BUCKET="${S3_BACKUP_BUCKET:-${BACKUP_S3_BUCKET:-}}"
TARGET_S3_PREFIX="${BACKUP_S3_PREFIX:-database-backups}"

if [ -n "$TARGET_S3_BUCKET" ]; then
    echo "[INFO] Uploading ${BACKUP_FILE} to durable external object storage (Bucket: '${TARGET_S3_BUCKET}')..."
    PYTHON_CMD=""
    if command -v python3 >/dev/null 2>&1; then
        PYTHON_CMD="python3"
    elif command -v python >/dev/null 2>&1; then
        PYTHON_CMD="python"
    fi

    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    if [ -n "$PYTHON_CMD" ] && [ -f "${SCRIPT_DIR}/s3_transfer.py" ]; then
        ${PYTHON_CMD} "${SCRIPT_DIR}/s3_transfer.py" upload "${BACKUP_FILE}" "${TARGET_S3_BUCKET}" "${TARGET_S3_PREFIX}"
        send_alert "SUCCESS" "Backup uploaded to s3://${TARGET_S3_BUCKET}/${TARGET_S3_PREFIX}/$(basename "${BACKUP_FILE}")"
    elif command -v aws >/dev/null 2>&1; then
        ENDPOINT_FLAG=""
        if [ -n "${S3_ENDPOINT_URL:-${AWS_ENDPOINT_URL:-}}" ]; then
            ENDPOINT_FLAG="--endpoint-url ${S3_ENDPOINT_URL:-${AWS_ENDPOINT_URL}}"
        fi
        aws s3 cp "${BACKUP_FILE}" "s3://${TARGET_S3_BUCKET}/${TARGET_S3_PREFIX}/$(basename "${BACKUP_FILE}")" ${ENDPOINT_FLAG}
        echo "[SUCCESS] Uploaded ${BACKUP_FILE} via aws-cli to s3://${TARGET_S3_BUCKET}/${TARGET_S3_PREFIX}/"
        send_alert "SUCCESS" "Backup uploaded to s3://${TARGET_S3_BUCKET}/${TARGET_S3_PREFIX}/$(basename "${BACKUP_FILE}")"
    else
        echo "[WARN] S3_BACKUP_BUCKET is set but neither python (with boto3) nor aws-cli is available. External upload skipped."
        send_alert "WARNING" "Backup completed locally but external upload skipped: python/aws tools not found."
    fi
else
    echo "[WARN] S3_BACKUP_BUCKET is not set. Backup is saved to local/ephemeral disk only: ${BACKUP_FILE}"
    echo "[WARN] In ephemeral container runtimes (e.g. Render Cron), files in /tmp are wiped when the job ends."
    echo "[WARN] Set S3_BACKUP_BUCKET with valid cloud storage credentials to enable durable, offsite disaster recovery."
fi

echo "[SUCCESS] Backup cycle completed successfully."

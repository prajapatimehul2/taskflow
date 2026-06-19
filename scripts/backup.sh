#!/usr/bin/env bash
# Phase 9 — logical database backup.
# Manual run:  bash scripts/backup.sh
# Cron (daily):  ln -s "$PWD/scripts/backup.sh" /etc/cron.daily/taskflow-backup
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/taskflow}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
DB_CONTAINER="${DB_CONTAINER:-taskflow_db}"

mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/taskflow-$(date +%F-%H%M%S).sql.gz"

docker exec "$DB_CONTAINER" pg_dump -U taskflow taskflow | gzip > "$FILE"
echo "Wrote $FILE"

# Prune old local backups
find "$BACKUP_DIR" -name 'taskflow-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

# Optional off-box copy (set BACKUP_S3_URI, e.g. s3://my-bucket/taskflow):
if [ -n "${BACKUP_S3_URI:-}" ]; then
  aws s3 cp "$FILE" "$BACKUP_S3_URI/"
  echo "Uploaded to $BACKUP_S3_URI/"
fi

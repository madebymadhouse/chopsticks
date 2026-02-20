#!/usr/bin/env bash
# Backup PostgreSQL database to $BACKUP_DIR (default: ./data/backups)
# Usage: ./scripts/backup-db.sh [output-dir]
# Cron (daily at 03:00): 0 3 * * * /app/scripts/backup-db.sh >> /var/log/backup-db.log 2>&1
set -euo pipefail

BACKUP_DIR="${1:-${BACKUP_DIR:-./data/backups}}"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
CONTAINER="${COMPOSE_PROJECT_NAME:-chopsticks}-postgres"
PGUSER="${POSTGRES_USER:-chopsticks}"
PGDB="${POSTGRES_DB:-chopsticks}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-7}"
FILENAME="${BACKUP_DIR}/${PGDB}_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[backup-db] Dumping ${PGDB} from ${CONTAINER} → ${FILENAME}"
docker exec "$CONTAINER" pg_dump -U "$PGUSER" "$PGDB" | gzip > "$FILENAME"

SIZE=$(du -sh "$FILENAME" | cut -f1)
echo "[backup-db] Done. Size: ${SIZE}"

# Prune backups older than KEEP_DAYS
echo "[backup-db] Pruning backups older than ${KEEP_DAYS} days"
find "$BACKUP_DIR" -maxdepth 1 -name "${PGDB}_*.sql.gz" -mtime +"$KEEP_DAYS" -delete

echo "[backup-db] Remaining backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "  (none)"

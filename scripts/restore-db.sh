#!/usr/bin/env bash
# Restore PostgreSQL database from a backup file
# Usage: ./scripts/restore-db.sh <backup-file.sql.gz>
# WARNING: This will DROP and recreate the database. Only use in emergencies.
set -euo pipefail

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" || ! -f "$BACKUP_FILE" ]]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo "Available backups:"
  ls -lh "${BACKUP_DIR:-./data/backups}"/*.sql.gz 2>/dev/null || echo "  (none found in ./data/backups)"
  exit 1
fi

CONTAINER="${COMPOSE_PROJECT_NAME:-chopsticks}-postgres"
PGUSER="${POSTGRES_USER:-chopsticks}"
PGDB="${POSTGRES_DB:-chopsticks}"

echo "[restore-db] WARNING: This will DROP '${PGDB}' and restore from: ${BACKUP_FILE}"
read -r -p "Type YES to confirm: " CONFIRM
[[ "$CONFIRM" == "YES" ]] || { echo "Aborted."; exit 1; }

echo "[restore-db] Dropping and recreating database..."
docker exec "$CONTAINER" psql -U "$PGUSER" -c "DROP DATABASE IF EXISTS ${PGDB};"
docker exec "$CONTAINER" psql -U "$PGUSER" -c "CREATE DATABASE ${PGDB};"

echo "[restore-db] Restoring from ${BACKUP_FILE}..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER" psql -U "$PGUSER" -d "$PGDB"

echo "[restore-db] Restore complete."

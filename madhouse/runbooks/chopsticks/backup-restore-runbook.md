# Backup & Restore Runbook — Chopsticks PostgreSQL

## Quick Reference

| Action | Command |
|--------|---------|
| Create backup | `./scripts/backup-db.sh` |
| List backups | `ls -lh data/backups/` |
| Restore from backup | `./scripts/restore-db.sh data/backups/<file>.sql.gz` |
| Test restore (non-destructive) | See "Testing Restores" below |

---

## Backup

### Manual backup
```bash
./scripts/backup-db.sh
# Output: data/backups/chopsticks_20260220T030000Z.sql.gz
```

### Custom output directory
```bash
BACKUP_DIR=/mnt/backup ./scripts/backup-db.sh
```

### Cron schedule (daily at 03:00 UTC)
Add to `/etc/cron.d/chopsticks-backup`:
```
0 3 * * * root cd /path/to/Chopsticks && COMPOSE_PROJECT_NAME=chopsticks ./scripts/backup-db.sh >> /var/log/chopsticks-backup.log 2>&1
```

Backups older than `BACKUP_KEEP_DAYS` (default: 7) are automatically pruned.

---

## Restore

### Emergency restore (destructive)
1. Stop the bot to prevent writes during restore:
   ```bash
   docker compose -f docker-compose.production.yml stop bot agents
   ```
2. Run restore:
   ```bash
   ./scripts/restore-db.sh data/backups/chopsticks_20260220T030000Z.sql.gz
   # Type YES when prompted
   ```
3. Run migrations to ensure schema is current:
   ```bash
   node scripts/migrate.js
   ```
4. Restart services:
   ```bash
   docker compose -f docker-compose.production.yml start bot agents
   ```

### Testing restores (non-destructive)
Restore to a temporary DB to validate:
```bash
docker exec chopsticks-postgres psql -U chopsticks -c "CREATE DATABASE chopsticks_restore_test;"
gunzip -c data/backups/chopsticks_20260220T030000Z.sql.gz | \
  docker exec -i chopsticks-postgres psql -U chopsticks -d chopsticks_restore_test
# Inspect, then clean up:
docker exec chopsticks-postgres psql -U chopsticks -c "DROP DATABASE chopsticks_restore_test;"
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `./data/backups` | Where backups are stored |
| `BACKUP_KEEP_DAYS` | `7` | Days to retain backups |
| `COMPOSE_PROJECT_NAME` | `chopsticks` | Docker container prefix |
| `POSTGRES_USER` | `chopsticks` | DB user |
| `POSTGRES_DB` | `chopsticks` | DB name |

---

## Off-site backup (recommended)

After each cron backup, sync to remote storage:
```bash
# S3-compatible (rclone)
rclone copy data/backups/ s3:my-bucket/chopsticks-backups/

# Or rsync to backup server
rsync -az data/backups/ backup-user@backup-host:/backups/chopsticks/
```

Add to cron after the backup step:
```
5 3 * * * root rclone copy /path/to/Chopsticks/data/backups/ s3:my-bucket/chopsticks-backups/ >> /var/log/chopsticks-backup-sync.log 2>&1
```

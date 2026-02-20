# Incident Runbook — Chopsticks Discord Bot

> **Document type:** Runbook  
> **Audience:** On-call engineers and server operators  
> **Last updated:** 2025  
> **Severity definitions:**  
> - **P1** — Complete service outage; bot is offline or non-functional for all guilds  
> - **P2** — Partial degradation; one or more features are broken or degraded  

---

## Runbook Index

| # | Section | Severity |
|---|---|---|
| 1 | [Bot Completely Offline](#p1-bot-completely-offline) | P1 |
| 2 | [Commands Returning Errors](#p2-commands-returning-errors) | P2 |
| 3 | [Database Connection Failure](#p2-database-connection-failure) | P2 |
| 4 | [Redis Unavailable](#p2-redis-unavailable) | P2 |
| 5 | [Voice / Lavalink Down](#p2-voicelavalink-down) | P2 |
| 6 | [Rate Limit Alerts Firing](#p2-rate-limit-alerts-firing) | P2 |
| 7 | [Security Incident: Possible Token Leak](#security-incident-possible-token-leak) | P1 |

---

## P1: Bot Completely Offline

### Symptoms
- Bot appears offline (grey status dot) in all servers
- All slash commands return "This application did not respond"
- `/health` endpoint unreachable or returns non-200
- Prometheus alert `ChopsticksProcessDown` firing

### Diagnosis Commands

```bash
# 1. Check if the bot container is running
docker ps --filter name=chopsticks-bot

# 2. Check recent container logs for crash reason
docker logs --tail 100 chopsticks-bot

# 3. Check Docker compose service status
docker compose -f docker-compose.production.yml ps

# 4. Check system resources (OOM killer, disk full)
df -h && free -m

# 5. Check if the process crashed with an error code
docker inspect chopsticks-bot --format='{{.State.ExitCode}} {{.State.Error}}'
```

### Fix Commands

```bash
# Attempt 1 — Restart the bot container
docker compose -f docker-compose.production.yml restart bot
sleep 15
curl -sf http://localhost:3000/health | jq .

# Attempt 2 — If restart fails, pull latest image and redeploy
docker compose -f docker-compose.production.yml pull bot
docker compose -f docker-compose.production.yml up -d --force-recreate --no-deps bot
sleep 15
curl -sf http://localhost:3000/health | jq .

# Attempt 3 — If image pull fails, redeploy from last known-good tag
docker tag chopsticks-bot:$PREVIOUS_STABLE chopsticks-bot:production
docker compose -f docker-compose.production.yml up -d --force-recreate --no-deps bot
```

### Rollback If Fix Fails

```bash
# Identify the last working image
docker images chopsticks-bot --format "table {{.Tag}}\t{{.CreatedAt}}" | head -10

# Deploy the previous tag
export ROLLBACK_TAG=<previous stable tag>
docker tag chopsticks-bot:$ROLLBACK_TAG chopsticks-bot:production
docker compose -f docker-compose.production.yml up -d --force-recreate --no-deps bot
```

### Post-Incident Steps
1. Review container logs for root cause (OOM, unhandled exception, dependency failure).
2. File a GitHub issue tagged `P1` with logs attached.
3. Add crash-specific test coverage if the cause was an unhandled exception.
4. Update this runbook if a new failure mode was encountered.

---

## P2: Commands Returning Errors

### Symptoms
- Users report "Something went wrong" or blank responses to slash commands
- `ChopsticksCommandErrorSpike` alert firing for one or more commands
- Error embeds visible in server channels
- Unhandled exceptions in bot logs

### Diagnosis Commands

```bash
# 1. Check real-time bot error logs
docker logs --tail 200 chopsticks-bot | grep -i error

# 2. Query Prometheus for command error rates
curl -sg 'http://localhost:9090/api/v1/query?query=rate(chopsticks_command_errors_total[5m])' \
  | jq '.data.result[] | {command: .metric.command, rate: .value[1]}'

# 3. Check if the error is isolated to new commands (post Phase 7 deploy)
docker logs --tail 500 chopsticks-bot | grep -E "massban|lockdown|ai|auction|heist|casino"

# 4. Verify slash command registration is up to date
node scripts/check-commands.mjs --env production
```

### Fix Commands

```bash
# Option A — Re-register slash commands (fixes "unknown interaction" errors)
npm run deploy-commands -- --env production

# Option B — Restart the bot (fixes transient state corruption)
docker compose -f docker-compose.production.yml restart bot

# Option C — Hot-patch: disable a single misbehaving command
# Edit src/commands/index.js to comment out the faulty command, then:
docker compose -f docker-compose.production.yml up -d --force-recreate --no-deps bot
```

### Rollback If Fix Fails

```bash
# Roll back to previous bot image
docker tag chopsticks-bot:$PREVIOUS_SHA chopsticks-bot:production
docker compose -f docker-compose.production.yml up -d --force-recreate --no-deps bot

# Re-register previous command manifest if commands changed
npm run deploy-commands -- --env production --manifest releases/$PREVIOUS_SHA/commands.json
```

### Post-Incident Steps
1. Reproduce the error in the staging environment.
2. Write a regression test that catches the specific failure.
3. Fix the bug, add the test, merge to main, and redeploy.

---

## P2: Database Connection Failure

### Symptoms
- Bot responds to commands but returns "Database error" embeds
- `/health` returns `"db": "error"` or `"db": "timeout"`
- Prometheus alert `ChopsticksDBConnectionFailure` firing
- Bot logs show `connection refused` or `ECONNREFUSED` to the PostgreSQL host

### Diagnosis Commands

```bash
# 1. Check if the PostgreSQL container is running
docker ps --filter name=postgres

# 2. Check PostgreSQL logs
docker logs --tail 100 chopsticks-postgres

# 3. Test direct database connectivity
docker exec -it chopsticks-postgres psql -U chopsticks -c "SELECT 1;"

# 4. Check connection pool status
curl -sf http://localhost:3000/admin/db-pool \
  -H "Authorization: Bearer $ADMIN_API_SECRET" | jq .

# 5. Check disk space (full disk causes Postgres to refuse connections)
df -h /var/lib/docker
```

### Fix Commands

```bash
# Attempt 1 — Restart PostgreSQL container
docker compose -f docker-compose.production.yml restart postgres
sleep 10
docker exec -it chopsticks-postgres psql -U chopsticks -c "SELECT 1;"

# Attempt 2 — If Postgres will not start, check data directory integrity
docker logs chopsticks-postgres 2>&1 | grep -E "FATAL|ERROR|PANIC"

# Attempt 3 — Restore from backup (ONLY if data directory is corrupted)
# See backup-restore-runbook.md for full procedure
cat wokspec/runbooks/chopsticks/backup-restore-runbook.md
```

### Rollback If Fix Fails

If the database cannot be recovered from the live volume:
```bash
# Stop the bot to prevent further writes
docker compose -f docker-compose.production.yml stop bot

# Restore from most recent backup snapshot
# (Follow backup-restore-runbook.md Step 3 onwards)

# Restart bot after restore is verified
docker compose -f docker-compose.production.yml start bot
```

### Post-Incident Steps
1. Verify backup integrity — confirm the restored data is complete.
2. Investigate root cause (disk full, OOM kill of Postgres, corrupted WAL).
3. Increase disk alert thresholds if disk was the cause.
4. Document the recovery time and any data loss window in the incident report.

---

## P2: Redis Unavailable

### Symptoms
- `ChopsticksRedisConnectionLoss` alert firing
- `/health` returns `"redis": "error"`
- Rate limiting falls back to in-memory (rate limits no longer shared across shards)
- Music queue shuffle undo snapshots lost
- Session caching unavailable (slightly higher DB load)

### Impact Assessment

| Feature | Behavior When Redis Unavailable |
|---|---|
| Rate limiting | Falls back to per-process in-memory; multi-shard deployments will not share buckets |
| Music queue snapshots | Shuffle undo history is lost until Redis recovers |
| Session cache | Every command goes directly to the database; latency may increase |
| Scheduled jobs | Job scheduler uses DB-backed fallback; no jobs lost |

### Diagnosis Commands

```bash
# 1. Check Redis container status
docker ps --filter name=chopsticks-redis

# 2. Check Redis logs
docker logs --tail 100 chopsticks-redis

# 3. Ping Redis directly
docker exec -it chopsticks-redis redis-cli ping

# 4. Check Redis memory usage (OOM eviction causes connection drops)
docker exec -it chopsticks-redis redis-cli info memory | grep used_memory_human
```

### Fix Commands

```bash
# Attempt 1 — Restart Redis container
docker compose -f docker-compose.production.yml restart redis
sleep 5
docker exec -it chopsticks-redis redis-cli ping   # should return PONG

# Attempt 2 — If Redis crashed due to maxmemory, clear volatile keys
docker exec -it chopsticks-redis redis-cli flushdb async

# Attempt 3 — Restart bot to re-establish Redis connection pool
docker compose -f docker-compose.production.yml restart bot
```

### Rollback If Fix Fails

Redis is used for caching and ephemeral state — there is no data to roll back. If Redis cannot be recovered:
1. The bot will continue operating in degraded mode (in-memory rate limiting).
2. Provision a new Redis instance and update `REDIS_URL` in the environment.
3. Restart the bot to connect to the new Redis.

### Post-Incident Steps
1. Review Redis memory configuration (`maxmemory` policy).
2. Add Redis memory alert if one does not already exist.
3. Verify rate-limit behavior was consistent during the outage window.

---

## P2: Voice/Lavalink Down

### Symptoms
- `/music play` returns "Unable to connect to audio server"
- All music commands fail or time out
- Prometheus alert `ChopsticksVoiceLLMHighFailureRate` or `ChopsticksPlaylistUploadQueueDepth` firing
- Bot logs show `Lavalink connection refused` or `WebSocket closed`

### Expected User Impact
- All active music sessions are interrupted immediately when Lavalink drops.
- Voice AI features (voice LLM) are unavailable until Lavalink recovers.
- Users will see error embeds on any music command.

### Diagnosis Commands

```bash
# 1. Check if the Lavalink container is running
docker ps --filter name=lavalink

# 2. Check Lavalink logs
docker logs --tail 100 chopsticks-lavalink

# 3. Check Lavalink REST API health
curl -sf http://localhost:2333/v4/info \
  -H "Authorization: $LAVALINK_PASSWORD" | jq .version

# 4. Check Lavalink JVM memory
docker stats chopsticks-lavalink --no-stream
```

### Fix Commands

```bash
# Attempt 1 — Restart Lavalink
docker compose -f docker-compose.lavalink.yml restart lavalink
sleep 20

# Verify Lavalink is responding
curl -sf http://localhost:2333/v4/info \
  -H "Authorization: $LAVALINK_PASSWORD" | jq .version

# Attempt 2 — Restart the bot to reconnect Lavalink WebSocket
docker compose -f docker-compose.production.yml restart bot

# Attempt 3 — If Lavalink fails due to Java OOM, increase heap
# Edit lavalink/application.yml: JVM_ARGS: "-Xmx512m" → "-Xmx1g"
# Then restart Lavalink
```

### Rollback If Fix Fails

Lavalink is stateless — there is no rollback to perform. If the current Lavalink version is broken:
```bash
# Pin to the last known-good Lavalink image in docker-compose.lavalink.yml
# Change: image: ghcr.io/lavalink-devs/lavalink:4
# To:     image: ghcr.io/lavalink-devs/lavalink:4.0.7   (pinned version)
docker compose -f docker-compose.lavalink.yml up -d --force-recreate lavalink
```

### Post-Incident Steps
1. Review Lavalink heap usage — increase `Xmx` if OOM was the cause.
2. Pin the Lavalink image version in `docker-compose.lavalink.yml` if a version upgrade caused the failure.
3. Add a Lavalink memory usage alert to Prometheus.

---

## P2: Rate Limit Alerts Firing

### Symptoms
- `ChopsticksAIRateLimitSpike` or other rate-limit alerts firing in Grafana/PagerDuty
- Users complaining that commands are being rejected with "Too many requests"
- Prometheus shows sustained spike in `chopsticks_rate_limit_hits_total`

### Diagnosis Commands

```bash
# 1. Identify which bucket is spiking
curl -sg 'http://localhost:9090/api/v1/query?query=increase(chopsticks_rate_limit_hits_total[5m])' \
  | jq '.data.result[] | {bucket: .metric.bucket, hits: .value[1]}'

# 2. Identify top guilds/users hitting the limit
curl -sg 'http://localhost:9090/api/v1/query?query=topk(10,increase(chopsticks_rate_limit_hits_total[5m]))' \
  | jq '.data.result'

# 3. Check bot logs for repeated invocations from a single source
docker logs --tail 500 chopsticks-bot | grep "RATE_LIMIT" | cut -d' ' -f5 | sort | uniq -c | sort -rn | head -20
```

### Fix Commands

```bash
# Option A — Apply emergency rate-limit override for a specific guild
/ratelimit override bucket:ai guild_id:<GUILD_ID> limit:100 window_seconds:60
# (Run this command in a management channel or via admin CLI)

# Option B — Temporarily raise the global limit for the affected bucket
# Edit src/constants/rate-limits.js: increase limit for the spiking bucket
# Restart the bot to apply:
docker compose -f docker-compose.production.yml restart bot

# Option C — If the spike is from a single abusive guild, apply a temporary block
/admin guild block guild_id:<GUILD_ID> duration:1h reason:"Rate limit abuse"
```

### Rollback If Fix Fails

If rate-limit overrides made the situation worse (e.g., allowed a DoS to proceed):
```bash
# Reset all rate-limit overrides to defaults
/ratelimit reset all

# Restart the bot to clear in-memory counters
docker compose -f docker-compose.production.yml restart bot
```

### Post-Incident Steps
1. Determine if the spike was legitimate traffic growth or abuse.
2. If abuse: report the guild/user and consider a permanent block.
3. If legitimate growth: raise the default limits and update `rate-limits.js`.
4. Review alert threshold — if the current threshold (50 hits / 5 min) fired due to normal usage, increase the threshold.

---

## Security Incident: Possible Token Leak

### Symptoms
- Bot token or guild encryption key may have been exposed in logs, a public repository, or a third-party service
- Unusual bot activity from unexpected guilds or at unexpected times
- Discord API reports activity not initiated by the production deployment
- A team member has reported accidentally committing or sharing credentials

### Immediate Actions (First 5 Minutes)

> **Do not delay.** A leaked Discord token allows anyone to control the bot and access all servers it is in.

```bash
# Step 1 — Rotate the Discord bot token IMMEDIATELY
# Go to: https://discord.com/developers/applications/<APP_ID>/bot
# Click "Reset Token" and copy the new token

# Step 2 — Update the token in production environment
ssh prod-host "
  export NEW_TOKEN='<new token>'
  sed -i \"s/DISCORD_TOKEN=.*/DISCORD_TOKEN=$NEW_TOKEN/\" /opt/chopsticks/.env.production
"

# Step 3 — Restart the bot with the new token
docker compose -f docker-compose.production.yml up -d --force-recreate --no-deps bot

# Step 4 — Verify the bot reconnects with the new token
sleep 15
curl -sf http://localhost:3000/health | jq '.gateway'   # should return "connected"
```

### Guild Key Invalidation

If per-guild encryption keys (used for storing sensitive guild settings) were also exposed:

```bash
# Step 1 — Rotate all guild encryption keys
node scripts/rotate-guild-keys.mjs --all --reason "security incident $(date -u +%Y%m%dT%H%M%SZ)"
# This script:
# - Generates new keys for each guild
# - Re-encrypts all guild settings with the new keys
# - Stores the new keys in the secret store (Vault / environment)

# Step 2 — Verify key rotation completed without errors
node scripts/verify-guild-keys.mjs

# Step 3 — Restart the bot to load new keys from the secret store
docker compose -f docker-compose.production.yml restart bot
```

### Audit and Containment

```bash
# Check for any actions taken with the compromised token
# Review Discord audit logs for the bot's application ID
curl -sf "https://discord.com/api/v10/guilds/<GUILD_ID>/audit-logs?user_id=<BOT_USER_ID>&limit=100" \
  -H "Authorization: Bot $NEW_TOKEN" | jq '.audit_log_entries[].action_type'

# Scan git history for any accidentally committed secrets
git log --all --full-history -- "*.env" "*.env.*" ".env*"
git log --all -S "DISCORD_TOKEN" --oneline | head -20

# If a secret was committed, purge it from git history
# (Use git-filter-repo or BFG Repo Cleaner — coordinate with the GitHub org admin)
```

### Rollback If Rotation Fails

If the token rotation script fails partway through:
```bash
# The old token is already revoked — there is no rollback to the old token.
# Manually set the new token in .env.production and restart.
# If guild key rotation failed mid-way, check script logs for which guilds were updated
# and re-run the rotation script with --guild-id <failed_id> for each incomplete guild.
```

### Post-Incident Steps
1. Determine how the token was leaked (git commit, log file, third-party service, environment variable exposure).
2. Fix the root cause (add `.env` to `.gitignore`, redact tokens from logs, rotate any other affected secrets).
3. File a security incident report in the internal security tracker.
4. Notify affected guild owners if any unauthorized actions were taken on their behalf.
5. Review access controls on the production server and secret store.
6. Add a pre-commit hook that prevents committing secrets (e.g., `detect-secrets`, `gitleaks`).

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LOCK_FILE="${LOCK_FILE:-/tmp/chopsticks-auto-update.lock}"
REMOTE="${AUTO_UPDATE_REMOTE:-private}"
BRANCH="${AUTO_UPDATE_BRANCH:-main}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.production.yml}"
PROFILES="${COMPOSE_PROFILES:-dashboard,monitoring,fun}"
SERVICES="${AUTO_UPDATE_SERVICES:-bot agents dashboard funhub}"
RUN_GATES="${AUTO_UPDATE_RUN_GATES:-true}"
DRY_RUN="${AUTO_UPDATE_DRY_RUN:-false}"
WEBHOOK_URL="${AUTO_UPDATE_WEBHOOK_URL:-}"
NOTIFY_ON_SUCCESS="${AUTO_UPDATE_NOTIFY_ON_SUCCESS:-false}"
HOST_NAME="${HOSTNAME:-$(hostname 2>/dev/null || echo unknown-host)}"

log() {
  printf '%s [auto-update] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

json_escape() {
  local s="${1:-}"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="${s//$'\n'/\\n}"
  s="${s//$'\r'/\\r}"
  printf '%s' "$s"
}

send_webhook() {
  local level="$1"
  local message="$2"
  if [ -z "$WEBHOOK_URL" ]; then
    return 0
  fi
  local now payload
  now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  payload="{\"content\":\"[${level}] chopsticks-auto-update on ${HOST_NAME} at ${now}: $(json_escape "$message")\"}"
  curl -fsS -m 10 -H "Content-Type: application/json" -d "$payload" "$WEBHOOK_URL" >/dev/null || true
}

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "another update job is already running; skipping"
  exit 0
fi

cd "$ROOT_DIR"

if [ "$DRY_RUN" = "true" ]; then
  log "dry-run enabled; no changes will be applied"
fi

error_handler() {
  local exit_code="$1"
  local line_no="$2"
  local cmd="$3"
  send_webhook "FAIL" "exit=${exit_code} line=${line_no} cmd=${cmd}"
}

trap 'error_handler $? $LINENO "$BASH_COMMAND"' ERR

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  log "not a git repository: $ROOT_DIR"
  exit 1
fi

if ! git remote get-url "$REMOTE" >/dev/null 2>&1; then
  log "remote '$REMOTE' not configured"
  exit 1
fi

IFS=',' read -ra PROFILE_LIST <<< "$PROFILES"
COMPOSE_ARGS=(-f "$COMPOSE_FILE")
for profile in "${PROFILE_LIST[@]}"; do
  trimmed="${profile//[[:space:]]/}"
  [ -n "$trimmed" ] && COMPOSE_ARGS+=(--profile "$trimmed")
done

LOCAL_SHA="$(git rev-parse HEAD)"

if [ "$DRY_RUN" = "true" ]; then
  log "would run: git fetch $REMOTE $BRANCH"
else
  git fetch "$REMOTE" "$BRANCH"
fi

REMOTE_SHA="$(git rev-parse "$REMOTE/$BRANCH")"

if [ "$LOCAL_SHA" = "$REMOTE_SHA" ]; then
  log "already up to date ($LOCAL_SHA)"
  exit 0
fi

if git merge-base --is-ancestor "$LOCAL_SHA" "$REMOTE_SHA"; then
  :
elif git merge-base --is-ancestor "$REMOTE_SHA" "$LOCAL_SHA"; then
  log "local branch is ahead of ${REMOTE}/${BRANCH}; skipping auto-update"
  exit 0
else
  log "local and remote have diverged; refusing non-fast-forward update"
  exit 1
fi

log "update available: $LOCAL_SHA -> $REMOTE_SHA"

if [ "$DRY_RUN" = "true" ]; then
  log "would run: git pull --ff-only $REMOTE $BRANCH"
else
  git pull --ff-only "$REMOTE" "$BRANCH"
fi

if [ "$RUN_GATES" = "true" ]; then
  if [ "$DRY_RUN" = "true" ]; then
    log "would run: npm run ci:syntax"
    log "would run: npm run ci:migrations"
  else
    npm run ci:syntax
    npm run ci:migrations
  fi
fi

if [ "$DRY_RUN" = "true" ]; then
  log "would run: docker compose ${COMPOSE_ARGS[*]} up -d --build $SERVICES"
  log "would run: bash scripts/ops/chopsticks-watchdog.sh"
  exit 0
fi

docker compose "${COMPOSE_ARGS[@]}" up -d --build $SERVICES
bash scripts/ops/chopsticks-watchdog.sh

log "update applied successfully"

if [ "$NOTIFY_ON_SUCCESS" = "true" ]; then
  send_webhook "OK" "updated to $(git rev-parse HEAD)"
fi

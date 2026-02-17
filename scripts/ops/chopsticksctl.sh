#!/usr/bin/env bash
set -euo pipefail

# Chopsticks control script: one entrypoint for "bring it up and keep it healthy".
# Designed for local dev, servers, and systemd. Safe defaults; no secrets printed.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.production.yml}"
COMPOSE_PROFILES="${COMPOSE_PROFILES:-dashboard,monitoring,fun}"

cd "$ROOT_DIR"

log() {
  printf '%s [chopsticksctl] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

die() {
  log "ERROR: $*"
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

build_compose_args() {
  COMPOSE_ARGS=(-f "$COMPOSE_FILE")
  IFS=',' read -ra PROFILE_LIST <<< "$COMPOSE_PROFILES"
  for profile in "${PROFILE_LIST[@]}"; do
    local trimmed="${profile//[[:space:]]/}"
    [ -n "$trimmed" ] && COMPOSE_ARGS+=(--profile "$trimmed")
  done
}

wait_for_service_ready() {
  local service="${1:?service}"
  local timeout_sec="${2:-180}"
  local cid status

  for _ in $(seq 1 "$timeout_sec"); do
    cid="$(docker compose "${COMPOSE_ARGS[@]}" ps -q "$service" 2>/dev/null | head -n 1 || true)"
    if [ -n "$cid" ]; then
      status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo unknown)"
      if [ "$status" = "healthy" ] || [ "$status" = "running" ]; then
        return 0
      fi
    fi
    sleep 1
  done

  return 1
}

bot_exec() {
  docker exec chopsticks-bot sh -lc "$*"
}

health_check() {
  docker exec chopsticks-bot node -e "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1));"
}

run_migrations() {
  log "running migrations"
  bot_exec "cd /app && node scripts/migrate.js"
}

deploy_commands() {
  # Deploy to guild by default (fast feedback). Global deploy is opt-in.
  local mode="${1:-guild}"
  log "deploying slash commands (mode=$mode)"
  bot_exec "cd /app && DEPLOY_MODE=$mode node scripts/deployCommands.js"
}

cmd="${1:-help}"

need_cmd docker
docker compose version >/dev/null 2>&1 || die "docker compose is not available"
[ -f "$COMPOSE_FILE" ] || die "compose file not found: $COMPOSE_FILE"
build_compose_args

case "$cmd" in
  up)
    [ -f ".env" ] || die ".env not found (create from .env.example)"

    log "preflight validation"
    ./scripts/validate-deployment.sh

    if [ "${CHOPSTICKS_AUTO_BUILD:-false}" = "true" ]; then
      log "building images (CHOPSTICKS_AUTO_BUILD=true)"
      docker compose "${COMPOSE_ARGS[@]}" build bot agents dashboard funhub
    fi

    log "starting stack ($COMPOSE_FILE) profiles=[$COMPOSE_PROFILES]"
    docker compose "${COMPOSE_ARGS[@]}" up -d --remove-orphans

    log "waiting for bot container readiness"
    if ! wait_for_service_ready bot 240; then
      docker compose "${COMPOSE_ARGS[@]}" ps || true
      die "bot did not become ready in time (check: docker logs chopsticks-bot)"
    fi

    log "waiting for /health"
    for _ in $(seq 1 60); do
      if health_check; then
        break
      fi
      sleep 1
    done
    health_check || die "bot /health is not 200 (check logs)"

    run_migrations

    if [ "${CHOPSTICKS_AUTO_DEPLOY_COMMANDS:-false}" = "true" ]; then
      if grep -Eq '^(DEV_GUILD_ID|GUILD_ID|STAGING_GUILD_ID|PROD_GUILD_ID)=' .env; then
        deploy_commands guild
      else
        log "skipping command deploy (no guild id detected in .env)"
      fi

      if [ "${CHOPSTICKS_DEPLOY_GLOBAL:-false}" = "true" ]; then
        deploy_commands global
      fi
    else
      log "auto command deploy disabled (CHOPSTICKS_AUTO_DEPLOY_COMMANDS=false)"
    fi

    log "stack ready"
    docker compose "${COMPOSE_ARGS[@]}" ps
    ;;

  down)
    docker compose "${COMPOSE_ARGS[@]}" down
    ;;

  restart)
    docker compose "${COMPOSE_ARGS[@]}" restart
    ;;

  status)
    docker compose "${COMPOSE_ARGS[@]}" ps
    ;;

  logs)
    svc="${2:-bot}"
    docker compose "${COMPOSE_ARGS[@]}" logs -f --tail=200 "$svc"
    ;;

  migrate)
    run_migrations
    ;;

  deploy)
    mode="${2:-guild}"
    deploy_commands "$mode"
    ;;

  doctor)
    log "containers"
    docker compose "${COMPOSE_ARGS[@]}" ps
    log "bot health"
    health_check && log "health ok" || die "health check failed"
    ;;

  help|*)
    cat <<EOF
Usage: ./scripts/ops/chopsticksctl.sh <command>

Commands:
  up                Start stack, wait for health, run migrations, deploy commands
  down              Stop stack
  restart           Restart services
  status            Show container status
  logs [service]    Follow logs (default: bot)
  migrate           Run migrations inside bot container
  deploy [mode]     Deploy slash commands (guild|global). Default: guild
  doctor            Quick health + status checks

Env toggles:
  COMPOSE_FILE=...                  Override compose file
  COMPOSE_PROFILES=dashboard,fun... Override enabled profiles
  CHOPSTICKS_AUTO_BUILD=true|false (default: false)
  CHOPSTICKS_AUTO_DEPLOY_COMMANDS=true|false (default: true)
  CHOPSTICKS_DEPLOY_GLOBAL=true|false (default: false)
EOF
    ;;
esac

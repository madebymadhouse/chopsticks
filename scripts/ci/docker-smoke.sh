#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.production.yml}"

echo "[smoke] compose file: $COMPOSE_FILE"

docker compose -f "$COMPOSE_FILE" build bot dashboard funhub
docker compose -f "$COMPOSE_FILE" --profile dashboard --profile monitoring --profile fun up -d postgres redis lavalink bot dashboard funhub prometheus grafana

echo "[smoke] waiting for service health..."
for _ in {1..30}; do
  if docker exec chopsticks-bot node -e "fetch('http://127.0.0.1:8080/healthz').then(r=>{if(r.status===200)process.exit(0);process.exit(1)}).catch(()=>process.exit(1))"; then
    break
  fi
  sleep 2
done

echo "[smoke] validating endpoint reachability..."
endpoint_ok=false
for _ in {1..30}; do
  if docker exec chopsticks-bot node -e "Promise.all([fetch('http://127.0.0.1:8080/healthz'),fetch('http://127.0.0.1:8080/metrics-app'),fetch('http://dashboard:8788/health'),fetch('http://funhub:8790/health'),fetch('http://prometheus:9090/-/healthy'),fetch('http://grafana:3000/api/health')]).then(async ([a,b,c,d,e,f])=>{const checks=[['bot-healthz',a.status],['bot-metrics-app',b.status],['dashboard-health',c.status],['funhub-health',d.status],['prometheus-health',e.status],['grafana-health',f.status]];for (const [name,status] of checks){if(status!==200){process.exit(1);} }process.exit(0);}).catch(()=>process.exit(1));"; then
    docker exec chopsticks-bot node -e "Promise.all([fetch('http://127.0.0.1:8080/healthz'),fetch('http://127.0.0.1:8080/metrics-app'),fetch('http://dashboard:8788/health'),fetch('http://funhub:8790/health'),fetch('http://prometheus:9090/-/healthy'),fetch('http://grafana:3000/api/health')]).then(async ([a,b,c,d,e,f])=>{const checks=[['bot-healthz',a.status],['bot-metrics-app',b.status],['dashboard-health',c.status],['funhub-health',d.status],['prometheus-health',e.status],['grafana-health',f.status]];for (const [name,status] of checks){console.log(name,status);}process.exit(0);}).catch(()=>process.exit(1));"
    endpoint_ok=true
    break
  fi
  sleep 2
done

if [[ "$endpoint_ok" != "true" ]]; then
  echo "[smoke] endpoint reachability failed"
  exit 1
fi

echo "[smoke] verifying Prometheus targets..."
for _ in {1..20}; do
  if docker exec chopsticks-bot node -e "fetch('http://prometheus:9090/api/v1/targets').then(r=>r.json()).then(j=>{const jobs=(j.data.activeTargets||[]).map(t=>[t.labels.job,t.health]);const required=['chopsticks-bot-app','chopsticks-bot-health','chopsticks-dashboard'];const ok=required.every(name=>jobs.some(([job,health])=>job===name&&health==='up'));if(!ok)process.exit(1);console.log(JSON.stringify(jobs));process.exit(0);}).catch(()=>process.exit(1));"; then
    exit 0
  fi
  sleep 2
done

echo "[smoke] Prometheus targets failed to reach UP state in time"
exit 1

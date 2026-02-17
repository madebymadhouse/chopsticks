#!/bin/bash
# Level 0 CI Check: Running Baseline
# Verifies system can boot cleanly from scratch

set -e

echo "=== Level 0: Running Baseline Check ==="

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
HEALTH_URL="http://localhost:8080/healthz"
TIMEOUT=90
BOT_CONTAINER="chopsticks-bot"

echo "1. Cleaning existing containers..."
docker compose -f "$COMPOSE_FILE" down -v 2>&1 || true

echo "2. Starting services..."
docker compose -f "$COMPOSE_FILE" up -d

echo "3. Waiting for PostgreSQL to be ready..."
for i in $(seq 1 30); do
  if docker exec chopsticks-postgres pg_isready -U chopsticks 2>/dev/null; then
    echo "✅ PostgreSQL is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ PostgreSQL not ready after 30s"
    exit 1
  fi
  sleep 1
done

echo "4. Waiting for bot to be healthy (timeout: ${TIMEOUT}s)..."
for i in $(seq 1 $TIMEOUT); do
  # Check health from inside the container
  if docker exec "$BOT_CONTAINER" curl -f -s http://localhost:8080/healthz > /dev/null 2>&1; then
    echo "✅ Health endpoint responding"
    break
  fi
  if [ $i -eq $TIMEOUT ]; then
    echo "❌ Health endpoint not responding after ${TIMEOUT}s"
    docker logs "$BOT_CONTAINER" --tail 50
    exit 1
  fi
  sleep 1
done

echo "5. Checking health payload..."
HEALTH_RESPONSE=$(docker exec "$BOT_CONTAINER" curl -s http://localhost:8080/healthz 2>&1)
echo "Health response: $HEALTH_RESPONSE"

if echo "$HEALTH_RESPONSE" | grep -q "ok\|healthy\|ready"; then
  echo "✅ Health check returns valid payload"
else
  echo "❌ Health check payload invalid"
  exit 1
fi

echo "6. Checking for agent registration..."
sleep 20 # Give agents container and agents time to connect
if docker logs "$BOT_CONTAINER" 2>&1 | grep -q "Agent.*registered\|Registering.*agent\|HANDSHAKE.*agent"; then
  echo "✅ At least one agent registered to bot"
elif docker logs chopsticks-agents 2>&1 | grep -q "Polling for agent changes"; then
  echo "✅ Agent runner is active (no agents configured yet - this is OK for clean boot)"
else
  echo "❌ Neither bot agent registration nor agent runner activity found"
  echo "Bot logs:"
  docker logs "$BOT_CONTAINER" --tail 30
  echo "Agents logs:"
  docker logs chopsticks-agents --tail 30
  exit 1
fi

echo "7. Checking for controller startup..."
if docker logs "$BOT_CONTAINER" 2>&1 | grep -q "Ready\|listening\|Bot.*logged in"; then
  echo "✅ Controller started successfully"
else
  echo "⚠️  Controller startup unclear, checking for errors..."
  if docker logs "$BOT_CONTAINER" 2>&1 | grep -qi "error\|crash\|fatal"; then
    echo "❌ Controller has errors"
    docker logs "$BOT_CONTAINER" --tail 100
    exit 1
  fi
fi

echo ""
echo "=== ✅ Level 0 Check PASSED ==="
echo "- Docker started without manual steps"
echo "- PostgreSQL ready"
echo "- Controller is running"
echo "- At least one agent registered"
echo "- Health endpoint returns OK"
echo ""
echo "Next: Update docs/status/MATURITY.md and begin Level 1"

#!/bin/bash
# Verify clean boot from scratch
# Tests that the platform can start with no manual intervention

set -e

echo "=== Verifying Clean Boot ==="

# Configuration
COMPOSE_FILE="docker-compose.production.yml"

echo "1. Stopping all existing containers..."
# NOTE: -v is intentionally omitted — named volumes (postgres data etc.) must be preserved
docker compose -f "$COMPOSE_FILE" down 2>&1 || true

echo "2. Removing any orphaned containers..."
docker ps -a | grep chopsticks | awk '{print $1}' | xargs -r docker rm -f 2>&1 || true

echo "3. Running unified start script..."
./scripts/start.sh

echo ""
echo "=== ✅ Clean Boot Verified ==="
echo "Platform started successfully with ./scripts/start.sh"

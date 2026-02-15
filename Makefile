# Chopsticks Platform Makefile
# Enforces maturity model progression

.PHONY: help start stop restart logs health status clean test-level-0 test-level-1 test-protocol verify-clean-boot

# Default target
help:
	@echo "🥢 Chopsticks Platform - Maturity Model Enforced"
	@echo ""
	@echo "Common Commands:"
	@echo "  make start              - Start all services (one-command bring-up)"
	@echo "  make stop               - Stop all services"
	@echo "  make restart            - Restart all services"
	@echo "  make logs               - Follow bot logs"
	@echo "  make health             - Check system health"
	@echo "  make status             - Show container status"
	@echo ""
	@echo "Testing & Verification:"
	@echo "  make test-level-0       - Run Level 0 maturity checks"
	@echo "  make test-level-1       - Run Level 1 contract tests"
	@echo "  make test-protocol      - Run protocol versioning tests"
	@echo "  make verify-clean-boot  - Verify clean boot from scratch"
	@echo "  make clean              - Clean all containers and volumes"
	@echo ""
	@echo "Development:"
	@echo "  make rebuild            - Rebuild bot container"
	@echo "  make deploy-commands    - Deploy slash commands"
	@echo ""
	@echo "Current Maturity Level: 1 (see MATURITY.md)"

# Start the platform
start:
	@./scripts/start.sh

# Stop the platform
stop:
	@docker compose -f docker-compose.production.yml down

# Restart the platform
restart: stop start

# Follow logs
logs:
	@docker logs chopsticks-bot -f

# Check health
health:
	@curl -s http://localhost:8080/healthz | jq . || curl -s http://localhost:8080/health | jq . || echo "Health endpoint not responding"

# Show status
status:
	@docker compose -f docker-compose.production.yml ps

# Clean everything
clean:
	@echo "⚠️  This will remove all containers and volumes"
	@read -p "Continue? [y/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker compose -f docker-compose.production.yml down -v; \
		echo "✅ Cleaned"; \
	fi

# Level 0 maturity check
test-level-0:
	@echo "Running Level 0 maturity checks..."
	@./scripts/ci/level-0-check.sh

# Level 1 contract tests
test-level-1:
	@echo "Running Level 1 contract tests..."
	@npm run test:level-1

# Protocol versioning tests
test-protocol:
	@npx mocha test/unit/protocol-version.test.js

# Verify clean boot
verify-clean-boot:
	@./scripts/verify-clean-boot.sh

# Rebuild bot container
rebuild:
	@docker compose -f docker-compose.production.yml build bot
	@docker compose -f docker-compose.production.yml up -d bot
	@echo "✅ Bot rebuilt and restarted"

# Deploy slash commands
deploy-commands:
	@node src/deploy-commands.js
	@echo "✅ Commands deployed"

# Check current maturity level
maturity:
	@echo "Current Maturity Level: 1"
	@echo "See MATURITY.md for details"
	@grep "^- \[" MATURITY.md | head -20

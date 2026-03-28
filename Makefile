.PHONY: dev test migrate lint secrets-check generate-jwt-secret seed-test-db

dev:
	docker compose up --build

migrate:
	cd services/api && alembic upgrade head

test-backend:
	cd services/api && pytest tests/ -v

test-frontend:
	cd apps/web && pnpm test

test-e2e:
	cd apps/web && pnpm exec playwright test

lint:
	cd apps/web && pnpm lint && pnpm typecheck
	cd services/api && ruff check .

secrets-check:
	@grep -rn "sk-ant\|nvapi-\|rzp_live\|sk_live" \
		--include="*.py" --include="*.ts" --include="*.tsx" \
		--exclude-dir=node_modules --exclude-dir=.git . \
		&& echo "HARDCODED SECRETS DETECTED — COMMIT BLOCKED" && exit 1 \
		|| echo "No hardcoded secrets found"

generate-jwt-secret:
	@openssl rand -hex 64

seed-test-db:
	@echo "Seeding test database with E2E fixtures..."
	cd services/api && python scripts/seed_test_data.py

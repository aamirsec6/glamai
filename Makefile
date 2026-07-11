# GlamAI Makefile

VENV := .venv
PY := $(VENV)/bin/python
CELERY := $(VENV)/bin/celery
UVICORN := $(VENV)/bin/uvicorn
PYTEST := $(VENV)/bin/pytest
RUFF := $(VENV)/bin/ruff
ALEMBIC := $(VENV)/bin/alembic

.PHONY: help setup dev test lint migrate

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Initial project setup
	$(PY) -m venv $(VENV)
	$(VENV)/bin/pip install -e ".[dev]"
	cp -n .env.example .env
	@echo "✅ Setup complete. Edit .env with your credentials."

dev: ## Start development server
	$(UVICORN) src.main:app --reload --port 8000

dev-infra: ## Start infrastructure (postgres + redis)
	docker compose up -d postgres redis

dev-worker: ## Start Celery worker
	$(CELERY) -A src.workers.celery_app worker --loglevel=info

dev-beat: ## Start Celery beat (scheduler)
	$(CELERY) -A src.workers.celery_app beat --loglevel=info

test: ## Run tests
	$(PYTEST) -xvs

test-cov: ## Run tests with coverage
	$(PYTEST) --cov=src --cov-report=term-missing

lint: ## Run linter
	$(RUFF) check src tests

lint-fix: ## Fix lint issues
	$(RUFF) check --fix src tests

format: ## Format code
	$(RUFF) format src tests

migrate: ## Run database migrations
	$(ALEMBIC) upgrade head

migrate-create: ## Create new migration
	@read -p "Migration message: " msg; \
	$(ALEMBIC) revision --autogenerate -m "$$msg"

bootstrap: ## Bootstrap database (create tables only)
	$(PY) scripts/bootstrap_db.py

gbp-sync: ## Sync GBP data (all orgs)
	$(PY) scripts/run_gbp_sync.py

gbp-sync-org: ## Sync GBP for one org: make gbp-sync-org ORG_ID=uuid
	$(PY) scripts/run_gbp_sync.py --org-id $(ORG_ID)

demo-seed: ## Seed demo account with sample data
	$(PY) scripts/seed_demo.py

demo-seed-reset: ## Reset and re-seed demo account
	$(PY) scripts/seed_demo.py --reset

journey-seed: ## Seed ~120 orgs for journey analytics testing
	$(PY) scripts/seed_journey_bulk.py --count 120

journey-seed-reset: ## Reset and seed large journey analytics dataset
	$(PY) scripts/seed_journey_bulk.py --count 120 --reset

journey-seed-large: ## Seed 300 orgs for journey analytics stress test
	$(PY) scripts/seed_journey_bulk.py --count 300 --reset

demo-agents: ## Run all content agents (ORG_ID optional)
	$(PY) scripts/run_content_agents.py $(if $(ORG_ID),--org-id $(ORG_ID),)

content-agents: ## Alias for demo-agents
	$(MAKE) demo-agents

demo: ## Bootstrap DB, seed demo, print URLs
	$(MAKE) bootstrap
	$(MAKE) demo-seed-reset


clean: ## Clean up
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .ruff_cache .mypy_cache

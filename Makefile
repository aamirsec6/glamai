# GlamAI Makefile

.PHONY: help setup dev test lint migrate

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Initial project setup
	python -m venv .venv
	. .venv/bin/activate && pip install -e ".[dev]"
	cp -n .env.example .env
	@echo "✅ Setup complete. Edit .env with your credentials."

dev: ## Start development server
	uvicorn src.main:app --reload --port 8000

dev-infra: ## Start infrastructure (postgres + redis)
	docker compose up -d postgres redis

dev-worker: ## Start Celery worker
	celery -A src.tasks.celery_app worker --loglevel=info

dev-beat: ## Start Celery beat (scheduler)
	celery -A src.tasks.celery_app beat --loglevel=info

test: ## Run tests
	pytest -xvs

test-cov: ## Run tests with coverage
	pytest --cov=src --cov-report=term-missing

lint: ## Run linter
	ruff check src tests

lint-fix: ## Fix lint issues
	ruff check --fix src tests

format: ## Format code
	ruff format src tests

migrate: ## Run database migrations
	alembic upgrade head

migrate-create: ## Create new migration
	@read -p "Migration message: " msg; \
	alembic revision --autogenerate -m "$$msg"

bootstrap: ## Bootstrap database (create tables + seed)
	python scripts/bootstrap_db.py

seed: ## Seed demo data
	python scripts/seed_demo_data.py

clean: ## Clean up
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .ruff_cache .mypy_cache

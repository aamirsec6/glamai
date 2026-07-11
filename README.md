# GlamAI — AI Marketing Platform for Local Service Businesses

## What is GlamAI?

GlamAI is a vertical-specific AI marketing platform for local service businesses
in India. The MVP targets **interior designers in Bangalore** with three core
features:

1. **GBP Optimizer** — Google Business Profile optimization for local discovery
2. **WhatsApp AI Agent** — Instant lead qualification and booking via WhatsApp
3. **Value Report** — Monthly marketing performance report delivered via WhatsApp

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     FastAPI (Python)                     │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│  Orgs    │  Leads   │  GBP     │ Reports  │  Territory  │
│  API     │  API     │  API     │  API     │  API        │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                   Service Layer                          │
├──────────┬──────────┬──────────┬──────────┬─────────────┤
│ WhatsApp │  GBP     │  AI      │  Report  │  Territory  │
│ Service  │  Service │  Service │  Service │  Service    │
├──────────┴──────────┴──────────┴──────────┴─────────────┤
│                   Data Layer (SQLModel)                  │
├─────────────────────────────────────────────────────────┤
│              PostgreSQL          Redis (Celery)          │
└─────────────────────────────────────────────────────────┘
```

## Project Structure

```
glamai/
├── pyproject.toml
├── Dockerfile              # Production API image
├── Dockerfile.dev          # Local docker-compose (hot reload)
├── dashboard/              # Next.js admin + client portal
├── deploy/railway/         # Railway deploy guide + env templates
├── scripts/
│   ├── bootstrap_db.py
│   └── start-api.sh        # Production API entry (schema + uvicorn)
├── src/
│   ├── main.py
│   ├── core/               # config, database, deps
│   ├── application/        # API facades (orchestration)
│   ├── analytics/          # DB-only insights engine
│   ├── integrations/       # External API connectors
│   ├── services/           # Domain logic
│   ├── workers/            # Celery tasks
│   └── api/v1/             # Thin HTTP routes
```

See [deploy/railway/README.md](deploy/railway/README.md) for production deployment.

## Quick Start

```bash
# 1. Clone and setup
git clone https://github.com/aamirsec6/glamai.git
cd glamai
cp .env.example .env
# Edit .env with your credentials

# 2. Create virtual environment
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# 3. Start infrastructure
docker compose up -d postgres redis

# 4. Bootstrap database
python scripts/bootstrap_db.py

# 5. Run
uvicorn src.main:app --reload --port 8000

# 6. Run tests
pytest
```

## Territory & Exclusivity Rules

See [docs/territory-rules.md](docs/territory-rules.md) for the full framework.

**Summary:**
- Each org has a territory (category + radius)
- Exclusive tier: no competing org in radius
- Standard tier: competing orgs allowed, keyword niches are partitioned
- Conflict detection runs at onboarding time

## Guarantee Framework

See [docs/guarantee-framework.md](docs/guarantee-framework.md) for the full framework.

**Summary:**
- Guarantee efforts you control (posts, response time, reports)
- Don't guarantee rank — guarantee optimization work
- Position-based guarantees (Top 3) for standard tier
- Position-based guarantees (Top 1) for exclusive tier

## Pricing

See [docs/pricing.md](docs/pricing.md) for the full framework.

| Plan | Price | Guarantee | Exclusivity |
|------|-------|-----------|-------------|
| Starter | ₹1,999/mo | Top 3 rank | No |
| Growth | ₹4,999/mo | Top 3 rank + priority | No |
| Enterprise | ₹7,999/mo | Top 1 rank | Yes (5km) |

## License

Proprietary — All rights reserved.

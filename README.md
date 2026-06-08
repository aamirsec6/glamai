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
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── Makefile
├── README.md
├── docs/
│   ├── architecture.md
│   ├── api-reference.md
│   ├── territory-rules.md
│   ├── guarantee-framework.md
│   └── pricing.md
├── scripts/
│   ├── bootstrap_db.py
│   ├── seed_demo_data.py
│   └── onboard_client.py
├── src/
│   ├── main.py                  # FastAPI entry point
│   ├── config.py                # Settings from env
│   ├── database.py              # DB engine + session
│   ├── models/
│   │   ├── __init__.py
│   │   ├── org.py               # Organization (tenant)
│   │   ├── lead.py              # Lead + WhatsApp conversations
│   │   ├── gbp.py               # GBP posts, rankings, competitors
│   │   ├── report.py            # Monthly value reports
│   │   ├── territory.py         # Territory/exclusivity records
│   │   └── notification.py      # Notification log
│   ├── api/
│   │   ├── __init__.py
│   │   ├── deps.py              # Auth + DB dependencies
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   ├── orgs.py          # Organization CRUD
│   │   │   ├── leads.py         # Lead management
│   │   │   ├── gbp.py           # GBP operations
│   │   │   ├── reports.py       # Report generation
│   │   │   ├── territory.py     # Territory checks
│   │   │   ├── admin.py         # Admin analytics
│   │   │   └── webhooks.py      # WhatsApp + GBP webhooks
│   ├── services/
│   │   ├── __init__.py
│   │   ├── whatsapp/
│   │   │   ├── __init__.py
│   │   │   ├── client.py        # 360dialog API client
│   │   │   ├── webhook.py       # Inbound message handler
│   │   │   └── templates.py     # WhatsApp message templates
│   │   ├── gbp/
│   │   │   ├── __init__.py
│   │   │   ├── client.py        # Google Business Profile API
│   │   │   ├── optimizer.py     # Post creation + optimization
│   │   │   └── insights.py      # GBP insights + rank tracking
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   ├── lead_qualifier.py    # Lead qualification flow
│   │   │   ├── post_generator.py    # GBP post writing
│   │   │   └── report_narrator.py   # Report narrative generation
│   │   ├── reports/
│   │   │   ├── __init__.py
│   │   │   ├── generator.py     # PDF report generation
│   │   │   └── scheduler.py     # Monthly report scheduling
│   │   └── territory/
│   │       ├── __init__.py
│   │       ├── checker.py       # Exclusivity conflict detection
│   │       ├── geocode.py       # Geocoding + distance calc
│   │       └── keyword_niche.py # Keyword territory mapping
│   └── tasks/
│       ├── __init__.py
│       ├── celery_app.py        # Celery configuration
│       ├── gbp_tasks.py         # GBP post scheduling
│       ├── report_tasks.py      # Report generation
│       └── notification_tasks.py # WhatsApp notifications
└── tests/
    ├── conftest.py
    ├── test_models.py
    ├── test_api/
    ├── test_services/
    └── test_tasks/
```

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

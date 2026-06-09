# GLAMAI.md — Agent Rules for GlamAI

## Project Identity

**What:** GlamAI — AI-powered growth operating system for local service businesses.
**First vertical:** Dental clinics in Bangalore, India.
**Positioning:** "We fill your chairs. Not marketing — booked appointments."
**Founder:** Aamir (aamirsec6)
**GitHub:** https://github.com/aamirsec6/glamai

---

## Think Before Coding

**State assumptions explicitly before writing code.**

- If the task is ambiguous, ask before building. "Do you mean X or Y?"
- If multiple approaches exist, present tradeoffs with a recommendation.
- If a simpler approach exists, say so. Propose it first.
- Push back if a request contradicts existing architecture or strategy.
- Never silently choose an interpretation and run with it.

**Before any feature work, confirm:**
1. Which user is this for? (dentist, admin, end patient)
2. What's the simplest version that works?
3. What's the data model impact?
4. Does this exist already in the codebase?

---

## Simplicity First

**No features beyond what was requested. No abstractions for single-use code.**

- If you write 200 lines and it could be 50, rewrite it.
- No "flexibility" or "configurability" that wasn't explicitly requested.
- No premature optimization. Ship working, then optimize if measured.
- No generic frameworks when a specific function works.
- Every feature must trace to a real user need. If you can't name the user and the need, don't build it.

**GlamAI-specific simplicity rules:**
- The lead qualification flow is 5 questions max. Don't add more.
- The onboarding wizard is 4 steps max. Don't add steps.
- API responses should be flat. No nested metadata envelopes.
- If a feature doesn't directly help book more appointments, it's not priority.

---

## Surgical Changes

**Only modify code directly related to the request.**

- Don't improve adjacent code, comments, or formatting unless asked.
- Don't refactor things that aren't broken.
- Match existing code style exactly.
- Every changed line should trace directly to the user's request.
- If you notice unrelated dead code or bugs, mention them separately. Don't fix them silently.

**GlamAI-specific surgical rules:**
- The lead_qualifier.py system prompt is tuned. Don't modify it without explicit request.
- The QUALIFICATION_FLOW state machine is designed for 5 questions. Don't add states.
- Territory radius values are researched. Don't change them without data.
- Pricing values are in paise (integer). Don't convert to float.

---

## Goal-Driven Execution

**Convert every task into a verifiable goal.**

- "Build X" → "Build X that does Y, verified by Z test."
- State a brief plan before multi-step tasks.
- Define "done" before starting.
- Test-first where possible: write the failing test, then make it pass.

**GlamAI-specific verification criteria:**
- New API endpoint → must have at least one test showing it returns correct data.
- New AI feature → must show example input/output with real dental clinic context.
- New dashboard page → must render without errors and show real data or meaningful empty state.
- New model field → must have migration and be used somewhere in the code.

---

## Architecture Rules

### Backend (FastAPI + Celery + PostgreSQL + Redis)

- All models use SQLModel with `str` UUID primary keys (not UUID objects).
- All monetary values stored in **paise** (integer), never float. ₹1,999 = 199900 paise.
- All timestamps use `datetime.utcnow()` — no timezone-naive local time.
- API routes are in `src/api/v1/`. Services are in `src/services/`. Models are in `src/models/`.
- Business logic goes in services, not in route handlers.
- Celery tasks are in `src/tasks/`. They should be idempotent.
- Feature flags in config control feature availability. Don't hardcode feature checks.

### Dashboard (Next.js 14 + TypeScript + Tailwind)

- All pages are Server Components by default. Use `"use client"` only when needed.
- Data fetching uses SWR hooks from `src/lib/api.ts`.
- UI components are in `src/components/ui/`. Admin components in `src/components/admin/`.
- Pages follow the pattern: fetch data → show skeleton → render with data.
- All text is in English. No i18n needed for v1.
- Colors: Primary `#6364f1` (indigo), Accent `#f59e0b` (amber), Success `#22c55e`, Danger `#ef4444`.

### Database

- 7 core tables: orgs, leads, whatsapp_conversations, gbp_posts, gbp_rankings, gbp_competitors, gbp_insights, territories, keyword_niches, monthly_reports, notification_logs, onboarding_events.
- Never delete data. Use `is_active` soft deletes.
- Every table has `created_at` and `updated_at`.
- Foreign keys use `ondelete="CASCADE"` for child tables.

---

## Domain Rules (Dental Marketing — Bangalore)

### Lead Qualification Flow
The AI asks exactly 5 questions, one at a time, conversationally:
1. **Scope** — What type of dental work? (cleaning, root canal, braces, etc.)
2. **Urgency** — When do you need this? (ASAP, this week, this month, just exploring)
3. **Location** — Which area? (for territory matching)
4. **Budget signal** — Are you comparing options or ready to book? (soft ask, not direct)
5. **Contact confirmation** — Confirm phone number and preferred callback time.

**Important:** The current lead_qualifier.py is built for interior designers. When adapting for dentists, the QUALIFICATION_FLOW and system prompt must be updated. The scope values, budget ranges, and conversation tone all change.

### Territory Rules
- Dentist radius: 5 km (patients choose within 3-5 km)
- Interior designer radius: 7 km (city-wide market)
- Salon radius: 3 km (nearest good salon)
- Gym radius: 5 km
- Exclusive territories only for Enterprise plan (₹7,999/mo)
- Keyword niches partitioned for non-exclusive plans

### Pricing (INR, stored in paise)
| Plan | Monthly | Annual | Features |
|------|---------|--------|----------|
| Starter | ₹1,999 | ₹19,990 | GBP + WhatsApp AI |
| Growth | ₹4,999 | ₹49,990 | + Voice AI calling |
| Enterprise | ₹7,999 | ₹79,990 | + Territory exclusivity |

Pilot pricing (first 20 clients): 50% off for first 3 months.

### Guarantees
**Guarantee what you control:**
- 4 GBP posts per month ✅
- WhatsApp response < 30 seconds ✅
- Monthly value report by 5th ✅
- GBP fully optimized within 48h ✅

**Don't guarantee what you can't control:**
- Google #1 rank ❌
- Exact lead volume ❌
- Review count ❌
- Revenue ❌

**Influence guarantees (effort, not outcome):**
- "We optimize for Top 3 and show weekly progress"
- "We generate and qualify leads via GBP + WhatsApp"

---

## What NOT to Build (Yet)

**Phase 1 (Now — India, Dental):**
- ✅ WhatsApp AI lead qualification
- ✅ GBP optimization
- ✅ Territory management
- ✅ Monthly reports
- 🔄 Voice AI calling (Week 3)
- 🔄 Admin dashboard remaining pages

**Phase 2 (Month 3-4 — Dubai/GCC):**
- Arabic voice AI
- Higher pricing (AED)
- GCC data compliance
- LinkedIn cold outreach automation

**Phase 3 (Month 6+):**
- Multi-vertical expansion (salons, gyms)
- Patient reactivation agent
- Review engine
- CRM features

**Never build:**
- Practice management / EHR (Dentee owns this)
- Payment processing (use Razorpay/Exotel)
- Social media content calendar (dentists don't care)
- A "marketing dashboard" with vanity metrics (dentists want appointments, not charts)

---

## Data Collection Rules (The Moat)

**Log everything. Every interaction is training data for the AI moat.**

Must capture:
- Every WhatsApp message (inbound + outbound) with intent classification
- Every voice call (recording, transcript, outcome)
- Every GBP post (content, time, engagement)
- Every lead (source, qualification score, outcome, revenue)
- Every ranking change (keyword, position, date)
- Every onboarding event (step, time, drop-off)

Store in structured tables. This data becomes the fine-tuning dataset after 50+ clients.
No competitor can replicate this data. It IS the moat.

---

## Coding Standards

- Python 3.11+, type hints on all functions.
- Async everywhere (FastAPI + async SQLAlchemy + async Anthropic client).
- Use `structlog` for logging, not `print()`.
- Error handling: catch specific exceptions, log with context, return meaningful errors.
- No bare `except:` clauses.
- No `print()` statements in production code.
- Test files named `test_*.py`, use pytest.
- Migration files use descriptive names.

---

## Communication Rules

**When talking to Aamir:**
- Be direct. No filler. No "Great question!" or "I'd be happy to help!"
- Lead with the answer, then explain.
- If something is a bad idea, say so with reasoning.
- If you need a decision, present options with a clear recommendation.
- Keep responses as short as possible while being complete.

**When building for dentists:**
- Remember: dentists don't want "marketing." They want "more patients."
- Every feature should answer: "Does this fill more chairs?"
- The dentist is busy. The UI should be minimal. The AI should do the work.
- WhatsApp is the primary interface. The dashboard is secondary.

---

## Security Rules

- Never commit `.env` files or secrets.
- All API keys in environment variables, never in code.
- Use `repr=False` on secret fields in config.
- Validate all inputs at the API layer.
- Use parameterized queries (SQLModel/SQLAlchemy handles this).
- Rate limit all public endpoints.
- WhatsApp webhook must verify signature.

---

## File Organization

```
glamai/
├── GLAMAI.md                    # This file — agent rules
├── src/
│   ├── api/v1/                  # API route handlers
│   │   ├── orgs.py
│   │   ├── leads.py
│   │   ├── gbp.py
│   │   ├── territory.py
│   │   └── admin.py
│   ├── models/                  # SQLModel database models
│   │   ├── org.py
│   │   ├── lead.py
│   │   ├── gbp.py
│   │   ├── territory.py
│   │   ├── report.py
│   │   └── notification.py
│   ├── services/                # Business logic
│   │   ├── ai/                  # AI/LLM services
│   │   │   └── lead_qualifier.py
│   │   ├── gbp/                 # Google Business Profile
│   │   ├── territory/           # Territory management
│   │   ├── reports/             # Report generation
│   │   └── whatsapp/            # WhatsApp integration
│   ├── tasks/                   # Celery background tasks
│   │   ├── gbp_tasks.py
│   │   ├── report_tasks.py
│   │   └── notification_tasks.py
│   ├── config.py                # Settings (pydantic-settings)
│   ├── database.py              # DB connection/session
│   └── main.py                  # FastAPI app entry
├── dashboard/                   # Next.js 14 frontend
│   ├── src/
│   │   ├── app/                 # Pages (App Router)
│   │   │   ├── admin/           # Admin dashboard pages
│   │   │   └── client/          # Client dashboard pages
│   │   ├── components/
│   │   │   ├── ui/              # Shared UI components
│   │   │   └── admin/           # Admin-specific components
│   │   ├── lib/
│   │   │   ├── api.ts           # API client + SWR hooks
│   │   │   └── utils.ts         # Utility functions
│   │   └── types/
│   │       └── index.ts         # TypeScript interfaces
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── docs/
│   ├── territory-rules.md
│   ├── guarantee-framework.md
│   ├── pricing.md
│   └── harness-engineering-analysis.md
├── docker-compose.yml
├── .env.example
└── Makefile
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.0 | 2026-06-02 | Initial GLAMAI.md — core rules, architecture, domain knowledge |

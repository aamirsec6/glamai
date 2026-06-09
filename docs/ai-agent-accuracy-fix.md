# AI Agent Accuracy Fix — Relevance to GlamAI

## Source
"From 65% to 94% AI Agent Accuracy in 65 Lines of Code" — buildmvpfast.com (June 2026)
Based on Andrej Karpathy's Jan 2026 post + Forrest Chang's 65-line CLAUDE.md fix (220K+ stars)

---

## The 3 Mistakes Karpathy Named (That Apply to Our AI Too)

### Mistake 1: Making assumptions instead of asking
**Karpathy:** "Models make wrong assumptions on your behalf and just run along without checked."

**GlamAI mapping — WhatsApp AI Agent:**
This is EXACTLY our lead qualification problem. When a lead says "I want to redesign my house," the AI shouldn't assume:
- Which rooms (full home? just kitchen?)
- What budget (₹5L? ₹50L?)
- What timeline (next month? next year?)

**Our current flow already handles this** — the qualification flow asks one question at a time (scope → size → budget → timeline → location). But we need to be more explicit: the AI should NOT assume ANY field. Even if the lead says "I have a 3BHK," don't assume budget.

**Action:** Update the lead_qualifier system prompt to explicitly say:
```
When extracting entities, NEVER assume a value just because it's common or likely.
If the user says "3BHK", record property_type but leave budget_range as UNKNOWN.
Only set a field if the user explicitly states it or clearly implies it.
```

### Mistake 2: Overcomplicating code
**Karpathy:** "Agents produce 1,000-line implementations for problems solvable in 100 lines."

**GlamAI mapping — our engineering:**
This applies to US building GlamAI too. When we ask an AI agent (like Hermes/claude-code) to build features, it might over-engineer.

**Action:** Add rules to our AGENTS.md:
```
## Simplicity first
- No abstractions for single-use code
- If you write 200 lines and it could be 50, rewrite it
- No features beyond what was requested
- For MVP: prefer explicit code over elegant abstractions
```

### Mistake 3: Touching code they weren't asked to change
**Karpathy:** "Agents modify adjacent comments, refactor imports, remove code they don't understand."

**GlamAI mapping:**
When an AI agent works on the GlamAI codebase, it should only change what's needed.

**Action:** Add to AGENTS.md:
```
## Surgical changes
- Only modify code directly related to the request
- Don't improve adjacent code, comments, or formatting
- Match existing code style exactly
- Every changed line should trace to the user's request
```

---

## The 4th Rule (Forrest Chang's Addition): Goal-Driven Execution

**"Fix the bug" → "Write a failing test, then make it pass"**

**GlamAI mapping — our AI should verify its own work:**
1. **GBP Post Generation:** After writing a post, the AI should check: Does it contain the target keyword? Is it under 1500 chars? Does it have a call-to-action?
2. **Lead Qualification:** After qualification, the AI should verify: Are all required fields extracted? Is the qualification score >= 0.5? Should the designer be notified?
3. **Report Generation:** After generating a report, verify: Are all metrics populated? Is the MoM comparison calculated?

**Action:** Add self-verification steps to each AI service:
- `services/ai/lead_qualifier.py` → after qualification, verify all fields are either extracted or explicitly marked unknown
- `services/gbp/optimizer.py` → after post generation, verify keyword inclusion + length + CTA
- `services/reports/generator.py` → after report generation, verify all metrics are non-null

---

## Our CLAUDE.md for GlamAI Repo

We should create `/home/ubuntu/glamai/CLAUDE.md` with these rules:

```markdown
# GlamAI Agent Instructions

## Project Structure
- `src/` — FastAPI backend (Python 3.11, SQLModel, async)
- `dashboard/` — Next.js 14 frontend (TypeScript, Tailwind)
- `docs/` — Architecture, product, and handoff docs
- `scripts/` — Database bootstrap and seed

## Conventions
- String UUIDs as primary keys (not UUID objects)
- API routes under `/api/v1/`
- All models in `src/models/`, services in `src/services/`
- Territory conflicts checked at onboarding (never bypass)
- WhatsApp is the primary interface; dashboard is secondary

## Think Before Coding
- State assumptions before writing code
- If uncertain about requirements, ask before proceeding
- Present tradeoffs when multiple approaches exist
- Push back when a simpler approach exists

## Simplicity First
- No features beyond what was requested
- No abstractions for single-use code
- If you write 200 lines and it could be 50, rewrite it
- For MVP: explicit code over elegant abstractions

## Surgical Changes
- Only modify code directly related to the request
- Don't improve adjacent code, comments, or formatting
- Match existing code style exactly
- Every changed line should trace to the user's request

## Goal-Driven Execution
- Convert tasks into verifiable goals with tests
- "Fix the bug" → "Write a failing test, then make it pass"
- State a brief plan before multi-step tasks
- Verify outputs before reporting success

## Current Focus
- See `DASHBOARD_STATUS.md` for dashboard build status
- See `dashboard/PROGRESS.md` for detailed progress
- See `dashboard/IMPLEMENTATION_SPEC.md` for remaining pages
```

---

## Key Metrics to Add (Inspired by the Article)

The article mentions accuracy going from 65% to 94%. For GlamAI's AI agent, we should track:

1. **Lead Qualification Accuracy:** % of leads where the AI correctly extracted all key fields (scope, budget, timeline, location). Target: >90%

2. **GBP Post Quality Score:** % of posts that include target keyword + are under 1500 chars + have CTA. Target: >95%

3. **False Assumption Rate:** % of leads where the AI assumed a value that was later corrected by the designer. Target: <5%

4. **Self-Verification Pass Rate:** % of AI outputs that pass automated verification before delivery. Target: >98%

These should be tracked per-org in the admin dashboard.

---

## TL;DR — What to Change Now

1. **Create CLAUDE.md** at repo root with the 4 rules (Think, Simplify, Surgical, Verify)
2. **Update lead_qualifier system prompt** to explicitly prohibit assumptions
3. **Add self-verification** to all AI services (lead qualification, GBP post, report generation)
4. **Track AI accuracy metrics** in admin dashboard (qualification accuracy, false assumption rate)
5. **Add AGENTS.md** for the dashboard repo too

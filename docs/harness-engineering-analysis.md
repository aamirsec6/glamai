# Agent Harness Engineering — Relevance to GlamAI

## Source
awesome-agent-harness (443 stars): https://github.com/AutoJunjie/awesome-agent-harness
Core thesis: "The harness matters more than the model." — OpenAI + Anthropic

---

## 1. PRINCIPLES THAT APPLY TO GLAMAI

From the 8 core principles — here's how each maps to what we're building:

| # | Principle | How GlamAI Applies |
|---|-----------|--------------------|
| 1 | **Humans steer, agents execute** | Interior designer steers (sets territory, pricing, scope). GlamAI agent executes (GBP posts, WhatsApp replies, lead qualification). |
| 2 | **Repository knowledge is system of record** | GlamAI's DB is the system of record. Territory rules, keyword niches, guarantee terms — all stored mechanically, not in someone's head. |
| 3 | **AGENTS.md is table of contents** | Our admin dashboard IS the "AGENTS.md" for the business — points to leads, GBP status, reports. Not an encyclopedia, just navigation. |
| 4 | **Enforce architecture mechanically** | Territory conflict detection runs at onboarding — can't be bypassed. Guarantee tracking is automatic. Budget alerts fire without human intervention. |
| 5 | **Agent legibility > human readability** | The WhatsApp AI conversation flow is optimized for the AI to understand the lead, not for the lead to see a pretty form. |
| 6 | **Fewer tools, more expressiveness** | 3 core features (GBP + WhatsApp + Reports) not 20. Each does one thing well. Progressive disclosure — lead qualification asks one question at a time. |
| 7 | **See like an agent** | Admin journey tracking shows you exactly where clients struggle. You see the product through their eyes. |
| 8 | **Corrections cheap, waiting expensive** | If a client's GBP rank drops, the system auto-generates new posts. No waiting for a human to notice. |

---

## 2. TOOLS FROM THE LIST WORTH ADOPTING

### Tier 1: Use Now (Free, Immediate Value)

#### agents.md / AGENTS.md Standard
- **What:** Open standard for project-level agent instructions
- **URL:** https://agents.md/
- **Why for GlamAI:** Our backend already has this pattern. The `PROGRESS.md` and `IMPLEMENTATION_SPEC.md` in the dashboard follow this principle — table of contents pointing to deeper sources.
- **Action:** Add an `AGENTS.md` to the GlamAI repo root that points to key files. Any AI agent working on the repo will auto-discover it.

#### MCP (Model Context Protocol)
- **What:** Open standard for connecting AI models to external tools
- **URL:** https://modelcontextprotocol.io/
- **Why for GlamAI:** We already have an MCP server in agent-money. GlamAI could expose its own MCP server so AI coding agents can query lead data, GBP status, territory info programmatically.
- **Action:** Build a GlamAI MCP server with tools: `get_leads`, `get_gbp_status`, `get_territory`, `get_reports`, `check_guarantee`.

#### GitAgent Standard
- **What:** Git-native, framework-agnostic standard for defining AI agents
- **URL:** https://github.com/open-gitagent/gitagent
- **Pattern:** agent.yaml manifest + SOUL.md identity + RULES.md constraints
- **Why for GlamAI:** Our backend already has this pattern implicitly. Formalizing it would make the project more agent-friendly.
- **Action:** Add `agent.yaml` to repo root defining GlamAI's agent interface.

#### get-shit-done (GSD)
- **What:** Meta-prompting and context engineering system for Claude Code
- **URL:** https://github.com/gsd-build/get-shit-done
- **Pattern:** milestone → phase → plan with progressive context delivery
- **Why for GlamAI:** Our 8-week build plan already follows this. Could formalize the dashboard build plan using GSD's structure.
- **Action:** Structure remaining dashboard work as milestones with progressive context files.

---

### Tier 2: Evaluate for Near-Term Use

#### Nanoclaw
- **What:** Lightweight agent runtime that runs in containers, connects to WhatsApp/Telegram
- **URL:** https://github.com/qwibitai/nanoclaw
- **Why for GlamAI:** We're building a WhatsApp-first product. Nanoclaw could be an alternative to 360dialog for the WhatsApp channel layer. Container-based isolation is cleaner.
- **Action:** Evaluate as potential replacement for 360dialog integration. Compare pricing and reliability.

#### claude-mem
- **What:** Automatic session capture with AI compression and injection into future sessions
- **URL:** https://github.com/thedotmack/claude-mem
- **Why for GlamAI:** Our admin dashboard's journey tracking is essentially this for client behavior. Could add similar memory for the AI agent itself — remembering context about each client across sessions.
- **Action:** Consider adding a memory layer to the WhatsApp AI agent that remembers past conversations with the same lead.

#### Hindsight
- **What:** Agent memory that learns from execution history
- **URL:** https://github.com/vectorize-io/hindsight
- **Why for GlamAI:** Could analyze past lead qualification conversations to improve the AI's questioning strategy over time.
- **Action:** Post-MVP: feed conversation outcomes back into the qualification model.

#### CodeBurn
- **What:** Token usage analytics broken down by task
- **URL:** https://github.com/AgentSeal/codeburn
- **Why for GlamAI:** We're using Claude Haiku for lead qualification and GBP post generation. Need to track token costs per client to ensure unit economics work.
- **Action:** Add token tracking to the AI service layer. Store `tokens_used` per lead qualification and per GBP post. Show in admin dashboard.

#### Honcho
- **What:** Agent state memory library
- **URL:** https://github.com/plastic-labs/honcho
- **Why for GlamAI:** Persistent state for each client's AI agent — remembers where they are in onboarding, past issues, preferences.
- **Action:** Evaluate as replacement for our custom org state management.

---

### Tier 3: Architecturally Interesting (Long-Term)

#### DeerFlow 2.0 (ByteDance)
- **What:** SuperAgent harness with skill system, sub-agent orchestration, sandboxed execution
- **URL:** https://github.com/bytedance/deer-flow
- **Why interesting:** If GlamAI grows to need multiple AI agents per client (one for GBP, one for WhatsApp, one for reports), DeerFlow's orchestration pattern could coordinate them.

#### Hive
- **What:** Outcome-driven agent framework with queen agent generating agent graphs
- **URL:** https://github.com/aden-hive/hive
- **Why interesting:** The "queen agent" pattern could be useful for the admin dashboard — a meta-agent that analyzes all client data and generates recommendations.

#### Zylos
- **What:** Persistent agent harness with tiered memory, multi-channel bridge, task scheduler
- **URL:** https://github.com/zylos-ai/zylos-core
- **Why interesting:** This is essentially what we're building for interior designers — a persistent agent that works across WhatsApp, GBP, and reports. Study their architecture.

#### Deep Agents (LangChain)
- **What:** Progressive disclosure through planning tools and subagent spawning
- **URL:** https://github.com/langchain-ai/deepagents
- **Why interesting:** Our lead qualification flow already does progressive disclosure (one question at a time). Deep Agents formalizes this pattern.

#### Compound Engineering Plugin
- **What:** Cross-agent standardized plugin for Claude Code, Codex, Cursor
- **URL:** https://github.com/EveryInc/compound-engineering-plugin
- **Why interesting:** If we want GlamAI to work with multiple AI coding agents (for the dashboard build), this provides a unified interface.

#### Symphony (OpenAI)
- **What:** Daemon that polls Linear issues, spawns isolated Codex agents per task, delivers PRs
- **URL:** https://github.com/openai/symphony
- **Why interesting:** The pattern of "poll for work → spawn agent → deliver result" is exactly what our Celery tasks do. Study their architecture for scaling insights.

#### Vibe Kanban
- **What:** Kanban orchestrator with git worktree isolation per agent
- **URL:** https://github.com/BloopAI/vibe-kanban
- **Why interesting:** If we scale to multiple developers working on GlamAI, this provides parallel agent execution patterns.

---

## 3. STANDARDS TO ADOPT

### AGENTS.md for GlamAI
Create `/home/ubuntu/glamai/AGENTS.md`:
```markdown
# GlamAI Agent Instructions

## Project Structure
- `src/` — FastAPI backend (Python)
- `dashboard/` — Next.js 14 frontend
- `docs/` — Architecture and product docs

## Key Files
- `src/models/` — Database models (SQLModel)
- `src/api/v1/` — API routes
- `src/services/` — Business logic
- `src/tasks/` — Celery async tasks

## Conventions
- All models use string UUIDs as primary keys
- API routes are under `/api/v1/`
- Use SWR for data fetching in dashboard
- Territory conflicts are checked at onboarding
- Guarantee tracking is automatic

## Current Focus
- See `DASHBOARD_STATUS.md` for dashboard build status
- See `dashboard/PROGRESS.md` for detailed progress
- See `dashboard/IMPLEMENTATION_SPEC.md` for remaining pages
```

### MCP Server for GlamAI
Create a GlamAI MCP server that exposes:
- `get_org_leads(org_id, status?)` — List leads
- `get_org_gbp_status(org_id)` — GBP connection + insights
- `get_org_territory(org_id)` — Territory + keywords
- `get_org_reports(org_id)` — Monthly reports
- `check_guarantee(org_id)` — Guarantee fulfillment status
- `get_admin_dashboard()` — Overview metrics

This would let AI coding agents working on GlamAI query the system programmatically.

---

## 4. KEY INSIGHTS FOR GLAMAI'S ARCHITECTURE

### Insight 1: "Fewer Tools, More Expressiveness"
Our 3-feature MVP (GBP + WhatsApp + Reports) is correct. The list confirms that the best harnesses have fewer, more expressive tools. Don't add more features — make the 3 features deeper.

### Insight 2: "Agent Legibility is the Goal"
The admin dashboard's journey tracking is the most important feature for scaling. It lets you "see like an agent" — understand where clients struggle without asking them. Prioritize this.

### Insight 3: "Corrections are Cheap, Waiting is Expensive"
Build auto-recovery into everything:
- GBP rank drops → auto-generate new posts
- Lead doesn't respond → auto-follow-up after 48h
- Territory conflict detected → auto-suggest resolution
- Guarantee at risk → auto-alert admin

### Insight 4: "Repository Knowledge is the System of Record"
All business rules should be in code/config, not in your head:
- Territory rules → `territory.py` checker
- Guarantee terms → `config.py` settings
- Pricing → `config.py` price map
- Onboarding flow → `onboarding-wizard.tsx` state machine

### Insight 5: Token Cost Tracking is Essential
CodeBurn is listed because at scale, token costs matter. For GlamAI:
- Track tokens per lead qualification (Claude Haiku)
- Track tokens per GBP post generation
- Show cost per client in admin dashboard
- Ensure unit economics work: cost per lead < ₹50

---

## 5. WHAT TO BUILD NEXT (PRIORITY ORDER)

Based on the harness engineering principles:

1. **Token tracking** (CodeBurn pattern) — Add to AI service layer
2. **AGENTS.md** — Add to repo root for agent discoverability
3. **GlamAI MCP server** — Expose data to AI coding agents
4. **Admin journey tracking** — Complete the "see like an agent" dashboard
5. **Auto-recovery workflows** — GBP rank drop → auto-post, lead ghost → auto-follow-up
6. **claude-mem for WhatsApp agent** — Remember context across conversations with same lead

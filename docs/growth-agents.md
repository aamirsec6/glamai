# Growth Agents Architecture

Qimma's growth stack runs a coordinated cast per organization:

```
Geo (Scout) → SEO (Sage) → Content (Spark) + Review replies (Ruby) + Insights (Cleo)
                ↘ targeted keywords handoff ↗
WhatsApp Lead (Maya) — event-driven, outside the weekly beat
```

## Handoff contract (`GrowthHandoff`)

| Stage | Writes | Reads |
|-------|--------|-------|
| **Geo** | `KeywordNiche` rows, lat/lng, competitors, `geo_brief` | Org address / category |
| **SEO** | `GbpRanking`, scorecard, `actions_planned` | Niches via `KeywordPlanner` |
| **Content** | `GbpPost` drafts/schedules, profile, review replies, analysis | `priority_keywords` + SEO `targeted_post` keywords |
| **Review requests** | WhatsApp review ask for WON leads | Leads without a prior `ReviewRequest` |

Growth passes an explicit `GrowthHandoff` object so Content never falls back to an unrelated vertical keyword slice when niches exist.

**Important:** Inside Growth, SEO **defers** `targeted_post` execution (`execute_posts=False`). Content owns GBP post creation so Monday runs do not double-post.

Standalone `POST /api/v1/agents/seo/run` still executes and **ingests** targeted posts.

## Agents

### Geo / Local Agent (`GeoLocalAgentOrchestrator`) — Scout

- Geocodes the org if `latitude` / `longitude` are missing
- Syncs nearby competitors via Google Places
- Assigns `KeywordNiche` rows from the vertical keyword pool (or territory partition)
- Outputs a `geo_brief` with `priority_keywords`

**API:** `POST /api/v1/agents/geo/run`

### SEO Agent (`SeoAgentOrchestrator`) — Sage

1. Loads tracked keywords from niches (fallback: vertical pack)
2. Tracks Map Pack positions (`RankTrackerService` → `GbpRanking`)
3. Runs `LocalSeoHealthModel` + competitive analysis
4. Plans actions (`targeted_post`, `profile_refresh`, `profile_keyword`)
5. Executes profile actions; posts only when `execute_posts=True` (standalone)
6. Builds the **Path to Top 3** weekly scorecard

**API:**

- `POST /api/v1/agents/seo/run`
- `GET /api/v1/agents/seo/scorecard?org_id=`

### Content Agents (`ContentAgentsOrchestrator`) — Spark / Ruby / Cleo

- Generates GBP posts using **niche + SEO-targeted keywords**
- Optimizes profile when SEO plans a refresh
- Auto-replies pending Google reviews
- Runs analytics / Path-to-insight narrative

**API:** `POST /api/v1/agents/content/run`

### Growth Orchestrator (`GrowthOrchestrator`)

Runs geo → SEO → content → pending review requests.

Persists last run via Redis (`qimma:growth:last_run:{org_id}`) with in-memory fallback.

**API:**

- `POST /api/v1/agents/growth/run`
- `GET /api/v1/agents/growth/last-run?org_id=`

**Celery:** `src.workers.growth_tasks.run_growth_agents_all_orgs` (Monday 6:30 AM IST) — **sole Monday growth owner**

### WhatsApp Lead Agent (Maya)

- Event-driven via WhatsApp webhook (`LeadQualifier` + vertical pack flows)
- Not on the Monday beat — reacts to inbound messages
- WON leads are picked up by Growth/Review for review-request WhatsApps

## Vertical Packs

Location: `src/services/verticals/packs/`

| Pack | Category | Places types |
|------|----------|--------------|
| `bakery.py` | `bakery` | `bakery` |
| `interior_design.py` | `interior_design` | `interior_designer` |
| `dentist.py` | `dentist` | `dentist` |
| `salon.py` | `salon` | `beauty_salon` |

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SERPAPI_KEY` | Optional | Automated Map Pack rank tracking |
| `FEATURE_SEO_AGENT` | No (default `true`) | Gate SEO agent |
| `FEATURE_GEO_AGENT` | No (default `true`) | Gate geo agent |
| `FEATURE_CONTENT_GENERATOR` | No | Gate GBP content generation |
| `FEATURE_REVIEW_ENGINE` | No | Gate review replies + requests |
| `FEATURE_MULTI_VERTICAL` | No (default `false`) | Enable non-default vertical packs in product |

## Path to Top 3 Scorecard

The scorecard is an **effort guarantee**, not a rank guarantee:

- Tracks keyword positions, week-over-week delta, and gap to #3
- Lists recommended SEO actions for the week
- `effort_guarantee: true`, `rank_guarantee: false`

## Dashboard

Client page: `/client/growth` — scorecard, rank trends, competitor snapshot, **Run Growth Agents**.

## Celery Beat (IST)

| Time | Task | Notes |
|------|------|-------|
| Mon 6:30 | `run_growth_agents_all_orgs` | Full pipeline owner |
| Every 15 min | `publish_scheduled_posts` | Publish what Content scheduled |
| Daily 6:15 / 6:45 | review sync / auto-reply | Light ops outside Growth |
| Tue 8:00 | `optimize_all_profiles` | Extra profile pass |

Removed from Monday beat (were duplicating Growth work):

- `track_rankings_all_orgs`
- `run_content_agents_all_orgs`
- `generate_weekly_posts`

Manual / API / admin can still call those tasks individually.

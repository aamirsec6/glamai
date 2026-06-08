# GlamAI Dashboard — Progress & Specification Document

## Last Updated: 2026-06-02

---

## 1. PROJECT OVERVIEW

GlamAI has two parts:
1. **Backend** (`/home/ubuntu/glamai/src/`) — FastAPI + Celery + PostgreSQL + Redis — **COMPLETE** (5,688 lines)
2. **Dashboard** (`/home/ubuntu/glamai/dashboard/`) — Next.js 14 frontend — **IN PROGRESS** (~3,900 lines written)

The dashboard has two areas:
- **Admin Dashboard** (`/admin/*`) — For you (the GlamAI operator) to manage all clients
- **Client Dashboard** (`/client/*`) — For interior designer clients to see their data

---

## 2. WHAT IS COMPLETE

### 2.1 Backend (100%)

All backend code is complete and includes:
- 7 database tables with full relationships (orgs, leads, whatsapp_conversations, gbp_posts, gbp_rankings, gbp_competitors, gbp_insights, territories, keyword_niches, monthly_reports, notification_logs, onboarding_events)
- 5 API route modules (orgs, leads, gbp, territory, admin)
- 5 service modules (whatsapp, gbp, ai lead qualifier, reports, territory)
- 3 Celery task modules with scheduled jobs
- Full territory/exclusivity conflict resolution system
- AI lead qualification flow with Claude Haiku
- WhatsApp Business API integration (360dialog)
- Google Business Profile API integration
- Monthly value report generation

### 2.2 Dashboard Foundation (100%)

**Config files:**
- `package.json` — Next.js 14, React 18, Tailwind, Recharts, Lucide, SWR, Zustand, Clerk
- `tsconfig.json` — TypeScript strict mode with path aliases
- `tailwind.config.ts` — Custom color system (primary: indigo #6366f1, accent: amber #f59e0b, success/warning/danger/info)
- `next.config.mjs` — API proxy to backend
- `postcss.config.mjs` — PostCSS for Tailwind
- `.env.example` — Environment variables template

**Types (`src/types/index.ts`):**
- 15+ TypeScript interfaces: Org, Lead, WhatsappMessage, GbpPost, GbpRanking, GbpCompetitor, Territory, MonthlyReport, NotificationLog, OnboardingEvent, AdminDashboard, FunnelStep, OrgHealth, UserJourneyEvent, UserJourneySession, DropOffPoint, WorkflowBottleneck, ClientNeed, WorkflowInsight

**API Client (`src/lib/api.ts`):**
- `ApiClient` class with static methods for all backend endpoints
- SWR hooks: useAdminDashboard, useOrgs, useOrgDetail, useLeads, useOnboardingFunnel, useWorkflowInsights, useOrgDashboard, useGbpPosts, useGbpRankings
- Fire-and-forget tracking endpoint

**Utilities (`src/lib/utils.ts`):**
- cn() — tailwind-merge + clsx
- formatCurrency, formatCurrencyFull, formatDate, formatDateTime, formatRelativeTime
- getHealthColor, getHealthBg, getHealthLabel
- getPlanColor, getStatusColor
- getInitials, getCategoryLabel, getBudgetLabel, getScopeLabel
- truncate, calculateChange

### 2.3 Shared UI Components (100%)

All in `src/components/ui/`:

| Component | File | Lines | Status |
|-----------|------|-------|--------|
| Card (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter) | card.tsx | ~200 | ✅ Complete |
| Badge (5 variants) | badge.tsx | ~35 | ✅ Complete |
| Button (5 variants, 3 sizes) | button.tsx | ~88 | ✅ Complete |
| Table (Table, TableHeader, TableBody, TableRow, TableHead, TableCell) | table.tsx | ~96 | ✅ Complete |
| Tabs (Tabs, TabsList, TabsTrigger, TabsContent) | tabs.tsx | ~134 | ✅ Complete |
| Progress (with variant colors) | progress.tsx | ~70 | ✅ Complete |
| Avatar (with initials fallback) | avatar.tsx | ~50 | ✅ Complete |
| Skeleton (loading placeholder) | skeleton.tsx | ~51 | ✅ Complete |
| EmptyState (icon + message + action) | empty-state.tsx | ~46 | ✅ Complete |
| StatCard (label + value + change + icon) | stat-card.tsx | ~67 | ✅ Complete |
| StatusBadge (dot + label) | status-badge.tsx | ~57 | ✅ Complete |

### 2.4 Admin Components (100%)

All in `src/components/admin/`:

| Component | File | Lines | Status |
|-----------|------|-------|--------|
| AdminSidebar (collapsible nav) | sidebar.tsx | ~70 | ✅ Complete |
| AdminHeader (search + notifications) | header.tsx | ~40 | ✅ Complete |
| FunnelChart (Recharts horizontal bar) | funnel-chart.tsx | ~143 | ✅ Complete |
| HealthScore (circular score + factors) | health-score.tsx | ~191 | ✅ Complete |
| JourneyTimeline (event timeline) | journey-timeline.tsx | ~186 | ✅ Complete |

### 2.5 Admin Pages (Partially Complete)

| Page | File | Status |
|------|------|--------|
| Admin Overview (`/admin`) | `app/admin/page.tsx` | ✅ Complete — stat cards, funnel chart, health pie, revenue trend, plan distribution, quick stats |
| Admin Clients List (`/admin/clients`) | `app/admin/clients/page.tsx` | ✅ Complete — table with filters, health, plan, status, MRR, leads |
| Admin Layout | `app/admin/layout.tsx` | ✅ Complete |

---

## 3. WHAT IS REMAINING

### 3.1 Admin Pages (6 pages needed)

#### 3.1.1 Client Detail Page (`/admin/clients/[id]/page.tsx`)
**Priority: CRITICAL**

This is the most important page. It shows everything about a single client.

**Layout:** Tabs with 6 sections:

**Tab 1: Overview**
- Org name, category, city, plan badge, status badge
- HealthScore component (circular score 0-100)
- Key metrics row: leads generated, conversion rate, revenue, GBP posts, reviews, MRR
- Onboarding progress bar (which step they're on)
- Quick actions: Send message, Pause account, Change plan

**Tab 2: Leads**
- Table of all leads for this org
- Columns: Name, Phone, Status, Budget, Scope, Source, Qualification Score, Created
- Filter by status (new, contacted, quoted, won, lost)
- Click row → expand to show conversation history (WhatsappMessage timeline)
- Lead status update buttons (mark as contacted/quoted/won/lost)

**Tab 3: GBP (Google Business Profile)**
- GBP connection status (connected/disconnected, last sync time)
- GBP insights: search views, maps views, website clicks, calls, direction requests (from GbpInsights table)
- Recent posts table: content, type, status, published_at, views, clicks
- Keyword rankings table: keyword, position, recorded_at (with trend arrow)
- Competitor list: name, distance, review_count, avg_rating, is_glamai_client flag

**Tab 4: Reports**
- List of monthly reports (most recent first)
- Each report card shows: period, leads_total, leads_won, conversion_rate, revenue, views, reviews
- Download PDF button
- Month-over-month comparison indicators (↑↓)

**Tab 5: Journey (User Journey Tracking)**
- Use the JourneyTimeline component
- Shows all UserJourneyEvent records for this org
- Grouped by session
- Event types: page_view, button_click, form_submit, api_call, error, lead_created, gbp_post, whatsapp_message
- Each event shows: timestamp, event type icon, description, page, metadata
- Filter by event type
- Session summary: pages visited, errors count, completed actions

**Tab 6: Territory**
- Territory details: city, category, radius, exclusivity, status
- Keyword niches assigned to this org
- Conflicting territories warning (if any)
- Map placeholder (Google Maps embed or static image)
- Button to modify territory

**Data fetching:**
```typescript
// Parallel data fetching
const [orgDetail, leads, gbpPosts, gbpRankings, reports, journeyEvents, territory] = await Promise.all([
  ApiClient.getOrgDetail(id),
  ApiClient.getLeads({ org_id: id }),
  ApiClient.getGbpPosts(id),
  ApiClient.getGbpRankings(id),
  ApiClient.getReports(id),
  ApiClient.getUserJourney(id),
  // territory from orgDetail or separate call
]);
```

#### 3.1.2 Onboarding Analytics Page (`/admin/onboarding/page.tsx`)
**Priority: HIGH**

Shows the onboarding funnel and helps identify stuck clients.

**Sections:**
1. **Funnel Chart** — Use FunnelChart component showing all steps
2. **Drop-off Analysis** — Table showing: step name, entered count, dropped off count, drop-off rate, avg time in step
3. **Stuck Clients List** — Clients who haven't progressed in 3+ days. Shows: name, current step, days stuck, last action, recommended action
4. **Time to Complete** — Stats: avg time to complete onboarding, median, p90
5. **Completion Rate Over Time** — Line chart showing weekly onboarding completion rate
6. **Common Drop-off Reasons** — Based on journey events: "GBP OAuth timeout", "WhatsApp verification failed", "Abandoned after signup"

#### 3.1.3 Territories Page (`/admin/territories/page.tsx`)
**Priority: MEDIUM**

**Sections:**
1. **Territory List** — Table: client name, city, category, radius, exclusivity, status, keyword count
2. **Conflict Warnings** — Alert banners for any overlapping exclusive territories
3. **Map View** — Placeholder for Google Maps with territory circles
4. **Keyword Niche Map** — For each territory, show which keywords are assigned to which clients

#### 3.1.4 Workflow Insights Page (`/admin/workflows/page.tsx`)
**Priority: HIGH**

This is the "intelligence" page that helps you understand where clients need help.

**Sections:**
1. **Drop-off Points** — Use DropOffPoint type. Show: step, drop-off count, rate, common reasons, affected clients count
2. **Workflow Bottlenecks** — Use WorkflowBottleneck type. Show: workflow name, avg time, p90 time, failure rate, affected orgs, recommendation
3. **Clients Needing Help** — Use ClientNeed type. Show: org name, issue type (stuck_onboarding, low_engagement, error_prone, territory_conflict, guarantee_at_risk, churn_risk), severity, description, recommendation, days since last activity
4. **AI Recommendations** — Generated insights like:
   - "3 clients stuck at GBP connection — consider simplifying OAuth flow"
   - "Client X hasn't logged in for 7 days — send re-engagement message"
   - "WhatsApp verification failing for 2 clients — check 360dialog API status"
   - "Client Y's guarantee is at risk — only 2 of 4 posts delivered this month"
5. **Overall Metrics** — Onboarding completion rate, avg time to active, active sessions in last 24h

#### 3.1.5 Admin Settings Page (`/admin/settings/page.tsx`)
**Priority: LOW**

- API key management (Clerk, Anthropic, Google, WhatsApp, Resend)
- Feature flags toggle (review_engine, reengagement, content_generator, multi_city, multi_vertical)
- Territory radius defaults per category
- Pricing configuration
- Notification preferences

#### 3.1.6 Root Page (`/app/page.tsx`)
**Priority: MEDIUM**

- Landing page that redirects based on Clerk role
- Admin role → `/admin`
- Client role → `/client`
- Unauthenticated → `/sign-in`

---

### 3.2 Client Dashboard Pages (5 pages needed)

#### 3.2.1 Client Layout (`/client/layout.tsx`)
**Priority: HIGH**

- Sidebar nav: Dashboard, Leads, GBP, Reports, Settings
- Header with org name, plan badge, notification bell
- Onboarding banner (if not complete): "Complete your setup — Step 2 of 4"

#### 3.2.2 Client Dashboard Home (`/client/page.tsx`)
**Priority: HIGH**

**Sections:**
1. **Onboarding Progress** — If not complete, show progress bar with steps
2. **Quick Stats** — Leads this month, conversion rate, revenue, GBP views
3. **Recent Leads** — Last 5 leads with status
4. **GBP Summary** — Connection status, last sync, views this month
5. **Latest Report** — Link to most recent monthly report

#### 3.2.3 Client Onboarding (`/client/onboarding/page.tsx`)
**Priority: HIGH**

Multi-step wizard with 4 steps:

**Step 1: Connect Google Business Profile**
- Explanation of why GBP matters
- "Connect GBP" button → opens OAuth flow
- Shows connected status after completion

**Step 2: Connect WhatsApp**
- Explanation of WhatsApp AI agent
- Phone number input
- Verification code entry
- Shows connected status

**Step 3: Set Territory**
- Address input with autocomplete
- Category selection
- Radius slider
- Exclusivity option (only for Enterprise)
- Map preview
- Conflict warning if applicable

**Step 4: Complete**
- Summary of what's set up
- "Go to Dashboard" button
- What to expect next

#### 3.2.4 Client Leads (`/client/leads/page.tsx`)
**Priority: HIGH**

- Lead list with filters (status, source)
- Lead card showing: name, phone, status, budget, scope, timeline, location, AI score
- Click to expand: full conversation history, AI summary, extracted data
- Status update buttons
- Search by name/phone

#### 3.2.5 Client GBP (`/client/gbp/page.tsx`)
**Priority: MEDIUM**

- GBP connection status
- Insights: views, clicks, calls, directions
- Recent posts with performance
- Keyword rankings with trend
- Competitor summary

#### 3.2.6 Client Reports (`/client/reports/page.tsx`)
**Priority: MEDIUM**

- Monthly report cards
- Period selector
- Key metrics per report
- Download PDF button
- Month-over-month comparison

#### 3.2.7 Client Settings (`/client/settings/page.tsx`)
**Priority: LOW**

- Plan and billing info
- Notification preferences
- Territory settings
- Connected accounts (GBP, WhatsApp)
- Danger zone: pause account, cancel

---

### 3.3 Global Pages

#### 3.3.1 Root Layout (`/app/layout.tsx`)
- ClerkProvider wrapper
- ThemeProvider (next-themes)
- Global styles import
- Inter font from Google Fonts

#### 3.3.2 Global Styles (`/app/globals.css`)
- Tailwind imports (@tailwind base/components/utilities)
- CSS variables for colors
- Custom utility classes

#### 3.3.3 Auth Pages (Clerk)
- `/sign-in` — Clerk SignIn component
- `/sign-up` — Clerk SignUp component
- Middleware for route protection

---

## 4. DATA FLOW

### Admin Dashboard
```
Browser → Next.js Page → SWR Hook → ApiClient → FastAPI Backend → PostgreSQL
                ↑                    ↓
                └── Cache (30s) ←────┘
```

### Client Dashboard
```
Browser → Next.js Page → SWR Hook → ApiClient → FastAPI Backend → PostgreSQL
                ↑                    ↓
                └── Cache (30s) ←────┘
```

### User Journey Tracking
```
Client Browser → ApiClient.trackEvent() → FastAPI /api/v1/track → PostgreSQL (user_journey_events)
                                                                    → Redis (real-time session store)
```

---

## 5. DESIGN SYSTEM

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Primary | #6366f1 | Buttons, links, active states |
| Accent | #f59e0b | Warnings, highlights |
| Success | #22c55e | Positive states, won leads |
| Warning | #f59e0b | Caution states |
| Danger | #ef4444 | Errors, lost leads, at-risk |
| Info | #3b82f6 | Informational |
| Background | #f8fafc | Page background |
| Card | #ffffff | Card backgrounds |
| Text | #0f172a | Primary text |
| Muted | #64748b | Secondary text |
| Border | #e2e8f0 | Borders |

### Typography
- Font: Inter (Google Fonts)
- Sizes: xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px)

### Spacing
- Card padding: 24px (p-6)
- Section gap: 24px (space-y-6)
- Component gap: 16px (gap-4)

### Border Radius
- Cards: 8px
- Buttons: 6px
- Badges: 4px (full for pill badges)

---

## 6. API ENDPOINTS USED

### Admin
- `GET /api/v1/admin/dashboard` — Overview metrics
- `GET /api/v1/admin/orgs` — List all orgs (with filters)
- `GET /api/v1/admin/orgs/{id}` — Org detail + health + events
- `GET /api/v1/admin/funnel` — Onboarding funnel data
- `GET /api/v1/admin/workflows/insights` — Workflow insights (needs backend implementation)

### Client
- `GET /api/v1/orgs/{id}` — Org details
- `GET /api/v1/orgs/{id}/dashboard` — Dashboard summary
- `GET /api/v1/leads/?org_id={id}` — Leads list
- `GET /api/v1/leads/{id}` — Lead detail + conversations
- `PATCH /api/v1/leads/{id}` — Update lead status
- `GET /api/v1/gbp/posts?org_id={id}` — GBP posts
- `GET /api/v1/gbp/rankings?org_id={id}` — Rankings
- `GET /api/v1/reports?org_id={id}` — Monthly reports
- `GET /api/v1/territory/check` — Conflict check
- `POST /api/v1/territory/claim` — Claim territory

### Tracking (needs backend implementation)
- `POST /api/v1/track` — Track user journey event
- `GET /api/v1/admin/orgs/{id}/journey` — Get journey events for org

---

## 7. BACKEND GAPS TO IMPLEMENT

These backend endpoints are referenced by the dashboard but don't exist yet:

1. **`GET /api/v1/admin/workflows/insights`** — Should analyze onboarding events, journey data, and org health to generate: drop-off points, bottlenecks, clients needing help, recommendations

2. **`POST /api/v1/track`** — Should accept UserJourneyEvent data and store it. Needs a new `user_journey_events` table:
   ```sql
   CREATE TABLE user_journey_events (
     id UUID PRIMARY KEY,
     org_id VARCHAR NOT NULL,
     session_id VARCHAR NOT NULL,
     event_type VARCHAR(50) NOT NULL,
     page VARCHAR(255),
     element VARCHAR(255),
     metadata JSONB,
     created_at TIMESTAMP DEFAULT NOW()
   );
   CREATE INDEX idx_journey_org ON user_journey_events(org_id);
   CREATE INDEX idx_journey_session ON user_journey_events(session_id);
   ```

3. **`GET /api/v1/admin/orgs/{id}/journey`** — Should return all journey events for an org, grouped by session

4. **`GET /api/v1/reports`** — Should support `org_id` query param to filter by org

5. **`GET /api/v1/notifications`** — Should support `org_id` query param

---

## 8. DEPLOYMENT

### Railway (Recommended)
- Backend: Railway service from `/home/ubuntu/glamai/` with Dockerfile
- Dashboard: Railway service from `/home/ubuntu/glamai/dashboard/` with Dockerfile
- Database: Railway PostgreSQL addon
- Redis: Railway Redis addon

### Environment Variables Needed
```
# Backend
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
APP_SECRET_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
WHATSAPP_360DIALOG_API_KEY=...
WHATSAPP_WEBHOOK_SECRET=...
GOOGLE_PLACES_API_KEY=...
RESEND_API_KEY=...

# Dashboard
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

---

## 9. FILE INVENTORY

### Files That Exist (27 files, ~3,900 lines)

```
dashboard/
├── .env.example
├── Dockerfile (needs creation)
├── Makefile (needs creation)
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── src/
    ├── app/
    │   ├── admin/
    │   │   ├── layout.tsx          ✅
    │   │   └── page.tsx            ✅ (overview)
    │   │   └── clients/
    │   │       └── page.tsx        ✅ (list)
    │   │       └── [id]/
    │   │           └── page.tsx    ❌ NEEDED
    │   ├── client/                 ❌ ALL NEEDED
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── onboarding/page.tsx
    │   │   ├── leads/page.tsx
    │   │   ├── gbp/page.tsx
    │   │   ├── reports/page.tsx
    │   │   └── settings/page.tsx
    │   ├── layout.tsx              ❌ NEEDED
    │   ├── page.tsx                ❌ NEEDED
    │   └── globals.css             ❌ NEEDED
    ├── components/
    │   ├── admin/
    │   │   ├── funnel-chart.tsx    ✅
    │   │   ├── header.tsx          ✅
    │   │   ├── health-score.tsx    ✅
    │   │   ├── journey-timeline.tsx ✅
    │   │   └── sidebar.tsx         ✅
    │   └── ui/
    │       ├── avatar.tsx          ✅
    │       ├── badge.tsx           ✅
    │       ├── button.tsx          ✅
    │       ├── card.tsx            ✅
    │       ├── empty-state.tsx     ✅
    │       ├── progress.tsx        ✅
    │       ├── skeleton.tsx        ✅
    │       ├── stat-card.tsx       ✅
    │       ├── status-badge.tsx    ✅
    │       ├── table.tsx           ✅
    │       └── tabs.tsx            ✅
    ├── lib/
    │   ├── api.ts                  ✅
    │   └── utils.ts                ✅
    └── types/
        └── index.ts                ✅
```

### Files That Need Creation (~25 files)

**Admin Pages (4):**
1. `src/app/admin/clients/[id]/page.tsx` — Client detail with 6 tabs
2. `src/app/admin/onboarding/page.tsx` — Onboarding analytics
3. `src/app/admin/territories/page.tsx` — Territory management
4. `src/app/admin/workflows/page.tsx` — Workflow insights

**Client Pages (6):**
5. `src/app/client/layout.tsx` — Client layout with sidebar
6. `src/app/client/page.tsx` — Client dashboard home
7. `src/app/client/onboarding/page.tsx` — Onboarding wizard
8. `src/app/client/leads/page.tsx` — Leads management
9. `src/app/client/gbp/page.tsx` — GBP status
10. `src/app/client/reports/page.tsx` — Reports viewer
11. `src/app/client/settings/page.tsx` — Settings

**Global Pages (3):**
12. `src/app/layout.tsx` — Root layout
13. `src/app/page.tsx` — Landing/redirect
14. `src/app/globals.css` — Global styles

**Client Components (5):**
15. `src/components/client/sidebar.tsx` — Client sidebar
16. `src/components/client/onboarding-wizard.tsx` — Wizard component
17. `src/components/client/lead-card.tsx` — Lead card
18. `src/components/client/gbp-status.tsx` — GBP status panel
19. `src/components/client/report-viewer.tsx` — Report viewer

**Admin Components (1):**
20. `src/components/admin/tenant-metrics.tsx` — Tenant-wise metrics table

**Config (3):**
21. `Dockerfile` — For Railway deployment
22. `Makefile` — Dev commands
23. `middleware.ts` — Clerk auth middleware

**Backend Gaps (3 new files):**
24. `src/api/v1/tracking.py` — Tracking endpoint
25. `src/api/v1/workflows.py` — Workflow insights endpoint
26. `src/models/tracking.py` — UserJourneyEvent model

---

## 10. ESTIMATED EFFORT

| Task | Complexity | Estimated Lines |
|------|-----------|----------------|
| Client Detail Page | High | ~400 |
| Onboarding Analytics | Medium | ~250 |
| Territories Page | Medium | ~200 |
| Workflow Insights | High | ~350 |
| Client Dashboard (6 pages) | High | ~800 |
| Client Components (5) | Medium | ~500 |
| Global Pages + Styles | Low | ~150 |
| Backend Gaps (3 endpoints + model) | Medium | ~300 |
| **TOTAL** | | **~2,950** |

---

## 11. EXECUTION ORDER FOR NEXT AGENT

1. **First:** Create the 3 missing backend endpoints (tracking, workflows, user_journey_events table)
2. **Second:** Create `src/app/layout.tsx` and `src/app/globals.css` and `src/app/page.tsx` (foundation)
3. **Third:** Create `src/app/admin/clients/[id]/page.tsx` (most important page)
4. **Fourth:** Create `src/app/admin/onboarding/page.tsx` and `src/app/admin/workflows/page.tsx`
5. **Fifth:** Create all 6 client dashboard pages + client layout + client components
6. **Sixth:** Create `src/app/admin/territories/page.tsx` and `src/app/admin/settings/page.tsx`
7. **Seventh:** Create Dockerfile, Makefile, middleware.ts
8. **Eighth:** Test, fix imports, ensure all components compile

---

## 12. IMPORTANT NOTES

- All component files use `"use client"` directive
- All imports use `@/` path alias
- The `card.tsx` file exports ALL UI components (Card, Badge, Button, Table, Tabs, Progress, Avatar, Skeleton, EmptyState, StatCard, StatusBadge) — this is the single import point
- The subagent wrote separate files for avatar, badge, button, etc. but the main card.tsx also contains them. The separate files may be duplicates — check before using.
- The health-score.tsx references `getHealthBgColor` which doesn't exist in utils.ts — needs to be added (similar to getHealthColor but returns bg classes)
- The journey-timeline.tsx references `UserJourneyEvent` type which has `session_id` and `description` fields — verify these match the types/index.ts definition
- The funnel-chart.tsx references `FunnelStep` with `label` and `conversion_pct` fields — verify these match types/index.ts (currently has `step`, `count`, `conversion_from_previous`)

# Dashboard Implementation Spec — Remaining Pages

## FILES TO CREATE

### 1. Client Detail Page
**Path:** `src/app/admin/clients/[id]/page.tsx`
**Lines:** ~400

```typescript
"use client";
import { useParams } from "next/navigation";
import { useOrgDetail, useLeads, useGbpPosts, useGbpRankings, useOrgDashboard } from "@/lib/api";
import { AdminHeader } from "@/components/admin/header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/card";
import { HealthScore } from "@/components/admin/health-score";
import { JourneyTimeline } from "@/components/admin/journey-timeline";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { formatCurrency, formatDate, formatRelativeTime, getPlanColor, getStatusColor, getCategoryLabel, getBudgetLabel, getScopeLabel, getHealthColor } from "@/lib/utils";
import { ArrowLeft, MessageSquare, Pause, Settings, TrendingUp, Users, IndianRupee, Eye, Star, MapPin, Phone, Mail, Globe } from "lucide-react";
import Link from "next/link";
```

**Structure:**
```
AdminLayout
  AdminHeader(title: "Client Details", subtitle: org.name)
  Back button → /admin/clients
  
  Tabs(defaultValue="overview")
    TabList
      TabTrigger("overview")    → "Overview"
      TabTrigger("leads")      → "Leads (N)"  
      TabTrigger("gbp")        → "GBP"
      TabTrigger("reports")    → "Reports"
      TabTrigger("journey")    → "Journey"
      TabTrigger("territory")  → "Territory"
    
    TabContent("overview")
      Row 1: HealthScore card (left) + Key metrics cards (right, 3x2 grid)
        Metric cards: Leads Generated, Conversion Rate, Revenue, MRR, Posts Delivered, Reviews
      Row 2: Onboarding progress (Progress component showing current step)
      Row 3: Quick actions: [Send Message] [Pause Account] [Change Plan]
      Row 4: Contact info card: email, phone, address, website, category, city
    
    TabContent("leads")
      Filter bar: status buttons [All] [New] [Contacted] [Quoted] [Won] [Lost]
      Search input
      Leads table:
        Columns: Name | Phone | Status | Budget | Scope | Source | Score | Created | Actions
        Row click → expandable row showing:
          - Lead details (timeline, property_type, property_size_sqft, location_area, notes)
          - Conversation history (WhatsappMessage list)
          - AI summary + extracted data
          - Action buttons: [Mark Contacted] [Mark Quoted] [Mark Won] [Mark Lost]
    
    TabContent("gbp")
      Row 1: GBP Status card (connected/disconnected, last_sync, place_id)
      Row 2: Insights grid (search_views, maps_views, clicks, calls, directions)
      Row 3: Recent posts table (content, type, status, published_at, views)
      Row 4: Rankings table (keyword, position with trend arrow, recorded_at)
      Row 5: Competitors table (name, distance, reviews, rating, is_glamai_client flag)
    
    TabContent("reports")
      Report cards grid (one per month):
        Period label, leads_total, leads_won, conversion_rate, revenue, views, reviews
        MoM change indicators (↑↓ percentage)
        Download PDF button
    
    TabContent("journey")
      Filter: event_type dropdown
      Session summary cards: total sessions, avg events per session, total errors
      JourneyTimeline component (all events for this org)
    
    TabContent("territory")
      Territory details card: city, category, radius, exclusivity, status
      Assigned keywords list
      Conflict warnings (if any)
      Map placeholder
      [Modify Territory] button

**Data fetching:**
```typescript
const { id } = useParams();
const { data: orgDetail } = useOrgDetail(id);
const { data: leads } = useLeads({ org_id: id });
const { data: gbpPosts } = useGbpPosts(id);
const { data: gbpRankings } = useGbpRankings(id);
const { data: dashboard } = useOrgDashboard(id);
// Reports: use SWR with /api/v1/reports?org_id={id}
// Journey: use SWR with /api/v1/admin/orgs/{id}/journey
```

---

### 2. Onboarding Analytics Page
**Path:** `src/app/admin/onboarding/page.tsx`
**Lines:** ~300

```typescript
"use client";
import { useOnboardingFunnel, useOrgs } from "@/lib/api";
import { AdminHeader } from "@/components/admin/header";
import { FunnelChart } from "@/components/admin/funnel-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { Progress } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/card";
import { AlertTriangle, Clock, TrendingDown, Users } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import type { Org } from "@/types";
```

**Structure:**
```
AdminLayout
  AdminHeader(title: "Onboarding Analytics", subtitle: "Track client onboarding progress")
  
  Row 1: Stat cards (4)
    [Total Signups] [Completed Onboarding] [Avg Time to Active] [Completion Rate %]
  
  Row 2: FunnelChart component (full width)
  
  Row 3: Two columns
    Left: Drop-off Analysis table
      Columns: Step | Entered | Dropped Off | Rate | Avg Time
      Each row shows a step in the funnel with drop-off metrics
    
    Right: Stuck Clients list
      Title: "Clients Stuck for 3+ Days"
      For each stuck client:
        Avatar + name, current step badge, days stuck, last action timestamp
        [Send Reminder] [View Details] buttons
  
  Row 4: Two columns
    Left: Time-to-Complete stats
      Avg: X days, Median: Y days, P90: Z days
      Distribution bar chart
    
    Right: Completion Rate Over Time
      Line chart (weekly completion rate for last 12 weeks)
  
  Row 5: Common Drop-off Reasons
    Card with list:
      - "GBP OAuth timeout" — 5 occurrences
      - "WhatsApp verification failed" — 3 occurrences  
      - "Abandoned after signup (no action in 24h)" — 8 occurrences
      - "Territory conflict detected" — 2 occurrences
```

**Stuck clients logic:**
Filter orgs where `onboarding_status` is NOT `active` or `onboarding_complete` AND `created_at` is more than 3 days ago. Sort by oldest first.

---

### 3. Territories Page
**Path:** `src/app/admin/territories/page.tsx`
**Lines:** ~200

Structure:
- Territory list table: Client | City | Category | Radius | Exclusivity | Keywords | Status
- Conflict warnings section (alert banners)
- Map placeholder (Gray box with "Map View — Coming Soon")

---

### 4. Workflow Insights Page
**Path:** `src/app/admin/workflows/page.tsx`
**Lines:** ~350

Structure:
```
AdminLayout
  AdminHeader(title: "Workflow Insights", subtitle: "AI-powered recommendations")

  Row 1: Overall metrics (4 stat cards)
    [Onboarding Completion Rate] [Avg Time to Active] [Active Sessions 24h] [Clients Needing Help]

  Row 2: Two columns
    Left: Drop-off Points
      Vertical bar chart: step name vs drop-off rate
      Each bar colored by severity (green < 30%, yellow 30-60%, red > 60%)
    
    Right: Workflow Bottlenecks
      Table: Workflow | Avg Time | P90 Time | Failure Rate | Orgs Affected
      Sorted by failure rate descending

  Row 3: Clients Needing Help (full width)
    Alert-style cards, one per client needing help:
      - Severity badge (critical/high/medium/low)
      - Client name + avatar
      - Issue type icon + description
      - Recommendation text
      - Days since last activity
      - [Take Action] button → links to client detail page

  Row 4: AI Recommendations
    Card with list of actionable insights:
      💡 "3 clients stuck at GBP connection — consider adding a video tutorial"
      💡 "Client X's guarantee is at risk — only 2/4 posts delivered"
      💡 "WhatsApp verification failing for new signups — check provider status"
      💡 "Territory conflict in Indiranagar — Client A and Client B both targeting 'interior designer Indiranagar'"
```

---

### 5. Client Dashboard Pages

#### 5.1 Client Layout
**Path:** `src/app/client/layout.tsx`
- Sidebar: Dashboard | Leads | GBP | Reports | Settings
- Header: Org name, plan badge, user avatar
- Onboarding banner (if not complete)

#### 5.2 Client Home
**Path:** `src/app/client/page.tsx`
- Onboarding progress (if incomplete)
- Quick stats: leads this month, conversion rate, revenue, GBP views
- Recent leads (last 5)
- GBP summary card

#### 5.3 Client Onboarding
**Path:** `src/app/client/onboarding/page.tsx`
- 4-step wizard with progress bar
- Step 1: GBP Connect (OAuth button)
- Step 2: WhatsApp Connect (phone input + verify)
- Step 3: Territory Set (address + radius slider)
- Step 4: Complete (summary + "Go to Dashboard")

#### 5.4 Client Leads
**Path:** `src/app/client/leads/page.tsx`
- Lead list with filters
- Lead cards with conversation preview
- Status update buttons

#### 5.5 Client GBP
**Path:** `src/app/client/gbp/page.tsx`
- Connection status
- Insights summary
- Recent posts
- Rankings

#### 5.6 Client Reports
**Path:** `src/app/client/reports/page.tsx`
- Monthly report cards
- Download PDF buttons

#### 5.7 Client Settings
**Path:** `src/app/client/settings/page.tsx`
- Plan info
- Notification preferences
- Connected accounts
- Danger zone

---

### 6. Global Pages

#### 6.1 Root Layout
**Path:** `src/app/layout.tsx`
```typescript
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "GlamAI — AI Marketing for Local Businesses",
  description: "Automated marketing for interior designers in India",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.className} bg-background text-foreground antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

#### 6.2 Global Styles
**Path:** `src/app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 248 250 252;
    --foreground: 15 23 42;
    --card: 255 255 255;
    --card-foreground: 15 23 42;
    --primary: 99 102 241;
    --primary-foreground: 255 255 255;
    --muted: 241 245 249;
    --muted-foreground: 100 116 139;
    --border: 226 232 240;
    --accent: 245 158 11;
    --success: 34 197 94;
    --warning: 245 158 11;
    --danger: 239 68 68;
    --info: 59 130 246;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

#### 6.3 Root Page
**Path:** `src/app/page.tsx`
```typescript
"use client";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/card";

export default function RootPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!user) {
      router.push("/sign-in");
      return;
    }
    // Check role from publicMetadata
    const role = user.publicMetadata?.role;
    if (role === "admin") {
      router.push("/admin");
    } else {
      router.push("/client");
    }
  }, [user, isLoaded, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <Skeleton className="h-8 w-32" />
    </div>
  );
}
```

---

## API CONTRACTS FOR BACKEND GAPS

### 1. User Journey Tracking

**Table:** `user_journey_events`
```sql
CREATE TABLE user_journey_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id VARCHAR(255) NOT NULL REFERENCES orgs(id),
  session_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  page VARCHAR(255),
  element VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_uje_org ON user_journey_events(org_id);
CREATE INDEX idx_uje_session ON user_journey_events(session_id);
CREATE INDEX idx_uje_type ON user_journey_events(event_type);
CREATE INDEX idx_uje_created ON user_journey_events(created_at);
```

**POST /api/v1/track**
```json
{
  "org_id": "uuid",
  "session_id": "sess_abc123",
  "event_type": "page_view",
  "page": "/client/leads",
  "element": "filter-button",
  "metadata": { "filter": "new" }
}
```
Response: 204 No Content

**GET /api/v1/admin/orgs/{id}/journey**
```json
{
  "data": [
    {
      "session_id": "sess_abc123",
      "events": [
        {
          "id": "uuid",
          "event_type": "page_view",
          "page": "/client/leads",
          "description": "Viewed leads page",
          "created_at": "2026-06-02T10:30:00Z"
        }
      ]
    }
  ]
}
```

### 2. Workflow Insights

**GET /api/v1/admin/workflows/insights**
```json
{
  "data": {
    "drop_offs": [
      {
        "step": "gbp_connected",
        "drop_off_count": 3,
        "drop_off_rate": 25.0,
        "common_reasons": ["OAuth timeout", "User cancelled"],
        "affected_orgs": ["org-1", "org-2", "org-3"]
      }
    ],
    "bottlenecks": [
      {
        "workflow": "gbp_oauth",
        "avg_time_minutes": 4.5,
        "p90_time_minutes": 12.0,
        "failure_rate": 15.0,
        "affected_orgs": 3,
        "recommendation": "Simplify GBP OAuth flow — add retry mechanism"
      }
    ],
    "clients_needing_help": [
      {
        "org_id": "org-1",
        "org_name": "Design Studio",
        "issue_type": "stuck_onboarding",
        "severity": "high",
        "description": "Stuck at GBP connection for 5 days",
        "recommendation": "Send a WhatsApp message with step-by-step GBP connect guide",
        "days_since_last_activity": 5
      }
    ],
    "overall_onboarding_rate": 68.5,
    "avg_time_to_active_hours": 72.0,
    "total_active_sessions_24h": 12
  }
}
```

---

## ESTIMATED LINES OF CODE REMAINING

| File | Estimated Lines |
|------|----------------|
| Client Detail Page | 400 |
| Onboarding Analytics | 300 |
| Territories Page | 200 |
| Workflow Insights | 350 |
| Client Layout | 80 |
| Client Home | 200 |
| Client Onboarding | 300 |
| Client Leads | 250 |
| Client GBP | 200 |
| Client Reports | 150 |
| Client Settings | 150 |
| Root Layout | 40 |
| Root Page | 30 |
| Sign-in/Sign-up | 60 |
| **TOTAL** | **~2,710** |

---

## IMPLEMENTATION ORDER

1. Root layout + globals.css + root page (foundation)
2. Sign-in/Sign-up pages (auth gate)
3. Client Detail Page (most complex, most important)
4. Client Dashboard pages (layout, home, onboarding, leads, gbp, reports, settings)
5. Onboarding Analytics Page
6. Workflow Insights Page
7. Territories Page
8. Admin Settings Page

---

## NOTES FOR THE IMPLEMENTING AGENT

1. **Check for duplicate UI components** — The subagent wrote both a combined card.tsx AND separate files (avatar.tsx, badge.tsx, etc.). Use the separate files if they have full implementations, otherwise use card.tsx exports.

2. **Fix type mismatches** — The subagent's funnel-chart.tsx uses `FunnelStep` with `label` and `conversion_pct` fields. The types/index.ts defines `FunnelStep` with `step`, `count`, `conversion_from_previous`. Reconcile these.

3. **Fix missing utility functions** — health-score.tsx references `getHealthBgColor` which doesn't exist in utils.ts. Add it.

4. **Add backend endpoints** — Implement the tracking and workflow insights endpoints listed in the API CONTRACTS section before building the frontend pages that depend on them.

5. **Use the ApiClient class** — All API calls should go through src/lib/api.ts. Add new methods there for tracking and workflow insights.

6. **Responsive design** — All pages must work on mobile. Use Tailwind responsive prefixes (sm:, md:, lg:).

7. **Loading states** — Every data-dependent component must have a loading skeleton state.

8. **Empty states** — Every list/table must have an empty state (use EmptyState component).

9. **Error handling** — Wrap data fetching in try/catch. Show user-friendly error messages.

10. **Use 'use client'** — All interactive components and pages must have the 'use client' directive.

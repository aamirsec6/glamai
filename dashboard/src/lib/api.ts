import useSWR, { SWRConfiguration } from "swr";
import type {
  AdminDashboard,
  ClientNeed,
  DropOffPoint,
  FunnelStep,
  GbpPost,
  GbpRanking,
  GbpCompetitor,
  Lead,
  MonthlyReport,
  NotificationLog,
  OnboardingEvent,
  Org,
  Territory,
  UserJourneySession,
  WhatsappMessage,
  WorkflowBottleneck,
  WorkflowInsight,
} from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getOrgHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const orgId =
      typeof window !== "undefined" ? localStorage.getItem("glamai_org_id") : "";
    if (orgId) headers["X-Org-Id"] = orgId;
  }
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET;
  if (adminSecret) headers["X-Admin-Secret"] = adminSecret;
  return headers;
}

const fetcher = async (url: string) => {
  const res = await fetch(`${API_BASE}${url}`, { headers: getOrgHeaders() });
  if (!res.ok) {
    const error = new Error("API request failed");
    (error as unknown as { status: number }).status = res.status;
    throw error;
  }
  return res.json();
};

// ── SWR Config ──
const swrConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateIfStale: true,
  dedupingInterval: 30000,
  refreshInterval: 60000,
};

// ── API Client Class ──

class ApiClient {
  // ── Orgs ──

  static async getOrgs(params?: {
    status?: string;
    plan?: string;
    city?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ data: Org[]; pagination: { page: number; page_size: number; total: number } }> {
    const search = new URLSearchParams();
    if (params?.status) search.set("status", params.status);
    if (params?.plan) search.set("plan", params.plan);
    if (params?.city) search.set("city", params.city);
    if (params?.page) search.set("page", String(params.page));
    if (params?.page_size) search.set("page_size", String(params.page_size));
    return fetcher(`/api/v1/admin/orgs?${search}`);
  }

  static async getOrg(id: string): Promise<{ data: Org }> {
    return fetcher(`/api/v1/orgs/${id}`);
  }

  static async getOrgDetail(id: string): Promise<{
    data: {
      org: Org;
      health_score: { score: number; label: string; reasons: string[] };
      stats?: {
        leads_total: number;
        leads_won: number;
        gbp_posts_total: number;
        gbp_posts_published: number;
        gbp_connected: boolean;
        whatsapp_connected: boolean;
        territory_claimed: boolean;
        last_gbp_sync: string | null;
        latest_insights_views: number | null;
      };
      onboarding_events: OnboardingEvent[];
    };
  }> {
    return fetcher(`/api/v1/admin/orgs/${id}`);
  }

  static async getOrgActivity(id: string): Promise<{
    data: {
      org_id: string;
      org_name: string;
      events: Array<{
        id: string;
        type: string;
        data: string | null;
        created_at: string;
      }>;
    };
  }> {
    return fetcher(`/api/v1/admin/orgs/${id}/activity`);
  }

  static async createOrg(data: Partial<Org>): Promise<{ data: Org }> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getOrgHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || "Failed to create organization");
    }
    return res.json();
  }

  static async updateOrg(id: string, data: Partial<Org>): Promise<{ data: Org }> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getOrgHeaders() },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static async getOrgDashboard(id: string): Promise<{
    data: {
      org: Org;
      leads: { total: number; by_status: Record<string, number>; recent: Lead[] };
      guarantee: { leads_generated: number; posts_delivered: number; reviews_collected: number };
      onboarding: { status: string; is_complete: boolean };
    };
  }> {
    return fetcher(`/api/v1/orgs/${id}/dashboard`);
  }

  // ── Leads ──

  static async getLeads(params: {
    org_id: string;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<{ data: Lead[]; pagination: { page: number; page_size: number; total: number; pages: number } }> {
    const search = new URLSearchParams({ org_id: params.org_id });
    if (params.status) search.set("status", params.status);
    if (params.page) search.set("page", String(params.page));
    if (params.page_size) search.set("page_size", String(params.page_size));
    return fetcher(`/api/v1/leads/?${search}`);
  }

  static async getLead(id: string, org_id: string): Promise<{
    data: Lead & { conversations: WhatsappMessage[] };
  }> {
    return fetcher(`/api/v1/leads/${id}?org_id=${org_id}`);
  }

  static async updateLead(
    id: string,
    data: Partial<Lead> & { org_id: string }
  ): Promise<{ data: Lead }> {
    const res = await fetch(`${API_BASE}/api/v1/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...getOrgHeaders() },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static async getGbpConnection(org_id: string): Promise<{
    data: { connected: boolean; place_id: string | null; gbp_name: string | null; last_synced_at: string | null };
  }> {
    return fetcher(`/api/v1/gbp/connection?org_id=${org_id}`);
  }

  static async getGbpInsights(org_id: string): Promise<{ data: Record<string, unknown> | null }> {
    return fetcher(`/api/v1/gbp/insights?org_id=${org_id}`);
  }

  static getGbpOAuthUrl(org_id: string): string {
    return `${API_BASE}/api/v1/gbp/oauth/start?org_id=${org_id}`;
  }

  // ── GBP ──

  static async getGbpPosts(org_id: string): Promise<{ data: GbpPost[] }> {
    return fetcher(`/api/v1/gbp/posts?org_id=${org_id}`);
  }

  static async getGbpRankings(org_id: string): Promise<{ data: GbpRanking[] }> {
    return fetcher(`/api/v1/gbp/rankings?org_id=${org_id}`);
  }

  static async getGbpCompetitors(org_id: string): Promise<{ data: GbpCompetitor[] }> {
    return fetcher(`/api/v1/gbp/competitors?org_id=${org_id}`);
  }

  // ── Members (Clerk) ──

  static async createMember(data: {
    clerk_user_id: string;
    org_id: string;
    role?: string;
    email?: string | null;
  }): Promise<{ data: { id: string; org_id: string | null; role: string } }> {
    const res = await fetch(`${API_BASE}/api/v1/members/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getOrgHeaders() },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      throw new Error("Failed to create member");
    }
    return res.json();
  }

  static async getMemberByClerk(clerk_user_id: string): Promise<{
    data: { org_id: string | null; role: string; email: string | null };
  }> {
    return fetcher(`/api/v1/members/by-clerk/${clerk_user_id}`);
  }

  static async createGbpPost(data: {
    org_id: string;
    content: string;
    title?: string;
    scheduled_at?: string;
  }): Promise<{ data: GbpPost }> {
    const res = await fetch(`${API_BASE}/api/v1/gbp/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getOrgHeaders() },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static async syncGbp(org_id: string, async = true): Promise<{ message: string; task_id?: string; data?: unknown }> {
    const res = await fetch(`${API_BASE}/api/v1/gbp/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getOrgHeaders() },
      body: JSON.stringify({ org_id, async }),
    });
    if (!res.ok) throw new Error("GBP sync failed");
    return res.json();
  }

  static async generateGbpPosts(org_id: string, async = true): Promise<{ message: string; task_id?: string }> {
    const res = await fetch(`${API_BASE}/api/v1/gbp/posts/generate?org_id=${org_id}&async=${async}`, {
      method: "POST",
      headers: getOrgHeaders(),
    });
    if (!res.ok) throw new Error("Post generation failed");
    return res.json();
  }

  static async publishGbpPost(post_id: string, org_id: string, async = true): Promise<{ message: string }> {
    const res = await fetch(
      `${API_BASE}/api/v1/gbp/posts/${post_id}/publish?org_id=${org_id}&async=${async}`,
      { method: "POST", headers: getOrgHeaders() }
    );
    if (!res.ok) throw new Error("Publish failed");
    return res.json();
  }

  static async getIntegrationHealth(org_id?: string): Promise<{
    data: Array<{ provider: string; status: string; message: string; last_error?: string }>;
  }> {
    const q = org_id ? `?org_id=${org_id}` : "";
    return fetcher(`/api/v1/integrations/health${q}`);
  }

  static async getAnalyticsSnapshot(org_id: string): Promise<{ data: Record<string, unknown> }> {
    return fetcher(`/api/v1/analytics/snapshot?org_id=${org_id}`);
  }

  static async generateReport(org_id: string, async = true): Promise<{ message: string; task_id?: string }> {
    const res = await fetch(`${API_BASE}/api/v1/reports/generate?org_id=${org_id}&async=${async}`, {
      method: "POST",
      headers: getOrgHeaders(),
    });
    if (!res.ok) throw new Error("Report generation failed");
    return res.json();
  }

  // ── Territory ──

  static async checkTerritory(org_id: string, lat: number, lng: number): Promise<{
    data: { has_conflict: boolean; conflicting_orgs: Org[]; resolution: string; message: string };
  }> {
    return fetcher(`/api/v1/territory/check?org_id=${org_id}&latitude=${lat}&longitude=${lng}`);
  }

  static async claimTerritory(data: {
    org_id: string;
    latitude: number;
    longitude: number;
    city: string;
    category: string;
    radius_km?: number;
    is_exclusive?: boolean;
  }): Promise<{ data: { territory: Territory; assigned_keywords: string[] } }> {
    const res = await fetch(`${API_BASE}/api/v1/territory/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // ── Admin ──

  static async getAdminDashboard(): Promise<{ data: AdminDashboard }> {
    return fetcher("/api/v1/admin/dashboard");
  }

  static async getOnboardingFunnel(): Promise<{ data: FunnelStep[] }> {
    return fetcher("/api/v1/admin/funnel");
  }

  // ── Reports ──

  static async getReports(org_id: string): Promise<{ data: MonthlyReport[] }> {
    return fetcher(`/api/v1/reports?org_id=${org_id}`);
  }

  // ── Notifications ──

  static async getNotifications(org_id: string): Promise<{ data: NotificationLog[] }> {
    return fetcher(`/api/v1/notifications?org_id=${org_id}`);
  }

  // ── User Journey (tracked client-side, stored via API) ──

  static async trackEvent(event: {
    org_id: string;
    session_id: string;
    event_type: string;
    page?: string;
    element?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    // Fire-and-forget tracking
    fetch(`${API_BASE}/api/v1/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    }).catch(() => {});
  }

  static async getUserJourney(org_id: string): Promise<{ data: UserJourneySession[] }> {
    return fetcher(`/api/v1/admin/orgs/${org_id}/journey`);
  }

  // ── Workflow Insights ──

  static async getWorkflowInsights(): Promise<{ data: WorkflowInsight }> {
    return fetcher("/api/v1/admin/workflows/insights");
  }
}

export default ApiClient;

// ── SWR Hooks ──

export function useAdminDashboard() {
  return useSWR("/api/v1/admin/dashboard", fetcher, swrConfig);
}

export function useOrgs(params?: Parameters<typeof ApiClient.getOrgs>[0]) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.plan) search.set("plan", params.plan);
  if (params?.city) search.set("city", params.city);
  return useSWR(`/api/v1/admin/orgs?${search}`, fetcher, swrConfig);
}

export function useOrgDetail(id: string) {
  return useSWR(id ? `/api/v1/admin/orgs/${id}` : null, fetcher, swrConfig);
}

export function useOrgActivity(id: string) {
  return useSWR(id ? `/api/v1/admin/orgs/${id}/activity` : null, fetcher, swrConfig);
}

export function useLeads(params: { org_id: string; status?: string }) {
  const search = new URLSearchParams({ org_id: params.org_id });
  if (params.status) search.set("status", params.status);
  return useSWR(`/api/v1/leads/?${search}`, fetcher, swrConfig);
}

export function useOnboardingFunnel() {
  return useSWR("/api/v1/admin/funnel", fetcher, swrConfig);
}

export function useWorkflowInsights() {
  return useSWR("/api/v1/admin/workflows/insights", fetcher, swrConfig);
}

export function useOrgDashboard(orgId: string) {
  return useSWR(orgId ? `/api/v1/orgs/${orgId}/dashboard` : null, fetcher, swrConfig);
}

export function useGbpPosts(orgId: string) {
  return useSWR(orgId ? `/api/v1/gbp/posts?org_id=${orgId}` : null, fetcher, swrConfig);
}

export function useGbpRankings(orgId: string) {
  return useSWR(orgId ? `/api/v1/gbp/rankings?org_id=${orgId}` : null, fetcher, swrConfig);
}

export function useGbpConnection(orgId: string) {
  return useSWR(orgId ? `/api/v1/gbp/connection?org_id=${orgId}` : null, fetcher, swrConfig);
}

export function useGbpInsights(orgId: string) {
  return useSWR(orgId ? `/api/v1/gbp/insights?org_id=${orgId}` : null, fetcher, swrConfig);
}

export function useGbpCompetitors(orgId: string) {
  return useSWR(orgId ? `/api/v1/gbp/competitors?org_id=${orgId}` : null, fetcher, swrConfig);
}

export function useReports(orgId: string) {
  return useSWR(orgId ? `/api/v1/reports?org_id=${orgId}` : null, fetcher, swrConfig);
}

export function useAnalyticsSnapshot(orgId: string) {
  return useSWR(orgId ? `/api/v1/analytics/snapshot?org_id=${orgId}` : null, fetcher, swrConfig);
}

export function useIntegrationHealth(orgId: string) {
  return useSWR(orgId ? `/api/v1/integrations/health?org_id=${orgId}` : null, fetcher, swrConfig);
}

export function useUserJourney(orgId: string) {
  return useSWR(orgId ? `/api/v1/admin/orgs/${orgId}/journey` : null, fetcher, swrConfig);
}

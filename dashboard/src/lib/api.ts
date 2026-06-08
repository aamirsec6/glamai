import useSWR, { SWRConfiguration } from "swr";
import type {
  AdminDashboard,
  ClientNeed,
  DropOffPoint,
  FunnelStep,
  GbpPost,
  GbpRanking,
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

const fetcher = async (url: string) => {
  const res = await fetch(`${API_BASE}${url}`);
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
      onboarding_events: OnboardingEvent[];
    };
  }> {
    return fetcher(`/api/v1/admin/orgs/${id}`);
  }

  static async createOrg(data: Partial<Org>): Promise<{ data: Org }> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  static async updateOrg(id: string, data: Partial<Org>): Promise<{ data: Org }> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
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

  static async getLead(id: string): Promise<{
    data: Lead & { conversations: WhatsappMessage[] };
  }> {
    return fetcher(`/api/v1/leads/${id}`);
  }

  static async updateLead(id: string, data: Partial<Lead>): Promise<{ data: Lead }> {
    const res = await fetch(`${API_BASE}/api/v1/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  }

  // ── GBP ──

  static async getGbpPosts(org_id: string): Promise<{ data: GbpPost[] }> {
    return fetcher(`/api/v1/gbp/posts?org_id=${org_id}`);
  }

  static async getGbpRankings(org_id: string): Promise<{ data: GbpRanking[] }> {
    return fetcher(`/api/v1/gbp/rankings?org_id=${org_id}`);
  }

  static async createGbpPost(data: Partial<GbpPost>): Promise<{ data: GbpPost }> {
    const res = await fetch(`${API_BASE}/api/v1/gbp/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
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

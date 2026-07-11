import type { Lead, OnboardingEvent, Org } from "@/types";
import { API_BASE, apiPost, fetcher, getOrgHeaders } from "./client";

export async function getOrgs(params?: {
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

export async function getOrg(id: string): Promise<{ data: Org }> {
  return fetcher(`/api/v1/orgs/${id}`);
}

export async function getOrgDetail(id: string): Promise<{
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

export async function getOrgActivity(id: string): Promise<{
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

export async function pauseOrg(id: string): Promise<{ data: { status: string; org: Org } }> {
  return apiPost(`/api/v1/admin/orgs/${id}/pause`, undefined, "Failed to pause account");
}

export async function resumeOrg(id: string): Promise<{ data: { status: string; org: Org } }> {
  return apiPost(`/api/v1/admin/orgs/${id}/resume`, undefined, "Failed to resume account");
}

export async function sendOrgMessage(
  id: string,
  message: string,
): Promise<{
  data: {
    status: string;
    sent: boolean;
    delivery_note: string;
    recipient: string;
  };
}> {
  return apiPost(`/api/v1/admin/orgs/${id}/message`, { message }, "Failed to send message");
}

export async function createOrg(data: Partial<Org>): Promise<{ data: Org }> {
  return apiPost("/api/v1/orgs/", data, "Failed to create organization");
}

export async function updateOrg(id: string, data: Partial<Org>): Promise<{ data: Org }> {
  const res = await fetch(`${API_BASE}/api/v1/orgs/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getOrgHeaders() },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getOrgDashboard(id: string): Promise<{
  data: {
    org: Org;
    leads: { total: number; by_status: Record<string, number>; recent: Lead[] };
    guarantee: { leads_generated: number; posts_delivered: number; reviews_collected: number };
    onboarding: { status: string; is_complete: boolean };
  };
}> {
  return fetcher(`/api/v1/orgs/${id}/dashboard`);
}

export async function createMember(data: {
  clerk_user_id: string;
  org_id: string;
  role?: string;
  email?: string | null;
}): Promise<{ data: { id: string; org_id: string | null; role: string } }> {
  return apiPost("/api/v1/members/", data, "Failed to create member");
}

export async function getMemberByClerk(clerk_user_id: string): Promise<{
  data: { org_id: string | null; role: string; email: string | null };
}> {
  return fetcher(`/api/v1/members/by-clerk/${clerk_user_id}`);
}

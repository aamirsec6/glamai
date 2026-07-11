import type { MonthlyReport, NotificationLog, Org, Territory } from "@/types";
import { API_BASE, apiPost, fetcher } from "./client";

export async function seedDemoAccount(reset = false): Promise<{
  org_id: string;
  client_url: string;
  ai_url: string;
}> {
  const res = await fetch(`${API_BASE}/api/v1/demo/seed?reset=${reset}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Demo seed failed");
  const json = await res.json();
  return {
    org_id: json.org_id,
    client_url: json.client_url,
    ai_url: json.ai_url,
  };
}

export async function generateReport(org_id: string, async = true): Promise<{ message: string; task_id?: string }> {
  return apiPost(
    `/api/v1/reports/generate?org_id=${org_id}&async=${async}`,
    undefined,
    "Report generation failed",
  );
}

export async function checkTerritory(org_id: string, lat: number, lng: number): Promise<{
  data: { has_conflict: boolean; conflicting_orgs: Org[]; resolution: string; message: string };
}> {
  return fetcher(`/api/v1/territory/check?org_id=${org_id}&latitude=${lat}&longitude=${lng}`);
}

export async function claimTerritory(data: {
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

export async function getReports(org_id: string): Promise<{ data: MonthlyReport[] }> {
  return fetcher(`/api/v1/reports?org_id=${org_id}`);
}

export async function getNotifications(org_id: string): Promise<{ data: NotificationLog[] }> {
  return fetcher(`/api/v1/notifications?org_id=${org_id}`);
}

export async function trackEvent(event: {
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

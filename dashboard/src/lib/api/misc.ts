import type { MonthlyReport, NotificationLog, Org, Territory } from "@/types";
import { apiPost, fetcher } from "./client";

export async function seedDemoAccount(reset = false): Promise<{
  org_id: string;
  client_url: string;
  ai_url: string;
}> {
  return apiPost(`/api/v1/demo/seed?reset=${reset}`, undefined, "Demo seed failed");
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
  address?: string;
}): Promise<{
  data: {
    territory: Territory;
    assigned_keywords: string[];
    conflict_info?: { has_conflict: boolean; message: string };
  };
}> {
  return apiPost("/api/v1/territory/claim", data, "Failed to claim territory");
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
  fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/track`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  }).catch(() => {});
}

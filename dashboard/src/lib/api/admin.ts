import type { AdminDashboard, FunnelStep, UserJourneySession, WorkflowInsight } from "@/types";
import { fetcher } from "./client";
import type { JourneyAnalyticsPayload, PilotStatusPayload } from "./types";

export async function getAdminIntelligence(): Promise<{ data: Record<string, unknown> }> {
  return fetcher("/api/v1/admin/intelligence");
}

export async function getAdminDashboard(): Promise<{ data: AdminDashboard }> {
  return fetcher("/api/v1/admin/dashboard");
}

export async function getOnboardingFunnel(): Promise<{ data: FunnelStep[] }> {
  return fetcher("/api/v1/admin/funnel");
}

export async function getJourneyAnalytics(periodDays = 90): Promise<{ data: JourneyAnalyticsPayload }> {
  return fetcher(`/api/v1/admin/journey-analytics?period_days=${periodDays}`);
}

export async function getWorkflowInsights(): Promise<{ data: WorkflowInsight }> {
  return fetcher("/api/v1/admin/workflows/insights");
}

export async function getPilotStatus(periodDays = 30): Promise<{ data: PilotStatusPayload }> {
  return fetcher(`/api/v1/admin/pilot-status?period_days=${periodDays}`);
}

export async function getUserJourney(org_id: string): Promise<{ data: UserJourneySession[] }> {
  return fetcher(`/api/v1/admin/orgs/${org_id}/journey`);
}

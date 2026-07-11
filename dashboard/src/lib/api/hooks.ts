import useSWR from "swr";
import { fetcher, swrConfig } from "./client";
import type { getOrgs } from "./orgs";

export function useAdminIntelligence() {
  return useSWR("/api/v1/admin/intelligence", fetcher, swrConfig);
}

export function useAdminDashboard() {
  return useSWR("/api/v1/admin/dashboard", fetcher, swrConfig);
}

export function useOrgs(params?: Parameters<typeof getOrgs>[0]) {
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

export function useJourneyAnalytics(periodDays = 90) {
  return useSWR(
    `/api/v1/admin/journey-analytics?period_days=${periodDays}`,
    fetcher,
    swrConfig,
  );
}

export function useWorkflowInsights() {
  return useSWR("/api/v1/admin/workflows/insights", fetcher, swrConfig);
}

export function useAdminPilotStatus(periodDays = 30) {
  return useSWR(
    `/api/v1/admin/pilot-status?period_days=${periodDays}`,
    fetcher,
    swrConfig,
  );
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

export function useAdvancedInsights(orgId: string, includeAi = false) {
  return useSWR(
    orgId
      ? `/api/v1/analytics/insights?org_id=${orgId}&include_ai_narrative=${includeAi}`
      : null,
    fetcher,
    swrConfig,
  );
}

export function useIntegrationHealth(orgId: string) {
  return useSWR(orgId ? `/api/v1/integrations/health?org_id=${orgId}` : null, fetcher, swrConfig);
}

export function useUserJourney(orgId: string) {
  return useSWR(orgId ? `/api/v1/admin/orgs/${orgId}/journey` : null, fetcher, swrConfig);
}

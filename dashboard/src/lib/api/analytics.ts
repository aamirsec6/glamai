import { apiPost, fetcher } from "./client";

export async function getIntegrationHealth(org_id?: string): Promise<{
  data: Array<{ provider: string; status: string; message: string; last_error?: string }>;
}> {
  const q = org_id ? `?org_id=${org_id}` : "";
  return fetcher(`/api/v1/integrations/health${q}`);
}

export async function getAnalyticsSnapshot(
  org_id: string,
  includeNarrative = false,
): Promise<{ data: Record<string, unknown> }> {
  return fetcher(
    `/api/v1/analytics/snapshot?org_id=${org_id}&include_narrative=${includeNarrative}`,
  );
}

export async function getAdvancedInsights(
  org_id: string,
  includeAiNarrative = false,
  periodDays = 30,
): Promise<{ data: Record<string, unknown> }> {
  return fetcher(
    `/api/v1/analytics/insights?org_id=${org_id}&period_days=${periodDays}&include_ai_narrative=${includeAiNarrative}`,
  );
}

/** Pull live GBP + competitor data, then return fresh snapshot + advanced insights. */
export async function syncLiveAnalysis(
  org_id: string,
  async_mode = false,
): Promise<{
  message?: string;
  task_id?: string;
  data?: {
    sync: Record<string, unknown>;
    snapshot: Record<string, unknown>;
    insights: Record<string, unknown>;
  };
}> {
  return apiPost("/api/v1/analytics/sync", { org_id, async_mode }, "Live analysis sync failed");
}

export async function runContentAgents(
  org_id: string,
  options?: {
    generate_posts?: boolean;
    post_count?: number;
    optimize_profile?: boolean;
    auto_reply_reviews?: boolean;
    include_analysis?: boolean;
    schedule_posts?: boolean;
  },
): Promise<{ data: Record<string, unknown> }> {
  return apiPost(
    "/api/v1/agents/content/run",
    {
      org_id,
      generate_posts: options?.generate_posts ?? true,
      post_count: options?.post_count ?? 4,
      optimize_profile: options?.optimize_profile ?? true,
      auto_reply_reviews: options?.auto_reply_reviews ?? true,
      include_analysis: options?.include_analysis ?? true,
      schedule_posts: options?.schedule_posts ?? true,
    },
    "Content agents failed",
  );
}

export async function runAnalysisAndContent(
  org_id: string,
  options?: {
    include_narrative?: boolean;
    generate_posts?: boolean;
    post_count?: number;
  },
): Promise<{ data: Record<string, unknown> }> {
  return runContentAgents(org_id, {
    include_analysis: options?.include_narrative ?? true,
    generate_posts: options?.generate_posts ?? true,
    post_count: options?.post_count ?? 4,
  });
}

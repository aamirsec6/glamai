import { apiPost, fetcher } from "./client";

export type SeoScorecard = {
  generated_at?: string;
  org_id?: string;
  org_name?: string;
  tracking_status?: string;
  summary?: {
    keywords_tracked?: number;
    in_top3?: number;
    avg_position?: number | null;
    progress_pct?: number;
    worst_keyword?: string | null;
    worst_position?: number | null;
  };
  keywords?: Array<{
    keyword: string;
    position: number | null;
    previous_position?: number | null;
    delta?: number | null;
    in_top3?: boolean;
    gap_to_top3?: number | null;
  }>;
  recommended_actions?: Array<{
    type: string;
    keyword?: string;
    reason?: string;
    priority?: string;
  }>;
  path_to_top3?: {
    target?: string;
    effort_guarantee?: boolean;
    rank_guarantee?: boolean;
    next_focus?: Record<string, unknown> | null;
  };
};

export async function getSeoScorecard(org_id: string): Promise<{ data: SeoScorecard }> {
  return fetcher(`/api/v1/agents/seo/scorecard?org_id=${org_id}`);
}

export async function runSeoAgent(
  org_id: string,
  options?: { execute_actions?: boolean },
): Promise<{ data: Record<string, unknown> }> {
  return apiPost(
    "/api/v1/agents/seo/run",
    { org_id, execute_actions: options?.execute_actions ?? true },
    "SEO agent failed",
  );
}

export async function runGeoAgent(org_id: string): Promise<{ data: Record<string, unknown> }> {
  return apiPost("/api/v1/agents/geo/run", { org_id }, "Geo agent failed");
}

export async function runGrowthAgents(
  org_id: string,
  options?: { execute_seo_actions?: boolean },
): Promise<{ data: Record<string, unknown> }> {
  return apiPost(
    "/api/v1/agents/growth/run",
    { org_id, execute_seo_actions: options?.execute_seo_actions ?? true },
    "Growth agents failed",
  );
}

export async function getLastGrowthRun(
  org_id: string,
): Promise<{ data: Record<string, unknown> | null; message?: string }> {
  return fetcher(`/api/v1/agents/growth/last-run?org_id=${org_id}`);
}

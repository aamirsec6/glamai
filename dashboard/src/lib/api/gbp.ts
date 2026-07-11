import type { GbpCompetitor, GbpPost, GbpRanking } from "@/types";
import { API_BASE, apiPost, fetcher, getOrgHeaders } from "./client";

export async function getGbpConnection(org_id: string): Promise<{
  data: { connected: boolean; place_id: string | null; gbp_name: string | null; last_synced_at: string | null };
}> {
  return fetcher(`/api/v1/gbp/connection?org_id=${org_id}`);
}

export async function getGbpInsights(org_id: string): Promise<{ data: Record<string, unknown> | null }> {
  return fetcher(`/api/v1/gbp/insights?org_id=${org_id}`);
}

export function getGbpOAuthUrl(org_id: string): string {
  return `${API_BASE}/api/v1/gbp/oauth/start?org_id=${org_id}`;
}

export async function getGbpPosts(org_id: string): Promise<{ data: GbpPost[] }> {
  return fetcher(`/api/v1/gbp/posts?org_id=${org_id}`);
}

export async function getGbpRankings(org_id: string): Promise<{ data: GbpRanking[] }> {
  return fetcher(`/api/v1/gbp/rankings?org_id=${org_id}`);
}

export async function getGbpCompetitors(org_id: string): Promise<{ data: GbpCompetitor[] }> {
  return fetcher(`/api/v1/gbp/competitors?org_id=${org_id}`);
}

export async function createGbpPost(data: {
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

export async function syncGbp(
  org_id: string,
  async = true,
): Promise<{ message: string; task_id?: string; data?: unknown }> {
  return apiPost("/api/v1/gbp/sync", { org_id, async }, "GBP sync failed");
}

export async function generateGbpPosts(org_id: string, async = true): Promise<{ message: string; task_id?: string }> {
  return apiPost(
    `/api/v1/gbp/posts/generate?org_id=${org_id}&async=${async}`,
    undefined,
    "Post generation failed",
  );
}

export async function generateImagePost(
  org_id: string,
  options?: {
    post_type?: string;
    keyword_target?: string;
    custom_context?: string;
  },
): Promise<{
  data: {
    post?: {
      title?: string;
      content?: string;
      image_url?: string;
      image_prompt?: string;
      keyword_target?: string;
    };
    posts_created?: number;
  };
}> {
  return apiPost(
    "/api/v1/gbp/posts/generate-image",
    {
      org_id,
      post_type: options?.post_type ?? "portfolio_showcase",
      keyword_target: options?.keyword_target,
      custom_context: options?.custom_context,
    },
    "Image post generation failed",
  );
}

export async function publishGbpPost(post_id: string, org_id: string, async = true): Promise<{ message: string }> {
  return apiPost(
    `/api/v1/gbp/posts/${post_id}/publish?org_id=${org_id}&async=${async}`,
    undefined,
    "Publish failed",
  );
}

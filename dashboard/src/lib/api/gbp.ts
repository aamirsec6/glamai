import type { GbpCompetitor, GbpPost, GbpRanking } from "@/types";
import { API_BASE, apiPost, fetcher, getOrgHeaders } from "./client";

export async function getGbpConnection(org_id: string): Promise<{
  data: {
    connected: boolean;
    place_id: string | null;
    gbp_name: string | null;
    gbp_status?: string | null;
    link_source?: "places" | "oauth" | null;
    last_synced_at: string | null;
    review_link?: string | null;
  };
}> {
  return fetcher(`/api/v1/gbp/connection?org_id=${org_id}`);
}

export async function getGbpLocations(org_id: string): Promise<{
  data: {
    status: string;
    selected: string | null;
    locations: Array<{
      name: string;
      title?: string;
      store_code?: string;
      address?: Record<string, unknown>;
    }>;
  };
}> {
  return fetcher(`/api/v1/gbp/locations?org_id=${org_id}`);
}

export async function selectGbpLocation(
  org_id: string,
  location_name: string,
): Promise<{ data: { place_id: string; gbp_name?: string } }> {
  return apiPost(
    "/api/v1/gbp/locations/select",
    { org_id, location_name },
    "Failed to select GBP location",
  );
}

export type PlacesSearchHit = {
  place_id: string;
  name: string;
  address?: string;
  rating?: number;
  review_count?: number;
  maps_uri?: string;
  phone?: string;
  website?: string;
};

export async function searchGbpPlaces(
  org_id: string,
  query?: string,
): Promise<{ data: { status: string; results: PlacesSearchHit[]; query?: string } }> {
  return apiPost(
    "/api/v1/gbp/places/search",
    { org_id, query },
    "Places search failed",
  );
}

export async function linkGbpPlace(
  org_id: string,
  place_id: string,
): Promise<{
  data: {
    status: string;
    place_id?: string;
    gbp_name?: string;
    rating?: number;
    review_count?: number;
    reviews_imported?: number;
    address?: string;
  };
  message?: string;
}> {
  return apiPost(
    "/api/v1/gbp/places/link",
    { org_id, place_id },
    "Failed to link Google business",
  );
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

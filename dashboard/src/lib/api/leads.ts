import type { Lead, WhatsappMessage } from "@/types";
import { API_BASE, fetcher, getOrgHeaders } from "./client";

export async function getLeads(params: {
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

export async function getLead(id: string, org_id: string): Promise<{
  data: Lead & { conversations: WhatsappMessage[] };
}> {
  return fetcher(`/api/v1/leads/${id}?org_id=${org_id}`);
}

export async function updateLead(
  id: string,
  data: Partial<Lead> & { org_id: string },
): Promise<{ data: Lead }> {
  const res = await fetch(`${API_BASE}/api/v1/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...getOrgHeaders() },
    body: JSON.stringify(data),
  });
  return res.json();
}

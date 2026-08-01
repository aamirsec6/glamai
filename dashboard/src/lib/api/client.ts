export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getOrgHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const orgId = localStorage.getItem("glamai_org_id");
    if (orgId) headers["X-Org-Id"] = orgId;
  }
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET;
  if (adminSecret) headers["X-Admin-Secret"] = adminSecret;
  return headers;
}

export const fetcher = async (url: string) => {
  const res = await fetch(`${API_BASE}${url}`, { headers: getOrgHeaders() });
  if (!res.ok) {
    const error = new Error("API request failed");
    (error as Error & { status: number }).status = res.status;
    throw error;
  }
  return res.json();
};

export async function apiPost<T>(
  path: string,
  body?: unknown,
  errorMessage = "Request failed",
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: body
      ? { "Content-Type": "application/json", ...getOrgHeaders() }
      : getOrgHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const parsed = await res.json().catch(() => ({}));
    const detail = (parsed as { detail?: string | Array<{ msg?: string }> }).detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail.map((d) => d.msg).filter(Boolean).join("; ")
          : errorMessage;
    throw new Error(message || errorMessage);
  }
  return res.json();
}

export const swrConfig = {
  revalidateOnFocus: true,
  revalidateIfStale: true,
  dedupingInterval: 30000,
  refreshInterval: 60000,
};

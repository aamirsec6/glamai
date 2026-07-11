"use client";

import * as React from "react";
import { isClerkEnabled } from "@/lib/auth-config";

const ORG_STORAGE_KEY = "glamai_org_id";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type OrgContextValue = {
  orgId: string | null;
  setOrgId: (id: string) => void;
  clearOrgId: () => void;
};

const OrgContext = React.createContext<OrgContextValue>({
  orgId: null,
  setOrgId: () => {},
  clearOrgId: () => {},
});

async function fetchDemoOrgId(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/demo/account`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.org_id ?? null;
  } catch {
    return null;
  }
}

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgId, setOrgIdState] = React.useState<string | null>(null);

  React.useEffect(() => {
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("org")
        : null;
    const fromStorage =
      typeof window !== "undefined" ? localStorage.getItem(ORG_STORAGE_KEY) : null;

    if (params) {
      localStorage.setItem(ORG_STORAGE_KEY, params);
      setOrgIdState(params);
      return;
    }

    if (fromStorage) {
      setOrgIdState(fromStorage);
      return;
    }

    if (!isClerkEnabled) {
      fetchDemoOrgId().then((id) => {
        if (id) {
          localStorage.setItem(ORG_STORAGE_KEY, id);
          setOrgIdState(id);
        }
      });
    }
  }, []);

  const setOrgId = React.useCallback((id: string) => {
    localStorage.setItem(ORG_STORAGE_KEY, id);
    setOrgIdState(id);
  }, []);

  const clearOrgId = React.useCallback(() => {
    localStorage.removeItem(ORG_STORAGE_KEY);
    setOrgIdState(null);
  }, []);

  return (
    <OrgContext.Provider value={{ orgId, setOrgId, clearOrgId }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrgId() {
  return React.useContext(OrgContext);
}

export function useRequiredOrgId(): string {
  const { orgId } = useOrgId();
  if (!orgId) {
    throw new Error("No org context — complete onboarding first");
  }
  return orgId;
}

"use client";

import * as React from "react";

const ORG_STORAGE_KEY = "glamai_org_id";

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

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgId, setOrgIdState] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fromStorage =
      typeof window !== "undefined" ? localStorage.getItem(ORG_STORAGE_KEY) : null;
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("org")
        : null;
    setOrgIdState(params || fromStorage || null);
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

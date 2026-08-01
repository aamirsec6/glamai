"use client";

import * as React from "react";

const ORG_STORAGE_KEY = "glamai_org_id";

type OrgContextValue = {
  orgId: string | null;
  isReady: boolean;
  setOrgId: (id: string) => void;
  clearOrgId: () => void;
};

const OrgContext = React.createContext<OrgContextValue>({
  orgId: null,
  isReady: false,
  setOrgId: () => {},
  clearOrgId: () => {},
});

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [orgId, setOrgIdState] = React.useState<string | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("org");
    const fromStorage = localStorage.getItem(ORG_STORAGE_KEY);

    if (fromUrl) {
      localStorage.setItem(ORG_STORAGE_KEY, fromUrl);
      setOrgIdState(fromUrl);
      setIsReady(true);
      return;
    }

    // Do not auto-load seeded demo — onboard the real client's GBP org.
    if (fromStorage) {
      setOrgIdState(fromStorage);
    }

    setIsReady(true);
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
    <OrgContext.Provider value={{ orgId, isReady, setOrgId, clearOrgId }}>
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
    throw new Error("Organization ID required");
  }
  return orgId;
}

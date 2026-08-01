"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import ApiClient from "@/lib/api";
import { useOrgId } from "@/lib/org-context";
import { isClerkEnabled } from "@/lib/auth-config";

const ORG_STORAGE_KEY = "glamai_org_id";

export function OrgClerkSync({ children }: { children: React.ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { setOrgId } = useOrgId();
  const router = useRouter();
  const pathname = usePathname();
  const [resolved, setResolved] = React.useState(false);

  React.useEffect(() => {
    if (!isClerkEnabled) {
      setResolved(true);
      return;
    }
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      setResolved(true);
      return;
    }

    const role = user.publicMetadata?.role as string | undefined;
    if (role === "admin") {
      setResolved(true);
      return;
    }

    let cancelled = false;

    const applyOrgs = (orgs: Array<{ id: string }>) => {
      if (cancelled) return;
      if (orgs.length === 0) {
        if (pathname.startsWith("/client") && pathname !== "/client/onboarding") {
          router.replace("/client/onboarding");
        }
        return;
      }
      const stored =
        typeof window !== "undefined" ? localStorage.getItem(ORG_STORAGE_KEY) : null;
      const match = stored && orgs.find((o) => o.id === stored);
      setOrgId(match ? match.id : orgs[0].id);
    };

    ApiClient.listMyOrgs(user.id)
      .then((res) => applyOrgs(res.data ?? []))
      .catch(() =>
        ApiClient.getMemberByClerk(user.id)
          .then((res) => {
            if (res.data?.org_id) applyOrgs([{ id: res.data.org_id }]);
            else applyOrgs([]);
          })
          .catch(() => applyOrgs([])),
      )
      .finally(() => {
        if (!cancelled) setResolved(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, setOrgId, pathname, router]);

  if (isClerkEnabled && !resolved) {
    return null;
  }

  return <>{children}</>;
}

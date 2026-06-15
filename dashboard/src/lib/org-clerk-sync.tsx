"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import ApiClient from "@/lib/api";
import { useOrgId } from "@/lib/org-context";
import { isClerkEnabled } from "@/lib/auth-config";

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

    ApiClient.getMemberByClerk(user.id)
      .then((res) => {
        if (res.data?.org_id) {
          setOrgId(res.data.org_id);
        } else if (
          pathname.startsWith("/client") &&
          pathname !== "/client/onboarding"
        ) {
          router.replace("/client/onboarding");
        }
      })
      .catch(() => {
        if (
          pathname.startsWith("/client") &&
          pathname !== "/client/onboarding"
        ) {
          router.replace("/client/onboarding");
        }
      })
      .finally(() => setResolved(true));
  }, [isLoaded, isSignedIn, user, setOrgId, pathname, router]);

  if (isClerkEnabled && !resolved) {
    return null;
  }

  return <>{children}</>;
}

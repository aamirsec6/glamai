"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { isClerkEnabled } from "@/lib/auth-config";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    if (!isClerkEnabled) return;
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    const role = user?.publicMetadata?.role as string | undefined;
    if (role !== "admin") {
      router.replace("/client");
    }
  }, [isLoaded, isSignedIn, user, router]);

  if (isClerkEnabled && (!isLoaded || !isSignedIn)) {
    return null;
  }

  return <>{children}</>;
}

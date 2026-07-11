"use client";

import * as React from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { isClerkEnabled } from "@/lib/auth-config";

export function ClientAuthGuard({ children }: { children: React.ReactNode }) {
  if (!isClerkEnabled) {
    return <>{children}</>;
  }
  return <ClerkClientAuthGuard>{children}</ClerkClientAuthGuard>;
}

function ClerkClientAuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  React.useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return <>{children}</>;
}

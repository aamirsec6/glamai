"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/auth-config";
import { LandingPage } from "@/components/landing/landing-page";

function SignedInRedirect() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const role = user?.publicMetadata?.role as string | undefined;
    router.replace(role === "admin" ? "/admin" : "/client");
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-white">
      <div className="text-center">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        <p className="text-sm text-slate-500">Taking you to your dashboard...</p>
      </div>
    </div>
  );
}

function ClerkLandingGate() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (isSignedIn) {
    return <SignedInRedirect />;
  }

  return <LandingPage />;
}

export default function RootPage() {
  if (!isClerkEnabled) {
    return <LandingPage />;
  }

  return <ClerkLandingGate />;
}

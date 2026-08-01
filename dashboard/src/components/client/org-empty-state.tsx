"use client";

import * as React from "react";
import Link from "next/link";
import { Building2, Loader2, Sparkles } from "lucide-react";
import ApiClient from "@/lib/api";
import { useOrgId } from "@/lib/org-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type OrgEmptyStateProps = {
  title?: string;
  description?: string;
  showDemo?: boolean;
};

export function OrgEmptyState({
  title = "Connect your business",
  description = "Create your client account and connect their Google Business Profile to continue.",
  showDemo = false,
}: OrgEmptyStateProps) {
  const { setOrgId } = useOrgId();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ApiClient.seedDemoAccount(false);
      setOrgId(result.org_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load demo account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-lg">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="rounded-full bg-primary/10 p-4">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/client/onboarding">
            <Button>Start onboarding</Button>
          </Link>
          {showDemo && (
            <Button variant="outline" onClick={handleDemo} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading demo…
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Load demo account
                </>
              )}
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { AgentCommandCenter } from "@/components/client/agent-command-center";
import { ClientPageHeader } from "@/components/client/page-header";
import { OrgEmptyState } from "@/components/client/org-empty-state";
import { useOrgDashboard } from "@/lib/api";
import { useOrgId } from "@/lib/org-context";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

export default function ClientAgentsPage() {
  const { orgId, isReady } = useOrgId();
  const { data: dashboard, isLoading } = useOrgDashboard(orgId || "");

  const d = dashboard?.data;
  const onboardingComplete = d?.onboarding?.is_complete;
  const leadsTotal = d?.leads?.total ?? 0;
  const gbpConnected = d?.gbp?.connected ?? !!d?.org?.gbp_place_id;

  if (!isReady || isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="py-8">
        <OrgEmptyState
          title="Agent command center"
          description="Connect a business to see Scout, Sage, Spark, Maya, Ruby, and Cleo."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ClientPageHeader
        title="Agents"
        description="See what each specialist did last — and run the full growth cast."
      />

      <AgentCommandCenter
        orgId={orgId}
        leadsTotal={leadsTotal}
        gbpConnected={gbpConnected}
        onboardingComplete={!!onboardingComplete}
        showFooterLink={false}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            href: "/client/growth",
            title: "Rankings",
            desc: "Path to Top 3 scorecard (Sage)",
          },
          {
            href: "/client/leads",
            title: "Leads",
            desc: "WhatsApp qualification (Maya)",
          },
          {
            href: "/client/insights",
            title: "Insights",
            desc: "Funnel & next actions (Cleo)",
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-14 items-center justify-between rounded-2xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
          >
            <div>
              <p className="font-medium text-foreground">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}

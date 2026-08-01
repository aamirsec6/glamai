"use client";

import * as React from "react";
import Link from "next/link";
import ApiClient, { useOrgDashboard, useReports, useAnalyticsSnapshot } from "@/lib/api";
import { useOrgId } from "@/lib/org-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientPageHeader } from "@/components/client/page-header";
import { AlertBanner } from "@/components/client/alert-banner";
import { OrgEmptyState } from "@/components/client/org-empty-state";
import { AgentCommandCenter } from "@/components/client/agent-command-center";
import { formatCurrency, formatRelativeTime, getHealthLabel } from "@/lib/utils";
import type { Lead } from "@/types";
import {
  Users, TrendingUp, Eye, FileText, MapPin,
  ArrowRight, RefreshCw, Target,
} from "lucide-react";

export default function ClientDashboardPage() {
  const { orgId, isReady } = useOrgId();
  const { data: dashboard, isLoading, mutate } = useOrgDashboard(orgId || "");
  const { data: reportsData } = useReports(orgId || "");
  const { data: analyticsData } = useAnalyticsSnapshot(orgId || "");

  const [syncing, setSyncing] = React.useState(false);
  const [runningGrowth, setRunningGrowth] = React.useState(false);
  const [banner, setBanner] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  const d = dashboard?.data;
  const org = d?.org;
  const onboardingComplete = d?.onboarding?.is_complete;

  const recentLeads: Lead[] = d?.leads?.recent ?? [];
  const leadsByStatus = d?.leads?.by_status ?? {};
  const totalLeads = d?.leads?.total ?? 0;
  const wonLeads = leadsByStatus["won"] ?? 0;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const latestReport = reportsData?.data?.[0];
  const revenue =
    latestReport?.total_estimated_revenue_inr ??
    recentLeads.filter((l) => l.status === "won").reduce((sum, l) => sum + (l.won_value_inr ?? 0), 0);

  type AnalyticsPayload = {
    snapshot?: {
      gbp_total_views?: number;
      gbp_website_clicks?: number;
      gbp_calls?: number;
      gbp_direction_requests?: number;
      leads_total?: number;
      last_synced_at?: string | null;
    };
    scores?: { overall?: number; lead_generation?: number; gbp_visibility?: number };
    recommendations?: string[];
  };
  const analytics = analyticsData?.data as AnalyticsPayload | undefined;
  const snapshot = analytics?.snapshot;
  const gbpFromDashboard = d?.gbp;
  const gbpConnected = gbpFromDashboard?.connected ?? !!org?.gbp_place_id;
  const overallScore = d?.analytics?.scores?.overall ?? analytics?.scores?.overall;
  const gbpViews =
    gbpFromDashboard?.total_views != null && gbpFromDashboard.total_views > 0
      ? gbpFromDashboard.total_views.toLocaleString()
      : snapshot?.gbp_total_views
        ? snapshot.gbp_total_views.toLocaleString()
        : "—";
  const leadsTotal = d?.leads?.total ?? snapshot?.leads_total ?? totalLeads;
  const lastSynced = gbpFromDashboard?.last_synced_at ?? snapshot?.last_synced_at ?? org?.gbp_last_synced_at;
  const topRecommendation = (d?.analytics?.recommendations ?? analytics?.recommendations ?? [])[0];

  const handleSyncGbp = async () => {
    if (!orgId) return;
    setSyncing(true);
    setBanner(null);
    try {
      await ApiClient.syncGbp(orgId, false);
      setBanner({ type: "success", text: "Google Profile synced successfully." });
      await mutate();
    } catch (e) {
      setBanner({ type: "error", text: e instanceof Error ? e.message : "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const handleRunGrowth = async () => {
    if (!orgId) return;
    setRunningGrowth(true);
    setBanner(null);
    try {
      await ApiClient.runGrowthAgents(orgId);
      setBanner({ type: "success", text: "Growth agents finished — check Marketing for rankings." });
      await mutate();
    } catch (e) {
      setBanner({ type: "error", text: e instanceof Error ? e.message : "Growth agents failed" });
    } finally {
      setRunningGrowth(false);
    }
  };

  if (!isReady) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="py-8">
        <OrgEmptyState />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <ClientPageHeader
        title={`Welcome${org?.name ? `, ${org.name.split(" ")[0]}` : ""}`}
        description="Your AI team and business pulse — in one place."
      />

      {banner && (
        <AlertBanner variant={banner.type} message={banner.text} onDismiss={() => setBanner(null)} />
      )}

      {/* What to do next — first for easy mobile use */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">What to do next</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleRunGrowth}
            disabled={runningGrowth || !onboardingComplete}
            className="flex min-h-14 items-start gap-4 rounded-xl border border-border p-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
          >
            <div className="rounded-lg bg-foreground p-2 text-background">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-foreground">Run growth agents</p>
              <p className="text-sm text-muted-foreground">Improve rankings and publish content</p>
            </div>
          </button>
          <button
            type="button"
            onClick={handleSyncGbp}
            disabled={!gbpConnected || syncing}
            className="flex min-h-14 items-start gap-4 rounded-xl border border-border p-4 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
          >
            <div className="rounded-lg bg-muted p-2 text-foreground">
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            </div>
            <div>
              <p className="font-medium text-foreground">Sync Google Profile</p>
              <p className="text-sm text-muted-foreground">
                {gbpConnected && lastSynced
                  ? `Last synced ${formatRelativeTime(lastSynced)}`
                  : "Pull latest views and reviews"}
              </p>
            </div>
          </button>
        </div>
        {topRecommendation && (
          <p className="mt-4 rounded-xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Tip:</span> {topRecommendation}
          </p>
        )}
      </div>

      <AgentCommandCenter
        orgId={orgId}
        leadsTotal={leadsTotal}
        gbpConnected={gbpConnected}
        onboardingComplete={!!onboardingComplete}
        compact
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Leads", value: String(leadsTotal), sub: `${conversionRate}% win rate`, icon: Users },
          { label: "Google views", value: gbpViews, sub: gbpConnected ? "This month" : "Connect profile", icon: Eye },
          {
            label: "Health score",
            value: overallScore != null ? String(Math.round(overallScore)) : "—",
            sub: overallScore != null ? getHealthLabel(overallScore) : "Run agents to score",
            icon: TrendingUp,
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-foreground">Recent leads</h2>
              <p className="text-sm text-muted-foreground">Latest inquiries</p>
            </div>
            <Link href="/client/leads">
              <Button variant="ghost" size="sm" className="min-h-10 rounded-full">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="p-4 sm:p-6">
            {recentLeads.length === 0 ? (
              <EmptyState
                icon={<Users className="h-8 w-8" />}
                title="No leads yet"
                description="Complete setup and run growth agents to start attracting customers."
              />
            ) : (
              <div className="space-y-2">
                {recentLeads.slice(0, 5).map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/client/leads/${lead.id}`}
                    className="flex min-h-14 items-center justify-between rounded-xl border border-border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{lead.contact_name}</p>
                      <p className="text-xs text-muted-foreground">{lead.contact_phone}</p>
                    </div>
                    <div className="ml-3 flex items-center gap-2">
                      <StatusBadge status={lead.status} />
                      <span className="hidden whitespace-nowrap text-xs text-muted-foreground sm:inline">
                        {formatRelativeTime(lead.created_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-border px-4 py-4 sm:px-6">
            <h2 className="font-semibold text-foreground">At a glance</h2>
            <p className="text-sm text-muted-foreground">Revenue and Google Profile</p>
          </div>
          <div className="space-y-4 p-4 sm:p-6">
            <div className="flex items-center justify-between rounded-xl bg-muted/60 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Estimated revenue</p>
                <p className="text-xl font-semibold text-foreground">{formatCurrency(revenue)}</p>
              </div>
              <Badge variant={gbpConnected ? "default" : "outline"} className="rounded-full">
                {gbpConnected ? "GBP connected" : "GBP not connected"}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Clicks", value: gbpFromDashboard?.website_clicks ?? snapshot?.gbp_website_clicks },
                { label: "Calls", value: gbpFromDashboard?.calls ?? snapshot?.gbp_calls },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-border p-3 text-center">
                  <p className="text-lg font-semibold text-foreground">
                    {value != null && value > 0 ? value.toLocaleString() : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Link href="/client/marketing" className="flex-1">
                <Button variant="outline" size="sm" className="min-h-11 w-full rounded-full">
                  <MapPin className="mr-2 h-4 w-4" /> Marketing
                </Button>
              </Link>
              <Link href="/client/reports" className="flex-1">
                <Button variant="outline" size="sm" className="min-h-11 w-full rounded-full">
                  <FileText className="mr-2 h-4 w-4" /> Reports
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

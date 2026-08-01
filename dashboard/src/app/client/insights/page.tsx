"use client";

import * as React from "react";
import Link from "next/link";
import ApiClient, { useAdvancedInsights, useGbpConnection } from "@/lib/api";
import { useOrgId } from "@/lib/org-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import { ClientPageHeader } from "@/components/client/page-header";
import {
  TrendingUp,
  Users,
  MapPin,
  Target,
  LineChart,
  Search,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

type InsightsData = {
  business_health_score?: number;
  executive_summary?: string[];
  ai_narrative?: string;
  lead_funnel?: {
    stages?: Array<{ stage: string; count: number; conversion_from_previous_pct?: number }>;
    overall_win_rate_pct?: number;
    pipeline_value_inr?: number;
    qualified_leads?: number;
    drop_off_stage?: string;
    health_score?: number;
    source_attribution?: Record<string, { total: number; won: number; win_rate_pct: number }>;
  };
  gbp_performance?: {
    engagement_rate_pct?: number;
    views_trend_pct?: number;
    content_cadence_score?: number;
    health_score?: number;
  };
  competitive?: {
    competitive_position?: string;
    your_rating?: number;
    competitor_avg_rating?: number;
    keywords_top3?: number;
    health_score?: number;
  };
  forecast?: {
    projected_leads_next_30d?: number;
    projected_revenue_inr?: number;
    projected_gbp_views?: number;
    confidence?: string;
    growth_rate_pct?: number;
  };
  seo_health?: {
    visibility_index?: number;
    avg_position?: number;
    keyword_gaps?: string[];
    health_score?: number;
  };
  opportunities?: Array<{
    id: string;
    title: string;
    category: string;
    impact_score: number;
    effort: string;
    expected_lift: string;
    rationale: string;
  }>;
};

export default function ClientInsightsPage() {
  const { orgId } = useOrgId();
  const [withAi, setWithAi] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [syncError, setSyncError] = React.useState("");
  const { data, isLoading, mutate } = useAdvancedInsights(orgId || "", withAi);
  const { data: connectionData, mutate: mutateConnection } = useGbpConnection(orgId || "");
  const insights = data?.data as InsightsData | undefined;

  const connected = connectionData?.data?.connected ?? false;
  const lastSynced = connectionData?.data?.last_synced_at;
  const hasLiveData =
    (insights?.business_health_score ?? 0) > 0 ||
    (insights?.lead_funnel?.stages?.some((s) => s.count > 0) ?? false) ||
    (insights?.gbp_performance?.health_score ?? 0) > 0;

  const handleSyncLive = async () => {
    if (!orgId) return;
    setSyncing(true);
    setSyncError("");
    try {
      await ApiClient.syncLiveAnalysis(orgId, false);
      await mutate();
      await mutateConnection();
    } catch {
      setSyncError("Sync failed — check GBP connection and API logs.");
    } finally {
      setSyncing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (withAi) {
        await ApiClient.getAdvancedInsights(orgId || "", true);
      }
      await mutate();
    } finally {
      setRefreshing(false);
    }
  };

  if (!orgId) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect a real business profile to run live analysis.
        </p>
        <Link href="/client/onboarding">
          <Button size="sm">Start onboarding</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ClientPageHeader
        title="Business Insights"
        description={
          connected && lastSynced
            ? `Live analysis from your GBP data, leads, and competitors. Last synced ${formatRelativeTime(lastSynced)}.`
            : "Live analysis from your GBP data, leads, and competitors."
        }
        actions={
          <>
            <Button
              size="sm"
              onClick={handleSyncLive}
              disabled={syncing || !connected}
              className="min-h-11"
              title={connected ? "Pull latest GBP data and refresh models" : "Connect GBP first"}
            >
              {syncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync live data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWithAi((v) => !v)}
              className="min-h-11"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {withAi ? "AI narrative on" : "AI narrative off"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="min-h-11">
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </>
        }
      />

      {syncError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive">
          {syncError}
        </p>
      )}

      {!connected && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">GBP not connected</p>
              <p className="text-sm text-muted-foreground">
                Connect Google Business Profile to pull real views, calls, and competitor data.
              </p>
            </div>
            <Link href="/client/onboarding">
              <Button size="sm">Connect GBP</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {connected && !hasLiveData && !isLoading && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">No live metrics yet</p>
              <p className="text-sm text-muted-foreground">
                Run a sync after connecting GBP. Add WhatsApp leads for funnel analysis.
              </p>
            </div>
            <Button size="sm" onClick={handleSyncLive} disabled={syncing}>
              {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Sync now
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <HealthCard
              label="Business Health"
              value={insights?.business_health_score}
              icon={<Target className="h-5 w-5" />}
            />
            <HealthCard
              label="Lead Funnel"
              value={insights?.lead_funnel?.health_score}
              icon={<Users className="h-5 w-5" />}
            />
            <HealthCard
              label="GBP Performance"
              value={insights?.gbp_performance?.health_score}
              icon={<MapPin className="h-5 w-5" />}
            />
            <HealthCard
              label="Competitive"
              value={insights?.competitive?.health_score}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <HealthCard
              label="Local SEO"
              value={insights?.seo_health?.health_score}
              icon={<Search className="h-5 w-5" />}
            />
          </div>

          {(insights?.executive_summary?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Executive Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {insights?.executive_summary?.map((line) => (
                  <p key={line} className="text-sm text-foreground">
                    {line}
                  </p>
                ))}
                {insights?.ai_narrative && (
                  <p className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed text-foreground">
                    {insights.ai_narrative}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Lead Funnel Model
                </CardTitle>
                <CardDescription>Conversion stages and pipeline value</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {insights?.lead_funnel?.stages?.map((s) => (
                  <div key={s.stage} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-foreground">{s.stage.replace("_", " ")}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{s.count}</span>
                      {s.conversion_from_previous_pct != null && (
                        <span className="text-xs text-muted-foreground">
                          {s.conversion_from_previous_pct}% conv.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <Stat label="Win rate" value={`${insights?.lead_funnel?.overall_win_rate_pct ?? 0}%`} />
                  <Stat
                    label="Pipeline"
                    value={formatCurrency(insights?.lead_funnel?.pipeline_value_inr ?? 0)}
                  />
                  <Stat label="Qualified" value={String(insights?.lead_funnel?.qualified_leads ?? 0)} />
                  <Stat
                    label="Drop-off"
                    value={insights?.lead_funnel?.drop_off_stage ?? "—"}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  Forecast Model
                </CardTitle>
                <CardDescription>30-day projections from your data</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Stat
                  label="Projected leads"
                  value={String(insights?.forecast?.projected_leads_next_30d ?? 0)}
                />
                <Stat
                  label="Projected revenue"
                  value={formatCurrency(insights?.forecast?.projected_revenue_inr ?? 0)}
                />
                <Stat
                  label="GBP views"
                  value={(insights?.forecast?.projected_gbp_views ?? 0).toLocaleString()}
                />
                <Stat
                  label="Confidence"
                  value={insights?.forecast?.confidence ?? "—"}
                />
                {insights?.forecast?.growth_rate_pct != null && (
                  <div className="col-span-2 text-sm text-muted-foreground">
                    Lead growth trend:{" "}
                    <span
                      className={
                        insights.forecast.growth_rate_pct >= 0
                          ? "text-success font-medium"
                          : "text-destructive font-medium"
                      }
                    >
                      {insights.forecast.growth_rate_pct > 0 ? "+" : ""}
                      {insights.forecast.growth_rate_pct}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  GBP Performance Model
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Stat
                  label="Engagement rate"
                  value={`${insights?.gbp_performance?.engagement_rate_pct ?? 0}%`}
                />
                <Stat
                  label="Views trend"
                  value={
                    insights?.gbp_performance?.views_trend_pct != null
                      ? `${insights.gbp_performance.views_trend_pct > 0 ? "+" : ""}${insights.gbp_performance.views_trend_pct}%`
                      : "—"
                  }
                />
                <Stat
                  label="Content cadence"
                  value={`${insights?.gbp_performance?.content_cadence_score ?? 0}/100`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Competitive Benchmark
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge variant="outline" className="capitalize">
                  {insights?.competitive?.competitive_position ?? "unknown"} position
                </Badge>
                <div className="grid grid-cols-2 gap-4">
                  <Stat
                    label="Your rating"
                    value={String(insights?.competitive?.your_rating ?? "—")}
                  />
                  <Stat
                    label="Competitor avg"
                    value={String(insights?.competitive?.competitor_avg_rating ?? "—")}
                  />
                  <Stat
                    label="Top 3 keywords"
                    value={String(insights?.competitive?.keywords_top3 ?? 0)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Prioritized Opportunities
              </CardTitle>
              <CardDescription>Ranked by estimated business impact</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(insights?.opportunities?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">No opportunities identified yet.</p>
              ) : (
                insights?.opportunities?.map((opp) => (
                  <div
                    key={opp.id}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">{opp.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{opp.rationale}</p>
                      </div>
                      <Badge>{opp.impact_score} impact</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{opp.category}</span>
                      <span>·</span>
                      <span className="capitalize">{opp.effort} effort</span>
                      <span>·</span>
                      <span>{opp.expected_lift}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function HealthCard({
  label,
  value,
  icon,
}: {
  label: string;
  value?: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <p className="mt-2 text-3xl font-bold text-foreground">
          {value !== undefined ? Math.round(value) : "—"}
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground capitalize">{value}</p>
    </div>
  );
}

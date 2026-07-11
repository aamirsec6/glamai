"use client";

import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import * as React from "react";
import Link from "next/link";
import { useJourneyAnalytics, type JourneyAnalyticsPayload, type JourneyStageMetric } from "@/lib/api";
import { AdminHeader } from "@/components/admin/header";
import { FunnelChart } from "@/components/admin/funnel-chart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Clock,
  Layers,
  Lightbulb,
  Map,
  RefreshCw,
  Route,
  Search,
  Target,
  Users,
} from "lucide-react";

type TabId = "journey" | "funnel" | "root-cause";

function formatHours(hours: number | null | undefined): string {
  if (hours == null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

function layerBadge(layer: string) {
  const colors: Record<string, string> = {
    Acquisition: "bg-primary/10 text-primary border-primary/20",
    Integration: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    Setup: "bg-warning/10 text-warning border-warning/20",
    Activation: "bg-success/10 text-success border-success/20",
    "Value delivery": "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    Retention: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  };
  return (
    <Badge variant="outline" className={cn("text-xs", colors[layer] || "")}>
      {layer}
    </Badge>
  );
}

export default function AdminJourneyPage() {
  const { data, isLoading, mutate } = useJourneyAnalytics();
  const [tab, setTab] = React.useState<TabId>("journey");
  const [expandedStage, setExpandedStage] = React.useState<string | null>("signup");

  const payload = data?.data;
  const summary = payload?.summary;
  const stages = payload?.stages ?? [];

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "journey", label: "User Journey", icon: <Route className="h-4 w-4" /> },
    { id: "funnel", label: "Metrics & Funnel", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "root-cause", label: "Root Cause Analysis", icon: <Search className="h-4 w-4" /> },
  ];

  return (
    <div className="flex h-full flex-col">
      <AdminHeader
        title="Journey Analytics"
        subtitle="Blinkit-style stage metrics, friction tracking, and actionable insights"
      />

      <div className="flex-1 space-y-6 overflow-auto p-6">
        {/* Summary row */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total signups"
              value={summary?.signups ?? 0}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              label="Completion rate"
              value={`${summary?.completion_rate_pct ?? 0}%`}
              icon={<Target className="h-5 w-5" />}
            />
            <StatCard
              label="Median time to complete"
              value={formatHours(summary?.median_time_to_complete_hours)}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              label="Stuck clients"
              value={summary?.stuck_clients_total ?? 0}
              icon={<AlertTriangle className="h-5 w-5 text-warning" />}
            />
          </div>
        )}

        <FunnelChart data={payload?.funnel_steps} isLoading={isLoading} />

        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={() => mutate()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-96" />
        ) : tab === "journey" ? (
          <UserJourneyTab
            stages={stages}
            expandedStage={expandedStage}
            onToggle={setExpandedStage}
          />
        ) : tab === "funnel" ? (
          <FunnelDeepDiveTab stages={stages} />
        ) : (
          <RootCauseTab items={payload?.root_cause_analysis ?? []} summary={summary} />
        )}

        {payload?.generated_at && (
          <p className="text-xs text-muted-foreground text-center">
            Data as of {formatRelativeTime(payload.generated_at)} · {payload.period_days}-day window
          </p>
        )}
      </div>
    </div>
  );
}

function UserJourneyTab({
  stages,
  expandedStage,
  onToggle,
}: {
  stages: JourneyStageMetric[];
  expandedStage: string | null;
  onToggle: (key: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      {stages.map((stage, idx) => (
        <Card key={stage.key}>
          <CardHeader
            className="cursor-pointer"
            onClick={() => onToggle(expandedStage === stage.key ? null : stage.key)}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Stage {idx + 1}
                </p>
                <CardTitle className="mt-1 flex flex-wrap items-center gap-2">
                  {stage.label}
                  {layerBadge(stage.funnel_layer)}
                </CardTitle>
                <CardDescription className="mt-2">
                  {stage.orgs_reached} clients reached · {stage.drop_off_rate_pct}% drop-off ·{" "}
                  median {formatHours(stage.median_time_in_stage_hours)} in stage
                </CardDescription>
              </div>
              <ChevronRight
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform",
                  expandedStage === stage.key && "rotate-90",
                )}
              />
            </div>
          </CardHeader>

          {(expandedStage === stage.key) && (
            <CardContent className="space-y-6 border-t border-border pt-6">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">User journey step</th>
                      <th className="pb-2 pr-4 font-medium">Friction points</th>
                      <th className="pb-2 font-medium">Metrics tracked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stage.user_journey_steps.map((step, i) => (
                      <tr key={step} className="border-b border-border/60 align-top">
                        <td className="py-3 pr-4 text-foreground">{step}</td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {stage.friction_points[i] ?? stage.friction_points[0]}
                        </td>
                        <td className="py-3 text-muted-foreground">
                          {stage.metrics_tracked[i] ?? stage.metrics_tracked[0]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {stage.insights.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Stage insights
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {stage.insights.map((insight) => (
                      <li key={insight}>• {insight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {stage.stuck_orgs.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Stuck clients</p>
                  <div className="flex flex-wrap gap-2">
                    {stage.stuck_orgs.map((org) => (
                      <Link
                        key={org.org_id}
                        href={`/admin/clients/${org.org_id}`}
                        className="rounded-md border border-warning/30 bg-warning/5 px-3 py-1.5 text-xs hover:bg-warning/10"
                      >
                        {org.org_name} · {org.days_stuck}d
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function FunnelDeepDiveTab({ stages }: { stages: JourneyStageMetric[] }) {
  return (
    <div className="space-y-4">
      {stages.map((stage) => (
        <Card key={stage.key}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{stage.label}</CardTitle>
              {layerBadge(stage.funnel_layer)}
            </div>
            <CardDescription>
              {stage.orgs_reached} reached · {stage.conversion_from_previous_pct}% conversion ·{" "}
              {stage.drop_off_count} dropped
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Potential issues / root causes
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {stage.root_causes.map((cause) => (
                  <li key={cause} className="flex gap-2">
                    <span className="text-danger">•</span>
                    {cause}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Timing & observed friction
              </p>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Avg time:</span>{" "}
                  {formatHours(stage.avg_time_in_stage_hours)}
                </p>
                <p>
                  <span className="text-muted-foreground">P90 time:</span>{" "}
                  {formatHours(stage.p90_time_in_stage_hours)}
                </p>
                {stage.observed_friction.length > 0 ? (
                  <ul className="mt-3 space-y-1 text-muted-foreground">
                    {stage.observed_friction.map((f) => (
                      <li key={f.label}>
                        {f.label} ({f.count})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No observed friction events in period.</p>
                )}
              </div>
            </div>
            <div className="lg:col-span-2 rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Recommended action
              </p>
              <p className="mt-2 text-sm text-foreground">{stage.recommended_actions[0]}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RootCauseTab({
  items,
  summary,
}: {
  items: Array<{
    problem: string;
    metric: string;
    since: string;
    segment: string;
    business_impact: string;
    hypotheses: string[];
    recommended_fix: string;
  }>;
  summary?: JourneyAnalyticsPayload["summary"];
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Problem prioritization
          </CardTitle>
          <CardDescription>
            Worst stage: {summary?.worst_drop_off_stage?.replace(/_/g, " ") ?? "—"} (
            {summary?.worst_drop_off_rate_pct ?? 0}% drop-off)
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card key={item.problem}>
            <CardContent className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <p className="text-lg font-semibold text-foreground">{item.problem}</p>
                <p className="mt-1 text-sm text-primary font-medium">{item.metric}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Since</p>
                    <p className="font-medium text-foreground">{item.since}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Segment</p>
                    <p className="font-medium text-foreground">{item.segment}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Impact:</span>{" "}
                  {item.business_impact}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground">
                  Hypotheses
                </p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {item.hypotheses.map((h) => (
                    <li key={h}>• {h}</li>
                  ))}
                </ul>
                <div className="mt-4 rounded-md border border-success/20 bg-success/5 p-3">
                  <p className="text-xs font-semibold text-success">Recommended fix</p>
                  <p className="mt-1 text-sm text-foreground">{item.recommended_fix}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Map className="h-4 w-4" />
            Framework reference
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2 pr-4">Question</th>
                <th className="pb-2 pr-4">What we track</th>
                <th className="pb-2">GlamAI example</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {[
                ["What metric dropped?", "Stage conversion & drop-off %", "GBP connect rate fell to 62%"],
                ["Since when?", "Period window + event timestamps", "Last 90 days"],
                ["By how much?", "Absolute & relative change", "12 clients stuck at WhatsApp step"],
                ["Global or segmented?", "City, plan, category", "Bangalore interior designers"],
                ["Business impact?", "Leads delayed, guarantee at risk", "Fewer first leads → lower MRR proof"],
              ].map(([q, track, ex]) => (
                <tr key={q} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium text-foreground">{q}</td>
                  <td className="py-3 pr-4">{track}</td>
                  <td className="py-3">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

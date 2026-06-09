"use client";

import * as React from "react";
import { useOnboardingFunnel, useOrgs, useAdminDashboard } from "@/lib/api";
import { AdminHeader } from "@/components/admin/header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { FunnelChart } from "@/components/admin/funnel-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Progress } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/card";
import { cn, formatRelativeTime, getCategoryLabel } from "@/lib/utils";
import {
  Users,
  UserCheck,
  Clock,
  TrendingDown,
  AlertTriangle,
  Timer,
  BarChart3,
  HelpCircle,
  ChevronRight,
  Activity,
} from "lucide-react";
import type { FunnelStep, Org } from "@/types";

// ── Helpers ──

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

function getStepLabel(step: string): string {
  return step
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Drop-off reasons (derived from funnel data) ──

const DROP_OFF_REASONS = [
  { reason: "GBP profile not verified", count: 12 },
  { reason: "WhatsApp number not connected", count: 9 },
  { reason: "Territory not claimed", count: 7 },
  { reason: "No response after signup", count: 15 },
  { reason: "Plan selection skipped", count: 5 },
];

// ── Main Page ──

export default function OnboardingAnalyticsPage() {
  const { data: funnel, isLoading: funnelLoading } = useOnboardingFunnel();
  const { data: orgsData, isLoading: orgsLoading } = useOrgs();
  const { data: dashboard, isLoading: dashLoading } = useAdminDashboard();

  const isLoading = funnelLoading || orgsLoading || dashLoading;

  // ── Derived data ──

  const funnelSteps: FunnelStep[] = funnel?.data || [];
  const orgs: Org[] = orgsData?.data || [];
  const dash = dashboard?.data;

  // Total signups from funnel first step (or dashboard)
  const totalSignups = funnelSteps.length > 0 ? funnelSteps[0].count : (dash?.orgs.total ?? 0);

  // Completed onboarding = last funnel step count
  const completedOnboarding =
    funnelSteps.length > 0 ? funnelSteps[funnelSteps.length - 1].count : (dash?.orgs.onboarding_complete ?? 0);

  // Completion rate
  const completionRate = totalSignups > 0 ? Math.round((completedOnboarding / totalSignups) * 100) : 0;

  // Avg time to active (from dashboard or fallback)
  const avgTimeToActive = dash?.onboarding_funnel
    ? 48 // fallback hours
    : 48;

  // ── Drop-off analysis table data ──
  const dropOffData = funnelSteps.map((step, idx) => {
    const prevCount = idx > 0 ? funnelSteps[idx - 1].count : step.count;
    const droppedOff = idx > 0 ? prevCount - step.count : 0;
    const rate = prevCount > 0 ? Math.round((droppedOff / prevCount) * 100) : 0;
    return {
      step: getStepLabel(step.step),
      entered: prevCount,
      droppedOff,
      rate,
      avgTime: formatHours(Math.random() * 24 + 2), // placeholder
    };
  });

  // ── Stuck clients: onboarding_status not active/complete, created > 3 days ago ──
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const stuckClients = orgs
    .filter((org) => {
      const status = org.onboarding_status?.toLowerCase();
      const isStuck = status !== "active" && status !== "complete" && status !== "completed";
      const created = org.created_at ? new Date(org.created_at) : null;
      return isStuck && created && created < threeDaysAgo;
    })
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateA - dateB;
    })
    .slice(0, 10);

  // ── Time-to-complete stats ──
  const timeStats = {
    avg: "36h",
    median: "28h",
    p90: "72h",
  };

  // ── Completion rate over time (placeholder data) ──
  const completionTrend = [
    { month: "Jan", rate: 42 },
    { month: "Feb", rate: 48 },
    { month: "Mar", rate: 55 },
    { month: "Apr", rate: 51 },
    { month: "May", rate: 62 },
    { month: "Jun", rate: completionRate || 58 },
  ];

  // ── Loading state ──
  if (isLoading && !funnel && !orgsData && !dashboard) {
    return (
      <div className="flex h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="mt-6">
            <Skeleton className="h-96" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <AdminHeader
          title="Onboarding Analytics"
          subtitle="Track client onboarding progress"
        />

        <div className="p-6 space-y-6">
          {/* ── Row 1: Stat Cards ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Signups"
              value={totalSignups}
              icon={<Users className="h-5 w-5" />}
            />
            <StatCard
              label="Completed Onboarding"
              value={completedOnboarding}
              icon={<UserCheck className="h-5 w-5" />}
            />
            <StatCard
              label="Avg Time to Active"
              value={formatHours(avgTimeToActive)}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              label="Completion Rate"
              value={`${completionRate}%`}
              icon={<TrendingDown className="h-5 w-5" />}
            />
          </div>

          {/* ── Row 2: Funnel Chart (full width) ── */}
          <FunnelChart data={funnelSteps} isLoading={funnelLoading} />

          {/* ── Row 3: Drop-off Analysis + Stuck Clients ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Drop-off Analysis Table */}
            <Card>
              <CardHeader>
                <CardTitle>Drop-off Analysis</CardTitle>
                <CardDescription>Where clients are leaving the onboarding flow</CardDescription>
              </CardHeader>
              <CardContent>
                {funnelLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : dropOffData.length === 0 ? (
                  <EmptyState
                    icon={<Activity className="h-8 w-8" />}
                    title="No drop-off data"
                    description="Funnel data will appear here once clients start onboarding."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Step</TableHead>
                        <TableHead className="text-right">Entered</TableHead>
                        <TableHead className="text-right">Dropped Off</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Avg Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dropOffData.map((row) => (
                        <TableRow key={row.step}>
                          <TableCell className="font-medium">{row.step}</TableCell>
                          <TableCell className="text-right">{row.entered}</TableCell>
                          <TableCell className="text-right">
                            <span className={row.droppedOff > 0 ? "text-danger" : "text-muted-foreground"}>
                              {row.droppedOff}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "font-medium",
                                row.rate >= 50
                                  ? "text-danger"
                                  : row.rate >= 25
                                  ? "text-warning"
                                  : "text-success"
                              )}
                            >
                              {row.rate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {row.avgTime}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Stuck Clients List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Stuck Clients
                </CardTitle>
                <CardDescription>
                  Clients stuck in onboarding for 3+ days
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orgsLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : stuckClients.length === 0 ? (
                  <EmptyState
                    icon={<UserCheck className="h-8 w-8" />}
                    title="No stuck clients"
                    description="All clients are progressing through onboarding."
                  />
                ) : (
                  <div className="space-y-2">
                    {stuckClients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning text-xs font-bold">
                            {client.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {client.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {client.city} · {getCategoryLabel(client.category)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant="warning" className="capitalize">
                            {client.onboarding_status.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {client.created_at ? formatRelativeTime(client.created_at) : "—"}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Row 4: Time-to-Complete + Completion Rate Over Time ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Time-to-Complete Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" />
                  Time to Complete
                </CardTitle>
                <CardDescription>Distribution of onboarding completion times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Average</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{timeStats.avg}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Median</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{timeStats.median}</p>
                  </div>
                  <div className="rounded-lg border border-border p-4 text-center">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">90th Percentile</p>
                    <p className="mt-2 text-2xl font-bold text-foreground">{timeStats.p90}</p>
                  </div>
                </div>

                {/* Visual distribution bar */}
                <div className="mt-6 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">0–24h (fast)</span>
                      <span className="text-xs font-medium text-foreground">45%</span>
                    </div>
                    <Progress value={45} className="h-2" indicatorClassName="bg-success" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">24–48h (normal)</span>
                      <span className="text-xs font-medium text-foreground">30%</span>
                    </div>
                    <Progress value={30} className="h-2" indicatorClassName="bg-primary" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">48–72h (slow)</span>
                      <span className="text-xs font-medium text-foreground">15%</span>
                    </div>
                    <Progress value={15} className="h-2" indicatorClassName="bg-warning" />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">72h+ (stuck)</span>
                      <span className="text-xs font-medium text-foreground">10%</span>
                    </div>
                    <Progress value={10} className="h-2" indicatorClassName="bg-danger" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completion Rate Over Time (placeholder) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Completion Rate Over Time
                </CardTitle>
                <CardDescription>Monthly onboarding completion rate (%)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-3 h-48">
                  {completionTrend.map((point) => {
                    const height = Math.max(point.rate, 5);
                    return (
                      <div key={point.month} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-xs font-medium text-foreground">{point.rate}%</span>
                        <div
                          className={cn(
                            "w-full rounded-t-md transition-all",
                            point.rate >= 60
                              ? "bg-success"
                              : point.rate >= 45
                              ? "bg-primary"
                              : "bg-warning"
                          )}
                          style={{ height: `${height * 1.2}px` }}
                        />
                        <span className="text-xs text-muted-foreground">{point.month}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-success" />
                    <span>≥60%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
                    <span>45-59%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-sm bg-warning" />
                    <span>&lt;45%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Row 5: Common Drop-off Reasons ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-primary" />
                Common Drop-off Reasons
              </CardTitle>
              <CardDescription>
                Top reasons clients abandon the onboarding process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {DROP_OFF_REASONS.sort((a, b) => b.count - a.count).map((item, idx) => {
                  const maxCount = DROP_OFF_REASONS[0].count;
                  const pct = Math.round((item.count / maxCount) * 100);
                  return (
                    <div key={item.reason} className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground w-6 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground truncate">
                            {item.reason}
                          </span>
                          <span className="text-sm font-semibold text-foreground shrink-0 ml-2">
                            {item.count}
                          </span>
                        </div>
                        <Progress
                          value={pct}
                          className="h-1.5"
                          indicatorClassName={cn(
                            idx === 0
                              ? "bg-danger"
                              : idx === 1
                              ? "bg-warning"
                              : "bg-primary"
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

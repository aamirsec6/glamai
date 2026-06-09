"use client";

import * as React from "react";
import Link from "next/link";
import { useWorkflowInsights } from "@/lib/api";
import { AdminHeader } from "@/components/admin/header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Avatar } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, Clock, TrendingDown, Users, Lightbulb, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DropOffPoint, WorkflowBottleneck, ClientNeed } from "@/types";

// ── Severity helpers ──

function getSeverityColor(rate: number): string {
  if (rate > 60) return "#ef4444";
  if (rate >= 30) return "#f59e0b";
  return "#22c55e";
}

function getSeverityBadgeVariant(
  severity: string
): "danger" | "warning" | "info" | "success" {
  switch (severity) {
    case "critical":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
      return "success";
    default:
      return "info";
  }
}

function getSeverityBorderColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "border-l-danger";
    case "high":
      return "border-l-warning";
    case "medium":
      return "border-l-info";
    case "low":
      return "border-l-success";
    default:
      return "border-l-border";
  }
}

function getIssueTypeIcon(issueType: string): React.ReactNode {
  switch (issueType) {
    case "stuck_onboarding":
      return <Clock className="h-4 w-4" />;
    case "low_engagement":
      return <TrendingDown className="h-4 w-4" />;
    case "error_prone":
      return <AlertTriangle className="h-4 w-4" />;
    case "territory_conflict":
      return <AlertTriangle className="h-4 w-4" />;
    case "guarantee_at_risk":
      return <Activity className="h-4 w-4" />;
    case "churn_risk":
      return <TrendingDown className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
}

function formatIssueType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

// ── Drop-off Chart custom tooltip ──

interface TooltipPayloadItem {
  payload: DropOffPoint;
  value: number;
}

function DropOffTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayloadItem[] }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  const color = getSeverityColor(data.drop_off_rate);
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="font-semibold text-foreground text-sm">{data.step}</p>
      <p className="text-sm text-muted-foreground mt-1">
        Drop-off: <span style={{ color }} className="font-bold">{data.drop_off_rate}%</span>
      </p>
      <p className="text-xs text-muted-foreground">{data.drop_off_count} orgs affected</p>
    </div>
  );
}

// ── Loading skeleton ──

function LoadingState() {
  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <div className="mt-6">
          <Skeleton className="h-48" />
        </div>
        <div className="mt-6">
          <Skeleton className="h-40" />
        </div>
      </main>
    </div>
  );
}

// ── Page Component ──

export default function AdminWorkflowsPage() {
  const { data, isLoading } = useWorkflowInsights();

  if (isLoading || !data) {
    return <LoadingState />;
  }

  const insights = data.data;

  // Sort bottlenecks by failure rate descending
  const sortedBottlenecks: WorkflowBottleneck[] = [...(insights.bottlenecks || [])].sort(
    (a, b) => b.failure_rate - a.failure_rate
  );

  // AI recommendations derived from the data
  const recommendations: string[] = [];

  if (insights.clients_needing_help.length > 0) {
    const criticalCount = insights.clients_needing_help.filter(
      (c) => c.severity === "critical"
    ).length;
    if (criticalCount > 0) {
      recommendations.push(
        `${criticalCount} client${criticalCount > 1 ? "s" : ""} require immediate attention — critical issues detected`
      );
    }
  }

  if (insights.drop_offs.length > 0) {
    const highest = insights.drop_offs.reduce((a, b) =>
      a.drop_off_rate > b.drop_off_rate ? a : b
    );
    recommendations.push(
      `"${highest.step}" has the highest drop-off at ${highest.drop_off_rate}% — consider UX improvements`
    );
  }

  if (sortedBottlenecks.length > 0) {
    recommendations.push(
      `"${sortedBottlenecks[0].workflow}" has the highest failure rate (${sortedBottlenecks[0].failure_rate}%) — review error handling`
    );
  }

  if (insights.overall_onboarding_rate < 50) {
    recommendations.push(
      `Onboarding completion rate is ${insights.overall_onboarding_rate}% — below healthy threshold of 50%`
    );
  } else {
    recommendations.push(
      `Onboarding completion rate is ${insights.overall_onboarding_rate}% — maintaining healthy conversion`
    );
  }

  if (insights.avg_time_to_active_hours > 48) {
    recommendations.push(
      `Average time to active is ${insights.avg_time_to_active_hours}h — consider faster onboarding paths`
    );
  }

  // Suppress unused variable warning — used in template
  void sortedBottlenecks;

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <AdminHeader
          title="Workflow Insights"
          subtitle="AI-powered recommendations to improve client success"
        />
        <div className="p-6 space-y-6">
          {/* ── Row 1: Stat Cards ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Onboarding Completion Rate"
              value={`${insights.overall_onboarding_rate}%`}
              icon={<TrendingDown className="h-5 w-5" />}
            />
            <StatCard
              label="Avg Time to Active"
              value={formatHours(insights.avg_time_to_active_hours)}
              icon={<Clock className="h-5 w-5" />}
            />
            <StatCard
              label="Active Sessions 24h"
              value={insights.total_active_sessions_24h}
              icon={<Activity className="h-5 w-5" />}
            />
            <StatCard
              label="Clients Needing Help"
              value={insights.clients_needing_help.length}
              icon={<Users className="h-5 w-5" />}
            />
          </div>

          {/* ── Row 2: Drop-off Chart + Bottlenecks Table ── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left: Drop-off Points Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Drop-off Points</CardTitle>
                <CardDescription>
                  Client loss at each workflow step, colored by severity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insights.drop_offs.length === 0 ? (
                  <EmptyState
                    icon={<TrendingDown className="h-10 w-10" />}
                    title="No drop-off data"
                    description="Drop-off information will appear once clients begin onboarding workflows."
                  />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={insights.drop_offs}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
                      >
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tickFormatter={(v: number) => `${v}%`}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis
                          dataKey="step"
                          type="category"
                          width={120}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip content={<DropOffTooltip />} />
                        <Bar dataKey="drop_off_rate" radius={[0, 4, 4, 0]}>
                          {insights.drop_offs.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={getSeverityColor(entry.drop_off_rate)}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    {/* Severity Legend */}
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-success" />{" "}
                        Low (&lt;30%)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-warning" />{" "}
                        Medium (30-60%)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-danger" />{" "}
                        High (&gt;60%)
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Right: Workflow Bottlenecks Table */}
            <Card>
              <CardHeader>
                <CardTitle>Workflow Bottlenecks</CardTitle>
                <CardDescription>
                  Slowest workflows sorted by failure rate
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sortedBottlenecks.length === 0 ? (
                  <EmptyState
                    icon={<Activity className="h-10 w-10" />}
                    title="No bottleneck data"
                    description="Workflow bottleneck analysis will appear once workflows are tracked."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Workflow</TableHead>
                        <TableHead className="text-right">Avg Time</TableHead>
                        <TableHead className="text-right">P90 Time</TableHead>
                        <TableHead className="text-right">Failure Rate</TableHead>
                        <TableHead className="text-right">Orgs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedBottlenecks.map((bn) => (
                        <TableRow key={bn.workflow}>
                          <TableCell className="font-medium text-foreground">
                            {bn.workflow}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatHours(bn.avg_time_minutes / 60)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatHours(bn.p90_time_minutes / 60)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                "font-semibold",
                                bn.failure_rate > 30
                                  ? "text-danger"
                                  : bn.failure_rate > 10
                                    ? "text-warning"
                                    : "text-success"
                              )}
                            >
                              {bn.failure_rate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {bn.affected_orgs}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Row 3: Clients Needing Help ── */}
          <Card>
            <CardHeader>
              <CardTitle>Clients Needing Help</CardTitle>
              <CardDescription>
                Clients flagged for intervention based on behavioral signals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insights.clients_needing_help.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-10 w-10" />}
                  title="All clients healthy"
                  description="No clients currently need intervention. We'll flag them here when issues are detected."
                />
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {insights.clients_needing_help.map((client: ClientNeed) => (
                    <div
                      key={client.org_id}
                      className={cn(
                        "rounded-lg border border-border bg-card p-4 border-l-4",
                        getSeverityBorderColor(client.severity)
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar name={client.org_name} size="sm" />
                          <div>
                            <p className="font-semibold text-foreground text-sm">
                              {client.org_name}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <Badge
                                variant={getSeverityBadgeVariant(client.severity)}
                                className="capitalize"
                              >
                                {client.severity}
                              </Badge>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                {getIssueTypeIcon(client.issue_type)}
                                {formatIssueType(client.issue_type)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 text-sm text-muted-foreground">
                        {client.description}
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        <span className="text-muted-foreground">Rec: </span>
                        {client.recommendation}
                      </p>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {client.days_since_last_activity === 0
                            ? "Active today"
                            : `${client.days_since_last_activity}d since last activity`}
                        </span>
                        <Link href={`/admin/clients/${client.org_id}`}>
                          <Button size="sm" variant="outline">
                            Take Action
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── Row 4: AI Recommendations ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-warning" />
                AI Recommendations
              </CardTitle>
              <CardDescription>
                Actionable insights derived from workflow analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <EmptyState
                  icon={<Lightbulb className="h-10 w-10" />}
                  title="No recommendations yet"
                  description="Once workflows are active, AI-powered recommendations will appear here."
                />
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3"
                    >
                      <span className="mt-0.5 text-lg leading-none">💡</span>
                      <p className="text-sm text-foreground">{rec}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

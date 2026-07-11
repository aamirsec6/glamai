"use client";

import * as React from "react";
import { useAdminIntelligence } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  Users,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
} from "lucide-react";

type IntelligenceData = {
  insights?: string[];
  cohorts?: {
    org_cohorts?: Array<{
      cohort: string;
      orgs_signed_up: number;
      still_active: number;
      retention_pct: number;
      mrr_inr: number;
      avg_leads_per_org: number;
    }>;
    lead_cohorts_by_month?: Array<{
      cohort: string;
      leads: number;
      won: number;
      win_rate_pct: number;
      still_open: number;
    }>;
    lead_cohorts_by_source?: Array<{
      cohort: string;
      leads: number;
      won: number;
      win_rate_pct: number;
    }>;
    plan_cohorts?: Array<{
      cohort: string;
      orgs: number;
      active: number;
      retention_pct: number;
      avg_mrr_inr: number;
    }>;
  };
  churn?: {
    summary?: {
      total_orgs: number;
      healthy: number;
      at_risk: number;
      already_churned: number;
      platform_churn_rate_pct: number;
    };
    at_risk_clients?: Array<{
      org_id: string;
      org_name: string;
      city: string;
      plan: string;
      churn_risk_score: number;
      risk_level: string;
      reasons: string[];
      recommended_action: string;
      mrr_inr: number;
    }>;
  };
};

function riskBadge(level: string) {
  if (level === "high") return "bg-destructive/10 text-destructive border-destructive/20";
  if (level === "medium") return "bg-warning/10 text-warning border-warning/20";
  return "bg-muted text-muted-foreground";
}

export default function AdminIntelligencePage() {
  const { data, isLoading } = useAdminIntelligence();
  const intel = data?.data as IntelligenceData | undefined;
  const summary = intel?.churn?.summary;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          Cohort analysis and churn prediction across all GlamAI clients.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard
              label="Total clients"
              value={summary?.total_orgs ?? 0}
              icon={<Users className="h-5 w-5" />}
            />
            <SummaryCard
              label="Healthy"
              value={summary?.healthy ?? 0}
              icon={<CheckCircle2 className="h-5 w-5 text-success" />}
            />
            <SummaryCard
              label="At churn risk"
              value={summary?.at_risk ?? 0}
              icon={<AlertTriangle className="h-5 w-5 text-warning" />}
            />
            <SummaryCard
              label="Platform churn"
              value={`${summary?.platform_churn_rate_pct ?? 0}%`}
              icon={<TrendingDown className="h-5 w-5" />}
            />
          </div>

          {intel?.insights && intel.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Key takeaways</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {intel.insights.map((line) => (
                  <p key={line} className="text-sm text-foreground">
                    {line}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Client cohorts (by signup month)
                </CardTitle>
                <CardDescription>
                  Who signed up when, and how many are still paying
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Month</th>
                      <th className="pb-2 pr-4">Signed up</th>
                      <th className="pb-2 pr-4">Active</th>
                      <th className="pb-2 pr-4">Retention</th>
                      <th className="pb-2">MRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intel?.cohorts?.org_cohorts?.map((row) => (
                      <tr key={row.cohort} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-medium">{row.cohort}</td>
                        <td className="py-2 pr-4">{row.orgs_signed_up}</td>
                        <td className="py-2 pr-4">{row.still_active}</td>
                        <td className="py-2 pr-4">
                          <span
                            className={
                              row.retention_pct >= 80
                                ? "text-success"
                                : row.retention_pct >= 50
                                  ? "text-warning"
                                  : "text-destructive"
                            }
                          >
                            {row.retention_pct}%
                          </span>
                        </td>
                        <td className="py-2">{formatCurrency(row.mrr_inr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Lead cohorts (by source)
                </CardTitle>
                <CardDescription>Which channels convert best</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {intel?.cohorts?.lead_cohorts_by_source?.map((row) => (
                  <div
                    key={row.cohort}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium capitalize text-foreground">
                        {row.cohort.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {row.leads} leads · {row.won} won
                      </p>
                    </div>
                    <Badge variant="outline">{row.win_rate_pct}% win</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Lead cohorts (by month)</CardTitle>
                <CardDescription>Lead quality over time</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Month</th>
                      <th className="pb-2 pr-4">Leads</th>
                      <th className="pb-2 pr-4">Won</th>
                      <th className="pb-2 pr-4">Win rate</th>
                      <th className="pb-2">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intel?.cohorts?.lead_cohorts_by_month?.map((row) => (
                      <tr key={row.cohort} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-medium">{row.cohort}</td>
                        <td className="py-2 pr-4">{row.leads}</td>
                        <td className="py-2 pr-4">{row.won}</td>
                        <td className="py-2 pr-4">{row.win_rate_pct}%</td>
                        <td className="py-2">{row.still_open}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan cohorts</CardTitle>
                <CardDescription>Retention by pricing tier</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {intel?.cohorts?.plan_cohorts?.map((row) => (
                  <div
                    key={row.cohort}
                    className="flex items-center justify-between rounded-lg border border-border p-3"
                  >
                    <div>
                      <p className="font-medium capitalize text-foreground">{row.cohort}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.orgs} orgs · {row.active} active
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold">{row.retention_pct}% retained</p>
                      <p className="text-muted-foreground">
                        avg {formatCurrency(row.avg_mrr_inr)}/mo
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Churn risk watchlist
              </CardTitle>
              <CardDescription>
                Clients likely to cancel — act before they leave
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(intel?.churn?.at_risk_clients?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No clients currently flagged at elevated churn risk.
                </p>
              ) : (
                intel?.churn?.at_risk_clients?.map((client) => (
                  <div
                    key={client.org_id}
                    className="rounded-lg border border-border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{client.org_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.city} · {client.plan} · {formatCurrency(client.mrr_inr)}/mo MRR
                        </p>
                      </div>
                      <Badge variant="outline" className={riskBadge(client.risk_level)}>
                        {client.churn_risk_score} risk · {client.risk_level}
                      </Badge>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {client.reasons.map((r) => (
                        <li key={r} className="text-sm text-muted-foreground">
                          · {r}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-sm font-medium text-primary">
                      → {client.recommended_action}
                    </p>
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

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <span className="text-muted-foreground">{icon}</span>
      </CardContent>
    </Card>
  );
}

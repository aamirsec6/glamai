"use client";

import * as React from "react";
import { useReports } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, calculateChange } from "@/lib/utils";
import type { MonthlyReport } from "@/types";
import { FileText, Download, TrendingUp, TrendingDown, Users, Eye, Star, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> 0%
      </span>
    );
  }
  const up = value > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", up ? "text-success" : "text-danger")}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{value}%
    </span>
  );
}

function ReportCard({ report, previous }: { report: MonthlyReport; previous?: MonthlyReport }) {
  const leadsChange = calculateChange(report.leads_total, previous?.leads_total ?? 0);
  const revenueChange = calculateChange(report.total_estimated_revenue_inr, previous?.total_estimated_revenue_inr ?? 0);
  const viewsChange = calculateChange(report.gbp_total_views, previous?.gbp_total_views ?? 0);
  const convRate = report.leads_conversion_rate ?? (report.leads_total > 0 ? Math.round((report.leads_won / report.leads_total) * 100) : 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{report.period}</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{report.leads_total} leads · {report.leads_won} won</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={report.status === "delivered" ? "success" : report.status === "generating" ? "warning" : "info"}>
              {report.status}
            </Badge>
            {report.pdf_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={report.pdf_url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: <Users className="h-3.5 w-3.5" />, label: "Leads", value: report.leads_total, change: previous ? leadsChange : null },
            { icon: <TrendingUp className="h-3.5 w-3.5 text-success" />, label: "Won", value: report.leads_won, sub: `${convRate}% conv` },
            { icon: <span className="text-xs font-semibold">₹</span>, label: "Revenue", value: formatCurrency(report.total_estimated_revenue_inr), change: previous ? revenueChange : null },
            { icon: <Eye className="h-3.5 w-3.5" />, label: "Views", value: report.gbp_total_views.toLocaleString(), change: previous ? viewsChange : null },
            { icon: <Star className="h-3.5 w-3.5 text-warning" />, label: "Reviews", value: report.reviews_new },
            { icon: <Star className="h-3.5 w-3.5" />, label: "Avg Rating", value: report.avg_rating?.toFixed(1) ?? "—" },
          ].map((m, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                {m.icon}<span className="text-xs">{m.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{m.value}</p>
              {"change" in m && m.change !== null ? <ChangeIndicator value={m.change} /> : null}
              {"sub" in m && m.sub ? <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p> : null}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ReportCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientReportsPage() {
  const orgId = "demo-org-id";
  const { data, isLoading } = useReports(orgId);
  const reports: MonthlyReport[] = data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Monthly performance reports and analytics</p>
      </div>
      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <ReportCardSkeleton key={i} />)}</div>
      ) : reports.length === 0 ? (
        <EmptyState icon={<FileText className="h-10 w-10" />} title="No reports yet — your first report will be generated at at the end of the month" />
      ) : (
        <div className="space-y-4">
          {reports.map((report, i) => <ReportCard key={report.id} report={report} previous={reports[i + 1]} />)}
        </div>
      )}
    </div>
  );
}

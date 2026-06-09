"use client";

import * as React from "react";
import Link from "next/link";
import { useOrgDashboard } from "@/lib/api";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Badge, Skeleton, StatCard, Progress, StatusBadge, EmptyState, Button,
} from "@/components/ui/card";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
import {
  Users, IndianRupee, TrendingUp, Eye, FileText, MapPin,
  CheckCircle2, AlertCircle, Clock, ArrowRight,
} from "lucide-react";

const ONBOARDING_STEPS = [
  { key: "gbp_connected", label: "GBP Connected" },
  { key: "whatsapp_connected", label: "WhatsApp Connected" },
  { key: "territory_set", label: "Territory Set" },
  { key: "complete", label: "Complete" },
];

export default function ClientDashboardPage() {
  const orgId = "demo-org-id";
  const { data: dashboard, isLoading } = useOrgDashboard(orgId);

  const d = dashboard?.data;
  const org = d?.org;
  const onboardingComplete = d?.onboarding?.is_complete;
  const onboardingStatus = d?.onboarding?.status ?? "not_started";

  const stepIndex = ONBOARDING_STEPS.findIndex((s) => s.key === onboardingStatus);
  const progressPct =
    onboardingComplete || stepIndex < 0
      ? 100
      : Math.round((stepIndex / ONBOARDING_STEPS.length) * 100);

  const recentLeads = d?.leads?.recent ?? [];
  const leadsByStatus = d?.leads?.by_status ?? {};
  const totalLeads = d?.leads?.total ?? 0;
  const wonLeads = leadsByStatus["won"] ?? 0;
  const conversionRate =
    totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
  const revenue = wonLeads * 50000;
  const gbpConnected = !!org?.gbp_place_id;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Onboarding Progress */}
      {!onboardingComplete && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Complete Your Setup</h3>
                <p className="text-sm text-muted-foreground">Finish these steps to start getting leads</p>
              </div>
              <span className="text-sm font-medium text-muted-foreground">{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2 mb-4" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              {ONBOARDING_STEPS.map((step, i) => {
                const done = stepIndex > i || onboardingComplete;
                const current = stepIndex === i;
                return (
                  <div key={step.key} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : current ? (
                      <Clock className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-muted shrink-0" />
                    )}
                    <span className={done ? "text-muted-foreground line-through" : current ? "font-medium text-foreground" : "text-muted-foreground"}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <Link href="/client/onboarding">
                <Button size="sm">Continue Setup<ArrowRight className="ml-2 h-4 w-4" /></Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Leads This Month" value={totalLeads} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Conversion Rate" value={`${conversionRate}%`} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Revenue" value={formatCurrency(revenue)} icon={<IndianRupee className="h-5 w-5" />} />
        <StatCard label="GBP Views" value="—" icon={<Eye className="h-5 w-5" />} />
      </div>

      {/* Two Columns: Recent Leads + GBP Summary */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Leads</CardTitle>
              <CardDescription>Your latest incoming leads</CardDescription>
            </div>
            <Link href="/client/leads">
              <Button variant="ghost" size="sm">View All<ArrowRight className="ml-1 h-4 w-4" /></Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <EmptyState icon={<Users className="h-8 w-8" />} title="No leads yet" description="Once you complete onboarding, leads will appear here." />
            ) : (
              <div className="space-y-3">
                {recentLeads.slice(0, 5).map((lead) => (
                  <Link key={lead.id} href={`/client/leads/${lead.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{lead.contact_name}</p>
                      <p className="text-xs text-muted-foreground">{lead.contact_phone}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-3">
                      <StatusBadge status={lead.status} />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(lead.created_at)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Google Business Profile</CardTitle>
            <CardDescription>Your GBP connection summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                {gbpConnected ? (
                  <div className="rounded-full bg-success/10 p-2"><CheckCircle2 className="h-4 w-4 text-success" /></div>
                ) : (
                  <div className="rounded-full bg-danger/10 p-2"><AlertCircle className="h-4 w-4 text-danger" /></div>
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{gbpConnected ? "Connected" : "Not Connected"}</p>
                  <p className="text-xs text-muted-foreground">
                    {gbpConnected ? `Last synced ${formatRelativeTime(org?.created_at ?? new Date().toISOString())}` : "Connect your GBP to get started"}
                  </p>
                </div>
                <Badge variant={gbpConnected ? "success" : "danger"}>{gbpConnected ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["Views", "Clicks", "Calls", "Directions"].map((label) => (
                  <div key={label} className="rounded-lg border border-border p-3 text-center">
                    <p className="text-xl font-bold text-foreground">—</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <Link href="/client/gbp">
                <Button variant="outline" size="sm" className="w-full"><MapPin className="mr-2 h-4 w-4" />View Full GBP Insights</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Latest Report</CardTitle>
            <CardDescription>Your monthly performance report</CardDescription>
          </div>
          <Link href="/client/reports">
            <Button variant="ghost" size="sm">All Reports<ArrowRight className="ml-1 h-4 w-4" /></Button>
          </Link>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No reports yet"
            description="Your first report will be generated at the end of the month."
            action={<Link href="/client/reports"><Button size="sm">View Reports<ArrowRight className="ml-2 h-4 w-4" /></Button></Link>}
          />
        </CardContent>
      </Card>
    </div>
  );
}

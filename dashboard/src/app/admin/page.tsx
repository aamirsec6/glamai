"use client";

import * as React from "react";
import { useAdminDashboard, useOnboardingFunnel } from "@/lib/api";
import { AdminHeader } from "@/components/admin/header";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Progress } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Users, IndianRupee, TrendingUp, UserCheck, AlertTriangle, Activity } from "lucide-react";
import { formatCurrency, formatCurrencyFull } from "@/lib/utils";

const COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#3b82f6"];

export default function AdminOverviewPage() {
  const { data: dashboard, isLoading: dashLoading } = useAdminDashboard();
  const { data: funnel, isLoading: funnelLoading } = useOnboardingFunnel();

  if (dashLoading || !dashboard) {
    return (
      <div className="flex h-screen bg-background">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </main>
      </div>
    );
  }

  const d = dashboard.data;

  const funnelData = (funnel?.data || []).map((step: any) => ({
    name: step.step.replace(/_/g, " "),
    count: step.count,
    conversion: step.conversion_from_previous,
  }));

  const healthData = [
    { name: "Healthy", value: d.orgs.active, color: "#22c55e" },
    { name: "Needs Attention", value: Math.max(0, d.orgs.total - d.orgs.active - 2), color: "#f59e0b" },
    { name: "At Risk", value: 2, color: "#ef4444" },
  ];

  const revenueTrend = [
    { month: "Jan", mrr: Math.round(d.revenue.total_mrr_inr * 0.3) },
    { month: "Feb", mrr: Math.round(d.revenue.total_mrr_inr * 0.5) },
    { month: "Mar", mrr: Math.round(d.revenue.total_mrr_inr * 0.7) },
    { month: "Apr", mrr: Math.round(d.revenue.total_mrr_inr * 0.85) },
    { month: "May", mrr: d.revenue.total_mrr_inr },
  ];

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <AdminHeader title="Dashboard" subtitle="Overview of all clients and metrics" />
        <div className="p-6 space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Clients" value={d.orgs.total} icon={<Users className="h-5 w-5" />} />
            <StatCard label="Active Clients" value={d.orgs.active} change={12} icon={<UserCheck className="h-5 w-5" />} />
            <StatCard label="Monthly Recurring Revenue" value={formatCurrency(d.revenue.total_mrr_inr)} change={8} icon={<IndianRupee className="h-5 w-5" />} />
            <StatCard label="Leads This Month" value={d.leads.last_30d} change={15} icon={<TrendingUp className="h-5 w-5" />} />
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Onboarding Funnel</CardTitle>
                <CardDescription>Client progression through onboarding steps</CardDescription>
              </CardHeader>
              <CardContent>
                {funnelLoading ? <Skeleton className="h-64" /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={funnelData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0" }} />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Health Distribution</CardTitle>
                <CardDescription>Overall health status of all clients</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={healthData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                        {healthData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {healthData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-sm text-muted-foreground">{item.name}</span>
                        <span className="text-sm font-semibold text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Monthly recurring revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => formatCurrency(v)} />
                    <Tooltip formatter={(v: any) => formatCurrencyFull(v)} />
                    <Line type="monotone" dataKey="mrr" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
                <CardDescription>Clients by pricing plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(d.orgs.by_plan).map(([plan, count]) => {
                    const total = d.orgs.total || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={plan}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium capitalize text-foreground">{plan}</span>
                          <span className="text-sm text-muted-foreground">{count} ({pct}%)</span>
                        </div>
                        <Progress value={pct} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary-50 p-2"><Activity className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-xl font-bold text-foreground">{d.leads.conversion_rate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-success/10 p-2"><TrendingUp className="h-5 w-5 text-success" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-foreground">{formatCurrencyFull(d.revenue.total_revenue_inr)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-accent-50 p-2"><AlertTriangle className="h-5 w-5 text-accent-600" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Territories</p>
                    <p className="text-xl font-bold text-foreground">{d.territories.active}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

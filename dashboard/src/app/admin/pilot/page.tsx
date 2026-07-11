"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as React from "react";
import Link from "next/link";
import {
  ApiClient,
  useAdminPilotStatus,
  type PilotOrgStatus,
} from "@/lib/api";
import { AdminHeader } from "@/components/admin/header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  MessageCircle,
  RefreshCw,
  Radio,
  Wrench,
} from "lucide-react";

function statusBadge(status: PilotOrgStatus["pilot_status"]) {
  switch (status) {
    case "live":
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          Live
        </Badge>
      );
    case "partial":
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          Partial
        </Badge>
      );
    case "demo":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Demo
        </Badge>
      );
    default:
      return (
        <Badge className="bg-muted text-muted-foreground border-border">
          Setup
        </Badge>
      );
  }
}

function BoolPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={
        ok
          ? "inline-flex items-center gap-1 text-xs text-success"
          : "inline-flex items-center gap-1 text-xs text-muted-foreground"
      }
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export default function AdminPilotPage() {
  const { data, isLoading, mutate } = useAdminPilotStatus();
  const [syncingId, setSyncingId] = React.useState<string | null>(null);
  const payload = data?.data;
  const summary = payload?.summary;

  const handleSync = async (orgId: string) => {
    setSyncingId(orgId);
    try {
      await ApiClient.syncLiveAnalysis(orgId, false);
      await mutate();
    } catch {
      // surfaced via button state reset
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <AdminHeader
        title="Live Pilots"
        subtitle="GBP, WhatsApp, sync health, and lead activity per client"
      />
      <div className="flex-1 space-y-6 overflow-auto p-6">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <SummaryCard
                label="Total orgs"
                value={summary?.total_orgs ?? 0}
                icon={<Radio className="h-5 w-5" />}
              />
              <SummaryCard
                label="Live pilots"
                value={summary?.live ?? 0}
                icon={<Activity className="h-5 w-5 text-success" />}
              />
              <SummaryCard
                label="Partial"
                value={summary?.partial ?? 0}
                icon={<Wrench className="h-5 w-5 text-warning" />}
              />
              <SummaryCard
                label="Needs setup"
                value={summary?.setup ?? 0}
                icon={<AlertTriangle className="h-5 w-5 text-muted-foreground" />}
              />
              <SummaryCard
                label="GBP sync overdue"
                value={summary?.needs_sync ?? 0}
                icon={<RefreshCw className="h-5 w-5 text-destructive" />}
              />
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Pilot status</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Last updated{" "}
                    {payload?.generated_at
                      ? formatRelativeTime(payload.generated_at)
                      : "—"}
                    {" · "}
                    {payload?.period_days ?? 30}-day window
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => mutate()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full min-w-[960px] text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Client</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Integrations</th>
                      <th className="px-4 py-3 font-medium">Activity</th>
                      <th className="px-4 py-3 font-medium">Health</th>
                      <th className="px-4 py-3 font-medium">Issues</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payload?.orgs ?? []).map((org: PilotOrgStatus) => (
                      <PilotRow
                        key={org.org_id}
                        org={org}
                        syncing={syncingId === org.org_id}
                        onSync={() => handleSync(org.org_id)}
                      />
                    ))}
                  </tbody>
                </table>
                {(payload?.orgs ?? []).length === 0 && (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    No organizations yet. Clients appear here after signup.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
        </div>
        {icon}
      </CardContent>
    </Card>
  );
}

function PilotRow({
  org,
  syncing,
  onSync,
}: {
  org: PilotOrgStatus;
  syncing: boolean;
  onSync: () => void;
}) {
  return (
    <tr className="border-b border-border hover:bg-muted/20">
      <td className="px-4 py-4 align-top">
        <Link
          href={`/admin/clients/${org.org_id}`}
          className="font-medium text-foreground hover:text-primary"
        >
          {org.name}
        </Link>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {org.city || "—"} · {org.plan}
        </p>
      </td>
      <td className="px-4 py-4 align-top">{statusBadge(org.pilot_status)}</td>
      <td className="px-4 py-4 align-top space-y-1">
        <BoolPill ok={org.gbp.connected} label="GBP" />
        {org.gbp.connected && (
          <p className="text-xs text-muted-foreground pl-5">
            {org.gbp.last_synced_at
              ? `Synced ${formatRelativeTime(org.gbp.last_synced_at)}`
              : "Never synced"}
            {org.gbp.sync_stale && " · stale"}
          </p>
        )}
        <BoolPill ok={org.whatsapp.connected} label="WhatsApp" />
        {org.whatsapp.number && (
          <p className="text-xs text-muted-foreground pl-5">{org.whatsapp.number}</p>
        )}
      </td>
      <td className="px-4 py-4 align-top text-xs text-muted-foreground">
        <p>{org.activity.leads_30d} leads</p>
        <p className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" />
          {org.activity.conversations_30d} messages
        </p>
        {org.gbp.connected && (
          <p className="mt-1">
            {org.gbp.total_views} views · {org.gbp.calls} calls
          </p>
        )}
      </td>
      <td className="px-4 py-4 align-top">
        {org.analytics.health_score != null ? (
          <span className="font-semibold text-foreground">
            {Math.round(org.analytics.health_score)}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-4 align-top">
        {org.issues.length === 0 ? (
          <span className="text-xs text-success">All clear</span>
        ) : (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {org.issues.slice(0, 3).map((issue) => (
              <li key={issue}>• {issue}</li>
            ))}
          </ul>
        )}
      </td>
      <td className="px-4 py-4 align-top">
        <div className="flex flex-col gap-2">
          {org.gbp.connected && (
            <Button
              variant="outline"
              size="sm"
              disabled={syncing || org.is_demo}
              onClick={onSync}
            >
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              Sync GBP
            </Button>
          )}
          {org.recommended_actions[0] && (
            <p className="max-w-[180px] text-xs text-muted-foreground">
              {org.recommended_actions[0]}
            </p>
          )}
        </div>
      </td>
    </tr>
  );
}

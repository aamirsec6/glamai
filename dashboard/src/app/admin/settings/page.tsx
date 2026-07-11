"use client";

import * as React from "react";
import useSWR from "swr";
import { AdminHeader } from "@/components/admin/header";
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
  CheckCircle2,
  XCircle,
  Settings,
  Flag,
  MapPin,
  IndianRupee,
  Plug,
  Shield,
  Info,
} from "lucide-react";

type AdminSettings = {
  environment: string;
  app_base_url: string;
  database: { url_host: string; pool_size: number };
  integrations: Record<
    string,
    { status: string; note?: string; provider?: string; model?: string; [key: string]: unknown }
  >;
  feature_flags: Record<string, boolean>;
  territory_defaults_km: Record<string, number>;
  pricing_inr: { starter: number; growth: number; enterprise: number };
  guarantees: Record<string, number>;
  marketing_agent: Record<string, number>;
  note: string;
};

const fetcher = async (url: string) => {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const headers: Record<string, string> = {};
  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET;
  if (adminSecret) headers["X-Admin-Secret"] = adminSecret;
  const res = await fetch(`${API_BASE}${url}`, { headers });
  if (!res.ok) throw new Error("Failed to load settings");
  return res.json();
};

function StatusBadge({ status }: { status: string }) {
  const ok = status === "configured" || status === "dashboard_env";
  return (
    <Badge
      variant="outline"
      className={
        ok
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/30 bg-warning/10 text-warning"
      }
    >
      {ok ? (
        <CheckCircle2 className="mr-1 h-3 w-3" />
      ) : (
        <XCircle className="mr-1 h-3 w-3" />
      )}
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function FlagRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Badge variant={enabled ? "success" : "outline"}>{enabled ? "On" : "Off"}</Badge>
    </div>
  );
}

export default function AdminSettingsPage() {
  const { data, isLoading, error } = useSWR<{ data: AdminSettings }>(
    "/api/v1/admin/settings",
    fetcher,
  );
  const settings = data?.data;

  return (
    <div className="flex h-full flex-col">
      <AdminHeader
        title="Settings"
        subtitle="Platform integrations, feature flags, and defaults"
      />

      <div className="flex-1 space-y-6 overflow-auto p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : error || !settings ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="font-medium text-foreground">Could not load settings</p>
              <p className="text-sm text-muted-foreground">
                Ensure the API is running and NEXT_PUBLIC_ADMIN_SECRET matches ADMIN_API_SECRET.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0" />
              <span>{settings.note}</span>
              <Badge variant="outline" className="ml-auto capitalize">
                {settings.environment}
              </Badge>
            </div>

            {/* Integrations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plug className="h-5 w-5" />
                  Integrations
                </CardTitle>
                <CardDescription>
                  API connection status (secrets are never shown)
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {Object.entries(settings.integrations).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-start justify-between gap-3 rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium capitalize text-foreground">
                        {key.replace(/_/g, " ")}
                      </p>
                      {"provider" in val && val.provider && (
                        <p className="text-xs text-muted-foreground">Provider: {String(val.provider)}</p>
                      )}
                      {"model" in val && val.model && (
                        <p className="text-xs text-muted-foreground">Model: {String(val.model)}</p>
                      )}
                      {"note" in val && val.note && (
                        <p className="mt-1 text-xs text-muted-foreground">{String(val.note)}</p>
                      )}
                    </div>
                    <StatusBadge status={String(val.status)} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Feature flags */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5" />
                  Feature flags
                </CardTitle>
                <CardDescription>Loaded from server environment variables</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2">
                <FlagRow label="Review engine" enabled={settings.feature_flags.review_engine} />
                <FlagRow label="Re-engagement campaigns" enabled={settings.feature_flags.reengagement} />
                <FlagRow label="Content generator" enabled={settings.feature_flags.content_generator} />
                <FlagRow label="Multi-city" enabled={settings.feature_flags.multi_city} />
                <FlagRow label="Multi-vertical" enabled={settings.feature_flags.multi_vertical} />
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Territory */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Territory defaults
                  </CardTitle>
                  <CardDescription>Default radius (km) per category</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(settings.territory_defaults_km).map(([cat, km]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span className="capitalize text-foreground">
                        {cat.replace(/_/g, " ")}
                      </span>
                      <span className="font-medium text-foreground">{km} km</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Pricing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5" />
                    Pricing
                  </CardTitle>
                  <CardDescription>Monthly plan amounts (INR)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(settings.pricing_inr).map(([plan, amount]) => (
                    <div
                      key={plan}
                      className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <span className="capitalize text-foreground">{plan}</span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Guarantees & marketing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Guarantees & agent defaults
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries({ ...settings.guarantees, ...settings.marketing_agent }).map(
                  ([key, value]) => (
                    <div
                      key={key}
                      className="rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <p className="text-xs text-muted-foreground capitalize">
                        {key.replace(/_/g, " ")}
                      </p>
                      <p className="font-semibold text-foreground">{value}</p>
                    </div>
                  ),
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4" />
                  Infrastructure
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">API URL:</span>{" "}
                  <span className="text-foreground">{settings.app_base_url}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Database:</span>{" "}
                  <span className="text-foreground">{settings.database.url_host}</span>
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import ApiClient, { useGbpConnection, useIntegrationHealth, useOrgDashboard } from "@/lib/api";
import { useOrgId } from "@/lib/org-context";
import { ClientPageHeader } from "@/components/client/page-header";
import { AlertBanner } from "@/components/client/alert-banner";
import { OrgEmptyState } from "@/components/client/org-empty-state";
import { formatRelativeTime } from "@/lib/utils";
import {
  CreditCard,
  Bell,
  MapPin,
  Link2,
  CheckCircle2,
  XCircle,
  Crown,
  Zap,
} from "lucide-react";

function Toggle({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          enabled ? "bg-primary" : "bg-muted",
        )}
        aria-pressed={enabled}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition",
            enabled ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};

const DEFAULT_NOTIFS = {
  newLead: true,
  weeklySummary: true,
  monthlyReport: true,
  marketingTips: false,
};

function notifStorageKey(orgId: string) {
  return `qimma-notif-prefs:${orgId}`;
}

export default function ClientSettingsPage() {
  const { orgId } = useOrgId();
  const { data: dashboard, isLoading } = useOrgDashboard(orgId || "");
  const { data: gbpData } = useGbpConnection(orgId || "");
  const { data: healthData } = useIntegrationHealth(orgId || "");
  const [notifications, setNotifications] = React.useState(DEFAULT_NOTIFS);
  const [banner, setBanner] = React.useState<string | null>(null);
  const [waPhone, setWaPhone] = React.useState("");
  const [savingWa, setSavingWa] = React.useState(false);

  const org = dashboard?.data?.org;
  const onboarding = dashboard?.data?.onboarding;
  const gbpConnected = gbpData?.data?.connected ?? false;
  const whatsappConnected = !!org?.whatsapp_number;
  const health = healthData?.data ?? [];

  React.useEffect(() => {
    if (org?.whatsapp_number) setWaPhone(org.whatsapp_number);
  }, [org?.whatsapp_number]);

  React.useEffect(() => {
    if (!orgId || typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(notifStorageKey(orgId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<typeof DEFAULT_NOTIFS>;
      setNotifications({ ...DEFAULT_NOTIFS, ...parsed });
    } catch {
      /* ignore corrupt prefs */
    }
  }, [orgId]);

  const handleReconnectGbp = () => {
    if (!orgId) return;
    window.location.href = ApiClient.getGbpOAuthUrl(orgId);
  };

  const handleSaveNotifications = () => {
    if (!orgId) return;
    localStorage.setItem(notifStorageKey(orgId), JSON.stringify(notifications));
    setBanner("Notification preferences saved on this device.");
  };

  const handleSaveWhatsApp = async () => {
    if (!orgId) return;
    const digits = waPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      setBanner("Enter a valid WhatsApp number (min 10 digits).");
      return;
    }
    setSavingWa(true);
    try {
      await ApiClient.updateOrg(orgId, {
        whatsapp_number: digits,
        whatsapp_verified: false,
      } as never);
      setBanner("WhatsApp number saved.");
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Failed to save WhatsApp number.");
    } finally {
      setSavingWa(false);
    }
  };

  if (!orgId) {
    return (
      <div className="py-8">
        <OrgEmptyState title="Settings" description="Connect a business to manage your account." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <ClientPageHeader
        title="Settings"
        description="Your plan, connections, territory, and notification preferences."
      />

      {banner && (
        <AlertBanner variant="success" message={banner} onDismiss={() => setBanner(null)} />
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Plan & billing</CardTitle>
          </div>
          <CardDescription>Your current Qimma subscription</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{PLAN_LABELS[org?.plan ?? "free"] ?? "Free"} plan</p>
                <p className="text-xs text-muted-foreground">
                  Contact us to change your plan
                </p>
              </div>
            </div>
            <Badge>Active</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-border p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Business</p>
              <p className="font-medium">{org?.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">City</p>
              <p className="font-medium">{org?.city ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="font-medium capitalize">{org?.category?.replace("_", " ") ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Exclusivity</p>
              <p className="font-medium capitalize">{org?.exclusivity ?? "standard"}</p>
            </div>
          </div>
          <a href="mailto:hello@qimma.io?subject=Change%20Qimma%20plan">
            <Button variant="outline" size="sm" className="min-h-11">
              <Crown className="mr-2 h-4 w-4" />
              Contact us to change plan
            </Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Choose what you want to be notified about</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <Toggle
            enabled={notifications.newLead}
            onChange={() => setNotifications((p) => ({ ...p, newLead: !p.newLead }))}
            label="New lead alerts"
            description="Instant alert when someone messages on WhatsApp"
          />
          <Toggle
            enabled={notifications.weeklySummary}
            onChange={() => setNotifications((p) => ({ ...p, weeklySummary: !p.weeklySummary }))}
            label="Weekly summary"
            description="Monday overview of leads and rankings"
          />
          <Toggle
            enabled={notifications.monthlyReport}
            onChange={() => setNotifications((p) => ({ ...p, monthlyReport: !p.monthlyReport }))}
            label="Monthly report"
            description="Value report delivered by the 5th of each month"
          />
          <Toggle
            enabled={notifications.marketingTips}
            onChange={() => setNotifications((p) => ({ ...p, marketingTips: !p.marketingTips }))}
            label="Marketing tips"
            description="Occasional tips to improve local SEO"
          />
          <div className="pt-4">
            <Button size="sm" onClick={handleSaveNotifications}>Save preferences</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Territory</CardTitle>
          </div>
          <CardDescription>Your local area and assigned keywords</CardDescription>
        </CardHeader>
        <CardContent>
          {onboarding?.is_complete ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-border p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">City</p>
                  <p className="font-medium">{org?.city ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="font-medium capitalize">{org?.category?.replace("_", " ") ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Exclusivity</p>
                  <Badge variant="outline" className="mt-1 capitalize">
                    {org?.exclusivity ?? "standard"}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="default" className="mt-1">Active</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Keyword assignments are managed by growth agents. Run agents from the Growth page to refresh your local keyword niches.
              </p>
              <Link href="/client/growth">
                <Button variant="outline" size="sm">View growth & keywords</Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <p className="text-sm text-muted-foreground">No territory claimed yet.</p>
              <Link href="/client/onboarding" className="mt-3 inline-block">
                <Button size="sm">Set up territory</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <CardTitle>Connected accounts</CardTitle>
          </div>
          <CardDescription>Services linked to your Qimma account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${gbpConnected ? "bg-success/10" : "bg-muted"}`}>
                {gbpConnected ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">Google Business Profile</p>
                <p className="text-xs text-muted-foreground">
                  {gbpConnected
                    ? `Connected${gbpData?.data?.last_synced_at ? ` · ${formatRelativeTime(gbpData.data.last_synced_at)}` : ""}`
                    : "Not connected"}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleReconnectGbp}>
              {gbpConnected ? "Reconnect" : "Connect"}
            </Button>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${whatsappConnected ? "bg-success/10" : "bg-muted"}`}>
                  {whatsappConnected ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">WhatsApp Business</p>
                  <p className="text-xs text-muted-foreground">
                    {whatsappConnected ? "Number saved for lead routing" : "Optional — add anytime"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="tel"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm"
              />
              <Button variant="outline" size="sm" onClick={() => void handleSaveWhatsApp()} disabled={savingWa}>
                {savingWa ? "Saving…" : "Save number"}
              </Button>
            </div>
          </div>

          {health.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {health.map((c: { provider: string; status: string }) => (
                <Badge key={c.provider} variant="outline" className="text-xs capitalize">
                  {c.provider.replace("_", " ")} · {c.status}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

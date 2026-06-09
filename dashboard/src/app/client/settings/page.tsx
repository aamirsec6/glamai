"use client";

import * as React from "react";
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
import {
  CreditCard,
  Bell,
  MapPin,
  Link2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pause,
  Trash2,
  Crown,
  Zap,
  Building2,
} from "lucide-react";

// ── Toggle Switch ──────────────────────────────────────────────

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
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          enabled ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            enabled ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────

export default function ClientSettingsPage() {
  const [notifications, setNotifications] = React.useState({
    newLead: true,
    weeklySummary: true,
    monthlyReport: true,
    marketingTips: false,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6">
      {/* Plan & Billing */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Plan & Billing</CardTitle>
          </div>
          <CardDescription>Manage your subscription and billing details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Growth Plan</p>
                <p className="text-xs text-muted-foreground">₹4,999/month</p>
              </div>
            </div>
            <Badge className="bg-accent-100 text-accent-700 border-accent-200">
              Active
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4">
            <div>
              <p className="text-xs text-muted-foreground">Billing Interval</p>
              <p className="text-sm font-medium text-foreground mt-1">Monthly</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Next Billing</p>
              <p className="text-sm font-medium text-foreground mt-1">July 2, 2026</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">GBP Posts</p>
              <p className="text-sm font-medium text-foreground mt-1">8 / month</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WhatsApp AI</p>
              <p className="text-sm font-medium text-foreground mt-1">Included</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" size="sm">
              <Crown className="h-4 w-4 mr-1.5" />
              Upgrade Plan
            </Button>
            <Button variant="ghost" size="sm">
              View Billing History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notification Preferences</CardTitle>
          </div>
          <CardDescription>Choose how and when you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          <Toggle
            enabled={notifications.newLead}
            onChange={() => toggleNotification("newLead")}
            label="New Lead Alerts"
            description="Get notified instantly when a new lead comes in via WhatsApp or GBP"
          />
          <Toggle
            enabled={notifications.weeklySummary}
            onChange={() => toggleNotification("weeklySummary")}
            label="Weekly Summary"
            description="A brief overview of your leads, rankings, and GBP performance every Monday"
          />
          <Toggle
            enabled={notifications.monthlyReport}
            onChange={() => toggleNotification("monthlyReport")}
            label="Monthly Value Report"
            description="Detailed monthly report with leads, revenue, reviews, and recommendations"
          />
          <Toggle
            enabled={notifications.marketingTips}
            onChange={() => toggleNotification("marketingTips")}
            label="Marketing Tips"
            description="Occasional tips to improve your Google ranking and lead conversion"
          />
        </CardContent>
      </Card>

      {/* Territory Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Territory Settings</CardTitle>
          </div>
          <CardDescription>Your configured territory and exclusivity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4">
            <div>
              <p className="text-xs text-muted-foreground">City</p>
              <p className="text-sm font-medium text-foreground mt-1">Bangalore</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <p className="text-sm font-medium text-foreground mt-1">Dentist</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Radius</p>
              <p className="text-sm font-medium text-foreground mt-1">5 km</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Exclusivity</p>
              <Badge className="mt-1 bg-muted text-muted-foreground border-border">
                Standard
              </Badge>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Assigned Keywords</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {[
                  "dentist in Bangalore",
                  "dental clinic",
                  "root canal",
                  "teeth whitening",
                  "braces",
                ].map((kw) => (
                  <Badge key={kw} variant="outline" className="text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Territory settings can only be modified by GlamAI support. Contact us to make changes.
          </p>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            <CardTitle>Connected Accounts</CardTitle>
          </div>
          <CardDescription>Manage your connected services</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GBP */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Google Business Profile
                </p>
                <p className="text-xs text-muted-foreground">
                  Connected · Last synced 2 hours ago
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Reconnect
            </Button>
          </div>

          {/* WhatsApp */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">WhatsApp Business</p>
                <p className="text-xs text-muted-foreground">
                  Connected · +91 98765 43210
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Reconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-danger/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-danger" />
            <CardTitle className="text-danger">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Irreversible actions — proceed with caution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-danger/20 bg-danger/5 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Pause Account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Temporarily stop all services. You can resume anytime.
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-danger/30 text-danger hover:bg-danger/10">
              <Pause className="h-4 w-4 mr-1.5" />
              Pause Account
            </Button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-danger/20 bg-danger/5 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Cancel Account</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete your account and all data. This cannot be undone.
              </p>
            </div>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-1.5" />
              Cancel Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

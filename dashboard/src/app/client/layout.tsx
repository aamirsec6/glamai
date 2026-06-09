"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MapPin,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useOrgDashboard } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/client", label: "Dashboard", icon: LayoutDashboard },
  { href: "/client/leads", label: "Leads", icon: Users },
  { href: "/client/gbp", label: "GBP", icon: MapPin },
  { href: "/client/reports", label: "Reports", icon: FileText },
  { href: "/client/settings", label: "Settings", icon: Settings },
];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const orgId = "demo-org-id";
  const { data, isLoading } = useOrgDashboard(orgId);

  const org = data?.data?.org;
  const onboardingComplete = data?.data?.onboarding?.is_complete;
  const currentStep = data?.data?.onboarding?.status ?? "not_started";

  const stepMap: Record<string, number> = {
    not_started: 0,
    gbp_connected: 1,
    whatsapp_connected: 2,
    territory_set: 3,
    complete: 4,
  };

  const currentStepNum = stepMap[currentStep] ?? 0;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r border-border bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <Link href="/client" className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold text-foreground">GlamAI</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 shrink-0",
                    isActive && "text-primary"
                  )}
                />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div className="border-t border-border p-4">
            <p className="text-xs text-muted-foreground">GlamAI v0.1.0</p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-auto">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div>
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-foreground">
                  {org?.name ?? "Your Dashboard"}
                </h1>
                <Badge
                  variant={
                    org?.plan === "enterprise"
                      ? "default"
                      : org?.plan === "growth"
                        ? "info"
                        : "outline"
                  }
                  className="capitalize"
                >
                  {org?.plan ?? "free"} plan
                </Badge>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        {/* Onboarding Banner */}
        {!onboardingComplete && (
          <div className="flex items-center justify-between border-b border-warning/20 bg-warning/5 px-6 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-2.5 w-2.5 rounded-full bg-warning" />
              <p className="text-sm font-medium text-foreground">
                Complete your setup &mdash; Step {currentStepNum + 1} of 4
              </p>
            </div>
            <Link href="/client/onboarding">
              <Button size="sm" variant="outline">
                Continue Setup
              </Button>
            </Link>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

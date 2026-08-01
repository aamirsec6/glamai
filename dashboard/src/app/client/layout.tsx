"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  MoreHorizontal,
  X,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/auth-config";
import { ClientAuthGuard } from "@/components/auth/client-auth-guard";
import { useOrgId } from "@/lib/org-context";
import { useOrgDashboard, useOrgSetup } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CLIENT_NAV,
  MOBILE_TAB_HREFS,
  getClientPageMeta,
  isClientNavActive,
} from "@/lib/client-nav";
import { ThemeToggle } from "@/components/client/theme-toggle";
import { useTheme } from "@/lib/theme-provider";
import { QimmaLogo } from "@/components/marketing/logo";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const { orgId } = useOrgId();
  const { data, isLoading } = useOrgDashboard(orgId || "");
  const { data: setupData } = useOrgSetup(orgId || "");

  const org = data?.data?.org;
  const setup = setupData?.data;
  const onboardingComplete =
    setup?.is_complete ?? data?.data?.onboarding?.is_complete;
  const missing = setup?.missing_required ?? [];
  const pageMeta = getClientPageMeta(pathname);
  const logoVariant = theme === "dark" ? "dark" : "light";

  const setupHint =
    missing[0] === "gbp_connected"
      ? "Connect Google Business Profile"
      : missing[0] === "location" ||
          missing[0] === "territory" ||
          missing[0] === "keywords"
        ? "Set location & keywords"
        : missing[0] === "business_profile"
          ? "Finish business profile"
          : "Continue setup";

  React.useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  React.useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const allNavItems = CLIENT_NAV.flatMap((s) => s.items);
  const mobileTabs = allNavItems.filter((item) =>
    (MOBILE_TAB_HREFS as readonly string[]).includes(item.href),
  );
  const moreActive = allNavItems.some(
    (item) =>
      !(MOBILE_TAB_HREFS as readonly string[]).includes(item.href) &&
      isClientNavActive(pathname, item.href),
  );

  const renderNavLinks = (opts: {
    collapsed?: boolean;
    onNavigate?: () => void;
  }) =>
    CLIENT_NAV.map((section) => (
      <div key={section.title}>
        <div className="space-y-0.5">
          {section.items.map((item) => {
            const active = isClientNavActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={opts.collapsed ? item.label : item.description}
                onClick={opts.onNavigate}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!opts.collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    ));

  return (
    <ClientAuthGuard>
      <div className="flex h-screen bg-background">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "hidden flex-col border-r border-border bg-card transition-all duration-300 md:flex",
            collapsed ? "w-[4.5rem]" : "w-60",
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            {!collapsed && (
              <Link href="/client" className="flex items-center gap-2">
                <QimmaLogo size="sm" variant={logoVariant} showWordmark />
              </Link>
            )}
            {collapsed && (
              <Link href="/client" className="mx-auto">
                <QimmaLogo size="sm" variant={logoVariant} showWordmark={false} />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            {renderNavLinks({ collapsed })}
          </nav>

          {!collapsed && org && (
            <div className="border-t border-border p-4">
              <p className="truncate text-sm font-medium text-foreground">
                {org.name}
              </p>
              <p className="truncate text-xs capitalize text-muted-foreground">
                {org.city ?? "—"} ·{" "}
                {org.category?.replace("_", " ") ?? "business"}
              </p>
            </div>
          )}
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-foreground/40"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-card shadow-lg">
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <Link href="/client" onClick={() => setDrawerOpen(false)}>
                  <QimmaLogo size="sm" variant={logoVariant} showWordmark />
                </Link>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-md p-2 text-muted-foreground hover:bg-muted"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-3">
                {renderNavLinks({ onNavigate: () => setDrawerOpen(false) })}
              </nav>
              {org && (
                <div className="border-t border-border p-4">
                  <p className="truncate text-sm font-medium text-foreground">
                    {org.name}
                  </p>
                  <p className="truncate text-xs capitalize text-muted-foreground">
                    {org.city ?? "—"} ·{" "}
                    {org.category?.replace("_", " ") ?? "business"}
                  </p>
                </div>
              )}
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:h-16 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
                aria-label="Open menu"
                onClick={() => setDrawerOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                {isLoading ? (
                  <Skeleton className="h-6 w-40" />
                ) : (
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {pageMeta.title}
                      </p>
                      <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
                        {org?.name ?? "Your business"}
                      </h1>
                    </div>
                    {org?.plan && (
                      <Badge
                        variant="outline"
                        className="hidden shrink-0 capitalize sm:inline-flex"
                      >
                        {org.plan}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              {isClerkEnabled ? (
                <UserButton afterSignOutUrl="/" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-xs font-medium text-background">
                  {org?.name?.[0]?.toUpperCase() ?? "Q"}
                </div>
              )}
            </div>
          </header>

          {!onboardingComplete && pathname !== "/client/onboarding" && orgId && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="h-2 w-2 shrink-0 rounded-full bg-warning" />
                <p className="truncate text-sm text-foreground">
                  <span className="font-medium">Setup incomplete</span>
                  <span className="hidden text-muted-foreground sm:inline">
                    {" "}
                    — {setupHint}
                  </span>
                </p>
              </div>
              <Link href="/client/onboarding" className="shrink-0">
                <Button size="sm" className="min-h-10 rounded-full">
                  Continue setup
                </Button>
              </Link>
            </div>
          )}

          <main className="flex-1 overflow-auto p-4 pb-24 sm:p-6 md:pb-8 lg:p-8">
            {children}
          </main>
        </div>

        {/* Mobile bottom tabs */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur md:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          aria-label="Primary"
        >
          <div className="grid grid-cols-5">
            {mobileTabs.map((item) => {
              const active = isClientNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <item.icon
                    className={cn("h-5 w-5", active && "stroke-[2.25]")}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium",
                moreActive || drawerOpen
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span>More</span>
            </button>
          </div>
        </nav>
      </div>
    </ClientAuthGuard>
  );
}

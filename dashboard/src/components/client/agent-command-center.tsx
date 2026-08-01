"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Play, RefreshCw } from "lucide-react";
import ApiClient from "@/lib/api";
import { useSeoScorecard } from "@/lib/api";
import { AgentAvatar } from "@/components/marketing/agent-avatar";
import { AlertBanner } from "@/components/client/alert-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildAgentCommandCards,
  formatAgentErrors,
  type AgentRuntimeStatus,
} from "@/lib/agent-command";
import { cn, formatRelativeTime } from "@/lib/utils";

const STATUS_STYLES: Record<
  AgentRuntimeStatus,
  { badge: string; label: string }
> = {
  ok: { badge: "bg-success/10 text-success border-success/20", label: "OK" },
  listening: {
    badge: "bg-info/10 text-info border-info/20",
    label: "Live",
  },
  attention: {
    badge: "bg-warning/10 text-foreground border-warning/20",
    label: "Attention",
  },
  idle: { badge: "bg-muted text-muted-foreground border-border", label: "Idle" },
  unknown: {
    badge: "bg-muted text-muted-foreground border-border",
    label: "—",
  },
};

type AgentCommandCenterProps = {
  orgId: string;
  leadsTotal?: number;
  gbpConnected?: boolean;
  onboardingComplete?: boolean;
  compact?: boolean;
  showFooterLink?: boolean;
};

export function AgentCommandCenter({
  orgId,
  leadsTotal = 0,
  gbpConnected = false,
  onboardingComplete = true,
  compact = false,
  showFooterLink = true,
}: AgentCommandCenterProps) {
  const { data: scorecardData, mutate: refreshScorecard } = useSeoScorecard(orgId);
  const [lastRun, setLastRun] = React.useState<Record<string, unknown> | null>(null);
  const [loadingRun, setLoadingRun] = React.useState(true);
  const [running, setRunning] = React.useState(false);
  const [banner, setBanner] = React.useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  const loadLastRun = React.useCallback(async () => {
    setLoadingRun(true);
    try {
      const res = await ApiClient.getLastGrowthRun(orgId);
      setLastRun(res.data ?? null);
    } catch {
      setLastRun(null);
    } finally {
      setLoadingRun(false);
    }
  }, [orgId]);

  React.useEffect(() => {
    void loadLastRun();
  }, [loadLastRun]);

  const inTop3 = scorecardData?.data?.summary?.in_top3 ?? null;
  const cards = buildAgentCommandCards(lastRun, {
    leadsTotal,
    gbpConnected,
    scorecardInTop3: inTop3,
  });
  const summary = (lastRun?.summary as Record<string, number> | undefined) ?? null;
  const errors = Array.isArray(lastRun?.errors) ? (lastRun!.errors as string[]) : [];
  const finishedAt =
    typeof lastRun?.finished_at === "string"
      ? lastRun.finished_at
      : typeof lastRun?.saved_at === "string"
        ? lastRun.saved_at
        : null;

  const handleRun = async () => {
    setRunning(true);
    setBanner(null);
    try {
      const res = await ApiClient.runGrowthAgents(orgId);
      setLastRun(res.data);
      await loadLastRun();
      const s = (res.data?.summary as Record<string, number> | undefined) ?? {};
      setBanner({
        type: "success",
        text: `Pipeline done — Scout → Sage → Spark/Ruby. Posts ${s.posts_created ?? 0}, top‑3 ${s.in_top3 ?? 0}, review asks ${s.review_requests_sent ?? 0}.`,
      });
      await refreshScorecard();
    } catch (e) {
      setBanner({
        type: "error",
        text: e instanceof Error ? e.message : "Growth pipeline failed",
      });
    } finally {
      setRunning(false);
    }
  };

  if (loadingRun && !lastRun) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Agent command center
            </p>
          </div>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Your AI team
          </h2>
          <p className="text-sm text-muted-foreground">
            {finishedAt
              ? `Last pipeline ${formatRelativeTime(finishedAt)}`
              : "No growth run yet — kick off the cast below"}
            {summary
              ? ` · ${summary.posts_created ?? 0} posts · ${summary.in_top3 ?? 0} in top 3`
              : ""}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 rounded-full sm:min-h-9"
            onClick={() => void loadLastRun()}
            disabled={loadingRun}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loadingRun && "animate-spin")} />
            Refresh
          </Button>
          <Button
            size="sm"
            className="min-h-11 rounded-full sm:min-h-9"
            onClick={() => void handleRun()}
            disabled={running || !onboardingComplete}
            title={!onboardingComplete ? "Finish setup first" : undefined}
          >
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running cast…
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run growth cast
              </>
            )}
          </Button>
        </div>
      </div>

      {banner && (
        <AlertBanner variant={banner.type} message={banner.text} onDismiss={() => setBanner(null)} />
      )}

      {errors.length > 0 && (
        <AlertBanner
          variant="warning"
          message={`Last run had ${errors.length} issue${errors.length === 1 ? "" : "s"}: ${formatAgentErrors(errors)}`}
        />
      )}

      <div
        className={cn(
          "grid gap-3",
          compact ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {cards.map(({ agent, status, statusLabel, lastAction, href }) => {
          const style = STATUS_STYLES[status];
          return (
            <Link
              key={agent.id}
              href={href}
              className="group flex min-h-[7.5rem] flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border hover:bg-muted/40 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <AgentAvatar agent={agent.avatar} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-foreground group-hover:text-foreground">
                      {agent.name}
                    </p>
                    <Badge variant="outline" className={cn("shrink-0 text-[10px]", style.badge)}>
                      {style.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{agent.title}</p>
                </div>
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">{statusLabel}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{lastAction}</p>
            </Link>
          );
        })}
      </div>

      {showFooterLink && (
        <p className="text-center text-xs text-muted-foreground">
          Scout → Sage → Spark / Ruby run on demand or Mondays. Maya listens on WhatsApp.
          Cleo summarizes.{" "}
          <Link href="/client/agents" className="font-medium text-foreground underline-offset-2 hover:underline">
            Full command center
          </Link>
        </p>
      )}
    </section>
  );
}

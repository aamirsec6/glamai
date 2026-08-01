"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import * as React from "react";
import { cn, getHealthColor, getHealthBg, getHealthLabel } from "@/lib/utils";
import type { OrgHealth } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, CheckCircle, Info } from "lucide-react";

type HealthScoreData = OrgHealth & {
  factors?: { type: string; label: string; detail?: string }[];
  last_login_days_ago?: number;
  onboarding_step?: string;
  gbp_sync_status?: string;
  whatsapp_status?: string;
};

interface HealthScoreProps {
  health?: HealthScoreData;
  isLoading?: boolean;
  orgName?: string;
}

export function HealthScore({ health, isLoading, orgName }: HealthScoreProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-24 rounded-full mx-auto" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No health data available</p>
        </CardContent>
      </Card>
    );
  }

  const score = health.score;
  const colorClass = getHealthColor(score);
  const bgClass = getHealthBg(score);
  const label = getHealthLabel(score);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Score</CardTitle>
        {orgName && <p className="text-sm text-muted-foreground">{orgName}</p>}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score circle */}
        <div className="flex flex-col items-center">
          <div className="relative flex h-28 w-28 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                className="stroke-border"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 264} 264`}
                className={colorClass}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className={cn("text-3xl font-bold", colorClass)}>
                {score}
              </span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          <span
            className={cn(
              "mt-2 rounded-badge px-3 py-1 text-sm font-medium",
              score >= 80
                ? "bg-success/15 text-foreground border border-success/30"
                : score >= 50
                ? "bg-warning/15 text-foreground border border-warning/30"
                : "bg-danger/15 text-foreground border border-danger/30"
            )}
          >
            {label}
          </span>
        </div>

        {/* Progress bar */}
        <Progress
          value={score}
          variant={
            score >= 80 ? "success" : score >= 50 ? "warning" : "danger"
          }
          size="md"
        />

        {/* Factors */}
        {(health.factors?.length ?? 0) > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Factors</h4>
            <div className="space-y-2">
              {health.factors!.map((factor, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 rounded-badge bg-gray-50 px-3 py-2"
                >
                  {factor.type === "positive" && (
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success-500" />
                  )}
                  {factor.type === "negative" && (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" />
                  )}
                  {factor.type === "neutral" && (
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-info-500" />
                  )}
                  <div>
                    <p className="text-sm text-foreground">{factor.label}</p>
                    {factor.detail && (
                      <p className="text-xs text-muted-foreground">{factor.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-badge bg-gray-50 p-3">
            <p className="text-xs text-muted-foreground">Last Login</p>
            <p className="text-sm font-medium text-foreground">
              {health.last_login_days_ago === 0
                ? "Today"
                : `${health.last_login_days_ago ?? 0}d ago`}
            </p>
          </div>
          <div className="rounded-badge bg-gray-50 p-3">
            <p className="text-xs text-muted-foreground">Onboarding</p>
            <p className="text-sm font-medium text-foreground capitalize">
              {(health.onboarding_step ?? "unknown").replace("_", " ")}
            </p>
          </div>
          <div className="rounded-badge bg-gray-50 p-3">
            <p className="text-xs text-muted-foreground">GBP Sync</p>
            <p
              className={cn(
                "text-sm font-medium capitalize",
                health.gbp_sync_status === "ok"
                  ? "text-success-600"
                  : health.gbp_sync_status === "stale"
                  ? "text-warning-600"
                  : "text-danger-600"
              )}
            >
              {health.gbp_sync_status ?? "unknown"}
            </p>
          </div>
          <div className="rounded-badge bg-gray-50 p-3">
            <p className="text-xs text-muted-foreground">WhatsApp</p>
            <p
              className={cn(
                "text-sm font-medium capitalize",
                health.whatsapp_status === "connected"
                  ? "text-success-600"
                  : "text-danger-600"
              )}
            >
              {health.whatsapp_status ?? "unknown"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

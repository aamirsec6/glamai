"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
  label?: string;
  showDot?: boolean;
}

const dotColors: Record<string, string> = {
  active: "bg-success-500",
  connected: "bg-success-500",
  qualified: "bg-success-500",
  won: "bg-success-500",
  pending: "bg-warning-500",
  new: "bg-warning-500",
  contacted: "bg-warning-500",
  inactive: "bg-danger-500",
  disconnected: "bg-danger-500",
  lost: "bg-danger-500",
  churned: "bg-danger-500",
  trial: "bg-info-500",
  onboarding: "bg-info-500",
  converted: "bg-success-500",
  error: "bg-danger-500",
  stale: "bg-warning-500",
  ok: "bg-success-500",
};

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, label, showDot = true, className, ...props }, ref) => {
    const dotColor = dotColors[status.toLowerCase()] || "bg-gray-400";
    const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-badge px-2.5 py-0.5 text-xs font-medium",
          "bg-gray-50 text-gray-700",
          className
        )}
        {...props}
      >
        {showDot && (
          <span className={cn("h-1.5 w-1.5 rounded-full", dotColor)} />
        )}
        {displayLabel}
      </span>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { StatusBadge };

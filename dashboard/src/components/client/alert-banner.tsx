"use client";

import * as React from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AlertBannerProps = {
  variant?: "success" | "error" | "warning" | "info";
  message: string;
  onDismiss?: () => void;
  className?: string;
};

const styles = {
  success: "border-success/30 bg-success/5 text-foreground",
  error: "border-destructive/30 bg-destructive/5 text-destructive",
  warning: "border-warning/30 bg-warning/5 text-foreground",
  info: "border-primary/20 bg-primary/5 text-foreground",
};

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertCircle,
  info: Info,
};

export function AlertBanner({
  variant = "info",
  message,
  onDismiss,
  className,
}: AlertBannerProps) {
  const Icon = icons[variant];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm",
        styles[variant],
        className,
      )}
      role="alert"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{message}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md p-0.5 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
